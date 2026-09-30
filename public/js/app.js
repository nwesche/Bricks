// Gemeinsamer Code: Katalog, Illustrationen, Warenkorb, Merkliste, Panels, Navigation
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const euro = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
const DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ---------- Katalog (data/catalog.js) ----------
const C = window.CATALOG;
const SHOP = C.shop, HOURS = C.hours, THEMES = C.themes, BRANDS = C.brands, PRODUCTS = C.products;
const SHOWROOMS = C.showrooms, EVENTS = C.events, BOOKABLE = C.bookable, TCG_TYPES = C.tcgTypes;
const themeById = Object.fromEntries(THEMES.map((t) => [t.id, t]));
const brandById = Object.fromEntries(BRANDS.map((b) => [b.id, b]));
const productById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const tcgTypeById = Object.fromEntries(TCG_TYPES.map((t) => [t.id, t]));
// Live-Bestand vom Server (falls erreichbar), sonst Katalogwerte
const STOCK = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock]));

// ---------- Datum ----------
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDay(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((b - a) / 864e5); }
function fmtDate(d, opts = { day: "numeric", month: "long" }) { return d.toLocaleDateString("de-DE", opts); }
function relDays(n) { return n === 0 ? "heute" : n === 1 ? "morgen" : n === -1 ? "gestern" : n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`; }

// ---------- Showroom-Logik ----------
function showroomPeriods() {
  return SHOWROOMS.map((s) => {
    const start = parseDay(s.start), end = new Date(start);
    end.setDate(end.getDate() + s.weeks * 7);
    return { ...s, startDate: start, endDate: end };
  }).sort((a, b) => a.startDate - b.startDate);
}
function currentShowroom() {
  const t = today(), list = showroomPeriods();
  return { cur: list.find((s) => s.startDate <= t && t < s.endDate) || null, next: list.find((s) => s.startDate > t) || null, list };
}

// ---------- Illustrationen ----------
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
// Farbe aufhellen/abdunkeln – gibt wieder Hex zurück, damit mehrfaches Abstufen funktioniert
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function brick(x, y, units, color, unit = 20, h = 16) {
  const w = units * unit;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${color}"/><rect x="${x}" y="${y + h - 3.5}" width="${w}" height="3.5" rx="1.5" fill="${shade(color, -0.12)}"/>`;
  for (let i = 0; i < units; i++) s += `<rect x="${x + i * unit + unit * 0.22}" y="${y - 4.5}" width="${unit * 0.56}" height="5.5" rx="1.6" fill="${shade(color, 0.06)}"/><rect x="${x + i * unit + unit * 0.22}" y="${y - 1.5}" width="${unit * 0.56}" height="1.6" fill="${shade(color, -0.1)}"/>`;
  return s;
}
function bricksArt(p) {
  const t = themeById[p.theme], r = rng(p.id);
  const cols = t.colors.filter((c) => c.toLowerCase() !== "#f2f2f2").concat(t.colors.includes("#f2f2f2") ? ["#ffffff"] : []);
  let s = "", y = 96, width = 6;
  const rows = 3 + Math.floor(r() * 2);
  for (let row = 0; row < rows; row++) {
    let x = 80 - (width * 20) / 2, left = width;
    while (left > 0) { const u = Math.min(left, [1, 2, 2, 3, 4][Math.floor(r() * 5)]); s += brick(x, y, u, cols[Math.floor(r() * cols.length)]); x += u * 20; left -= u; }
    y -= 16; width = Math.max(1, width - 1 - Math.floor(r() * 2));
  }
  return `<svg viewBox="0 0 160 120" aria-hidden="true"><ellipse cx="80" cy="113" rx="62" ry="4" fill="rgba(0,0,0,.08)"/>${s}</svg>`;
}
// Sammelkarten-Produkte: neutrale Verpackungen (keine geschützten Motive)
function tcgArt(p) {
  const [a, b] = { booster: ["#2b6fd9", "#ffcb05"], display: ["#d92b2b", "#ffcb05"], etb: ["#3a2f8f", "#ffcb05"], collection: ["#1fae7a", "#ffcb05"], accessories: ["#1f2a44", "#9ad0ff"] }[p.type];
  const star = (cx, cy, r) => { let d = ""; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + (i * Math.PI) / 5; d += `${i ? "L" : "M"}${(cx + rr * Math.cos(an)).toFixed(1)},${(cy + rr * Math.sin(an)).toFixed(1)}`; } return `<path d="${d}Z" fill="${b}"/>`; };
  const pack = (x, y, w, h) => {
    const z = w / 8;
    let top = `M${x},${y + 6}`; for (let i = 0; i < 8; i++) top += ` l${z / 2},${i % 2 ? 6 : -6} l${z / 2},${i % 2 ? -6 : 6}`;
    return `<path d="${top} V${y + h - 6} H${x} Z" fill="${a}"/><rect x="${x}" y="${y + h * 0.18}" width="${w}" height="${h * 0.1}" fill="${shade(a, 0.14)}"/>${star(x + w / 2, y + h * 0.58, w * 0.24)}`;
  };
  let s;
  if (p.type === "booster") s = p.name.includes("Bundle") ? pack(34, 24, 44, 76) + pack(58, 18, 44, 82) + pack(82, 24, 44, 76) : pack(56, 12, 48, 94);
  else if (p.type === "accessories") {
    const n = p.name.toLowerCase();
    s = n.includes("ordner") ? `<rect x="44" y="18" width="76" height="90" rx="6" fill="${a}"/><rect x="40" y="18" width="12" height="90" rx="4" fill="${shade(a, -0.12)}"/>${star(84, 62, 16)}`
      : n.includes("deckbox") ? `<rect x="52" y="30" width="60" height="76" rx="6" fill="${a}"/><rect x="52" y="30" width="60" height="18" rx="6" fill="${shade(a, 0.15)}"/>${star(82, 74, 13)}`
      : [0, 1, 2].map((i) => `<rect x="${46 + i * 12}" y="${22 + i * 7}" width="52" height="72" rx="4" fill="${i === 2 ? b : shade(b, -0.12 * (2 - i))}" stroke="#fff" stroke-width="1.5"/>`).join("");
  } else {
    const h = p.type === "display" ? 62 : 76, w = p.type === "display" ? 112 : 88, x = 74 - w / 2, y = 106 - h;
    s = `<path d="M${x},${y} l14,-12 h${w} l-14,12 Z" fill="${shade(a, 0.15)}"/><path d="M${x + w},${y} l14,-12 v${h} l-14,12 Z" fill="${shade(a, -0.15)}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${a}"/>`;
    s += star(x + w / 2, y + h / 2 - 3, h * 0.28) + `<rect x="${x + 8}" y="${y + h - 13}" width="${w - 16}" height="6" rx="3" fill="${shade(a, 0.2)}"/>`;
  }
  return `<svg viewBox="0 0 160 120" aria-hidden="true"><ellipse cx="80" cy="112" rx="58" ry="4" fill="rgba(0,0,0,.08)"/>${s}</svg>`;
}
function productArt(p) { return p.cat === "tcg" ? tcgArt(p) : bricksArt(p); }
function tintOf(p) { return p.cat === "tcg" ? "#ffcb05" : themeById[p.theme].colors[0]; }
function showroomArt(sr, w = 360, h = 150) {
  const r = rng(sr.id), cols = sr.colors, unit = 14, bh = 11;
  let s = "";
  for (let x = 0; x < w; ) {
    const units = 1 + Math.floor(r() * 3), height = 2 + Math.floor(r() * 7 + Math.sin(x / 40) * 2), color = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < height; k++) s += brick(x, h - 6 - (k + 1) * bh, units, k % 3 === 2 ? shade(color, 0.08) : color, unit, bh);
    x += units * unit + 2;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s}</svg>`;
}

// ---------- Verfügbarkeit ----------
function avail(p) {
  const n = STOCK[p.id] ?? 0, lim = p.limit || 99;
  if (p.status === "bald") return n > 0
    ? { key: "pre", text: `Vorbestellbar · erscheint am ${fmtDate(parseDay(p.released), { day: "numeric", month: "short" })}`, can: true, max: Math.min(n, lim) }
    : { key: "out", text: "Vorbestell-Kontingent vergriffen", can: false, max: 0 };
  if (n <= 0) return { key: "out", text: "Ausverkauft", can: false, max: 0 };
  if (n <= 3) return { key: "low", text: `Nur noch ${n} auf Lager`, can: true, max: Math.min(n, lim) };
  return { key: "in", text: `Auf Lager · Versand in ${SHOP.shipping.days}`, can: true, max: Math.min(n, lim) };
}
function badgeText(p) {
  if (avail(p).key === "out") return "Ausverkauft";
  return { neu: "Neu", bestseller: "Beliebt", wenige: "Nur noch wenige", bald: "Vorbestellen" }[p.status] || "";
}
function badgeClass(p) { return avail(p).key === "out" ? "out" : p.status; }

// ---------- Warenkorb ----------
const cart = { items: load("bricks-cart", {}) }; // { id: qty }
function cartCount() { return Object.values(cart.items).reduce((a, b) => a + b, 0); }
function cartLines() { return Object.entries(cart.items).filter(([id]) => productById[id]).map(([id, qty]) => ({ p: productById[id], qty })); }
function cartTotals(mode = "ship") {
  const sub = cartLines().reduce((s, l) => s + l.p.price * l.qty, 0);
  const ship = SHOP.shipping;
  const shipping = mode === "pickup" || sub === 0 || sub >= ship.freeFrom ? 0 : ship.cost;
  return { sub, shipping, total: sub + shipping, freeLeft: Math.max(0, ship.freeFrom - sub) };
}
function addToCart(id, qty = 1) {
  const p = productById[id], a = avail(p), have = cart.items[id] || 0;
  if (!a.can) return toast("Leider nicht verfügbar.");
  if (have + qty > a.max) {
    toast(p.limit && a.max === p.limit ? `Maximal ${p.limit} pro Kunde – fair für alle Sammler.` : `Nur ${a.max} verfügbar.`);
    qty = a.max - have;
    if (qty <= 0) return;
  } else toast(`„${p.name}“ im Warenkorb`);
  cart.items[id] = have + qty;
  saveCart();
  pop();
}
function setCartQty(id, d) {
  const p = productById[id], a = avail(p), next = (cart.items[id] || 0) + d;
  if (d > 0 && next > a.max) return toast(p.limit && a.max === p.limit ? `Maximal ${p.limit} pro Kunde.` : `Nur ${a.max} verfügbar.`);
  if (next <= 0) delete cart.items[id]; else cart.items[id] = next;
  saveCart();
}
function saveCart() { store("bricks-cart", cart.items); renderCart(); document.dispatchEvent(new CustomEvent("cart:change")); }

// ---------- Merkliste ----------
const wish = { items: load("bricks-wish2", []) }; // [id]
function toggleWish(id) {
  wish.items = wish.items.includes(id) ? wish.items.filter((x) => x !== id) : [...wish.items, id];
  store("bricks-wish2", wish.items);
  toast(wish.items.includes(id) ? "Auf der Merkliste ♥" : "Von der Merkliste entfernt");
  renderWish();
}
function heartBtn(p, cls = "") {
  const on = wish.items.includes(p.id);
  return `<button class="heart ${on ? "is-on" : ""} ${cls}" data-wish="${p.id}" aria-pressed="${on}" aria-label="${on ? "Von Merkliste entfernen" : "Auf die Merkliste"}"><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.7 4 7.2 4c2 0 3.6 1.1 4.8 2.7C13.2 5.1 14.8 4 16.8 4c3.5 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg></button>`;
}
function pop() { $$(".cart-count").forEach((b) => { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }); navigator.vibrate?.(12); }

// ---------- Produktkarte (für alle Seiten) ----------
function productCard(p) {
  const brand = brandById[p.brand], a = avail(p);
  const sub = p.cat === "tcg" ? tcgTypeById[p.type].label + (p.limit ? ` · max. ${p.limit} pro Kunde` : "") : `${String(p.age).replace(".5", "½")}+ · ${p.pieces.toLocaleString("de-DE")} Teile`;
  return `
    <article class="card" data-product="${p.id}" tabindex="0" aria-label="${esc(p.name)} – Details">
      <div class="card__art" style="--tint:${tintOf(p)}">${productArt(p)}<span class="badge badge--${badgeClass(p)}">${badgeText(p)}</span>${heartBtn(p)}</div>
      <div class="card__body">
        <span class="brand-tag" style="--c:${brand.color}">${esc(brand.name)}</span>
        <h3>${esc(p.name)}</h3>
        <p class="card__meta">${sub}</p>
        <p class="avail avail--${a.key}"><i></i>${a.key === "in" ? "Auf Lager" : a.key === "pre" ? "Vorbestellbar" : a.text}</p>
        <div class="card__foot"><b>${euro(p.price)}</b>${a.can ? `<button class="add" data-add="${p.id}" aria-label="${esc(p.name)} in den Warenkorb"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1.4 11a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/><path d="M9 8a3 3 0 0 1 6 0M12 11.5v5M9.5 14h5"/></svg></button>` : ""}</div>
      </div>
    </article>`;
}

// ---------- Panels ----------
function openPanel(id) {
  closePanels(false);
  $(id).classList.add("is-open");
  $(id).setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
  document.documentElement.classList.add("no-scroll");
}
function closePanels(unlock = true) {
  $$(".panel.is-open").forEach((p) => { p.classList.remove("is-open"); p.style.transform = ""; p.setAttribute("aria-hidden", "true"); });
  $("#overlay").hidden = true;
  if (unlock) document.documentElement.classList.remove("no-scroll");
}
function openSheet(html) { $("#sheetBody").innerHTML = html; openPanel("#sheet"); $("#sheetBody").scrollTop = 0; }
function swipeClose(panel) {
  let y0 = null, dy = 0;
  panel.addEventListener("touchstart", (e) => { if (!matchMedia("(max-width: 760px)").matches || !e.target.closest(".panel__grab")) return; y0 = e.touches[0].clientY; dy = 0; panel.style.transition = "none"; }, { passive: true });
  panel.addEventListener("touchmove", (e) => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
  panel.addEventListener("touchend", () => { if (y0 === null) return; panel.style.transition = ""; y0 = null; dy > 110 ? closePanels() : (panel.style.transform = ""); });
}

function openProduct(id) {
  const p = productById[id], brand = brandById[p.brand], a = avail(p);
  const facts = p.cat === "tcg"
    ? `<div><dt>Art</dt><dd>${esc(tcgTypeById[p.type].label)}</dd></div><div><dt>Preis</dt><dd>${euro(p.price)}</dd></div><div><dt>Limit</dt><dd>${p.limit ? `${p.limit} / Kunde` : "–"}</dd></div>`
    : `<div><dt>Alter</dt><dd>${String(p.age).replace(".5", "½")}+</dd></div><div><dt>Teile</dt><dd>${p.pieces.toLocaleString("de-DE")}</dd></div><div><dt>Preis</dt><dd>${euro(p.price)}</dd></div>`;
  openSheet(`
    <div class="sheet-art" style="--tint:${tintOf(p)}">${productArt(p)}<span class="badge badge--${badgeClass(p)}">${badgeText(p)}</span></div>
    <div class="sheet-info">
      <span class="brand-tag" style="--c:${brand.color}">${esc(brand.name)}${p.theme ? ` · ${esc(themeById[p.theme].label)}` : ""}</span>
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.desc)}</p>
      <dl class="facts">${facts}</dl>
      <p class="avail avail--${a.key} avail--big"><i></i>${a.text}</p>
      <div class="sheet-actions">
        ${heartBtn(p, "heart--big")}
        <button class="btn btn--primary btn--grow" data-add="${p.id}" data-close-after ${a.can ? "" : "disabled"}>${a.key === "pre" ? "Jetzt vorbestellen" : a.can ? "In den Warenkorb" : "Ausverkauft"}${a.can ? ` · ${euro(p.price)}` : ""}</button>
      </div>
      <p class="fine">Preis inkl. MwSt., zzgl. Versand (kostenlos ab ${euro(SHOP.shipping.freeFrom)}) · Abholung im Laden kostenlos.${p.cat === "bricks" && p.age >= 3 ? " Achtung: Nicht für Kinder unter 3 Jahren geeignet – enthält verschluckbare Kleinteile." : ""}</p>
    </div>`);
}

function renderCart() {
  const n = cartCount();
  $$(".cart-count").forEach((b) => { b.textContent = n; b.hidden = !n; });
  const lines = cartLines(), t = cartTotals();
  $("#cartEmpty").hidden = lines.length > 0;
  $("#cartFoot").hidden = lines.length === 0;
  $("#cartList").innerHTML = lines.map(({ p, qty }) => `
    <li class="w-item"><span class="w-item__art" style="--tint:${tintOf(p)}">${productArt(p)}</span>
      <div class="w-item__text"><b>${esc(p.name)}</b><small>${euro(p.price)}${p.status === "bald" ? " · Vorbestellung" : ""}${p.limit ? ` · max. ${p.limit}` : ""}</small></div>
      <div class="qty"><button data-cq="${p.id}" data-d="-1" aria-label="weniger">−</button><span>${qty}</span><button data-cq="${p.id}" data-d="1" aria-label="mehr">+</button></div></li>`).join("");
  $("#cartSub").textContent = euro(t.sub);
  const bar = Math.min(100, (t.sub / SHOP.shipping.freeFrom) * 100);
  $("#shipHint").innerHTML = t.freeLeft > 0
    ? `Noch <b>${euro(t.freeLeft)}</b> bis zum kostenlosen Versand<span class="ship-bar"><span style="width:${bar}%"></span></span>`
    : `<b>Kostenloser Versand</b> ✓<span class="ship-bar"><span style="width:100%"></span></span>`;
}
function renderWish() {
  $$(".wish-count").forEach((b) => { b.textContent = wish.items.length; b.hidden = !wish.items.length; });
  $$("[data-wish]").forEach((b) => { const on = wish.items.includes(b.dataset.wish); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
  const list = wish.items.map((id) => productById[id]).filter(Boolean);
  $("#wishEmpty").hidden = list.length > 0;
  $("#wishList").innerHTML = list.map((p) => `
    <li class="w-item"><span class="w-item__art" style="--tint:${tintOf(p)}">${productArt(p)}</span>
      <div class="w-item__text"><b>${esc(p.name)}</b><small>${euro(p.price)} · ${avail(p).text}</small></div>
      ${avail(p).can ? `<button class="btn btn--small" data-add="${p.id}">In den Korb</button>` : ""}</li>`).join("");
}

// ---------- Toast & Status ----------
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("is-visible"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-visible"), 2400); }
function openState() {
  const d = new Date(), h = HOURS[d.getDay()], m = d.getHours() * 60 + d.getMinutes(), toM = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
  if (h && m >= toM(h[0]) && m < toM(h[1])) return { open: true, text: `Laden geöffnet bis ${h[1]} Uhr · Online-Shop rund um die Uhr` };
  for (let i = 0; i < 8; i++) {
    const x = new Date(); x.setDate(x.getDate() + i); const hh = HOURS[x.getDay()];
    if (hh && (i > 0 || m < toM(hh[0]))) return { open: false, text: `Online-Shop rund um die Uhr · Laden öffnet ${i === 0 ? "heute" : i === 1 ? "morgen" : DAYS[x.getDay()]} um ${hh[0]} Uhr` };
  }
  return { open: false, text: "Online-Shop rund um die Uhr geöffnet" };
}

// ---------- Gemeinsames Markup ----------
const ICONS = {
  shop: '<path d="M4 8h16l-1.3 11.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  tcg: '<rect x="5" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V7"/><path d="M10.5 7.5l1 2.1 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>',
  showroom: '<rect x="3" y="10" width="7" height="10" rx="1"/><rect x="14" y="5" width="7" height="15" rx="1"/><path d="M5 10V8M8 10V8M16 5V3M19 5V3"/>',
  events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.7 4 7.2 4c2 0 3.6 1.1 4.8 2.7C13.2 5.1 14.8 4 16.8 4c3.5 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/>',
};
function mountShared(active) {
  const nav = [["index.html#shop", "Shop", "shop"], ["tcg.html", "Pokémon TCG", "tcg"], ["showroom.html", "Showroom", "showroom"], ["events.html", "Events", "events"]];
  $("#header").innerHTML = `
    <div class="topline">🚚 Versand in ${SHOP.shipping.days} · kostenlos ab ${euro(SHOP.shipping.freeFrom)} · oder gratis im Laden abholen</div>
    <div class="container header__inner">
      <a class="logo" href="index.html" aria-label="${SHOP.name} – Startseite"><svg class="logo__mark" viewBox="0 0 44 36" aria-hidden="true">${brick(2, 12, 2, "#d92b2b", 20, 20)}</svg><span class="logo__text">${SHOP.name}</span></a>
      <nav class="nav" aria-label="Hauptnavigation">${nav.map(([h, l, k]) => `<a href="${h}" ${k === active ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div class="header__actions">
        <button class="icon-btn icon-btn--head" data-open-wish aria-label="Merkliste"><svg viewBox="0 0 24 24">${ICONS.heart}</svg><b class="wish-count" hidden>0</b></button>
        <button class="cart-btn" data-open-cart aria-label="Warenkorb öffnen"><svg viewBox="0 0 24 24">${ICONS.cart}</svg><span>Warenkorb</span><b class="cart-count" hidden>0</b></button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", `
    <nav class="tabbar" aria-label="Schnellnavigation">
      ${nav.map(([h, l, k]) => `<a href="${h}" class="${k === active ? "is-active" : ""}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg><span>${l === "Pokémon TCG" ? "TCG" : l}</span></a>`).join("")}
      <button data-open-cart><svg viewBox="0 0 24 24">${ICONS.cart}</svg><span>Korb</span><b class="cart-count" hidden>0</b></button>
    </nav>
    <div class="overlay" id="overlay" hidden></div>
    <aside class="panel sheet" id="sheet" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="panel__grab"><span></span></div>
      <button class="icon-btn panel__close" data-close aria-label="Schließen">✕</button>
      <div class="panel__body" id="sheetBody"></div>
    </aside>
    <aside class="panel side" id="cart" role="dialog" aria-modal="true" aria-labelledby="cartTitle" aria-hidden="true">
      <div class="panel__grab"><span></span></div>
      <div class="panel__head"><h2 id="cartTitle">Warenkorb</h2><button class="icon-btn" data-close aria-label="Schließen">✕</button></div>
      <div class="panel__body">
        <ul class="w-list" id="cartList"></ul>
        <div class="empty" id="cartEmpty"><svg viewBox="0 0 64 52">${brick(6, 22, 3, "#e8e4de", 17, 22)}</svg><p>Dein Warenkorb ist leer.</p><a class="btn btn--ghost" href="index.html#shop" data-close>Zum Shop</a></div>
      </div>
      <div class="panel__foot" id="cartFoot">
        <p class="ship-hint" id="shipHint"></p>
        <div class="sum"><span>Zwischensumme <small>inkl. MwSt.</small></span><b id="cartSub">0,00 €</b></div>
        <a class="btn btn--primary btn--block" href="checkout.html">Zur Kasse</a>
        <p class="pay-logos">Karte · PayPal · Apple Pay · Google Pay · Klarna · Abholung im Laden</p>
      </div>
    </aside>
    <aside class="panel side" id="wish" role="dialog" aria-modal="true" aria-labelledby="wishTitle" aria-hidden="true">
      <div class="panel__grab"><span></span></div>
      <div class="panel__head"><h2 id="wishTitle">Merkliste</h2><button class="icon-btn" data-close aria-label="Schließen">✕</button></div>
      <div class="panel__body">
        <ul class="w-list" id="wishList"></ul>
        <div class="empty" id="wishEmpty"><p>Noch nichts gemerkt.<br>Tippe bei einem Produkt auf das ♥.</p></div>
      </div>
    </aside>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`);

  $("#footer").innerHTML = `
    <div class="container footer__grid">
      <div><b class="footer__brand">${SHOP.name}</b><p>${SHOP.claim}<br>${SHOP.street} · ${SHOP.city}<br><a href="tel:${SHOP.phone.replace(/\s/g, "")}">${SHOP.phone}</a> · <a href="mailto:${SHOP.email}">${SHOP.email}</a></p></div>
      <div><b>Shop</b><a href="index.html#shop">Klemmbausteine</a><a href="tcg.html">Pokémon TCG</a><a href="index.html#marken">Marken</a></div>
      <div><b>Service</b><a href="#">Versand & Lieferung</a><a href="#">Widerrufsrecht</a><a href="#">AGB</a></div>
      <div><b>Rechtliches</b><a href="#">Impressum</a><a href="#">Datenschutz</a></div>
    </div>
    <p class="container legal">Alle Preise inkl. MwSt., zzgl. Versandkosten. LEGO® ist eine Marke der LEGO Gruppe; Pokémon ist eine Marke von Nintendo, Creatures Inc. und GAME FREAK Inc. Alle genannten Marken gehören ihren jeweiligen Inhabern, die diese Website weder sponsern noch unterstützen. ${SHOP.name} ist ein unabhängiger Fachhändler.</p>`;

  document.addEventListener("click", (e) => {
    const w = e.target.closest("[data-wish]");
    if (w) { e.stopPropagation(); return toggleWish(w.dataset.wish); }
    const add = e.target.closest("[data-add]");
    if (add) { e.stopPropagation(); addToCart(add.dataset.add); if (add.hasAttribute("data-close-after")) setTimeout(closePanels, 200); return; }
    if (e.target.closest("[data-open-cart]")) return openPanel("#cart");
    if (e.target.closest("[data-open-wish]")) return openPanel("#wish");
    if (e.target.closest("[data-close]")) return closePanels();
    const q = e.target.closest("[data-cq]");
    if (q) return setCartQty(q.dataset.cq, +q.dataset.d);
    const card = e.target.closest("[data-product]");
    if (card && !e.target.closest("button, a")) return openProduct(card.dataset.product);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanels();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-product]")) { e.preventDefault(); openProduct(e.target.dataset.product); }
  });
  $("#overlay").addEventListener("click", () => closePanels());
  $$(".panel").forEach(swipeClose);
  addEventListener("scroll", () => $("#header").classList.toggle("is-scrolled", scrollY > 8), { passive: true });
  renderCart();
  renderWish();
  refreshStock();
}

// Live-Bestand holen (nur mit Server) und Anzeigen aktualisieren
async function refreshStock() {
  try {
    const res = await fetch("/api/stock", { cache: "no-store" });
    if (!res.ok) return;
    Object.assign(STOCK, await res.json());
    renderCart();
    renderWish();
    document.dispatchEvent(new CustomEvent("stock:change"));
  } catch { /* ohne Server: Katalogbestand */ }
}
