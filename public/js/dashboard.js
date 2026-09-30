// Shop-Dashboard: Kennzahlen & Diagramme, Bestellungen mit Versand, Vorbestellungen, Lager
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const euro = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const euro0 = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = (n, d = 0) => n.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }
function store(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} }

const CAT = window.CATALOG;
const PROD = Object.fromEntries(CAT.products.map((p) => [p.id, p]));
const BRAND = Object.fromEntries(CAT.brands.map((b) => [b.id, b]));
// Feste Reihenfolge = feste Farbe (validierte Referenzpalette)
const AREAS = [{ id: "bricks", label: "Klemmbausteine", color: "var(--series-1)" }, { id: "tcg", label: "Pokémon TCG", color: "var(--series-2)" }];
const S = { pin: load("bricks-dash-pin", null), data: null, range: 7, seen: new Set(), first: true, flash: new Set(), sound: load("bricks-dash-sound", true), offset: 0, sf: "all", q: "" };
let audio = null;

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", "X-Dashboard-Pin": S.pin } });
  if (res.status === 401) { store("bricks-dash-pin", null); location.reload(); throw new Error("401"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
}
async function login(pin) {
  S.pin = pin;
  try {
    const res = await fetch("/api/dashboard/data", { headers: { "X-Dashboard-Pin": pin } });
    if (res.status === 401) throw new Error("Falsche PIN.");
    const data = await res.json();
    store("bricks-dash-pin", pin);
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    $("#login").hidden = true;
    $("#app").hidden = false;
    apply(data);
    setInterval(poll, 6000);
  } catch (e) {
    $("#loginError").textContent = e instanceof TypeError ? "Server nicht erreichbar – läuft start_server.bat?" : e.message;
    $("#loginError").hidden = false;
  }
}
async function poll() {
  try { apply(await api("/api/dashboard/data")); $("#live").classList.remove("is-off"); $("#live em").textContent = "Live"; }
  catch (e) { if (e.message !== "401") { $("#live").classList.add("is-off"); $("#live em").textContent = "Keine Verbindung"; } }
}
function now() { return new Date(Date.now() + S.offset); }
function apply(data) {
  S.offset = Date.parse(data.serverTime) - Date.now();
  const fresh = data.orders.filter((o) => o.status === "neu" && !S.seen.has(o.number));
  data.orders.forEach((o) => S.seen.add(o.number));
  if (!S.first && fresh.length) {
    fresh.forEach((o) => { S.flash.add(o.number); setTimeout(() => S.flash.delete(o.number), 8000); });
    ding();
    toast(fresh.length === 1 ? `🧱 Neue Bestellung #${fresh[0].number} · ${euro(fresh[0].total)}` : `🧱 ${fresh.length} neue Bestellungen`);
  }
  S.first = false;
  S.data = data;
  $("#live em").textContent = "Live";
  $("#demoBar").hidden = !data.hasDemo;
  render();
}
function ding() {
  if (!S.sound || !audio) return;
  audio.resume();
  [660, 880, 1175].forEach((f, i) => {
    const t = audio.currentTime + i * 0.14, o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.22);
  });
}

// ---------- Auswertung ----------
const valid = (o) => o.status !== "storniert";
const futurePre = (o) => o.preorder && o.preorder > isoDay(now());
function inRange(o, days, shift = 0) {
  const end = now(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1 - shift);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const d = new Date(o.createdAt);
  return d >= start && d < end;
}
function stats(list) {
  const o = list.filter(valid), rev = o.reduce((s, x) => s + x.total, 0);
  return { count: o.length, rev, avg: o.length ? rev / o.length : 0, ship: o.length ? o.filter((x) => x.delivery === "ship").length / o.length : 0 };
}
function delta(cur, prev) {
  if (!prev) return "";
  const d = (cur - prev) / prev;
  return `<b class="${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${num(Math.abs(d) * 100)} %</b> vs. Vorwoche`;
}

function render() {
  const open = S.data.orders.filter((o) => ["neu", "packen", "abholbereit"].includes(o.status) && !futurePre(o));
  const pre = S.data.orders.filter((o) => valid(o) && futurePre(o));
  const low = CAT.products.filter((p) => p.status !== "bald" && (S.data.stock[p.id] ?? 0) <= 3);
  badge("#bOrders", open.filter((o) => o.status === "neu").length);
  badge("#bPre", pre.length);
  badge("#bStock", low.length);
  const nNew = open.filter((o) => o.status === "neu").length;
  document.title = nNew ? `(${nNew}) Neu · Bricks Dashboard` : "Dashboard · Bricks";
  renderOverview(low);
  renderBoard(open);
  renderPre(pre);
  renderStock();
}
function badge(sel, n) { $(sel).hidden = !n; $(sel).textContent = n; }

function renderOverview(low) {
  const days = S.range, cur = S.data.orders.filter((o) => inRange(o, days)), s = stats(cur);
  const prev = days === 7 ? stats(S.data.orders.filter((o) => inRange(o, 7, 7))) : null;
  $("#ovTitle").textContent = `Letzte ${days} Tage`;
  $("#ovSub").textContent = `inkl. heute · Stand ${now().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
  $("#kpis").innerHTML = [
    ["Umsatz", euro0(s.rev), prev ? delta(s.rev, prev.rev) : `Ø ${euro0(s.rev / days)} pro Tag`],
    ["Bestellungen", num(s.count), prev ? delta(s.count, prev.count) : `Ø ${num(s.count / days, 1)} pro Tag`],
    ["Ø Warenkorb", euro(s.avg), prev ? delta(s.avg, prev.avg) : "pro Bestellung"],
    ["Online-Versand", num(s.ship * 100) + " %", "der Bestellungen · Rest: Abholung"],
  ].map(([l, v, d]) => `<div class="kpi"><div class="kpi__label">${l}</div><div class="kpi__value">${v}</div><div class="kpi__delta">${d}</div></div>`).join("");

  const rows = Array.from({ length: days }, (_, i) => {
    const d = now(); d.setDate(d.getDate() - days + 1 + i);
    const list = S.data.orders.filter((o) => valid(o) && o.createdAt.startsWith(isoDay(d)));
    return { label: days === 7 ? (i === days - 1 ? "Heute" : WD[d.getDay()]) : (i % 5 === 4 || i === days - 1 ? `${d.getDate()}.${d.getMonth() + 1}.` : ""), full: d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "numeric" }), value: list.reduce((a, o) => a + o.total, 0), count: list.length };
  });
  barChart($("#cDays"), rows, (r) => `<b>${r.full}</b><br>${euro(r.value)} · ${r.count} Bestellungen`, (v) => euro0(v));
  $("#tDays").innerHTML = table(["Tag", "Bestellungen", "Umsatz"], rows.map((r) => [r.full, num(r.count), euro(r.value)]));

  const lines = cur.filter(valid).flatMap((o) => o.lines);
  const byArea = AREAS.map((a) => ({ ...a, value: lines.filter((l) => l.cat === a.id).reduce((x, l) => x + l.price * l.qty, 0) }));
  const tot = byArea.reduce((a, b) => a + b.value, 0);
  $("#mixSub").textContent = tot ? `${euro0(tot)} Warenwert` : "";
  $("#cMix").innerHTML = tot
    ? `<div class="mix-bar" role="img" aria-label="Umsatzanteile">${byArea.filter((a) => a.value).map((a) => `<span style="width:${(a.value / tot) * 100}%;background:${a.color}" data-tip="<b>${a.label}</b><br>${euro(a.value)} · ${num((a.value / tot) * 100)} %"></span>`).join("")}</div>
       <ul class="legend">${byArea.map((a) => `<li><i style="background:${a.color}"></i><span>${a.label}</span><b>${euro0(a.value)}</b><small>${num(tot ? (a.value / tot) * 100 : 0)} %</small></li>`).join("")}</ul>`
    : `<p class="empty">Noch keine Umsätze.</p>`;
  $("#tMix").innerHTML = table(["Bereich", "Umsatz", "Anteil"], byArea.map((a) => [a.label, euro(a.value), num(tot ? (a.value / tot) * 100 : 0) + " %"]));

  const byBrand = CAT.brands.map((b) => ({ label: b.name, value: lines.filter((l) => l.brand === b.id).reduce((x, l) => x + l.price * l.qty, 0) })).filter((b) => b.value).sort((a, b) => b.value - a.value);
  hBarChart($("#cBrand"), byBrand, (v) => euro0(v));
  $("#tBrand").innerHTML = table(["Marke", "Umsatz"], byBrand.map((b) => [b.label, euro(b.value)]));

  const qty = {};
  lines.forEach((l) => (qty[l.name] = (qty[l.name] || 0) + l.qty));
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  hBarChart($("#cTop"), top, (v) => num(v) + "×");
  $("#tTop").innerHTML = table(["Produkt", "Menge"], top.map((r) => [r.label, num(r.value)]));

  $("#lowStock").innerHTML = low.length ? low.sort((a, b) => (S.data.stock[a.id] ?? 0) - (S.data.stock[b.id] ?? 0)).slice(0, 7).map((p) => {
    const n = S.data.stock[p.id] ?? 0;
    return `<li><span class="st ${n === 0 ? "st--storniert" : "st--neu"}">${n === 0 ? "Ausverkauft" : `${n} Stk.`}</span><span class="what">${esc(p.name)}</span><small>${esc(BRAND[p.brand].name)}</small></li>`;
  }).join("") : `<li class="empty">Alles gut gefüllt. 👍</li>`;
}

function table(head, rows) {
  return `<table><thead><tr>${head.map((h, i) => `<th class="${i ? "num" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? "num" : ""}">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function niceStep(max) { const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw || 1)), n = raw / mag; return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag); }
function barChart(el, rows, tip, fmt) {
  const W = Math.max(280, el.clientWidth || 720), H = W < 500 ? 200 : 240, L = 52, B = 24, T = 18;
  const max = Math.max(1, ...rows.map((r) => r.value)), step = niceStep(max), top = Math.ceil(max / step) * step;
  const y = (v) => T + (H - T - B) * (1 - v / top), bw = (W - L) / rows.length, barW = Math.min(30, bw * 0.6);
  const peak = rows.reduce((m, r, i) => (r.value > rows[m].value ? i : m), 0);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Säulendiagramm">`;
  for (let v = 0; v <= top; v += step) svg += `<line class="${v ? "gridline" : "baseline"}" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  rows.forEach((r, i) => {
    const x = L + i * bw + (bw - barW) / 2, h = y(0) - y(r.value), r4 = Math.min(4, h / 2, barW / 2);
    svg += `<rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" data-i="${i}"/>`;
    if (h > 0) svg += `<path class="bar" data-i="${i}" d="M${x},${y(0)} V${y(r.value) + r4} Q${x},${y(r.value)} ${x + r4},${y(r.value)} H${x + barW - r4} Q${x + barW},${y(r.value)} ${x + barW},${y(r.value) + r4} V${y(0)} Z"/>`;
    if (i === peak && r.value) svg += `<text class="value" x="${x + barW / 2}" y="${y(r.value) - 6}" text-anchor="middle">${fmt(r.value)}</text>`;
    if (r.label) svg += `<text class="tick" x="${x + barW / 2}" y="${H - 6}" text-anchor="middle">${esc(r.label)}</text>`;
  });
  el.innerHTML = svg + "</svg>";
  bindTips(el, (i) => tip(rows[i]));
}
function hBarChart(el, rows, fmt) {
  if (!rows.length) { el.innerHTML = `<p class="empty">Noch keine Daten im Zeitraum.</p>`; return; }
  const W = Math.max(280, el.clientWidth || 520), rowH = 34, L = Math.min(180, W * 0.42), R = 64, H = rows.length * rowH;
  const max = Math.max(...rows.map((r) => r.value)), maxChars = Math.floor((L - 10) / 6.6);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  rows.forEach((r, i) => {
    const y0 = i * rowH + 8, h = rowH - 16, w = Math.max(2, ((W - L - R) * r.value) / max), r4 = Math.min(4, h / 2);
    svg += `<rect class="hit" x="0" y="${i * rowH}" width="${W}" height="${rowH}" data-i="${i}"/>`;
    svg += `<text class="label" x="${L - 10}" y="${y0 + h / 2 + 4}" text-anchor="end">${esc(r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + "…" : r.label)}</text>`;
    svg += `<path class="bar" data-i="${i}" d="M${L},${y0} H${L + w - r4} Q${L + w},${y0} ${L + w},${y0 + r4} V${y0 + h - r4} Q${L + w},${y0 + h} ${L + w - r4},${y0 + h} H${L} Z"/>`;
    svg += `<text class="value" x="${L + w + 6}" y="${y0 + h / 2 + 4}">${fmt(r.value)}</text>`;
  });
  el.innerHTML = svg + "</svg>";
  bindTips(el, (i) => `<b>${esc(rows[i].label)}</b><br>${fmt(rows[i].value)}`);
}
function bindTips(el, content) {
  const tip = $("#tooltip");
  const show = (e) => {
    const t = e.target.closest("[data-i]");
    if (!t) return hide();
    $$(".bar", el).forEach((b) => b.classList.toggle("is-hover", b.dataset.i === t.dataset.i));
    tip.innerHTML = content(+t.dataset.i);
    const r = ($(`.bar[data-i="${t.dataset.i}"]`, el) || t).getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - 100, Math.max(100, r.left + r.width / 2)) + "px";
    tip.style.top = r.top + "px";
    tip.hidden = false;
  };
  const hide = () => { tip.hidden = true; $$(".bar", el).forEach((b) => b.classList.remove("is-hover")); };
  el.onpointermove = show; el.onpointerdown = show; el.onpointerleave = hide;
}
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".chart, .mix-bar")) $("#tooltip").hidden = true; });
document.addEventListener("pointermove", (e) => {
  const seg = e.target.closest(".mix-bar span"), tip = $("#tooltip");
  if (seg) { tip.innerHTML = seg.dataset.tip; const r = seg.getBoundingClientRect(); tip.style.left = r.left + r.width / 2 + "px"; tip.style.top = r.top + "px"; tip.hidden = false; }
});

// ---------- Bestellungen ----------
const NEXT = {
  neu: (o) => ["packen", "Packen"],
  packen: (o) => (o.delivery === "ship" ? ["versendet", "Versenden 🚚"] : ["abholbereit", "Abholbereit ✓"]),
  abholbereit: (o) => ["abgeschlossen", "Abgeholt"],
};
function orderCard(o, actions = true) {
  const c = o.customer, ship = o.delivery === "ship", d = new Date(o.createdAt);
  const pre = o.preorder ? new Date(o.preorder + "T12:00:00") : null;
  return `<article class="order ${S.flash.has(o.number) ? "is-new" : ""}" data-no="${o.number}">
    <div class="order__head"><span class="order__no">#${o.number}</span><span class="order__who">${esc(c.name)}</span>
      <span class="order__when">${d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })} ${pad(d.getHours())}:${pad(d.getMinutes())}</span></div>
    <p class="order__ship">${ship ? `📦 <b>Versand</b> · ${esc(c.street || "")}, ${esc(c.zip || "")} ${esc(c.city || "")}` : "🏬 <b>Abholung im Laden</b>"}${o.tracking ? ` · Sendung ${esc(o.tracking)}` : ""}</p>
    <ul>${o.lines.map((l) => `<li><b>${l.qty}×</b>${esc(l.name)} ${l.cat === "tcg" ? '<span class="tcg-tag">TCG</span>' : ""}${l.preorder ? ` <span class="pre-tag">ab ${new Date(l.preorder + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}</span>` : ""}</li>`).join("")}</ul>
    ${o.note ? `<p class="order__note">📝 ${esc(o.note)}</p>` : ""}
    <div class="order__foot"><span>${o.paymentStatus === "bezahlt" ? "✓ bezahlt" : o.payment === "store" ? "💶 bei Abholung" : esc(o.paymentStatus)} · ${esc(c.email)}</span><b>${euro(o.total)}</b></div>
    ${actions && NEXT[o.status] ? `<div class="order__actions"><button class="btn ${o.status === "packen" ? "btn--ok" : "btn--primary"}" data-set="${NEXT[o.status](o)[0]}">${NEXT[o.status](o)[1]}</button>${o.status === "neu" ? `<button class="btn btn--danger btn--small" data-set="storniert" title="Stornieren">✕</button>` : ""}</div>` : ""}
    ${!actions ? `<span class="st st--${o.status === "versendet" ? "abholbereit" : o.status}">${{ versendet: "Versendet", abgeschlossen: "Abgeschlossen", storniert: "Storniert", neu: "Neu", packen: "In Bearbeitung", abholbereit: "Abholbereit" }[o.status]}</span>` : ""}
  </article>`;
}
function renderBoard(open) {
  const lanes = { neu: ["#lNeu", "#cNeu"], packen: ["#lPack", "#cPack"], abholbereit: ["#lReady", "#cReady"] };
  Object.entries(lanes).forEach(([st, [l, c]]) => {
    const list = open.filter((o) => o.status === st).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    $(l).innerHTML = list.map((o) => orderCard(o)).join("") || `<p class="empty">–</p>`;
    $(c).textContent = list.length;
  });
  const done = S.data.orders.filter((o) => ["versendet", "abgeschlossen", "storniert"].includes(o.status) && inRange(o, 7)).sort((a, b) => b.statusChangedAt.localeCompare(a.statusChangedAt));
  $("#cDone").textContent = done.length;
  $("#doneList").innerHTML = done.length ? `<div class="pre-orders">${done.slice(0, 60).map((o) => orderCard(o, false)).join("")}</div>` : `<p class="empty">Noch nichts.</p>`;
}
let shipFor = null;
async function setStatus(no, status, tracking) {
  if (status === "versendet" && tracking === undefined) {
    shipFor = no;
    $("#shipTitle").textContent = `#${no} versenden`;
    $("#shipTracking").value = "";
    $("#shipErr").hidden = true;
    $("#shipDialog").showModal();
    setTimeout(() => $("#shipTracking").focus(), 50);
    return;
  }
  if (status === "storniert" && !confirm(`Bestellung #${no} stornieren? Der Bestand wird zurückgebucht, bezahlte Beträge werden erstattet.`)) return;
  try {
    const saved = await api(`/api/dashboard/orders/${no}/status`, { method: "POST", body: JSON.stringify({ status, tracking }) });
    Object.assign(S.data.orders.find((x) => x.number === no), saved);
    if (status === "storniert") poll();
    render();
    toast({ versendet: `🚚 #${no} versendet – Kunde wurde informiert`, abholbereit: `🏬 #${no} abholbereit – Kunde wurde informiert`, storniert: `#${no} storniert` }[status] || `#${no} aktualisiert`);
    return true;
  } catch (e) {
    if (status === "versendet") { $("#shipErr").textContent = e.message; $("#shipErr").hidden = false; }
    else toast("⚠ " + e.message);
    return false;
  }
}

// ---------- Vorbestellungen ----------
function renderPre(pre) {
  const byProd = {};
  pre.forEach((o) => o.lines.filter((l) => l.preorder).forEach((l) => { (byProd[l.id] ||= { qty: 0, orders: [] }).qty += l.qty; byProd[l.id].orders.push(o); }));
  const ids = Object.keys(byProd).sort((a, b) => (PROD[a]?.released || "").localeCompare(PROD[b]?.released || ""));
  $("#preList").innerHTML = ids.length ? ids.map((id) => {
    const p = PROD[id], r = byProd[id], rel = new Date(p.released + "T12:00:00");
    const days = Math.round((rel - new Date(isoDay(now()) + "T12:00:00")) / 864e5);
    return `<section class="pre-card">
      <div class="pre-card__head"><h2>${esc(p.name)}</h2><span class="muted">${esc(BRAND[p.brand].name)} · erscheint ${rel.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</span></div>
      <div class="pre-stats">
        <div><b>${r.qty}</b><span>vorbestellt</span></div><div><b>${r.orders.length}</b><span>Bestellungen</span></div>
        <div><b>${S.data.stock[id] ?? 0}</b><span>noch frei im Kontingent</span></div><div><b>${days}</b><span>Tage bis Release</span></div>
      </div>
      <details><summary class="link">Bestellungen anzeigen</summary><div class="pre-orders">${r.orders.map((o) => orderCard(o, false)).join("")}</div></details>
    </section>`;
  }).join("") : `<p class="empty">Keine offenen Vorbestellungen.</p>`;
}

// ---------- Lager ----------
function renderStock() {
  const q = S.q.trim().toLowerCase();
  const list = CAT.products.filter((p) => {
    const n = S.data.stock[p.id] ?? 0;
    const f = S.sf === "all" || (S.sf === "low" && n > 0 && n <= 3) || (S.sf === "out" && n === 0);
    return f && (!q || (p.name + " " + BRAND[p.brand].name).toLowerCase().includes(q));
  }).sort((a, b) => (S.data.stock[a.id] ?? 0) - (S.data.stock[b.id] ?? 0));
  $("#stockTable").innerHTML = `<table><thead><tr><th>Produkt</th><th>Marke</th><th class="num">Preis</th><th class="num">Bestand</th><th class="num">Buchen</th></tr></thead><tbody>${list.map((p) => {
    const n = S.data.stock[p.id] ?? 0;
    return `<tr class="${n === 0 ? "stock-row--out" : ""}" data-sid="${p.id}"><td><b>${esc(p.name)}</b><small>${p.status === "bald" ? "Vorbestell-Kontingent" : p.limit ? `Limit ${p.limit}/Kunde` : ""}</small></td><td>${esc(BRAND[p.brand].name)}</td>
      <td class="num">${euro(p.price)}</td><td class="num"><span class="stock-num">${n}</span>${n === 0 ? '<small>ausverkauft</small>' : n <= 3 ? '<small>knapp</small>' : ""}</td>
      <td><div class="stock-btns"><button data-sd="-1" aria-label="1 abbuchen">−1</button><button data-sd="1" aria-label="1 zubuchen">+1</button><button data-sd="10" aria-label="10 zubuchen">+10</button></div></td></tr>`;
  }).join("")}</tbody></table>`;
}
async function bookStock(id, delta) {
  try {
    const r = await api(`/api/dashboard/stock/${id}`, { method: "POST", body: JSON.stringify({ delta }) });
    S.data.stock[id] = r.stock;
    render();
  } catch (e) { toast("⚠ " + e.message); }
}

// ---------- Oberfläche ----------
let toastT;
function toast(m) { $("#toast").textContent = m; $("#toast").classList.add("is-visible"); clearTimeout(toastT); toastT = setTimeout(() => $("#toast").classList.remove("is-visible"), 3500); }
function showTab(t) {
  $$(".tab").forEach((x) => x.classList.toggle("is-active", x.dataset.tab === t));
  $$(".view").forEach((v) => (v.hidden = v.id !== "view-" + t));
  $("#tooltip").hidden = true;
  scrollTo(0, 0);
  if (t === "overview" && S.data) renderOverview(CAT.products.filter((p) => p.status !== "bald" && (S.data.stock[p.id] ?? 0) <= 3));
}

$("#loginForm").addEventListener("submit", (e) => { e.preventDefault(); login($("#pin").value.trim()); });
$("#tabs").addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) showTab(t.dataset.tab); });
$("#range").addEventListener("click", (e) => {
  const b = e.target.closest("[data-range]");
  if (!b) return;
  S.range = +b.dataset.range;
  $$("#range button").forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-checked", x === b); });
  render();
});
$("#stockFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sf]");
  if (!b) return;
  S.sf = b.dataset.sf;
  $$("#stockFilter button").forEach((x) => x.classList.toggle("is-active", x === b));
  renderStock();
});
$("#stockQ").addEventListener("input", (e) => { S.q = e.target.value; renderStock(); });
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-set]");
  if (s) return setStatus(+s.closest("[data-no]").dataset.no, s.dataset.set);
  const sd = e.target.closest("[data-sd]");
  if (sd) return bookStock(sd.closest("[data-sid]").dataset.sid, +sd.dataset.sd);
  const tb = e.target.closest("[data-table]");
  if (tb) { const t = $("#" + tb.dataset.table); t.hidden = !t.hidden; tb.textContent = t.hidden ? "Tabelle" : "Diagramm"; return; }
  const go = e.target.closest("[data-goto]");
  if (go) showTab(go.dataset.goto);
});
$("#shipDialog").addEventListener("close", async () => {
  if ($("#shipDialog").returnValue !== "ok" || !shipFor) return;
  const ok = await setStatus(shipFor, "versendet", $("#shipTracking").value.trim());
  if (!ok) $("#shipDialog").showModal();
});
$("#soundBtn").addEventListener("click", () => {
  S.sound = !S.sound;
  store("bricks-dash-sound", S.sound);
  $("#soundBtn").textContent = S.sound ? "🔔" : "🔕";
  $("#soundBtn").classList.toggle("is-off", !S.sound);
  if (S.sound) { audio?.resume(); ding(); }
});
$("#logout").addEventListener("click", () => { store("bricks-dash-pin", null); location.reload(); });
$("#demoDelete").addEventListener("click", async () => {
  if (!confirm("Alle Demo-Bestellungen löschen? Echte Bestellungen bleiben erhalten.")) return;
  await api("/api/dashboard/demo/delete", { method: "POST", body: "{}" });
  S.seen.clear(); S.first = true;
  poll();
  toast("Demo-Daten gelöscht.");
});
let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => S.data && render(), 150); });
document.addEventListener("visibilitychange", () => !document.hidden && S.data && poll());
$("#soundBtn").textContent = S.sound ? "🔔" : "🔕";
if (S.pin) $("#pin").value = S.pin;
$("#pin").focus();
