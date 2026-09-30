"""
Bricks – Online-Shop-Server (nur Python-Standardbibliothek).

  • Shop:        http://<PC-IP>:8090/
  • Dashboard:   http://<PC-IP>:8090/dashboard

Start: python server.py   (oder Doppelklick auf start_server.bat)
Einstellungen: config.json · Produkte, Preise & Katalogbestand: public/data/catalog.js
Laufende Daten (Bestellungen, Lager, E-Mail-Vorschauen): Ordner data/
"""

import copy
import json
import random
import re
import secrets
import smtplib
import socket
import sys
import threading
import time as clock
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlparse

import payments

BASE = Path(__file__).resolve().parent
PUBLIC = BASE / "public"
DATA = BASE / "data"
ORDERS_FILE = DATA / "orders.json"
STOCK_FILE = DATA / "stock.json"
MAIL_DIR = DATA / "mails"
CONFIG = json.loads((BASE / "config.json").read_text(encoding="utf-8"))

PORT = int(CONFIG.get("port", 8090))
PIN = str(CONFIG.get("dashboardPin", "1234"))
SMTP = CONFIG.get("smtp", {})
STRIPE_KEY = CONFIG.get("stripe", {}).get("secretKey", "").strip()
WEBHOOK_SECRET = CONFIG.get("stripe", {}).get("webhookSecret", "").strip()
PAYMENT_MODE = "stripe" if STRIPE_KEY else "demo"

STATUSES = ["neu", "packen", "versendet", "abholbereit", "abgeschlossen", "storniert"]
HIDDEN = {"zahlung", "abgebrochen"}  # warten auf Zahlung / nie bezahlt
PAYMENT_TIMEOUT_MIN = 45
MAX_BODY = 60_000
lock = threading.Lock()


# ---------- Daten ----------
def read_json(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        path.rename(path.with_suffix(f".defekt-{datetime.now():%Y%m%d%H%M%S}.json"))
        return fallback


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def catalog():
    """Liest public/data/catalog.js (JSON nach „window.CATALOG =“)."""
    text = (PUBLIC / "data" / "catalog.js").read_text(encoding="utf-8")
    return json.loads(text.split("window.CATALOG =", 1)[1].strip().rstrip(";"))


def load_stock(cat=None):
    cat = cat or catalog()
    stock = read_json(STOCK_FILE, {})
    for p in cat["products"]:
        stock.setdefault(p["id"], p["stock"])  # neue Produkte übernehmen den Katalogbestand
    return stock


def iso(dt):
    return dt.isoformat(timespec="seconds")


def euro(n):
    return f"{n:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


# ---------- Validierung & Bestellung ----------
class InputError(Exception):
    pass


def text(value, field, required=True, max_len=200):
    value = str(value or "").strip()
    if required and not value:
        raise InputError(f"Bitte „{field}“ angeben.")
    if len(value) > max_len:
        raise InputError(f"„{field}“ ist zu lang.")
    return value


def build_order(payload, orders, stock):
    cat = catalog()
    ship_cfg = cat["shop"]["shipping"]
    products = {p["id"]: p for p in cat["products"]}

    wanted = {}
    for line in payload.get("lines") or []:
        qty = line.get("qty")
        if line.get("id") not in products or not isinstance(qty, int) or not 1 <= qty <= 50:
            raise InputError("Ungültiger Artikel im Warenkorb.")
        wanted[line["id"]] = wanted.get(line["id"], 0) + qty
    if not wanted or len(wanted) > 40:
        raise InputError("Der Warenkorb ist leer.")

    lines = []
    for pid, qty in wanted.items():
        p = products[pid]
        if p.get("limit") and qty > p["limit"]:
            raise InputError(f"„{p['name']}“ gibt es maximal {p['limit']}× pro Kunde.")
        if qty > stock.get(pid, 0):
            left = stock.get(pid, 0)
            raise InputError(f"„{p['name']}“ ist nur noch {left}× verfügbar." if left else f"„{p['name']}“ ist leider ausverkauft.")
        lines.append({"id": pid, "name": p["name"], "cat": p["cat"], "brand": p["brand"], "price": p["price"], "qty": qty,
                      "preorder": p["released"] if p["status"] == "bald" else None})

    delivery = payload.get("delivery")
    pay = payload.get("payment")
    if delivery not in ("ship", "pickup") or pay not in ("online", "store"):
        raise InputError("Bitte Lieferart und Zahlung wählen.")
    if delivery == "ship" and pay != "online":
        raise InputError("Beim Versand ist nur Online-Zahlung möglich.")
    if payload.get("acceptTerms") is not True:
        raise InputError("Bitte AGB und Widerrufsbelehrung bestätigen.")

    c = payload.get("customer") or {}
    customer = {
        "email": text(c.get("email"), "E-Mail", max_len=120),
        "name": text(c.get("name"), "Name", max_len=80),
        "phone": text(c.get("phone"), "Telefon", required=False, max_len=40),
    }
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", customer["email"]):
        raise InputError("Bitte eine gültige E-Mail-Adresse angeben.")
    if delivery == "ship":
        customer["street"] = text(c.get("street"), "Straße", max_len=120)
        customer["zip"] = text(c.get("zip"), "PLZ", max_len=5)
        customer["city"] = text(c.get("city"), "Ort", max_len=80)
        if not re.fullmatch(r"\d{5}", customer["zip"]):
            raise InputError("Bitte eine gültige 5-stellige PLZ angeben.")

    subtotal = round(sum(l["price"] * l["qty"] for l in lines), 2)
    shipping = 0.0 if delivery == "pickup" or subtotal >= ship_cfg["freeFrom"] else ship_cfg["cost"]
    pre = [l["preorder"] for l in lines if l["preorder"]]
    now = datetime.now()
    return {
        "number": max((o["number"] for o in orders), default=10000) + 1,
        "token": secrets.token_urlsafe(12),
        "createdAt": iso(now), "statusChangedAt": iso(now),
        "status": "zahlung" if pay == "online" else "neu",
        "payment": pay, "paymentStatus": "offen" if pay == "online" else "vor_ort",
        "delivery": delivery, "customer": customer,
        "note": text(payload.get("note"), "Anmerkung", required=False, max_len=300),
        "lines": lines, "subtotal": subtotal, "shipping": shipping, "total": round(subtotal + shipping, 2),
        "preorder": max(pre) if pre else None, "tracking": "", "mails": [],
    }


def reserve(stock, order, sign=-1):
    for l in order["lines"]:
        stock[l["id"]] = max(0, stock.get(l["id"], 0) + sign * l["qty"])


def public_status(o):
    return {k: o.get(k) for k in ("number", "status", "delivery", "payment", "paymentStatus", "subtotal", "shipping", "total", "tracking", "preorder", "createdAt")} | {
        "email": o["customer"]["email"], "lines": [{"id": l["id"], "name": l["name"], "qty": l["qty"], "price": l["price"]} for l in o["lines"]]}


# ---------- E-Mails ----------
def local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def public_url():
    return (CONFIG.get("publicUrl") or f"http://{local_ip()}:{PORT}").rstrip("/")


def build_mail(o, kind):
    shop = catalog()["shop"]
    n, first = o["number"], o["customer"]["name"].split()[0]
    ship = o["delivery"] == "ship"
    subjects = {
        "bestaetigung": f"Deine Bestellung #{n} bei {shop['name']}",
        "versendet": f"Bestellung #{n} ist unterwegs 🚚",
        "abholbereit": f"Bestellung #{n} liegt zur Abholung bereit",
        "storniert": f"Bestellung #{n} wurde storniert",
    }
    body = {
        "bestaetigung": [f"Hallo {first}, danke für deine Bestellung!",
                         "Wir packen sie so schnell wie möglich." if ship else "Wir melden uns, sobald sie zur Abholung bereitliegt."]
                        + ([f"Enthaltene Vorbestellungen verschicken wir zum Erscheinungstermin ({o['preorder']})."] if o.get("preorder") else []),
        "versendet": [f"Hallo {first}, dein Paket ist auf dem Weg!", f"Sendungsnummer: {o.get('tracking')}"],
        "abholbereit": [f"Hallo {first}, deine Bestellung liegt bereit.", f"Abholung: {shop['street']}, {shop['city']} – bitte Bestellnummer #{n} mitbringen."],
        "storniert": [f"Hallo {first}, deine Bestellung wurde storniert.",
                      "Den bezahlten Betrag erstatten wir automatisch." if o.get("paymentStatus") in ("bezahlt", "erstattet") else "Es wurde nichts abgebucht.",
                      f"Fragen? {shop['phone']} · {shop['email']}"],
    }[kind]
    link = f"{public_url()}/status.html?t={o['token']}"
    rows = "".join(f'<tr><td style="padding:4px 0">{l["qty"]}× {escape(l["name"])}</td><td style="text-align:right">{euro(l["price"] * l["qty"])}</td></tr>' for l in o["lines"])
    rows += f'<tr><td style="padding:4px 0;color:#62605c">{"Versand" if ship else "Abholung"}</td><td style="text-align:right;color:#62605c">{euro(o["shipping"]) if o["shipping"] else "kostenlos"}</td></tr>'
    track = f'<p><a href="https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={quote(o.get("tracking", ""))}">Sendung verfolgen</a></p>' if kind == "versendet" else ""
    html = f"""<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:Arial,sans-serif;color:#151515">
<div style="max-width:560px;margin:0 auto;padding:24px"><p style="font-size:22px;font-weight:800;margin:0 0 16px">🧱 {escape(shop['name'])}</p>
<div style="background:#fff;border-radius:18px;padding:24px"><h1 style="font-size:22px;margin:0 0 12px">{escape(subjects[kind])}</h1>
{''.join(f'<p style="margin:0 0 8px">{escape(x)}</p>' for x in body)}{track}
<p style="margin:20px 0"><a href="{escape(link)}" style="background:#d92b2b;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Bestellung ansehen</a></p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #ebe7e1;font-size:15px">{rows}
<tr><td style="padding-top:8px;font-weight:800">Gesamt</td><td style="text-align:right;padding-top:8px;font-weight:800">{euro(o['total'])}</td></tr></table></div>
<p style="font-size:12px;color:#62605c;text-align:center">{escape(shop['name'])} · {escape(shop['street'])} · {escape(shop['city'])}</p></div></body></html>"""
    plain = "\n".join(body) + f"\n\n" + "\n".join(f"{l['qty']}× {l['name']} – {euro(l['price'] * l['qty'])}" for l in o["lines"]) + f"\nGesamt: {euro(o['total'])}\n\nBestellung ansehen: {link}\n"
    return subjects[kind], plain, html


def deliver_mail(o, kind):
    try:
        subject, plain, html = build_mail(o, kind)
        if not SMTP.get("host"):
            MAIL_DIR.mkdir(parents=True, exist_ok=True)
            (MAIL_DIR / f"{o['number']}_{kind}.html").write_text(html, encoding="utf-8")
            print(f"  ✉ E-Mail-Vorschau „{subject}“ → data/mails/{o['number']}_{kind}.html")
            return
        msg = EmailMessage()
        msg["Subject"], msg["From"], msg["To"] = subject, SMTP.get("from") or SMTP.get("user"), o["customer"]["email"]
        msg.set_content(plain)
        msg.add_alternative(html, subtype="html")
        port = int(SMTP.get("port", 587))
        server = smtplib.SMTP_SSL(SMTP["host"], port, timeout=20) if port == 465 else smtplib.SMTP(SMTP["host"], port, timeout=20)
        with server:
            if port != 465:
                server.starttls()
            if SMTP.get("user"):
                server.login(SMTP["user"], SMTP.get("password", ""))
            server.send_message(msg)
        print(f"  ✉ E-Mail „{subject}“ gesendet")
    except Exception as e:
        print(f"  ⚠ E-Mail #{o['number']} ({kind}) fehlgeschlagen: {e}")


def notify(o, kind):
    """Jede E-Mail-Art höchstens einmal je Bestellung (Aufruf unter `lock`)."""
    if o.get("demo") or kind in o.setdefault("mails", []):
        return
    o["mails"].append(kind)
    threading.Thread(target=deliver_mail, args=(copy.deepcopy(o), kind), daemon=True).start()


# ---------- Zahlung ----------
def with_order(match, fn):
    with lock:
        orders, stock = read_json(ORDERS_FILE, []), load_stock()
        o = next((x for x in orders if match(x)), None)
        if o is None:
            return None
        fn(o, stock)
        write_json(ORDERS_FILE, orders)
        write_json(STOCK_FILE, stock)
        return copy.deepcopy(o)


def find_order(match):
    with lock:
        return next((x for x in read_json(ORDERS_FILE, []) if match(x)), None)


def mark_paid(o, stock, intent=None):
    if o["status"] != "zahlung":
        return
    o.update(status="neu", paymentStatus="bezahlt", paidAt=iso(datetime.now()), statusChangedAt=iso(datetime.now()))
    if intent:
        o["paymentIntent"] = intent
    notify(o, "bestaetigung")
    print(f"  💳 #{o['number']} online bezahlt ({euro(o['total'])})")


def mark_abandoned(o, stock, why):
    if o["status"] != "zahlung":
        return
    o.update(status="abgebrochen", paymentStatus="abgebrochen", statusChangedAt=iso(datetime.now()))
    reserve(stock, o, +1)  # reservierten Bestand freigeben
    print(f"  ✖ #{o['number']} nicht bezahlt ({why}) – Bestand freigegeben")


def start_checkout(o):
    t = quote(o["token"])
    if PAYMENT_MODE == "demo":
        return f"/demo-zahlung.html?t={t}"
    stripe_order = {"number": o["number"], "items": o["lines"], "fee": o["shipping"], "customer": o["customer"]}
    sid, url = payments.create_checkout(STRIPE_KEY, stripe_order, f"{public_url()}/status.html?t={t}", f"{public_url()}/checkout.html?abgebrochen={t}")
    with_order(lambda x: x["token"] == o["token"], lambda x, s: x.update(sessionId=sid))
    return url


def apply_session(session):
    def update(o, stock):
        if session.get("payment_status") == "paid":
            mark_paid(o, stock, session.get("payment_intent"))
        elif session.get("status") == "expired":
            mark_abandoned(o, stock, "Bezahlseite abgelaufen")
    with_order(lambda o: o.get("sessionId") == session.get("id"), update)


_last_sync = {}


def sync_stripe(token, force=False):
    if PAYMENT_MODE != "stripe":
        return
    o = find_order(lambda x: x["token"] == token)
    if not o or o["status"] != "zahlung" or not o.get("sessionId"):
        return
    if not force and clock.time() - _last_sync.get(token, 0) < 5:
        return
    _last_sync[token] = clock.time()
    try:
        apply_session(payments.retrieve_session(STRIPE_KEY, o["sessionId"]))
    except payments.PaymentError as e:
        print(f"  ⚠ Stripe-Abfrage fehlgeschlagen: {e}")


def refund_if_paid(number):
    o = find_order(lambda x: x["number"] == number)
    if not o or o.get("paymentStatus") != "bezahlt":
        return
    error = None
    if PAYMENT_MODE == "stripe" and not str(o.get("paymentIntent", "")).startswith("demo"):
        try:
            payments.refund(STRIPE_KEY, o["paymentIntent"])
        except (payments.PaymentError, KeyError) as e:
            error = str(e) or "Zahlungs-ID fehlt"
    with_order(lambda x: x["number"] == number,
               lambda x, s: x.update(paymentStatus="erstattung_fehlgeschlagen" if error else "erstattet", refundError=error or ""))
    print(f"  ↩ Erstattung #{number}: {'FEHLGESCHLAGEN – ' + error if error else 'erledigt'}")


def watchdog():
    while True:
        clock.sleep(60)
        try:
            for o in [x for x in read_json(ORDERS_FILE, []) if x["status"] == "zahlung"]:
                sync_stripe(o["token"], force=True)
            cutoff = iso(datetime.now() - timedelta(minutes=PAYMENT_TIMEOUT_MIN))
            with lock:
                orders, stock = read_json(ORDERS_FILE, []), load_stock()
                stale = [o for o in orders if o["status"] == "zahlung" and o["createdAt"] < cutoff]
                for o in stale:
                    mark_abandoned(o, stock, f"nach {PAYMENT_TIMEOUT_MIN} Min nicht bezahlt")
                if stale:
                    write_json(ORDERS_FILE, orders)
                    write_json(STOCK_FILE, stock)
        except Exception as e:
            print(f"  ⚠ Zahlungsprüfung: {e}")


# ---------- Demo-Daten fürs Dashboard ----------
def make_demo_orders():
    cat = catalog()
    rnd = random.Random(7)
    prods = [p for p in cat["products"] if p["status"] != "bald"]
    weights = [6 if p["cat"] == "tcg" and p["type"] in ("booster", "accessories") else 3 if p["cat"] == "tcg" else 2 if p["price"] < 100 else 1 for p in prods]
    names = ["Anna Weber", "Ben Koch", "Clara Wolf", "David Fischer", "Elif Yilmaz", "Felix Braun", "Greta Schulz", "Jonas Hoffmann", "Lea Richter", "Mia Klein", "Noah Becker", "Paul Wagner", "Sophie Meyer", "Tim Schäfer"]
    cities = [("10115", "Berlin"), ("20095", "Hamburg"), ("50667", "Köln"), ("80331", "München"), ("12345", "Musterstadt"), ("04109", "Leipzig")]
    now, orders, number = datetime.now(), [], 10000
    for back in range(30, -1, -1):
        day = now.date() - timedelta(days=back)
        n = rnd.randint(6, 11) + (4 if day.weekday() >= 4 else 0) + (30 - back) // 6  # leichtes Wachstum
        for _ in range(n):
            created = datetime.combine(day, datetime.min.time()) + timedelta(hours=rnd.choice([8, 10, 12, 13, 17, 19, 20, 21, 22]), minutes=rnd.randint(0, 59))
            if created > now:
                continue
            picks = {}
            for p in rnd.choices(prods, weights, k=rnd.choice([1, 1, 2, 2, 3])):
                picks[p["id"]] = min(picks.get(p["id"], 0) + rnd.choice([1, 1, 1, 2]), p.get("limit") or 3)
            lines = [{"id": p["id"], "name": p["name"], "cat": p["cat"], "brand": p["brand"], "price": p["price"], "qty": picks[p["id"]], "preorder": None}
                     for p in prods if p["id"] in picks]
            sub = round(sum(l["price"] * l["qty"] for l in lines), 2)
            ship = rnd.random() < 0.72
            shipping = 0.0 if not ship or sub >= 50 else 4.99
            age_h = (now - created).total_seconds() / 3600
            status = ("abgeschlossen" if age_h > 72 else ("versendet" if ship else "abholbereit") if age_h > 20 else "packen" if age_h > 3 else "neu")
            if rnd.random() < 0.02:
                status = "storniert"
            number += 1
            name = rnd.choice(names)
            plz, city = rnd.choice(cities)
            orders.append({
                "number": number, "token": secrets.token_urlsafe(12), "createdAt": iso(created), "statusChangedAt": iso(created),
                "status": status, "payment": "online" if ship or rnd.random() < 0.5 else "store",
                "paymentStatus": "erstattet" if status == "storniert" else "bezahlt", "delivery": "ship" if ship else "pickup",
                "customer": {"email": name.split()[0].lower() + "@example.de", "name": name, "phone": "",
                             **({"street": f"Beispielweg {rnd.randint(1, 80)}", "zip": plz, "city": city} if ship else {})},
                "note": "", "lines": lines, "subtotal": sub, "shipping": shipping, "total": round(sub + shipping, 2), "preorder": None,
                "tracking": f"00340434{rnd.randint(10**11, 10**12 - 1)}" if status in ("versendet", "abgeschlossen") and ship else "", "mails": [], "demo": True})
    # Vorbestellungen für den nächsten TCG-Release
    for pid, k in (("t07", 9), ("t08", 14), ("p09", 3)):
        p = next(x for x in cat["products"] if x["id"] == pid)
        for _ in range(k):
            number += 1
            q = rnd.choice([1, 1, 2]) if p.get("limit", 2) >= 2 else 1
            created = now - timedelta(hours=rnd.randint(2, 24 * 12))
            orders.append({"number": number, "token": secrets.token_urlsafe(12), "createdAt": iso(created), "statusChangedAt": iso(created), "status": "neu",
                           "payment": "online", "paymentStatus": "bezahlt", "delivery": rnd.choice(["ship", "ship", "pickup"]),
                           "customer": {"email": "vorbesteller@example.de", "name": rnd.choice(names), "phone": ""}, "note": "",
                           "lines": [{"id": pid, "name": p["name"], "cat": p["cat"], "brand": p["brand"], "price": p["price"], "qty": q, "preorder": p["released"]}],
                           "subtotal": p["price"] * q, "shipping": 0.0, "total": p["price"] * q, "preorder": p["released"], "tracking": "", "mails": [], "demo": True})
    return sorted(orders, key=lambda o: o["createdAt"])


# ---------- HTTP ----------
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(PUBLIC), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_BODY:
            raise InputError("Ungültige Anfrage.")
        try:
            return json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise InputError("Ungültige Anfrage.")

    def authorized(self):
        return secrets.compare_digest(self.headers.get("X-Dashboard-Pin", ""), PIN)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/dashboard", "/dashboard/"):
            self.send_response(302)
            self.send_header("Location", "/dashboard.html")
            self.end_headers()
            return
        if path == "/api/stock":
            with lock:
                return self.send_json(200, load_stock())
        m = re.fullmatch(r"/api/status/([\w-]+)", path)
        if m:
            sync_stripe(m[1])
            o = find_order(lambda x: x["token"] == m[1])
            return self.send_json(200, public_status(o)) if o else self.send_json(404, {"error": "Nicht gefunden"})
        if path == "/api/dashboard/data":
            if not self.authorized():
                return self.send_json(401, {"error": "Falsche PIN"})
            since = iso(datetime.now() - timedelta(days=35))
            with lock:
                orders = [o for o in read_json(ORDERS_FILE, []) if o["status"] not in HIDDEN and (o["createdAt"] >= since or o["status"] in ("neu", "packen", "abholbereit"))]
                stock = load_stock()
            return self.send_json(200, {"orders": orders, "stock": stock, "serverTime": iso(datetime.now()),
                                        "hasDemo": any(o.get("demo") for o in orders), "paymentMode": PAYMENT_MODE})
        if path.startswith("/api/"):
            return self.send_json(404, {"error": "Nicht gefunden"})
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/orders":
                payload = self.body()
                with lock:
                    orders, stock = read_json(ORDERS_FILE, []), load_stock()
                    o = build_order(payload, orders, stock)
                    reserve(stock, o)  # Bestand sofort reservieren
                    orders.append(o)
                    if o["payment"] == "store":
                        notify(o, "bestaetigung")
                    write_json(ORDERS_FILE, orders)
                    write_json(STOCK_FILE, stock)
                print(f"[{datetime.now():%H:%M}] ➜ Bestellung #{o['number']} · {o['customer']['name']} · {euro(o['total'])} · "
                      f"{'Versand' if o['delivery'] == 'ship' else 'Abholung'}{' · wartet auf Zahlung' if o['payment'] == 'online' else ''}")
                redirect = None
                if o["payment"] == "online":
                    try:
                        redirect = start_checkout(o)
                    except payments.PaymentError as e:
                        print(f"  ⚠ Bezahlseite #{o['number']}: {e}")
                        with_order(lambda x: x["token"] == o["token"], lambda x, s: mark_abandoned(x, s, "Stripe-Fehler"))
                        return self.send_json(502, {"error": "Online-Zahlung ist gerade nicht möglich. Bitte versuche es gleich noch einmal."})
                return self.send_json(201, {**public_status(o), "token": o["token"], "redirectUrl": redirect})

            m = re.fullmatch(r"/api/orders/([\w-]+)/abort", path)
            if m:
                o = find_order(lambda x: x["token"] == m[1])
                if o and o["status"] == "zahlung":
                    if PAYMENT_MODE == "stripe" and o.get("sessionId"):
                        try:
                            payments.expire_session(STRIPE_KEY, o["sessionId"])
                        except payments.PaymentError:
                            sync_stripe(m[1], force=True)
                    with_order(lambda x: x["token"] == m[1], lambda x, s: mark_abandoned(x, s, "vom Kunden abgebrochen"))
                o = find_order(lambda x: x["token"] == m[1])
                return self.send_json(200, public_status(o) if o else {})

            m = re.fullmatch(r"/api/demo-pay/([\w-]+)", path)
            if m and PAYMENT_MODE == "demo":
                action, t = self.body().get("action"), m[1]
                if action == "pay":
                    o = with_order(lambda x: x["token"] == t, lambda x, s: mark_paid(x, s, "demo_" + secrets.token_hex(5)))
                    target = f"/status.html?t={quote(t)}"
                else:
                    o = with_order(lambda x: x["token"] == t, lambda x, s: mark_abandoned(x, s, "Demo abgebrochen"))
                    target = f"/checkout.html?abgebrochen={quote(t)}"
                return self.send_json(200, {"redirectUrl": target}) if o else self.send_json(404, {"error": "Nicht gefunden"})

            if path == "/api/stripe/webhook":
                if not WEBHOOK_SECRET:
                    return self.send_json(400, {"error": "Webhook nicht konfiguriert"})
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(min(length, 1_000_000))
                try:
                    event = payments.verify_webhook(raw, self.headers.get("Stripe-Signature"), WEBHOOK_SECRET)
                except (payments.PaymentError, ValueError):
                    return self.send_json(400, {"error": "Ungültige Signatur"})
                if event.get("type") in ("checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"):
                    apply_session(event["data"]["object"])
                return self.send_json(200, {"received": True})

            if path.startswith("/api/dashboard/") and not self.authorized():
                return self.send_json(401, {"error": "Falsche PIN"})

            m = re.fullmatch(r"/api/dashboard/orders/(\d+)/status", path)
            if m:
                b = self.body()
                status, tracking = b.get("status"), text(b.get("tracking"), "Sendungsnummer", required=False, max_len=40)
                if status not in STATUSES:
                    raise InputError("Ungültiger Status.")

                def change(o, stock):
                    if o["status"] in HIDDEN:
                        raise InputError("Diese Bestellung ist noch nicht bezahlt.")
                    if o["status"] == "storniert":
                        raise InputError("Stornierte Bestellungen können nicht wieder geöffnet werden.")
                    if status == "versendet":
                        if o["delivery"] != "ship":
                            raise InputError("Abholbestellungen werden nicht versendet.")
                        if not re.fullmatch(r"[A-Za-z0-9]{8,40}", tracking or o.get("tracking", "")):
                            raise InputError("Bitte eine gültige Sendungsnummer eingeben.")
                        o["tracking"] = tracking or o["tracking"]
                    if status == "abholbereit" and o["delivery"] != "pickup":
                        raise InputError("Versandbestellungen können nicht abgeholt werden.")
                    if status == "storniert":
                        reserve(stock, o, +1)
                    o["status"], o["statusChangedAt"] = status, iso(datetime.now())
                    if status in ("versendet", "abholbereit", "storniert"):
                        notify(o, status)

                with lock:
                    orders, stock = read_json(ORDERS_FILE, []), load_stock()
                    o = next((x for x in orders if x["number"] == int(m[1])), None)
                    if not o:
                        return self.send_json(404, {"error": "Nicht gefunden"})
                    change(o, stock)
                    write_json(ORDERS_FILE, orders)
                    write_json(STOCK_FILE, stock)
                if status == "storniert":
                    refund_if_paid(o["number"])
                return self.send_json(200, find_order(lambda x: x["number"] == int(m[1])))

            m = re.fullmatch(r"/api/dashboard/stock/([\w-]+)", path)
            if m:
                delta = self.body().get("delta")
                if not isinstance(delta, int) or abs(delta) > 1000:
                    raise InputError("Ungültige Menge.")
                with lock:
                    stock = load_stock()
                    if m[1] not in stock:
                        return self.send_json(404, {"error": "Produkt unbekannt"})
                    stock[m[1]] = max(0, stock[m[1]] + delta)
                    write_json(STOCK_FILE, stock)
                return self.send_json(200, {"id": m[1], "stock": stock[m[1]]})

            if path == "/api/dashboard/demo/delete":
                with lock:
                    write_json(ORDERS_FILE, [o for o in read_json(ORDERS_FILE, []) if not o.get("demo")])
                return self.send_json(200, {"ok": True})

            self.send_json(404, {"error": "Nicht gefunden"})
        except InputError as e:
            self.send_json(400, {"error": str(e)})


class Server(ThreadingHTTPServer):
    allow_reuse_address = sys.platform != "win32"  # Windows: kein doppelter Start auf demselben Port
    daemon_threads = True

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    try:
        server = Server(("0.0.0.0", PORT), Handler)
    except OSError:
        print(f"Port {PORT} ist bereits belegt – läuft der Server schon in einem anderen Fenster?")
        sys.exit(1)
    if CONFIG.get("demoData") and not ORDERS_FILE.exists():
        demo = make_demo_orders()
        write_json(ORDERS_FILE, demo)
        print(f"  Demo-Daten angelegt: {len(demo)} Bestellungen (im Dashboard löschbar)")
    ip = local_ip()
    print("=" * 60)
    print(f"  {catalog()['shop']['name']} – Online-Shop läuft")
    print("=" * 60)
    print(f"  Shop:       http://localhost:{PORT}/   (im WLAN: http://{ip}:{PORT}/)")
    print(f"  Dashboard:  http://{ip}:{PORT}/dashboard   PIN: {PIN}")
    print(f"  Zahlung:    {'Stripe ' + ('LIVE – echtes Geld!' if STRIPE_KEY.startswith('sk_live') else 'Testmodus') if PAYMENT_MODE == 'stripe' else 'DEMO (kein Stripe-Schlüssel – es fließt kein Geld)'}")
    print(f"  E-Mails:    {'Versand über ' + SMTP['host'] if SMTP.get('host') else 'Vorschau in data/mails/'}")
    print("  Beenden mit Strg+C")
    print("=" * 60)
    threading.Thread(target=watchdog, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
