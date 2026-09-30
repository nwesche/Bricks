// Bestellstatus: Zahlung → Bearbeitung → Versand/Abholung, mit Sendungsverfolgung
mountShared("shop");
const token = new URLSearchParams(location.search).get("t");
let timer = null;

const HEAD = {
  zahlung: ["Zahlung wird bestätigt …", "Einen Moment – wir warten auf die Bestätigung deiner Zahlung."],
  neu: ["Danke für deine Bestellung!", "Wir haben sie erhalten und kümmern uns darum."],
  packen: ["Wird gerade gepackt 📦", "Deine Bestellung ist in Bearbeitung."],
  versendet: ["Unterwegs zu dir 🚚", "Dein Paket ist verschickt."],
  abholbereit: ["Liegt für dich bereit 🏬", "Du kannst deine Bestellung ab sofort im Laden abholen."],
  abgeschlossen: ["Abgeschlossen – viel Spaß! 🧱", "Danke, dass du bei uns bestellt hast."],
  storniert: ["Bestellung storniert", "Bereits gezahlte Beträge erstatten wir automatisch."],
  abgebrochen: ["Zahlung nicht abgeschlossen", "Es wurde nichts abgebucht. Dein Warenkorb ist noch da."],
};

function render(o) {
  const ship = o.delivery === "ship";
  const steps = ["Bestellt", "In Bearbeitung", ship ? "Versendet" : "Abholbereit", ship ? "Zugestellt" : "Abgeholt"];
  const idx = { zahlung: -1, neu: 0, packen: 1, versendet: 2, abholbereit: 2, abgeschlossen: 3 }[o.status];
  const [h, sub] = HEAD[o.status] || ["Deine Bestellung", ""];
  const pay = o.payment === "online" ? (o.paymentStatus === "bezahlt" ? "✓ Online bezahlt" : o.paymentStatus === "erstattet" ? "↩ Erstattet" : "Online-Zahlung ausstehend") : "Bezahlung bei Abholung";
  $("#statusCard").innerHTML = `
    <span class="eyebrow">Bestellung #${o.number}</span>
    <h1>${h}</h1>
    <p class="lead">${sub}${o.status === "neu" ? ` Eine Bestätigung ging an <b>${esc(o.email)}</b>.` : ""}</p>
    ${idx !== undefined && idx >= -1 && !["storniert", "abgebrochen"].includes(o.status) ? `<ol class="track">${steps.map((s, i) => `<li class="${i < idx || idx === 3 ? "is-done" : i === idx ? "is-now" : ""}"><i></i>${s}</li>`).join("")}</ol>` : ""}
    ${o.tracking ? `<div class="st-box">📦 Sendungsnummer <b>${esc(o.tracking)}</b> · <a href="https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener">Sendung verfolgen</a></div>` : ""}
    ${!ship && ["neu", "packen", "abholbereit"].includes(o.status) ? `<div class="st-box">🏬 Abholung: ${esc(SHOP.name)}, ${esc(SHOP.street)}, ${esc(SHOP.city)} · Bitte Bestellnummer #${o.number} mitbringen.</div>` : ""}
    ${o.preorder ? `<div class="st-box">📅 Enthält Vorbestellungen – ${ship ? "Versand" : "Abholung"} ab ${fmtDate(parseDay(o.preorder))}.</div>` : ""}
    <ul class="co-lines">${o.lines.map((l) => { const p = productById[l.id]; return `<li class="co-line">${p ? `<span class="w-item__art" style="--tint:${tintOf(p)}">${productArt(p)}</span>` : ""}<span>${esc(l.name)}<small>${l.qty} × ${euro(l.price)}</small></span><b>${euro(l.price * l.qty)}</b></li>`; }).join("")}</ul>
    <div class="co-sums">
      <div><span>Zwischensumme</span><span>${euro(o.subtotal)}</span></div>
      <div><span>${ship ? "Versand" : "Abholung"}</span><span>${o.shipping ? euro(o.shipping) : "kostenlos"}</span></div>
      <div class="total"><span>Gesamt</span><span>${euro(o.total)}</span></div>
      <div><small>${pay}</small></div>
    </div>
    <div class="cta"><a class="btn btn--ghost" href="index.html#shop">${o.status === "abgebrochen" ? "Zurück zum Warenkorb" : "Weiter einkaufen"}</a></div>`;
  document.title = `#${o.number} · ${h}`;

  // Nach erfolgreicher Online-Zahlung: Warenkorb leeren
  const pending = load("bricks-pending", null);
  if (pending?.token === token && !["zahlung", "abgebrochen"].includes(o.status)) {
    cart.items = {};
    saveCart();
    store("bricks-pending", null);
  }
  if (["abgeschlossen", "storniert", "abgebrochen"].includes(o.status)) clearInterval(timer);
}

async function loadStatus() {
  try {
    const res = await fetch(`/api/status/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.status === 404) { $("#statusCard").innerHTML = `<h1>Bestellung nicht gefunden</h1><p class="lead">Der Link ist ungültig. Bei Fragen: <a href="mailto:${SHOP.email}">${SHOP.email}</a></p>`; clearInterval(timer); return; }
    if (res.ok) render(await res.json());
  } catch { /* offline – nächster Versuch */ }
}

if (!token) $("#statusCard").innerHTML = `<h1>Keine Bestellung angegeben</h1><p class="lead">Den Link zu deiner Bestellung findest du in der Bestätigungs-E-Mail.</p>`;
else { loadStatus(); timer = setInterval(loadStatus, 8000); }
