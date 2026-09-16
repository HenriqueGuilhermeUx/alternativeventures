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
