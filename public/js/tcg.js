// Pokémon-TCG-Sparte: Versprechen, Release-Kalender, Sortiment, Einstieg & Events
mountShared("tcg");

const T = { type: "all" };
const TCG = PRODUCTS.filter((p) => p.cat === "tcg");

function renderHeroArt() {
  const pick = ["t03", "t04", "t01"].map((id) => productById[id]);
  $("#tcgHeroArt").innerHTML = pick.map((p, i) => `<div class="tcg-hero__item tcg-hero__item--${i}">${productArt(p)}</div>`).join("");
}

function renderPromises() {
  $("#promises").innerHTML = [
    ["⚖️", "Faires Kauflimit", "Begehrte Displays & Boxen gibt es nur in haushaltsüblichen Mengen – damit alle eine Chance haben."],
    ["📅", "Vorbestellung mit Garantie", "Wer vorbestellt, bekommt sicher – Abholung am Release-Tag oder Versand zum Release."],
    ["🔒", "Versiegelte Originalware", "Nur original versiegelte Produkte aus offiziellen Vertriebswegen."],
    ["📦", "Sicher verpackt", "Karten & Displays verschicken wir gepolstert und knickfrei."],
  ].map(([i, t, d]) => `<div class="promise"><span>${i}</span><b>${t}</b><p>${d}</p></div>`).join("");
}

function renderReleases() {
  const list = C.tcgReleases.map((r) => ({ ...r, d: parseDay(r.date) })).filter((r) => r.d >= today()).sort((a, b) => a.d - b.d);
  $("#releaseList").innerHTML = list.length ? list.map((r, i) => {
    const days = daysBetween(today(), r.d);
    const prods = r.products.map((id) => productById[id]).filter(Boolean);
    return `<article class="release ${i === 0 ? "release--next" : ""}">
      <div class="release__count"><b>${days}</b><span>${days === 1 ? "Tag" : "Tage"}</span></div>
      <div class="release__body">
        <span class="release__date">${fmtDate(r.d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.note)}</p>
        ${prods.length ? `<ul class="release__prods">${prods.map((p) => { const a = avail(p); return `<li><span>${esc(p.name.replace("Vorbestellung: ", ""))}</span><b>${euro(p.price)}</b>${a.can ? `<button class="btn btn--small btn--primary" data-add="${p.id}">Vorbestellen</button>` : `<em>${a.text}</em>`}</li>`; }).join("")}</ul>` : `<p class="fine">Vorbestellung öffnet bald – schau wieder vorbei.</p>`}
      </div>
    </article>`;
  }).join("") : `<p class="empty">Neue Termine folgen in Kürze.</p>`;
}

function renderTypeChips() {
  const chips = [{ id: "all", label: "Alle" }, ...TCG_TYPES];
  $("#typeChips").innerHTML = chips.map((c) => `<button class="chip ${T.type === c.id ? "is-active" : ""}" data-type="${c.id}" role="tab" aria-selected="${T.type === c.id}">${esc(c.label)}</button>`).join("");
}
function renderGrid() {
  const list = TCG.filter((p) => T.type === "all" || p.type === T.type)
    .sort((a, b) => (a.status === "bald") - (b.status === "bald") || b.released.localeCompare(a.released));
  $("#tcgGrid").innerHTML = list.map(productCard).join("");
}

function renderEvents() {
  const list = EVENTS.filter((e) => e.audience === "tcg" && parseDay(e.date) >= today()).sort((a, b) => a.date.localeCompare(b.date));
  $("#tcgEvents").innerHTML = `<h3>Spieltreffs & Turniere</h3>` + list.map((e) => {
    const d = parseDay(e.date), left = e.spots - e.taken;
    return `<a class="ev-mini__item" href="events.html#${e.id}">
      <span class="date date--tcg"><b>${d.getDate()}</b>${MONTHS[d.getMonth()].slice(0, 3)}</span>
      <span class="ev-mini__text"><b>${esc(e.title.replace("Pokémon TCG: ", ""))}</b><small>${DAYS[d.getDay()]}, ${e.time} Uhr · ${e.price ? euro(e.price) : "kostenlos"}</small></span>
      <span class="spots ${left === 0 ? "is-full" : left <= 3 ? "is-low" : ""}">${left === 0 ? "voll" : `${left} frei`}</span></a>`;
  }).join("");
}

$("#typeChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-type]");
  if (!b) return;
  T.type = b.dataset.type;
  renderTypeChips();
  renderGrid();
});
document.addEventListener("stock:change", () => { renderGrid(); renderReleases(); });

renderHeroArt();
renderPromises();
renderReleases();
renderTypeChips();
renderGrid();
renderEvents();
