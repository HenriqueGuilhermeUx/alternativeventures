const contactVault = {
email: ['henrique', 'campos66', 'gmail.com'],
phone: ['55', '11', '94798', '4328']
};
function openContact(type) {
if (type === 'email') {
const email = contactVault.email[0] + contactVault.email[1] + '@' + contactVault.email[2];
window.location.href = 'mailto:' + email + '?subject=Contato%20via%20Alternative%20Ventures';
return;
}
const phone = contactVault.phone.join('');
const text = encodeURIComponent('Olá, Henrique. Vim pelo site da Alternative Ventures.');
window.open('https://wa.me/' + phone + '?text=' + text, '_blank', 'noopener,noreferrer');
}

function findVentureCard(name) {
return [...document.querySelectorAll('.venture-card')].find((card) =>
(card.querySelector('h3')?.textContent || '').trim().toLowerCase() === name.toLowerCase()
);
}

function updateVentureWebsite(name, url) {
const card = findVentureCard(name);
if (!card) return;
let link = card.querySelector('.card-link');
if (link) {
link.href = url;
return;
}
const actions = card.querySelector('.card-actions');
if (!actions) return;
let group = actions.querySelector('.action-links-group');
if (!group) {
group = document.createElement('div');
group.className = 'action-links-group';
const ownership = actions.querySelector('.ownership');
actions.insertBefore(group, ownership || actions.firstChild);
[...actions.children].filter((item) => item !== group && !item.classList.contains('ownership')).forEach((item) => group.appendChild(item));
}
link = document.createElement('a');
link.href = url;
link.className = 'card-link';
link.target = '_blank';
link.rel = 'noopener';
link.textContent = 'Site →';
group.insertBefore(link, group.firstChild);
}

updateVentureWebsite('EcoTracker', 'https://ecotracker.com.br');
updateVentureWebsite('DocWallet', 'https://trydocwallet.com');
updateVentureWebsite('Modo', 'https://trymodo.com.br');
updateVentureWebsite('MindSteps', 'https://mymindsteps.com.br');
updateVentureWebsite('F-Insight', 'https://f-insight.org');

if (!findVentureCard('NexOffices')) {
const grid = document.querySelector('.portfolio-grid');
if (grid) {
grid.insertAdjacentHTML('beforeend', `<article class="venture-card" data-category="b2b" style="--accent: rgba(53,213,255,.55)"><div class="card-top"><div class="icon-box">🏢</div><span class="stage">AI Office</span></div><h3>NexOffices</h3><div class="venture-type">Escritório digital com agentes de IA</div><p>Escritório digital com agentes de IA pré-programados para executar rotinas, organizar demandas e automatizar operações de negócios em um único ambiente.</p><div class="tags"><span class="tag">Agentes IA</span><span class="tag">Escritório digital</span><span class="tag">Automação</span><span class="tag">B2B</span></div><div class="card-actions"><a href="https://nexoffices.com.br" class="card-link" target="_blank" rel="noopener">Acessar site →</a><span class="ownership">Alternative Ventures</span></div></article>`);
}
}


const googlePlayMark = `
<svg class="store-mark" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="#00D7FE" d="M3.2 2.7 13.9 12 3.2 21.3a2.1 2.1 0 0 1-.7-1.6V4.3c0-.63.28-1.2.7-1.6Z"/>
  <path fill="#00F076" d="m13.9 12 3.3-2.9-11-6.2c-.66-.37-1.36-.36-1.93-.07L13.9 12Z"/>
  <path fill="#FFEA00" d="m13.9 12-9.63 9.17c.57.29 1.27.3 1.93-.07l11-6.2-3.3-2.9Z"/>
  <path fill="#FF3A44" d="m17.2 9.1-3.3 2.9 3.3 2.9 2.55-1.44c1.19-.67 1.19-2.25 0-2.92L17.2 9.1Z"/>
</svg>`;

function ensureActionGroup(card) {
  if (!card) return null;
  const actions = card.querySelector('.card-actions');
  if (!actions) return null;
  let group = actions.querySelector('.action-links-group');
  if (group) return group;
  group = document.createElement('div');
  group.className = 'action-links-group';
  const ownership = actions.querySelector('.ownership');
  actions.insertBefore(group, ownership || actions.firstChild);
  [...actions.children]
    .filter((item) => item !== group && !item.classList.contains('ownership'))
    .forEach((item) => group.appendChild(item));
  return group;
}

function decorateGooglePlayLinks() {
  document.querySelectorAll('.playstore-badge').forEach((link) => {
    link.classList.add('store-badge', 'android-store-badge');
    link.setAttribute('aria-label', 'Abrir app no Google Play');
    link.setAttribute('title', 'Abrir no Google Play');
    link.innerHTML = googlePlayMark + '<span>App</span>';
  });
}

const pwaDirectory = {
  'Nexa': '/app/nexa',
  'F-Insight': '/app/f-insight',
  'NexJud': '/app/nexjud',
  'DocWallet': '/app/docwallet',
  'MindCompliance': '/app/mindcompliance',
  'Modo': '/app/modo',
  'SmartBots': '/app/smartbots',
  'Staff': '/app/staff',
  'SindCopilot': '/app/sindcopilot',
  'Health Wallet': '/app/healthwallet',
  'MindSteps': '/app/mindsteps',
  'Ecotracker': '/app/ecotracker',
  'Connexio': '/app/connexio'
};

function addPwaLinks() {
  Object.entries(pwaDirectory).forEach(([name, url]) => {
    const card = findVentureCard(name);
    if (!card || card.querySelector('.pwa-badge')) return;
    const group = ensureActionGroup(card);
    if (!group) return;
    const link = document.createElement('a');
    link.href = url;
    link.className = 'store-badge pwa-badge';
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = 'Abrir iOS / PWA';
    link.setAttribute('aria-label', 'Abrir versão iOS / PWA de ' + name);
    link.innerHTML = '<svg class="pwa-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 17.5h6M12 6v7m-2.5-2.5L12 13l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>iOS / PWA</span>';
    group.appendChild(link);
  });
}

decorateGooglePlayLinks();
addPwaLinks();

const filterButtons = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.venture-card');
filterButtons.forEach((button) => {
button.addEventListener('click', () => {
const filter = button.dataset.filter;
filterButtons.forEach((item) => item.classList.remove('active'));
button.classList.add('active');
cards.forEach((card) => {
const show = filter === 'all' || card.dataset.category === filter;
card.classList.toggle('hidden', !show);
});
});
});
