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
