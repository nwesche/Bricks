// Events-Seite: Filter, Monatsliste, Reservierung, Kalender-Download
mountShared("events");

const AUD = [
  { id: "all", label: "Alle" },
  { id: "kinder", label: "Für Kinder" },
  { id: "familie", label: "Für Familien" },
  { id: "erwachsene", label: "Für Erwachsene" },
  { id: "tcg", label: "Pokémon TCG" },
  { id: "free", label: "Kostenlos" },
];
const AUD_LABEL = { kinder: "Kinder", familie: "Familien", erwachsene: "Erwachsene", alle: "Für alle", tcg: "Pokémon TCG" };
// ?filter=tcg in der Adresse öffnet die Liste direkt gefiltert (Link von der TCG-Seite)
const state = { aud: new URLSearchParams(location.search).get("filter") || "all", requested: load("bricks-requested", []) };
const upcoming = EVENTS.filter((e) => parseDay(e.date) >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

function spotsInfo(e) {
  const left = Math.max(0, e.spots - e.taken);
  return { left, full: left === 0, low: left > 0 && left <= 3, pct: Math.min(100, (e.taken / e.spots) * 100) };
}

function renderNext() {
  const e = upcoming[0];
  if (!e) return;
  const d = parseDay(e.date);
  $("#nextEv").innerHTML = `
    <span class="next-ev__count"><b>${daysBetween(today(), d)}</b>${daysBetween(today(), d) === 1 ? "Tag" : "Tage"}</span>
    <span class="next-ev__text"><small>Nächstes Event</small><b>${esc(e.title)}</b><span>${DAYS[d.getDay()]}, ${fmtDate(d)} · ${e.time} Uhr</span></span>
    <a class="btn btn--primary" href="#${e.id}">Ansehen</a>`;
}

function renderChips() {
  $("#audChips").innerHTML = AUD.map((a) => `<button class="chip ${state.aud === a.id ? "is-active" : ""}" data-aud="${a.id}" role="tab" aria-selected="${state.aud === a.id}">${a.label}</button>`).join("");
}

function card(e) {
  const d = parseDay(e.date);
  const s = spotsInfo(e);
  const requested = state.requested.includes(e.id);
  return `
    <article class="ev ev--${e.audience}" id="${e.id}">
      <div class="ev__date"><span>${DAYS[d.getDay()].slice(0, 2)}</span><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()].slice(0, 3)}</span></div>
      <div class="ev__body">
        <div class="ev__tags"><span class="aud aud--${e.audience}">${AUD_LABEL[e.audience]}</span><span>${e.price ? euro(e.price) + (e.days ? ` für ${e.days} Tage` : " pro Person") : "kostenlos"}</span>${e.days ? `<span>${e.days} Termine</span>` : ""}</div>
        <h3>${esc(e.title)}</h3>
        <p class="ev__when">${e.time}–${e.end} Uhr${e.days ? ` · ${e.days} Tage ab ${fmtDate(d, { day: "numeric", month: "short" })}` : ""} · ${esc(e.age)} · ${relDays(daysBetween(today(), d))}</p>
        <p>${esc(e.desc)}</p>
        <div class="ev__spots ${s.full ? "is-full" : s.low ? "is-low" : ""}">
          <div class="bar"><span style="width:${s.pct}%"></span></div>
          <span>${s.full ? "Ausgebucht – Warteliste möglich" : s.low ? `Nur noch ${s.left} ${s.left === 1 ? "Platz" : "Plätze"} frei` : `${s.left} von ${e.spots} Plätzen frei`}</span>
        </div>
        <div class="ev__actions">
          ${requested ? `<span class="done-tag">✓ Angefragt</span>` : `<button class="btn ${s.full ? "btn--ghost" : "btn--primary"}" data-book="${e.id}">${s.full ? "Auf die Warteliste" : "Platz reservieren"}</button>`}
          <button class="btn btn--ghost btn--icon" data-ics="${e.id}" aria-label="In meinen Kalender" title="In meinen Kalender"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg></button>
        </div>
      </div>
    </article>`;
}

function renderList() {
  const list = upcoming.filter((e) => state.aud === "all" || (state.aud === "free" ? e.price === 0
    : e.audience === state.aud || (e.audience === "alle" && state.aud !== "tcg")));
  const groups = {};
  list.forEach((e) => { const d = parseDay(e.date); (groups[`${d.getFullYear()}-${pad(d.getMonth() + 1)}`] ||= []).push(e); });
  $("#evList").innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([k, evs]) => {
    const [y, m] = k.split("-").map(Number);
    return `<section class="month"><h2 class="month__title">${MONTHS[m - 1]} <small>${y}</small></h2><div class="month__list">${evs.map(card).join("")}</div></section>`;
  }).join("") : `<p class="empty">Für diese Auswahl sind gerade keine Termine geplant.</p>`;
}

// ---------- Reservierung ----------
function openBooking(id) {
  const e = byId[id];
  const d = parseDay(e.date);
  const s = spotsInfo(e);
  const max = s.full ? 4 : Math.min(6, s.left);
  const c = load("bricks-customer", {});
  openSheet(`
    <div class="sheet-head ev--${e.audience}">
      <span class="aud aud--${e.audience}">${AUD_LABEL[e.audience]}</span>
      <h2>${esc(e.title)}</h2>
      <p>${DAYS[d.getDay()]}, ${fmtDate(d)} · ${e.time}–${e.end} Uhr · ${esc(e.age)}</p>
    </div>
    <div class="sheet-info">
      <p>${esc(e.desc)}</p>
      <dl class="facts">
        <div><dt>Preis</dt><dd>${e.price ? euro(e.price) : "kostenlos"}</dd></div>
        <div><dt>Frei</dt><dd>${s.full ? "0" : s.left}</dd></div>
        <div><dt>Mitbringen</dt><dd>${esc(e.bring)}</dd></div>
      </dl>
      <form class="form" id="bookForm" novalidate>
        <h3>${s.full ? "Auf die Warteliste" : "Platz reservieren"}</h3>
        <label class="field"><span>Anzahl Personen</span>
          <div class="stepper" data-max="${max}"><button type="button" data-step="-1" aria-label="weniger">−</button><output name="count">1</output><button type="button" data-step="1" aria-label="mehr">+</button></div>
        </label>
        <div class="field-row">
          <label class="field"><span>Name *</span><input name="name" autocomplete="name" required value="${esc(c.name || "")}"></label>
          <label class="field"><span>Telefon *</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(c.phone || "")}"></label>
        </div>
        ${e.audience === "kinder" ? `<label class="field"><span>Name & Alter der Kinder</span><input name="kids" placeholder="z. B. Mia (8), Tom (6)"></label>` : ""}
        <p class="fine">${e.price ? `Bezahlt wird vor Ort. ` : ""}Wir bestätigen deinen Platz per Nachricht – meist am selben Tag.</p>
        <div class="send"><button type="button" class="btn btn--wa" data-book-send="wa">Per WhatsApp</button><button type="button" class="btn btn--primary" data-book-send="mail">Per E-Mail</button></div>
      </form>
    </div>`);
  $("#bookForm").dataset.event = id;
}

function sendBooking(channel) {
  const f = $("#bookForm");
  const e = byId[f.dataset.event];
  if (!f.name.value.trim() || !f.phone.value.trim()) { toast("Bitte Name und Telefon angeben."); (f.name.value.trim() ? f.phone : f.name).focus(); return; }
  store("bricks-customer", { name: f.name.value.trim(), phone: f.phone.value.trim() });
  const d = parseDay(e.date);
  const full = spotsInfo(e).full;
  const text = [
    `Hallo ${SHOP.name}! Ich möchte ${full ? "auf die Warteliste für" : "Plätze reservieren für"}:`, "",
    `${e.title} – ${DAYS[d.getDay()]}, ${fmtDate(d)}, ${e.time} Uhr`,
    `Personen: ${f.count.value}`, f.kids?.value.trim() ? `Kinder: ${f.kids.value.trim()}` : null, "",
    `Name: ${f.name.value.trim()}`, `Telefon: ${f.phone.value.trim()}`,
  ].filter((l) => l !== null).join("\n");
  if (channel === "wa") window.open(`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  else location.href = `mailto:${SHOP.email}?subject=${encodeURIComponent(`${full ? "Warteliste" : "Reservierung"}: ${e.title} am ${fmtDate(d)}`)}&body=${encodeURIComponent(text)}`;
  state.requested = [...new Set([...state.requested, e.id])];
  store("bricks-requested", state.requested);
  closePanels();
  renderList();
  toast("Anfrage vorbereitet – bitte noch absenden. Wir bestätigen dir den Platz! 🧱");
}

// Kalender-Datei (.ics) – funktioniert mit Apple, Google & Outlook
function downloadIcs(id) {
  const e = byId[id];
  const d = e.date.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bricks//Events//DE", "BEGIN:VEVENT",
    `UID:${e.id}-${d}@bricks`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Berlin:${d}T${e.time.replace(":", "")}00`, `DTEND;TZID=Europe/Berlin:${d}T${e.end.replace(":", "")}00`,
    `SUMMARY:${e.title} (${SHOP.name})`, `LOCATION:${SHOP.name}\\, ${SHOP.street}\\, ${SHOP.city}`,
    `DESCRIPTION:${e.desc.replace(/,/g, "\\,")}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${e.title.replace(/[^\wäöüÄÖÜß-]+/g, "-")}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Termin für deinen Kalender heruntergeladen 📅");
}

function renderBookables() {
  $("#bookables").innerHTML = BOOKABLE.map((b) => `
    <article class="bookable">
      <svg viewBox="0 0 64 48" aria-hidden="true">${brick(4, 20, 3, b.id === "birthday" ? "#ffc93c" : "#2b6fd9", 18, 24)}</svg>
      <h3>${esc(b.title)}</h3><p>${esc(b.info)}</p>
      <div class="bookable__foot"><b>${esc(b.price)}</b><a class="btn btn--ghost" href="mailto:${SHOP.email}?subject=${encodeURIComponent("Anfrage: " + b.title)}&body=${encodeURIComponent("Hallo Bricks-Team,\n\nwir interessieren uns für: " + b.title + "\n\nWunschtermin:\nAnzahl Personen:\n\nViele Grüße")}">Anfragen</a></div>
    </article>`).join("");
}

// ---------- Ereignisse ----------
$("#audChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-aud]");
  if (!b) return;
  state.aud = b.dataset.aud;
  renderChips();
  renderList();
  b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-book]");
  if (b) return openBooking(b.dataset.book);
  const i = e.target.closest("[data-ics]");
  if (i) return downloadIcs(i.dataset.ics);
  const st = e.target.closest("[data-step]");
  if (st) {
    const box = st.closest(".stepper"), out = $("output", box);
    out.value = Math.max(1, Math.min(+box.dataset.max, +out.value + +st.dataset.step));
    return;
  }
  const s = e.target.closest("[data-book-send]");
  if (s) sendBooking(s.dataset.bookSend);
});

renderNext();
renderChips();
renderList();
renderBookables();
if (location.hash) setTimeout(() => { const el = $(location.hash); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("is-target"); } }, 80);
