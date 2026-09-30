// Startseite: Einstieg, Vorteile, Shop mit Filtern, Marken, TCG-/Showroom-Teaser, Events, Besuch
mountShared("shop");

const F = { filter: "all", q: "", age: "", sort: "new" };

function renderHero() {
  const st = openState();
  $("#openStatus").classList.toggle("is-open", st.open);
  $("#openStatus span").textContent = st.text;
  const { cur, next } = currentShowroom();
  $("#heroStats").innerHTML = `
    <li><b>${PRODUCTS.filter((p) => p.status === "neu").length}</b><span>Neuheiten online</span></li>
    <li><b>${BRANDS.length}</b><span>Marken im Sortiment</span></li>
    <li><b>${EVENTS.filter((e) => parseDay(e.date) >= today()).length}</b><span>Events geplant</span></li>`;
  const c = ["#d92b2b", "#ffc93c", "#2b6fd9", "#1fae7a", "#ff8a1f", "#151515"];
  const rows = [[[40, 4, 0], [120, 4, 2], [200, 4, 1], [280, 4, 3]], [[80, 4, 1], [160, 2, 4], [200, 4, 0], [280, 2, 2]], [[100, 2, 3], [140, 4, 2], [220, 3, 5]], [[120, 4, 0], [200, 2, 1]], [[150, 2, 3], [190, 2, 4]], [[170, 2, 2]]];
  let s = `<ellipse cx="200" cy="336" rx="170" ry="10" fill="rgba(0,0,0,.07)"/>`;
  rows.forEach((row, i) => row.forEach(([x, u, ci]) => (s += brick(x, 300 - i * 34, u, c[ci], 20, 34))));
  s += brick(310, 80, 1, "#ffc93c", 20, 20) + brick(46, 120, 2, "#1fae7a", 20, 20) + brick(330, 200, 1, "#2b6fd9", 20, 20);
  $("#heroArt").innerHTML = s;
  $("#heroNow").innerHTML = cur
    ? `<small>Jetzt im Showroom</small><b>${esc(cur.title)}</b><span>noch ${daysBetween(today(), cur.endDate)} Tage</span>`
    : next ? `<small>Bald im Showroom</small><b>${esc(next.title)}</b><span>ab ${fmtDate(next.startDate)}</span>` : "";
}

function renderUsps() {
  const s = SHOP.shipping;
  $("#usps").innerHTML = [
    ["🚚", `Versand in ${s.days}`, `mit ${s.carrier} innerhalb ${s.country === "Deutschland" ? "Deutschlands" : s.country}`],
    ["🎁", `Kostenlos ab ${euro(s.freeFrom)}`, `sonst ${euro(s.cost)} Versand`],
    ["🏬", "Gratis im Laden abholen", "meist schon am selben Tag"],
    ["🔒", "Sicher bezahlen", "Karte, PayPal, Apple Pay, Klarna"],
  ].map(([i, t, d]) => `<div class="usp"><span>${i}</span><div><b>${t}</b><small>${d}</small></div></div>`).join("");
}

// ---------- Shop ----------
function chipsList() {
  return [
    { id: "all", label: "Alle" }, { id: "bricks", label: "Klemmbausteine" },
    ...BRANDS.filter((b) => b.id !== "pokemon").map((b) => ({ id: "brand:" + b.id, label: b.name, color: b.color })),
    { id: "tcg", label: "Pokémon TCG", color: "#ffcb05" }, { id: "pre", label: "Vorbestellen" },
  ];
}
function renderChips() {
  $("#brandChips").innerHTML = chipsList().map((c) => `<button class="chip ${F.filter === c.id ? "is-active" : ""}" data-f="${c.id}" role="tab" aria-selected="${F.filter === c.id}">${c.color ? `<i style="background:${c.color}"></i>` : ""}${esc(c.label)}</button>`).join("");
}
function ageMatch(p) {
  if (!F.age) return true;
  if (p.cat === "tcg") return false; // Altersfilter gilt nur für Klemmbausteine
  const a = +F.age;
  return a === 2 ? p.age <= 3 : a === 6 ? p.age >= 4 && p.age <= 8 : a === 9 ? p.age >= 9 && p.age < 14 : p.age >= 14;
}
function renderGrid() {
  const q = F.q.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    const f = F.filter;
    const okF = f === "all" || (f === "bricks" && p.cat === "bricks") || (f === "tcg" && p.cat === "tcg") || (f === "pre" && p.status === "bald") || (f.startsWith("brand:") && p.brand === f.slice(6));
    const hay = `${p.name} ${p.desc} ${brandById[p.brand].name} ${p.theme ? themeById[p.theme].label : ""}`.toLowerCase();
    return okF && ageMatch(p) && (!q || hay.includes(q));
  });
  const rank = { in: 0, low: 1, pre: 2, out: 3 };
  const sorters = {
    new: (a, b) => (a.status === "bald") - (b.status === "bald") || b.released.localeCompare(a.released),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    stock: (a, b) => rank[avail(a).key] - rank[avail(b).key],
  };
  list.sort(sorters[F.sort]);
  $("#result").textContent = `${list.length} ${list.length === 1 ? "Produkt" : "Produkte"}`;
  $("#grid").innerHTML = list.length ? list.map(productCard).join("") : `<p class="empty">Keine Produkte gefunden – probier einen anderen Filter.</p>`;
}

function renderBrands() {
  $("#brands").innerHTML = BRANDS.map((b) => {
    const n = PRODUCTS.filter((p) => p.brand === b.id).length;
    const href = b.id === "pokemon" ? "tcg.html" : "#shop";
    return `<a class="brand" href="${href}" data-brand="${b.id}" style="--c:${b.color}">
      <span class="brand__mark">${b.name.replace("®", "").slice(0, 2)}</span>
      <b>${esc(b.name)}</b><p>${esc(b.desc)}</p><small>${n} ${n === 1 ? "Produkt" : "Produkte"} →</small></a>`;
  }).join("");
}

function renderTcgTeaser() {
  const rel = C.tcgReleases.map((r) => ({ ...r, d: parseDay(r.date) })).filter((r) => r.d >= today()).sort((a, b) => a.d - b.d)[0];
  $("#tcgTeaser").innerHTML = `
    <div class="tcg-teaser__text">
      <span class="eyebrow">Neu bei Bricks</span>
      <h2>Pokémon TCG</h2>
      <p>Booster, Displays, Top-Trainer-Boxen & Zubehör – mit fairem Kauflimit pro Kunde, Vorbestellungen und Spieltreffs im Laden.</p>
      <span class="btn btn--light">Zur TCG-Sparte</span>
    </div>
    ${rel ? `<div class="tcg-teaser__count"><small>Nächster Release</small><b>${daysBetween(today(), rel.d)}</b><span>Tage · ${fmtDate(rel.d)}</span><em>Jetzt vorbestellen</em></div>` : ""}`;
}

function renderShowroomTeaser() {
  const { cur, next } = currentShowroom();
  const sr = cur || next;
  if (!sr) return;
  const total = daysBetween(sr.startDate, sr.endDate), done = cur ? daysBetween(sr.startDate, today()) : 0;
  $("#srTeaser").style.setProperty("--c1", sr.colors[0]);
  $("#srTeaser").innerHTML = `
    <div class="sr-teaser__art">${showroomArt(sr, 520, 200)}</div>
    <div class="sr-teaser__text">
      <span class="eyebrow">${cur ? "Aktueller Showroom" : "Nächster Showroom"}</span>
      <h2>${esc(sr.title)}</h2><p>${esc(sr.teaser)}</p>
      <div class="progress"><span style="width:${cur ? (done / total) * 100 : 0}%"></span></div>
      <p class="sr-teaser__meta">${fmtDate(sr.startDate)} – ${fmtDate(new Date(sr.endDate - 864e5))} · <b>${cur ? `noch ${daysBetween(today(), sr.endDate)} Tage` : `öffnet ${relDays(daysBetween(today(), sr.startDate))}`}</b>${cur && next ? ` · danach: ${esc(next.title)}` : ""}</p>
      <span class="btn btn--primary">Showroom ansehen</span>
    </div>`;
}

function renderEventsMini() {
  const list = EVENTS.filter((e) => parseDay(e.date) >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  $("#evMini").innerHTML = list.map((e) => {
    const d = parseDay(e.date), left = e.spots - e.taken;
    return `<a class="ev-mini__item" href="events.html#${e.id}">
      <span class="date ${e.audience === "tcg" ? "date--tcg" : ""}"><b>${d.getDate()}</b>${MONTHS[d.getMonth()].slice(0, 3)}</span>
      <span class="ev-mini__text"><b>${esc(e.title)}</b><small>${DAYS[d.getDay()]}, ${e.time} Uhr · ${esc(e.age)}</small></span>
      <span class="spots ${left === 0 ? "is-full" : left <= 3 ? "is-low" : ""}">${left === 0 ? "ausgebucht" : `${left} frei`}</span></a>`;
  }).join("");
}

function renderVisit() {
  $("#address").innerHTML = `<b>${SHOP.name}</b><br>${SHOP.street}<br>${SHOP.city}`;
  $("#maps").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SHOP.name}, ${SHOP.street}, ${SHOP.city}`)}`;
  $("#call").href = "tel:" + SHOP.phone.replace(/\s/g, "");
  const t = new Date().getDay();
  $("#hours").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `<li class="${d === t ? "is-today" : ""}"><span>${DAYS[d]}</span><span>${HOURS[d] ? HOURS[d].join(" – ") : "geschlossen"}</span></li>`).join("");
}

function setFilter(f) {
  F.filter = f;
  renderChips();
  renderGrid();
  $(`#brandChips [data-f="${CSS.escape(f)}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}
$("#brandChips").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) setFilter(b.dataset.f); });
$("#brands").addEventListener("click", (e) => { const b = e.target.closest("[data-brand]"); if (b && b.dataset.brand !== "pokemon") setFilter("brand:" + b.dataset.brand); });
$("#q").addEventListener("input", (e) => { F.q = e.target.value; renderGrid(); });
$("#q").addEventListener("keydown", (e) => e.key === "Enter" && e.target.blur());
$("#age").addEventListener("change", (e) => { F.age = e.target.value; renderGrid(); });
$("#sort").addEventListener("change", (e) => { F.sort = e.target.value; renderGrid(); });
document.addEventListener("stock:change", renderGrid);

renderHero();
renderUsps();
renderChips();
renderGrid();
renderBrands();
renderTcgTeaser();
renderShowroomTeaser();
renderEventsMini();
renderVisit();
