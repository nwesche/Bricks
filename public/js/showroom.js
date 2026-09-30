// Showroom-Seite: aktueller Showroom, nächster Showroom, Zeitleiste
mountShared("showroom");

const { cur, next, list } = currentShowroom();
const t0 = today();

function hero() {
  const sr = cur || next;
  if (!sr) { $("#srHero").innerHTML = `<div class="container"><h1>Showroom</h1><p class="lead">Der nächste Showroom wird gerade geplant.</p></div>`; return; }
  const total = daysBetween(sr.startDate, sr.endDate);
  const done = cur ? daysBetween(sr.startDate, t0) : 0;
  const left = cur ? daysBetween(t0, sr.endDate) : daysBetween(t0, sr.startDate);
  const week = Math.min(sr.weeks, Math.floor(done / 7) + 1);
  $("#srHero").style.setProperty("--c1", sr.colors[0]);
  $("#srHero").innerHTML = `
    <div class="sr-hero__art">${showroomArt(sr, 900, 260)}</div>
    <div class="container sr-hero__inner">
      <span class="pill">${cur ? `● Jetzt im Showroom · Woche ${week} von ${sr.weeks}` : "Demnächst im Showroom"}</span>
      <h1>${esc(sr.title)}</h1>
      <p class="lead">${esc(sr.desc)}</p>
      <div class="countdown">
        <div><b>${left}</b><span>${cur ? "Tage noch" : "Tage bis Start"}</span></div>
        <div><b>${(sr.bricks / 1000).toLocaleString("de-DE")}k</b><span>Steine verbaut</span></div>
        <div><b>${sr.hours}</b><span>Stunden Bauzeit</span></div>
      </div>
      <div class="progress progress--big" aria-label="Laufzeit"><span style="width:${cur ? (done / total) * 100 : 0}%"></span></div>
      <p class="sr-hero__dates">${fmtDate(sr.startDate, { day: "numeric", month: "long" })} – ${fmtDate(new Date(sr.endDate - 864e5), { day: "numeric", month: "long", year: "numeric" })} · Eintritt frei zu den Öffnungszeiten</p>
    </div>`;
}

function highlights() {
  const sr = cur || next;
  if (!sr) return;
  $("#srHighlights").innerHTML = `
    <h2>Das erwartet dich</h2>
    <ul class="checks">${sr.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    <p class="fine">Für Kinder gibt es an der Kasse einen Such-Pass – wer alles findet, bekommt eine kleine Überraschung.</p>`;
  const after = cur ? next : list.find((s) => s.startDate > sr.startDate);
  $("#srNext").innerHTML = after ? `
    <div class="sr-box__art">${showroomArt(after, 420, 120)}</div>
    <span class="eyebrow">Als Nächstes</span>
    <h2>${esc(after.title)}</h2>
    <p>${esc(after.teaser)}</p>
    <p class="sr-box__when">Ab ${fmtDate(after.startDate, { weekday: "long", day: "numeric", month: "long" })} · ${relDays(daysBetween(t0, after.startDate))}</p>
    <a class="btn btn--ghost" href="events.html">Zur Eröffnungsfeier →</a>` : `<h2>Als Nächstes</h2><p>Wird gerade geplant – lass dich überraschen!</p>`;
}

function timeline() {
  $("#timeline").innerHTML = list.map((s) => {
    const state = s.endDate <= t0 ? "past" : s.startDate <= t0 ? "now" : "soon";
    const label = { past: "Vorbei", now: "Läuft gerade", soon: relDays(daysBetween(t0, s.startDate)).replace(/^in/, "Start in") }[state];
    return `
      <article class="tl ${"tl--" + state}" ${state === "now" ? 'aria-current="true"' : ""}>
        <div class="tl__art">${showroomArt(s, 320, 110)}</div>
        <div class="tl__body">
          <span class="tl__state">${label}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.teaser)}</p>
          <small>${fmtDate(s.startDate, { day: "numeric", month: "short" })} – ${fmtDate(new Date(s.endDate - 864e5), { day: "numeric", month: "short", year: "numeric" })} · ${s.weeks} Wochen</small>
        </div>
      </article>`;
  }).join("");
  // Auf dem Handy direkt zum aktuellen Showroom wischen
  const now = $(".tl--now");
  if (now) $("#timeline").scrollLeft = now.offsetLeft - 16;
}

$("#joinMail").href = `mailto:${SHOP.email}?subject=${encodeURIComponent("Modell für den Showroom")}&body=${encodeURIComponent("Hallo Bricks-Team,\n\nich möchte mein Modell für den Showroom einreichen:\n\nName des Modells:\nGröße (ca.):\nFoto: bitte anhängen\n\nViele Grüße")}`;
hero();
highlights();
timeline();
