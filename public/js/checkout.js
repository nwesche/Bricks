// Kasse: Lieferart, Adresse, Zahlung, Zusammenfassung & Bestellung an den Server
mountShared("shop");
const form = $("#coForm");

function delivery() { return form.delivery.value; }

function render() {
  const lines = cartLines();
  $("#coEmpty").hidden = lines.length > 0;
  $("#coGrid").hidden = lines.length === 0;
  if (!lines.length) return;

  const mode = delivery();
  const t = cartTotals(mode === "pickup" ? "pickup" : "ship");
  const s = SHOP.shipping;
  $("#shipInfo").textContent = `${s.days} · kostenlos ab ${euro(s.freeFrom)}`;
  $("#shipPrice").textContent = cartTotals("ship").shipping ? euro(s.cost) : "kostenlos";
  $("#pickupInfo").textContent = `${SHOP.street}, ${SHOP.city} · meist am selben Tag bereit`;
  $("#pickupAddr").textContent = `Abholung bei ${SHOP.name}, ${SHOP.street}, ${SHOP.city}. Wir schicken dir eine E-Mail, sobald alles bereitliegt.`;

  // Adresse nur bei Versand; „bei Abholung bezahlen“ nur bei Abholung
  $("#addrStep").hidden = mode !== "ship";
  $("#nameStep").hidden = mode === "ship";
  ["name", "street", "zip", "city"].forEach((n) => (form[n].required = mode === "ship"));
  form.pickupName.required = mode !== "ship";
  const store = form.querySelector('input[value="store"]');
  store.disabled = mode === "ship";
  if (store.disabled && store.checked) form.querySelector('input[value="online"]').checked = true;

  const pre = lines.filter((l) => l.p.status === "bald");
  $("#preNote").hidden = !pre.length;
  if (pre.length) {
    const latest = pre.map((l) => parseDay(l.p.released)).sort((a, b) => b - a)[0];
    $("#preNote").textContent = `Deine Bestellung enthält Vorbestellungen. ${mode === "ship" ? `Wir verschicken alles zusammen zum Erscheinungstermin (${fmtDate(latest)}).` : `Du kannst alles ab dem ${fmtDate(latest)} abholen.`}`;
  }

  $("#coLines").innerHTML = lines.map(({ p, qty }) => `
    <li class="co-line"><span class="w-item__art" style="--tint:${tintOf(p)}">${productArt(p)}</span>
      <span>${esc(p.name)}<small>${qty} × ${euro(p.price)}${p.status === "bald" ? " · Vorbestellung" : ""}</small></span><b>${euro(p.price * qty)}</b></li>`).join("");
  $("#coSums").innerHTML = `
    <div><span>Zwischensumme</span><span>${euro(t.sub)}</span></div>
    <div><span>${mode === "ship" ? `Versand (${s.carrier})` : "Abholung im Laden"}</span><span>${t.shipping ? euro(t.shipping) : "kostenlos"}</span></div>
    ${mode === "ship" && t.freeLeft > 0 ? `<div><small>Noch ${euro(t.freeLeft)} bis zum kostenlosen Versand</small></div>` : ""}
    <div class="total"><span>Gesamt</span><span>${euro(t.total)}</span></div>
    <div><small>inkl. ${euro(t.total - t.total / 1.19)} MwSt. (19 %)</small></div>`;
  $("#coToggleTotal").textContent = euro(t.total);
  $("#coSubmit").textContent = `Zahlungspflichtig bestellen · ${euro(t.total)}`;
}

function note(msg, kind = "") {
  const n = $("#coNote");
  n.innerHTML = msg;
  n.className = "note" + (kind ? " note--" + kind : "");
  n.hidden = !msg;
  if (msg) n.scrollIntoView({ block: "center", behavior: "smooth" });
}

async function submit(e) {
  e.preventDefault();
  if (!form.checkValidity()) {
    const bad = $$("input:invalid, textarea:invalid", form).find((el) => !el.closest("[hidden]"));
    note(bad?.name === "terms" ? "Bitte bestätige die AGB und die Widerrufsbelehrung." : bad?.name === "zip" ? "Bitte gib eine gültige 5-stellige PLZ an." : "Bitte fülle alle Pflichtfelder (*) aus.");
    bad?.focus();
    return;
  }
  const mode = delivery();
  const f = Object.fromEntries(new FormData(form));
  const payload = {
    lines: cartLines().map(({ p, qty }) => ({ id: p.id, qty })),
    delivery: mode,
    payment: f.payment,
    customer: {
      email: f.email.trim(), phone: f.phone.trim(),
      name: (mode === "ship" ? f.name : f.pickupName).trim(),
      street: f.street?.trim(), zip: f.zip?.trim(), city: f.city?.trim(),
    },
    note: f.note.trim(),
    acceptTerms: !!f.terms,
  };
  store("bricks-customer", { email: payload.customer.email, phone: payload.customer.phone, name: payload.customer.name, street: f.street, zip: f.zip, city: f.city });

  const btn = $("#coSubmit");
  btn.disabled = true;
  btn.textContent = "Wird gesendet …";
  try {
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Die Bestellung konnte nicht gesendet werden.");
    if (data.redirectUrl) {
      // Online-Zahlung: Warenkorb bleibt bestehen, bis die Zahlung bestätigt ist
      store("bricks-pending", { token: data.token });
      location.href = data.redirectUrl;
      return;
    }
    cart.items = {};
    saveCart();
    location.href = `status.html?t=${encodeURIComponent(data.token)}`;
  } catch (err) {
    note(err instanceof TypeError
      ? `Der Shop-Server ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal oder ruf uns an: <a href="tel:${SHOP.phone.replace(/\s/g, "")}">${SHOP.phone}</a>`
      : esc(err.message));
    btn.disabled = false;
    render();
    refreshStock();
  }
}

// Rückkehr nach abgebrochener Zahlung
async function handleAbort() {
  const p = new URLSearchParams(location.search);
  const token = p.get("abgebrochen");
  if (!token) return;
  history.replaceState(null, "", location.pathname);
  try { await fetch(`/api/orders/${encodeURIComponent(token)}/abort`, { method: "POST" }); } catch {}
  store("bricks-pending", null);
  note("Die Zahlung wurde abgebrochen – es wurde nichts abgebucht. Dein Warenkorb ist noch da.", "info");
  refreshStock();
}

// Gespeicherte Kontaktdaten vorausfüllen
const saved = load("bricks-customer", null);
if (saved) ["email", "phone", "name", "street", "zip", "city"].forEach((k) => { if (saved[k] && form[k]) form[k].value = saved[k]; });
if (saved?.name) form.pickupName.value = saved.name;

form.addEventListener("change", render);
form.addEventListener("submit", submit);
$("#coToggle").addEventListener("click", () => {
  const box = $("#coSummary");
  box.classList.toggle("is-collapsed");
  const open = !box.classList.contains("is-collapsed");
  $("#coToggle").setAttribute("aria-expanded", open);
  $("#coToggle span").textContent = open ? "Bestellübersicht ausblenden ▴" : "Bestellübersicht anzeigen ▾";
});
document.addEventListener("cart:change", render);
document.addEventListener("stock:change", render);
render();
handleAbort();
