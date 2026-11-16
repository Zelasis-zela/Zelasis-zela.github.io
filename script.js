const CONFIG = {
  brand: "Zelasis",
  email: "zelasis.pro@gmail.com",          
  discordInvite: "https://discord.gg/VWMYkzDHWJ",
  discordUser: "_zelasis__",
  hostingPrice: 10,                        
  apiUrl: "",
  webhookUrl: "https://discord.com/api/webhooks/1571970553378635797/xXv4qc0mKRskzKBSjTULgKCJUPnEmqgL9Lvd2uN4FEoZ7WRn8CANQVpIhe1jIgbLXZ20",
  modules: [
    { level: "Simple", price: 5,
      items: ["Embeds personnalisés", "Sondages", "Suggestions", "Infos serveur", "Commandes utilitaires"] },
    { level: "Intermédiaire", price: 15,
      items: ["Tickets", "Modération", "Logs", "Bienvenue", "Auto-rôles", "Vérification"] },
    { level: "Avancé", price: 50,
      items: ["Économie & boutique", "Niveaux / XP", "Giveaways", "Musique", "Mini-jeux", "Intégration API"] },
  ],
};

document.querySelectorAll("[data-brand]").forEach(el => el.textContent = CONFIG.brand);
document.querySelectorAll("[data-discord]").forEach(el => el.href = CONFIG.discordInvite);
document.querySelectorAll("[data-discord-user]").forEach(el => el.textContent = CONFIG.discordUser);
document.querySelectorAll("[data-email]").forEach(el => { el.href = "mailto:" + CONFIG.email; el.textContent = CONFIG.email; });
document.querySelectorAll("[data-hosting-price]").forEach(el => el.textContent = CONFIG.hostingPrice);
document.getElementById("year").textContent = new Date().getFullYear();
document.title = `${CONFIG.brand} — Bots Discord personnalisés`;

const nav = document.getElementById("nav");
const navLinks = document.getElementById("navLinks");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20), { passive: true });
document.getElementById("burger").addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

const words = ["la modération.", "les tickets.", "l'économie.", "les niveaux.", "les giveaways.", "ta communauté."];
const rotator = document.getElementById("rotator");
let wi = 0, ci = words[0].length, deleting = false;
(function type() {
  const w = words[wi];
  rotator.textContent = w.slice(0, ci);
  let delay = deleting ? 40 : 80;
  if (!deleting && ci === w.length) { delay = 1800; deleting = true; }
  else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 300; }
  ci += deleting ? -1 : 1;
  if (ci > w.length) ci = w.length;
  setTimeout(type, delay);
})();

const chatBody = document.getElementById("chatBody");
const script = [
  { user: "Luna", cmd: "/ticket ouvrir", bot: { title: "🎫 Ticket #0217 créé", text: "Un membre du staff arrive." } },
  { user: "Kenji", cmd: "/rank", bot: { title: "⭐ Niveau 14 · Rang #3", text: "2 840 / 4 000 XP" } },
  { user: "Mira", cmd: "/daily", bot: { title: "💰 +250 coins", text: "Solde : 12 700 coins" } },
  { user: "Admin", cmd: "/giveaway start", bot: { title: "🎉 Giveaway lancé !", text: "Nitro · fin dans 24 h" } },
];
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function addMsg(html) {
  chatBody.insertAdjacentHTML("beforeend", html);
  while (chatBody.children.length > 5) chatBody.firstElementChild.remove();
}
let si = 0;
function playChat() {
  const s = script[si % script.length];
  addMsg(`<div class="msg"><div class="msg__avatar msg__avatar--user">${s.user[0]}</div><div>
    <div class="msg__name">${esc(s.user)}</div><div class="msg__text"><span class="msg__cmd">${esc(s.cmd)}</span></div></div></div>`);
  setTimeout(() => {
    addMsg(`<div class="typing" id="typing">${esc(CONFIG.brand)} écrit…</div>`);
    setTimeout(() => {
      document.getElementById("typing")?.remove();
      addMsg(`<div class="msg"><div class="msg__avatar msg__avatar--bot">◈</div><div>
        <div class="msg__name">${esc(CONFIG.brand)} <span class="msg__tag">BOT</span></div>
        <div class="msg__embed"><b>${esc(s.bot.title)}</b><span>${esc(s.bot.text)}</span></div></div></div>`);
      si++;
      setTimeout(playChat, 2200);
    }, 900);
  }, 700);
}
playChat();

const simGroups = document.getElementById("simGroups");
const selected = new Map(); 
simGroups.innerHTML = CONFIG.modules.map(g => `
  <div class="sim__group">
    <div class="sim__group-head"><h3>${g.level}</h3><span>${g.price} € / module</span></div>
    <div class="chips">${g.items.map(i => `<button type="button" class="chip" data-name="${esc(i)}" data-price="${g.price}">${esc(i)}</button>`).join("")}</div>
  </div>`).join("");

const priceEl = document.getElementById("simPrice");
const hostingEl = document.getElementById("simHosting");
function updateSim() {
  const total = [...selected.values()].reduce((a, b) => a + b, 0);
  priceEl.textContent = total;
  priceEl.classList.add("bump");
  setTimeout(() => priceEl.classList.remove("bump"), 180);
  const n = selected.size;
  document.getElementById("simSummary").textContent =
    n ? `${n} module${n > 1 ? "s" : ""} : ${[...selected.keys()].join(", ")}` : "Aucun module sélectionné";
  document.getElementById("simMonthly").textContent = hostingEl.checked ? `+ ${CONFIG.hostingPrice} € / mois d'hébergement` : "";
  document.getElementById("formSim").textContent = n
    ? `Sélection du simulateur : ${[...selected.keys()].join(", ")} — ${total} €${hostingEl.checked ? ` + hébergement ${CONFIG.hostingPrice} €/mois` : ""}`
    : "Sélection du simulateur : aucun module";
}
simGroups.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const { name, price } = chip.dataset;
  chip.classList.toggle("active");
  chip.classList.contains("active") ? selected.set(name, +price) : selected.delete(name);
  updateSim();
});
hostingEl.addEventListener("change", updateSim);
document.getElementById("simReset").addEventListener("click", () => {
  selected.clear();
  hostingEl.checked = false;
  simGroups.querySelectorAll(".chip.active").forEach(c => c.classList.remove("active"));
  updateSim();
});

const form = document.getElementById("quoteForm");
document.querySelectorAll("[data-pack]").forEach(btn =>
  btn.addEventListener("click", () => form.pack.value = btn.dataset.pack));

const msg = document.getElementById("formMsg");
const submitBtn = form.querySelector('button[type="submit"]');
const setMsg = (type, text) => { msg.className = `form__msg ${type}`; msg.textContent = text; };
const selectionText = () => selected.size ? document.getElementById("formSim").textContent.replace("Sélection du simulateur : ", "") : "";

form.addEventListener("submit", async e => {
  e.preventDefault();
  let ok = true;
  ["name", "message"].forEach(f => {
    const bad = !form[f].value.trim();
    form[f].classList.toggle("invalid", bad);
    if (bad) ok = false;
  });
  if (!ok) return setMsg("err", "Remplis au moins ton nom et ton besoin.");

  const payload = {
    name: form.name.value.trim(),
    discord: form.discord.value.trim(),
    email: form.email.value.trim(),
    pack: form.pack.value,
    budget: form.budget.value,
    selection: selectionText(),
    message: form.message.value.trim(),
    website: form.website.value, 
  };

  if (!CONFIG.apiUrl && !CONFIG.webhookUrl) {
    const body = [
      `Nom : ${payload.name}`, `Discord : ${payload.discord || "—"}`, `Email : ${payload.email || "—"}`,
      `Formule : ${payload.pack || "Pas encore décidé"}`, `Budget : ${payload.budget || "—"}`, "",
      `Simulateur : ${payload.selection || "aucun module"}`, "", "Besoin :", payload.message,
    ].join("\n");
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(`Demande de devis bot Discord — ${payload.name}`)}&body=${encodeURIComponent(body)}`;
    return setMsg("ok", "Ta messagerie s'ouvre, il ne reste plus qu'à envoyer !");
  }

  if (!payload.discord && !payload.email) {
    form.discord.classList.add("invalid"); form.email.classList.add("invalid");
    return setMsg("err", "Indique ton pseudo Discord ou ton email pour recevoir ma réponse.");
  }
  submitBtn.disabled = true;
  setMsg("", "Envoi en cours…");
  try {
    let data;
    if (CONFIG.webhookUrl) {
      if (payload.website) { data = { ok: true, linked: true }; } else {
        const res = await fetch(`${CONFIG.webhookUrl}?wait=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `${CONFIG.brand} · Site`,
            allowed_mentions: { parse: [] },
            embeds: [{ title: "devis-site", description: "```json" + String.fromCharCode(10) + JSON.stringify(payload) + String.fromCharCode(10) + "```" }],
          }),
        });
        if (res.status === 429) throw new Error("Trop de demandes, réessaie dans quelques minutes.");
        if (!res.ok) throw new Error("Envoi impossible.");
        data = { ok: true, unknown: true };
      }
    } else {
      const res = await fetch(`${CONFIG.apiUrl}/api/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Envoi impossible");
    }

    if (data.unknown) setMsg("ok", payload.discord
      ? "✅ Demande envoyée ! Si tu es sur le serveur Discord, regarde tes MP : je te réponds là-bas sous 24 h."
      : "✅ Demande envoyée ! Je te réponds par email sous 24 h.");
    else
    if (data.linked) setMsg("ok", data.existing
      ? "✅ Demande ajoutée à ton ticket en cours ! Je te réponds en MP Discord."
      : "✅ Demande envoyée ! Regarde tes MP Discord, je te réponds là-bas sous 24 h.");
    else if (payload.discord) setMsg("ok", `✅ Demande reçue ! Mais je n'ai pas trouvé « ${payload.discord} » sur le serveur : rejoins-le pour recevoir ma réponse en MP${payload.email ? ", sinon je te réponds par email" : ""}.`);
    else setMsg("ok", "✅ Demande reçue ! Je te réponds par email sous 24 h.");
    form.reset();
  } catch (err) {
    setMsg("err", `❌ ${err.message === "Failed to fetch" ? "Le bot est injoignable pour le moment." : err.message} Tu peux aussi m'écrire à ${CONFIG.email}.`);
  } finally {
    submitBtn.disabled = false;
  }
});
form.addEventListener("input", e => e.target.classList.remove("invalid"));

const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});
