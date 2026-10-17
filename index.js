// Bot Zelasis : installation du serveur + tickets + devis automatiques
// discord.js v14 — node index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client, GatewayIntentBits, Partials, Events, ChannelType, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, AttachmentBuilder,
} = require('discord.js');

// ═════════════════════════ Réglages (à modifier ici) ═════════════════════════
const BRAND = { name: 'Zelasis', color: 0x5b9bff, email: 'zelasis.pro@gmail.com', discord: '_zelasis__' };

// Catalogue des modules : prix à l'unité
const MODULES = [
  { id: 'embeds', name: 'Embeds personnalisés', tier: 'simple', price: 5 },
  { id: 'sondages', name: 'Sondages', tier: 'simple', price: 5 },
  { id: 'infos', name: 'Infos serveur', tier: 'simple', price: 5 },
  { id: 'utils', name: 'Commandes utilitaires', tier: 'simple', price: 5 },
  { id: 'tickets', name: 'Tickets', tier: 'inter', price: 15 },
  { id: 'modo', name: 'Modération', tier: 'inter', price: 15 },
  { id: 'logs', name: 'Logs', tier: 'inter', price: 15 },
  { id: 'welcome', name: 'Bienvenue', tier: 'inter', price: 15 },
  { id: 'roles', name: 'Auto-rôles', tier: 'inter', price: 15 },
  { id: 'eco', name: 'Économie & boutique', tier: 'avance', price: 50 },
  { id: 'xp', name: 'Niveaux / XP', tier: 'avance', price: 50 },
  { id: 'give', name: 'Giveaways', tier: 'avance', price: 50 },
  { id: 'music', name: 'Musique', tier: 'avance', price: 50 },
  { id: 'games', name: 'Mini-jeux', tier: 'avance', price: 50 },
];
const TIER_LABEL = { simple: 'Simple', inter: 'Intermédiaire', avance: 'Avancé' };

const PRICING = {
  starter: { price: 15, modules: ['modo', 'logs'] },        // pack Starter = exactement modération + logs
  surMesure: { price: 60, maxModules: 4, advancedExtra: 30 }, // 60 € pour 4 modules simples/intermédiaires, +30 € par module avancé
  premium: { price: 350, minModules: 5 },                    // dès 350 €, modules illimités
  hosting: 10,                                               // €/mois
  depositPercent: 50,                                        // acompte demandé au lancement
};

// Relances des tickets sans réponse du client
const REMIND_AFTER_H = 48;   // relance après 48 h
const CLOSE_AFTER_H = 24 * 7; // fermeture après 7 jours

// Réponses automatiques aux questions fréquentes (dans les tickets, 1 fois par sujet)
const FAQ = [
  { key: 'delai', match: /d[ée]lai|combien de temps|quand.*(pr[eê]t|fini|livr)|livraison/i,
    title: '⏱️ Délais', text: 'Compte **2 à 10 jours** selon la taille du projet : 2–3 jours pour quelques modules simples, jusqu\'à 10 jours pour un bot complet. Le délai exact est confirmé avec le devis.' },
  { key: 'paiement', match: /pai?ement|payer|paypal|virement|acompte|rib/i,
    title: '💳 Paiement', text: `Paiement par **virement** ou **PayPal**. Un acompte de **${PRICING.depositPercent} %** est demandé au lancement, le solde à la livraison.` },
  { key: 'source', match: /code source|\bsource\b|\bcode\b.*(fourni|donn|re[çc]oi)/i,
    title: '📂 Code source', text: 'Le code source est fourni avec les packs **Sur mesure** et **Premium**. Le pack Starter est vendu en licence d\'utilisation.' },
  { key: 'heberg', match: /h[ée]berg|24\s?\/\s?7|en ligne|serveur.*tourn|vps/i,
    title: '☁️ Hébergement', text: `Tu peux l'héberger toi-même (guide fourni), ou je m'en occupe pour **${PRICING.hosting} €/mois** : bot en ligne 24/7, mises à jour et corrections incluses.` },
  { key: 'prix', match: /\bprix\b|tarif|combien.*(co[uû]t|€|euro)|co[uû]te/i,
    title: '💎 Tarifs', text: 'Modules : **5 €** (simple), **15 €** (intermédiaire), **50 €** (avancé).\nPacks : Starter dès **15 €**, Sur mesure dès **60 €**, Premium dès **350 €**.\nPour un prix exact, ouvre un ticket **Demande de devis** : le calcul est automatique.' },
  { key: 'modif', match: /modif|retouche|changer.*apr[eè]s|mise à jour|update/i,
    title: '🛠️ Modifications', text: 'Les petites corrections sont incluses pendant la période de support (30 jours en Sur mesure, 90 jours en Premium). Les nouvelles fonctionnalités sont chiffrées à part.' },
];

const TICKET_TYPES = {
  devis: {
    label: 'Demande de devis', emoji: '💰', description: 'Calcul automatique du prix',
    fields: [
      { id: 'details', label: 'Décris ton projet', style: 'long', placeholder: 'Nom du bot, taille du serveur, idées, délai souhaité…', required: false },
    ],
  },
  commande: {
    label: 'Passer commande', emoji: '🛒', description: 'Tu as déjà un devis validé',
    fields: [
      { id: 'pack', label: 'Pack ou modules commandés', style: 'short', placeholder: 'Ex. Sur mesure – 60 €', required: true },
      { id: 'paiement', label: 'Moyen de paiement', style: 'short', placeholder: 'Virement ou PayPal', required: true },
      { id: 'details', label: 'Infos complémentaires', style: 'long', placeholder: 'Nom du bot, couleurs, remarques…', required: false },
    ],
  },
  support: {
    label: 'Support / bug', emoji: '🛠️', description: 'Un souci avec ton bot',
    fields: [
      { id: 'bot', label: 'Bot ou commande concernée', style: 'short', placeholder: 'Ex. /ticket ne répond plus', required: true },
      { id: 'details', label: 'Décris le problème', style: 'long', placeholder: 'Ce qui se passe, depuis quand, message d\'erreur…', required: true },
    ],
  },
  question: {
    label: 'Autre question', emoji: '❓', description: 'Tout le reste',
    fields: [
      { id: 'details', label: 'Ta question', style: 'long', placeholder: 'Pose ta question ici', required: true },
    ],
  },
};

// ═════════════════════════ Stockage simple ═════════════════════════
const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  try { const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); d.guilds ??= {}; d.tickets ??= {}; return d; } catch { return { guilds: {}, tickets: {} }; }
}
let data = loadData();
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
const cfg = (guildId) => data.guilds[guildId];

// ═════════════════════════ Client ═════════════════════════
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const commands = [
  new SlashCommandBuilder().setName('setup').setDescription('Installe tout le serveur (salons, rôles, tickets)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false),
  new SlashCommandBuilder().setName('panel').setDescription('Republie le panneau de tickets dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setDMPermission(false),
  new SlashCommandBuilder().setName('ajouter').setDescription('Ajoute un membre au ticket actuel')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à ajouter').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).setDMPermission(false),
  new SlashCommandBuilder().setName('retirer').setDescription('Retire un membre du ticket actuel')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à retirer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).setDMPermission(false),
].map((c) => c.toJSON());

client.once(Events.ClientReady, async (c) => {
  for (const guild of c.guilds.cache.values()) await guild.commands.set(commands).catch(console.error);
  console.log(`✅ Connecté en tant que ${c.user.tag} sur ${c.guilds.cache.size} serveur(s)`);
  setInterval(() => checkInactiveTickets().catch(console.error), 15 * 60 * 1000);
  checkInactiveTickets().catch(console.error);
});
client.on(Events.GuildCreate, (guild) => guild.commands.set(commands).catch(console.error));

// ═════════════════════════ Devis ═════════════════════════
const euros = (n) => `${n} €`;

function computeQuote(ids, hosting) {
  const mods = MODULES.filter((m) => ids.includes(m.id));
  const unit = mods.reduce((s, m) => s + m.price, 0);
  const n = mods.length;
  const nAdv = mods.filter((m) => m.tier === 'avance').length;
  const options = [{ key: 'unit', label: 'Modules à l\'unité', price: unit }];

  const isStarter = n === PRICING.starter.modules.length && PRICING.starter.modules.every((id) => ids.includes(id));
  if (isStarter) options.push({ key: 'starter', label: 'Pack Starter', price: PRICING.starter.price });
  if (n >= 2 && n <= PRICING.surMesure.maxModules) {
    options.push({ key: 'surmesure', label: 'Pack Sur mesure', price: PRICING.surMesure.price + nAdv * PRICING.surMesure.advancedExtra,
      note: nAdv ? `60 € + ${nAdv} module(s) avancé(s) × ${PRICING.surMesure.advancedExtra} €` : null });
  }
  if (n >= PRICING.premium.minModules) options.push({ key: 'premium', label: 'Pack Premium', price: PRICING.premium.price, from: true });

  // à prix égal, le pack l'emporte (personnalisation + support en plus)
  const best = options.reduce((a, b) => (b.price <= a.price ? b : a));
  const days = nAdv === 0 ? (n <= 2 ? '2 à 3 jours' : '3 à 6 jours') : (n <= 4 && nAdv <= 1 ? '3 à 6 jours' : '7 à 10 jours');
  return { mods, unit, best, saved: unit - best.price, hosting, days, deposit: Math.ceil((best.price * PRICING.depositPercent) / 100) };
}

function quoteEmbed(q, num) {
  const lines = q.mods.map((m) => `• ${m.name} — ${euros(m.price)} *(${TIER_LABEL[m.tier]})*`).join('\n') || '—';
  const e = new EmbedBuilder().setColor(BRAND.color).setTitle(`💰 Devis automatique — #${num}`)
    .addFields({ name: 'Modules choisis', value: lines.slice(0, 1024) });
  if (q.best.key !== 'unit') {
    e.addFields({ name: '💡 Meilleure option', value: `**${q.best.label}** — ${q.best.from ? 'dès ' : ''}${euros(q.best.price)}${q.best.note ? `\n*${q.best.note}*` : ''}\n${q.saved > 0 ? `Total à l'unité : ~~${euros(q.unit)}~~ · tu économises **${euros(q.saved)}**` : 'Même prix qu\'à l\'unité, avec la personnalisation et 30 jours de support en plus'}` });
  }
  e.addFields(
    { name: 'Prix estimé', value: `**${q.best.from ? 'dès ' : ''}${euros(q.best.price)}**${q.hosting ? `\n+ hébergement ${euros(PRICING.hosting)}/mois` : ''}`, inline: true },
    { name: `Acompte (${PRICING.depositPercent} %)`, value: euros(q.deposit), inline: true },
    { name: 'Délai estimé', value: q.days, inline: true },
  ).setFooter({ text: `Estimation automatique — confirmée par ${BRAND.name} avant tout paiement` });
  return e;
}

function moduleSelect(customId, selected = [], hosting = false) {
  const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Coche les modules voulus…')
    .setMinValues(1).setMaxValues(MODULES.length + 1)
    .addOptions(
      ...MODULES.map((m) => ({ value: m.id, label: `${m.name} — ${euros(m.price)}`, description: TIER_LABEL[m.tier], default: selected.includes(m.id) })),
      { value: 'hosting', label: `Hébergement 24/7 — ${euros(PRICING.hosting)}/mois`, description: 'Option', emoji: '☁️', default: hosting },
    );
  return new ActionRowBuilder().addComponents(menu);
}

const quoteButtons = (disabled = false) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('quote:accept').setLabel('Accepter le devis').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(disabled),
  new ButtonBuilder().setCustomId('quote:edit').setLabel('Modifier').setEmoji('✏️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
);

// ═════════════════════════ Embeds du serveur ═════════════════════════
const embed = () => new EmbedBuilder().setColor(BRAND.color).setFooter({ text: BRAND.name });

function rulesEmbed() {
  return embed().setTitle('📜 Règlement').setDescription([
    '**1.** Respect de tout le monde, pas d\'insultes ni de harcèlement.',
    '**2.** Pas de spam, de pub ou de liens douteux.',
    '**3.** Pas de contenu NSFW, illégal ou choquant.',
    '**4.** Les commandes et demandes de devis se font **uniquement par ticket**.',
    '**5.** Aucune demande de bot de raid, self-bot, spam ou contournement des règles de Discord.',
    '**6.** Le staff a le dernier mot en cas de litige.',
    '',
    'En restant sur le serveur, tu acceptes ce règlement et les [conditions de Discord](https://discord.com/terms).',
  ].join('\n'));
}

function pricesEmbed() {
  return embed().setTitle('💎 Tarifs').setDescription('Bots Discord sur mesure, code propre et support après livraison.')
    .addFields(
      { name: '🧩 Modules à l\'unité', value: '**Simple — 5 €**\nEmbeds, sondages, infos serveur, utilitaires\n\n**Intermédiaire — 15 €**\nTickets, modération, logs, bienvenue, auto-rôles\n\n**Avancé — 50 €**\nÉconomie, niveaux/XP, giveaways, musique, mini-jeux' },
      { name: '📦 Packs', value: `**Starter — 15 €**\nModération + logs, guide d'installation\n\n**Sur mesure — dès 60 €** ⭐\nJusqu'à 4 modules simples ou intermédiaires (+${PRICING.surMesure.advancedExtra} € par module avancé), personnalisation, base de données, 30 j de support\n\n**Premium — dès 350 €**\nModules illimités, dashboard web, API, support prioritaire 90 j` },
      { name: '☁️ Hébergement', value: `**${PRICING.hosting} € / mois** — bot en ligne 24/7 et maintenance` },
      { name: '💳 Paiement', value: `Virement ou PayPal · acompte de ${PRICING.depositPercent} % au lancement, solde à la livraison` },
    );
}

function panelMessage() {
  const e = embed().setTitle('🎫 Ouvrir un ticket').setDescription([
    'Choisis ce dont tu as besoin dans le menu ci-dessous.',
    'Un salon privé sera créé rien que pour toi.',
    '',
    '💰 **Devis** — coche tes modules, le prix est calculé tout de suite',
    '🛒 **Commande** — ton devis est validé',
    '🛠️ **Support** — un souci avec ton bot',
    '❓ **Question** — tout le reste',
    '',
    '⏱️ Réponse sous 24 h en général.',
  ].join('\n'));
  const menu = new StringSelectMenuBuilder().setCustomId('ticket:open').setPlaceholder('Choisis le type de ticket…')
    .addOptions(Object.entries(TICKET_TYPES).map(([value, t]) => ({ value, label: t.label, emoji: t.emoji, description: t.description })));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

// ═════════════════════════ /setup ═════════════════════════
async function setupGuild(guild) {
  const everyone = guild.roles.everyone;
  const me = guild.members.me;

  const staff = await guild.roles.create({ name: 'Staff', color: BRAND.color, hoist: true, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.ModerateMembers] });
  const clientRole = await guild.roles.create({ name: 'Client', color: 0x7dd3fc, hoist: true });
  const member = await guild.roles.create({ name: 'Membre', color: 0x8592ae });

  const readOnly = [
    { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.AddReactions] },
    { id: staff.id, allow: [PermissionFlagsBits.SendMessages] },
    { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
  ];
  const staffOnly = [
    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: staff.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels] },
  ];

  const cat = (name, permissionOverwrites) => guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites });
  const text = (name, parent, extra = {}) => guild.channels.create({ name, type: ChannelType.GuildText, parent, ...extra });

  const infos = await cat('📌 INFOS', readOnly);
  const welcome = await text('👋・bienvenue', infos);
  const rules = await text('📜・règlement', infos);
  const prices = await text('💎・tarifs', infos);
  await text('📢・annonces', infos);
  const reviews = await text('⭐・avis', infos, {
    topic: 'Les clients peuvent laisser leur avis ici',
    permissionOverwrites: [
      { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
      { id: clientRole.id, allow: [PermissionFlagsBits.SendMessages] },
      { id: staff.id, allow: [PermissionFlagsBits.SendMessages] },
    ],
  });

  const support = await cat('🎫 SUPPORT', readOnly);
  const panel = await text('🎫・ouvrir-un-ticket', support);

  const commu = await cat('💬 COMMUNAUTÉ');
  await text('💬・général', commu);
  await text('🤖・showcase', commu, { topic: 'Aperçus des bots réalisés' });
  await text('🧪・test-commandes', commu, { topic: 'Teste les bots de démo ici' });

  const tickets = await cat('📂 TICKETS', staffOnly);
  const staffCat = await cat('🔒 STAFF', staffOnly);
  const logs = await text('📁・logs-tickets', staffCat);
  await text('💬・staff', staffCat);

  await rules.send({ embeds: [rulesEmbed()] });
  await prices.send({ embeds: [pricesEmbed()] });
  await panel.send(panelMessage());
  await reviews.send({ embeds: [embed().setTitle('⭐ Avis clients').setDescription('Tu as reçu ton bot ? Laisse ton avis ici, ça aide énormément !\n(Le rôle **Client** est donné à la livraison.)')] });

  data.guilds[guild.id] = {
    staffRoleId: staff.id, clientRoleId: clientRole.id, memberRoleId: member.id,
    ticketCategoryId: tickets.id, logsChannelId: logs.id, welcomeChannelId: welcome.id,
    rulesChannelId: rules.id, panelChannelId: panel.id, counter: data.guilds[guild.id]?.counter ?? 0,
  };
  saveData();
  return { staff, panel };
}

// ═════════════════════════ Outils tickets ═════════════════════════
const parseTopic = (topic = '') => Object.fromEntries((topic.match(/(\w+):(\S+)/g) || []).map((p) => p.split(':')));
const isStaff = (member, c) => member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(c.staffRoleId);

function ticketOf(channel) {
  const c = channel.guild && cfg(channel.guild.id);
  if (!c || channel.parentId !== c.ticketCategoryId) return null;
  let t = data.tickets[channel.id];
  if (!t) {
    const meta = parseTopic(channel.topic);
    if (!meta.owner) return null;
    t = data.tickets[channel.id] = { guildId: channel.guild.id, owner: meta.owner, type: meta.type, num: meta.num, waitingOn: 'staff', lastAt: Date.now(), faq: [] };
  }
  return t;
}

async function notifyOwner(guild, e, components = []) {
  try {
    const id = process.env.OWNER_ID || guild.ownerId;
    const user = await client.users.fetch(id);
    await user.send({ embeds: [e], components });
  } catch { /* MP fermés : on ignore */ }
}

async function log(guild, e, files = []) {
  const c = cfg(guild.id);
  const ch = c && guild.channels.cache.get(c.logsChannelId);
  if (ch) await ch.send({ embeds: [e], files }).catch(() => {});
}

function buildModal(type, extra = '') {
  const t = TICKET_TYPES[type];
  const modal = new ModalBuilder().setCustomId(`ticket:modal:${type}${extra ? `:${extra}` : ''}`).setTitle(t.label);
  for (const f of t.fields) {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setPlaceholder(f.placeholder)
        .setStyle(f.style === 'long' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(f.required).setMaxLength(f.style === 'long' ? 1500 : 200),
    ));
  }
  return modal;
}

// La sélection de modules voyage dans l'identifiant du formulaire : indices séparés par des points, "h" = hébergement
const encodeSel = (ids, hosting) => [...ids.map((id) => MODULES.findIndex((m) => m.id === id)), ...(hosting ? ['h'] : [])].join('.');
const decodeSel = (s) => {
  const parts = (s || '').split('.').filter(Boolean);
  return { ids: parts.filter((p) => p !== 'h').map((i) => MODULES[Number(i)]?.id).filter(Boolean), hosting: parts.includes('h') };
};
const splitValues = (values) => ({ ids: values.filter((v) => v !== 'hosting'), hosting: values.includes('hosting') });

function existingTicket(guild, userId) {
  const c = cfg(guild.id);
  return guild.channels.cache.find((ch) => ch.parentId === c.ticketCategoryId && parseTopic(ch.topic).owner === userId);
}

async function createTicket(interaction, type, sel) {
  const c = cfg(interaction.guild.id);
  const guild = interaction.guild;
  const user = interaction.user;

  const existing = existingTicket(guild, user.id);
  if (existing) return interaction.editReply(`Tu as déjà un ticket ouvert : ${existing}`);

  c.counter += 1;
  const num = String(c.counter).padStart(4, '0');
  const t = TICKET_TYPES[type];

  const channel = await guild.channels.create({
    name: `${type}-${num}`,
    type: ChannelType.GuildText,
    parent: c.ticketCategoryId,
    topic: `owner:${user.id} type:${type} num:${num}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      { id: c.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] },
      { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels] },
    ],
  });

  const ticket = data.tickets[channel.id] = { guildId: guild.id, owner: user.id, type, num, waitingOn: 'staff', lastAt: Date.now(), faq: [] };

  const e = embed().setTitle(`${t.emoji} ${t.label} — #${num}`)
    .setDescription(`Merci ${user} ! Ton ticket est ouvert, je te réponds au plus vite (sous 24 h en général).\nTu peux ajouter des images ou des exemples ici.`)
    .setThumbnail(user.displayAvatarURL()).setTimestamp();
  for (const f of t.fields) {
    const v = interaction.fields.getTextInputValue(f.id)?.trim();
    if (v) e.addFields({ name: f.label, value: v.slice(0, 1024) });
  }
  const manage = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Prendre en charge').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Fermer').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );
  await channel.send({ content: `${user} <@&${c.staffRoleId}>`, embeds: [e], components: [manage], allowedMentions: { users: [user.id], roles: [c.staffRoleId] } });

  let alertText = `${channel} — ${t.label}\nPar ${user} (${user.tag})`;
  if (type === 'devis' && sel) {
    const q = computeQuote(sel.ids, sel.hosting);
    const msg = await channel.send({ embeds: [quoteEmbed(q, num)], components: [quoteButtons()] });
    Object.assign(ticket, { quote: { ids: sel.ids, hosting: sel.hosting, msgId: msg.id }, waitingOn: 'client', lastAt: Date.now() });
    alertText += `\nEstimation : **${q.best.from ? 'dès ' : ''}${euros(q.best.price)}** (${q.mods.length} module(s))`;
  }
  saveData();

  log(guild, embed().setTitle('🎫 Ticket ouvert').setDescription(alertText).setTimestamp());
  notifyOwner(guild, embed().setTitle(`🔔 Nouveau ticket : ${t.label}`).setDescription(alertText).setTimestamp());
  return interaction.editReply(`✅ Ton ticket est ouvert : ${channel}`);
}

async function transcript(channel) {
  let all = []; let before;
  for (let i = 0; i < 20; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all = all.concat([...batch.values()]);
    before = batch.last().id;
  }
  all.reverse();
  const lines = all.map((m) => {
    const date = m.createdAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    let txt = m.content || '';
    for (const e of m.embeds) txt += `${txt ? '\n' : ''}[Embed] ${e.title || ''} ${e.description || ''} ${e.fields.map((f) => `${f.name}: ${f.value}`).join(' | ')}`;
    for (const a of m.attachments.values()) txt += `\n[Fichier] ${a.url}`;
    return `[${date}] ${m.author.tag} : ${txt}`;
  });
  const header = `Transcript du ticket #${channel.name} — ${channel.guild.name}\nGénéré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n${'─'.repeat(50)}\n`;
  return Buffer.from(header + lines.join('\n'), 'utf8');
}

async function closeTicket(channel, closedBy, reason) {
  const meta = data.tickets[channel.id] || parseTopic(channel.topic);
  await channel.send(`🔒 Ticket fermé${reason ? ` (${reason})` : ''}. Le salon sera supprimé dans 5 secondes.`).catch(() => {});
  const buf = await transcript(channel).catch(() => null);
  const t = TICKET_TYPES[meta.type];
  const file = () => (buf ? [new AttachmentBuilder(buf, { name: `transcript-${channel.name}.txt` })] : []);
  await log(channel.guild, embed().setTitle('🔒 Ticket fermé')
    .setDescription(`**#${channel.name}** — ${t ? t.label : meta.type}\nAuteur : <@${meta.owner}>\nFermé par : ${closedBy}${reason ? `\nRaison : ${reason}` : ''}`).setTimestamp(), file());
  const owner = await client.users.fetch(meta.owner).catch(() => null);
  if (owner) {
    await owner.send({
      embeds: [embed().setTitle('🔒 Ton ticket est fermé').setDescription(`Merci d'être passé par **${channel.guild.name}** !\nVoici l'historique de ta conversation.\n\nUne question ? Rouvre un ticket quand tu veux.`)],
      files: file(),
    }).catch(() => {});
  }
  delete data.tickets[channel.id];
  saveData();
  setTimeout(() => channel.delete('Ticket fermé').catch(() => {}), 5000);
}

// ═════════════════════════ Relances ═════════════════════════
async function checkInactiveTickets() {
  const now = Date.now();
  for (const [channelId, t] of Object.entries(data.tickets)) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) { if (client.guilds.cache.has(t.guildId)) { delete data.tickets[channelId]; saveData(); } continue; }
    if (t.waitingOn !== 'client') continue;
    const hours = (now - t.lastAt) / 3600000;
    if (hours >= CLOSE_AFTER_H) {
      await closeTicket(channel, client.user, 'aucune réponse depuis 7 jours');
    } else if (hours >= REMIND_AFTER_H && !t.reminded) {
      const left = Math.max(1, Math.round((CLOSE_AFTER_H - hours) / 24));
      await channel.send({ content: `<@${t.owner}>`, embeds: [embed().setTitle('👋 Petit rappel').setDescription(`On attend ta réponse pour avancer sur ton projet !\nSans nouvelles, ce ticket sera fermé automatiquement dans **${left} jour(s)**.`)] }).catch(() => {});
      t.reminded = true;
      saveData();
    }
  }
}

// ═════════════════════════ Messages dans les tickets ═════════════════════════
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const t = ticketOf(message.channel);
  if (!t) return;
  const c = cfg(message.guild.id);
  const fromClient = message.author.id === t.owner;

  if (!fromClient) {
    if (message.member && isStaff(message.member, c)) { t.waitingOn = 'client'; t.lastAt = Date.now(); t.lastStaffAt = Date.now(); t.reminded = false; saveData(); }
    return;
  }
  t.waitingOn = 'staff'; t.lastAt = Date.now(); t.reminded = false;

  // Réponses automatiques, sauf si le staff est en pleine conversation (moins de 30 min)
  const staffActive = t.lastStaffAt && Date.now() - t.lastStaffAt < 30 * 60 * 1000;
  if (!staffActive && message.content) {
    const hits = FAQ.filter((f) => !t.faq.includes(f.key) && f.match.test(message.content));
    if (hits.length) {
      const e = embed().setTitle('🤖 Réponse automatique')
        .setDescription(`En attendant ${BRAND.name}, voici ce qui pourrait t'aider :`)
        .addFields(hits.map((f) => ({ name: f.title, value: f.text })))
        .setFooter({ text: `${BRAND.name} te répondra aussi personnellement` });
      await message.reply({ embeds: [e], allowedMentions: { repliedUser: false } }).catch(() => {});
      t.faq.push(...hits.map((f) => f.key));
    }
  }
  saveData();
});

client.on(Events.ChannelDelete, (channel) => { if (data.tickets[channel.id]) { delete data.tickets[channel.id]; saveData(); } });

// ═════════════════════════ Interactions ═════════════════════════
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.inGuild()) return;
    const c = cfg(interaction.guild.id);

    // ── Commandes slash
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup') {
        if (c) return interaction.reply({ content: '⚠️ Le serveur est déjà installé. Utilise `/panel` pour republier le panneau de tickets.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const { staff, panel } = await setupGuild(interaction.guild);
        await interaction.member.roles.add(staff).catch(() => {});
        return interaction.editReply(`✅ Serveur installé ! Panneau de tickets : ${panel}\nTu as reçu le rôle **Staff**. Tu peux supprimer les salons par défaut.`);
      }
      if (!c) return interaction.reply({ content: 'Lance d\'abord `/setup`.', ephemeral: true });

      if (interaction.commandName === 'panel') {
        await interaction.channel.send(panelMessage());
        c.panelChannelId = interaction.channel.id; saveData();
        return interaction.reply({ content: '✅ Panneau publié.', ephemeral: true });
      }
      if (interaction.commandName === 'ajouter' || interaction.commandName === 'retirer') {
        const t = ticketOf(interaction.channel);
        if (!t) return interaction.reply({ content: 'Cette commande s\'utilise dans un ticket.', ephemeral: true });
        const target = interaction.options.getUser('membre');
        if (interaction.commandName === 'ajouter') {
          await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
          return interaction.reply(`➕ ${target} a été ajouté au ticket.`);
        }
        if (target.id === t.owner) return interaction.reply({ content: 'Impossible de retirer l\'auteur du ticket.', ephemeral: true });
        await interaction.channel.permissionOverwrites.delete(target.id);
        return interaction.reply(`➖ ${target} a été retiré du ticket.`);
      }
      return;
    }
    if (!c) return;

    // ── Panneau : choix du type de ticket
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:open') {
      const type = interaction.values[0];
      const existing = existingTicket(interaction.guild, interaction.user.id);
      if (existing) await interaction.reply({ content: `Tu as déjà un ticket ouvert : ${existing}`, ephemeral: true });
      else if (type === 'devis') {
        await interaction.reply({
          content: '💰 **Coche les modules que tu veux** (plusieurs choix possibles). Le prix sera calculé automatiquement.',
          components: [moduleSelect('quote:pick')], ephemeral: true,
        });
      } else await interaction.showModal(buildModal(type));
      // remet le menu à zéro (après la réponse : Discord exige une réponse en moins de 3 s)
      return interaction.message.edit(panelMessage()).catch(() => {});
    }

    // ── Devis : modules choisis → formulaire
    if (interaction.isStringSelectMenu() && interaction.customId === 'quote:pick') {
      const { ids, hosting } = splitValues(interaction.values);
      if (!ids.length) return interaction.reply({ content: 'Choisis au moins un module 🙂', ephemeral: true });
      return interaction.showModal(buildModal('devis', encodeSel(ids, hosting)));
    }

    // ── Formulaire envoyé
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:modal:')) {
      const [, , type, enc] = interaction.customId.split(':');
      if (!TICKET_TYPES[type]) return;
      await interaction.deferReply({ ephemeral: true });
      return createTicket(interaction, type, type === 'devis' ? decodeSel(enc) : null);
    }

    // ── Devis : modification
    if (interaction.isStringSelectMenu() && interaction.customId === 'quote:edit') {
      const t = ticketOf(interaction.channel);
      if (!t?.quote) return interaction.reply({ content: 'Devis introuvable.', ephemeral: true });
      const { ids, hosting } = splitValues(interaction.values);
      if (!ids.length) return interaction.reply({ content: 'Choisis au moins un module 🙂', ephemeral: true });
      const q = computeQuote(ids, hosting);
      const msg = await interaction.channel.messages.fetch(t.quote.msgId).catch(() => null);
      if (msg) await msg.edit({ embeds: [quoteEmbed(q, t.num)], components: [quoteButtons()] });
      else { const m = await interaction.channel.send({ embeds: [quoteEmbed(q, t.num)], components: [quoteButtons()] }); t.quote.msgId = m.id; }
      Object.assign(t.quote, { ids, hosting });
      Object.assign(t, { waitingOn: 'client', lastAt: Date.now(), reminded: false });
      saveData();
      await interaction.update({ content: '✅ Devis mis à jour.', components: [] });
      return interaction.channel.send(`✏️ ${interaction.user} a modifié le devis : nouveau prix estimé **${q.best.from ? 'dès ' : ''}${euros(q.best.price)}**.`);
    }

    // ── Boutons
    if (interaction.isButton()) {
      const t = ticketOf(interaction.channel);
      if (!t) return;
      const staff = isStaff(interaction.member, c);
      const isOwner = interaction.user.id === t.owner;

      if (interaction.customId === 'quote:edit') {
        if (!staff && !isOwner) return interaction.reply({ content: 'Tu ne peux pas modifier ce devis.', ephemeral: true });
        return interaction.reply({ content: 'Modifie ta sélection :', components: [moduleSelect('quote:edit', t.quote?.ids || [], t.quote?.hosting)], ephemeral: true });
      }

      if (interaction.customId === 'quote:accept') {
        if (!isOwner && !staff) return interaction.reply({ content: 'Seul l\'auteur du ticket peut accepter le devis.', ephemeral: true });
        if (!t.quote) return interaction.reply({ content: 'Devis introuvable.', ephemeral: true });
        const q = computeQuote(t.quote.ids, t.quote.hosting);
        await interaction.update({ components: [quoteButtons(true)] });
        const pay = embed().setTitle('✅ Devis accepté !').setDescription([
          `Merci ! Ton projet est validé pour **${q.best.from ? 'dès ' : ''}${euros(q.best.price)}**${q.hosting ? ` + ${euros(PRICING.hosting)}/mois d'hébergement` : ''}.`,
          '',
          `**Étape suivante : l'acompte de ${euros(q.deposit)}** (${PRICING.depositPercent} %)`,
          '💳 Paiement par **virement** ou **PayPal**',
          `${BRAND.name} t'envoie les coordonnées de paiement ici même et confirme le prix final.`,
          '',
          `Le développement démarre dès réception de l'acompte · délai estimé : **${q.days}**.`,
        ].join('\n'));
        await interaction.channel.send({ content: `${interaction.user}`, embeds: [pay] });
        Object.assign(t, { type: 'commande', accepted: true, waitingOn: 'staff', lastAt: Date.now(), reminded: false });
        saveData();
        await interaction.channel.setName(`commande-${t.num}`).catch(() => {});
        await interaction.channel.setTopic(`owner:${t.owner} type:commande num:${t.num}`).catch(() => {});
        const alert = embed().setTitle('💸 Devis accepté !')
          .setDescription(`${interaction.channel} — <@${t.owner}>\n**${q.best.label}** : ${q.best.from ? 'dès ' : ''}${euros(q.best.price)}${q.hosting ? ` + ${euros(PRICING.hosting)}/mois` : ''}\nAcompte à demander : **${euros(q.deposit)}**\n\nModules : ${q.mods.map((m) => m.name).join(', ')}`).setTimestamp();
        notifyOwner(interaction.guild, alert);
        return log(interaction.guild, alert);
      }

      if (interaction.customId === 'ticket:claim') {
        if (!staff) return interaction.reply({ content: 'Seul le staff peut prendre un ticket en charge.', ephemeral: true });
        const row = ActionRowBuilder.from(interaction.message.components[0]);
        row.components[0].setDisabled(true).setLabel(`Pris par ${interaction.member.displayName}`);
        await interaction.update({ components: [row] });
        return interaction.channel.send(`🙋 ${interaction.user} prend en charge ton ticket <@${t.owner}> !`);
      }

      if (interaction.customId === 'ticket:close') {
        if (!staff && !isOwner) return interaction.reply({ content: 'Tu ne peux pas fermer ce ticket.', ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:close-confirm').setLabel('Confirmer la fermeture').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket:close-cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
        );
        return interaction.reply({ content: 'Tu veux vraiment fermer ce ticket ?', components: [row], ephemeral: true });
      }
      if (interaction.customId === 'ticket:close-cancel') return interaction.update({ content: 'Fermeture annulée.', components: [] });
      if (interaction.customId === 'ticket:close-confirm') {
        await interaction.update({ content: '🔒 Fermeture en cours…', components: [] });
        return closeTicket(interaction.channel, interaction.user);
      }
    }
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Une erreur est survenue. Vérifie que le bot a bien la permission Administrateur.', ephemeral: true };
    if (interaction.deferred || interaction.replied) interaction.followUp(msg).catch(() => {});
    else if (interaction.isRepliable()) interaction.reply(msg).catch(() => {});
  }
});

// ═════════════════════════ Bienvenue ═════════════════════════
client.on(Events.GuildMemberAdd, async (member) => {
  const c = cfg(member.guild.id);
  if (!c) return;
  await member.roles.add(c.memberRoleId).catch(() => {});
  const ch = member.guild.channels.cache.get(c.welcomeChannelId);
  if (!ch) return;
  const e = embed().setTitle(`Bienvenue ${member.displayName} ! 👋`)
    .setDescription(`Content de te voir sur **${member.guild.name}** !\n\n📜 Lis le règlement : <#${c.rulesChannelId}>\n🎫 Besoin d'un bot ? Ouvre un ticket : <#${c.panelChannelId}>`)
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Tu es le membre n°${member.guild.memberCount}` });
  ch.send({ content: `${member}`, embeds: [e] }).catch(() => {});
});

// Exporté pour les tests (node -e "require('./index.js')" ne se connecte pas sans token)
module.exports = { computeQuote, encodeSel, decodeSel, FAQ };

if (require.main === module) {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN manquant : copie .env.example en .env et colle ton token.');
    process.exit(1);
  }
  client.login(process.env.DISCORD_TOKEN).catch((err) => {
    if (String(err).includes('disallowed intents')) {
      console.error('❌ Active « Server Members Intent » ET « Message Content Intent » sur le portail Discord (onglet Bot), puis redémarre.');
    } else console.error(err);
    process.exit(1);
  });
}
