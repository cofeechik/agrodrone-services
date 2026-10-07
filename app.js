// Contact setting. The visitor sends the prepared message in WhatsApp.
const siteConfig = { whatsapp: '77477386296' };
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('span').textContent = '+';
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '−' : '+';
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => { document.querySelector('#service').value = link.dataset.service; });
});
document.querySelector('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = ['Здравствуйте! Хочу обсудить работу агродрона.'];
  const labels = { service: 'Услуга', area: 'Площадь, га', crop: 'Культура или груз', location: 'Расположение', note: 'Дополнительные сведения' };
  for (const [key, label] of Object.entries(labels)) {
    const value = String(data.get(key) || '').trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  const url = `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});
