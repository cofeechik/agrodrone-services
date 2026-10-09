// Contact details are unconfirmed; prepare a copyable request without sending it.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

const header = document.querySelector('.header');
let scrollPending = false;
function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 12);
  scrollPending = false;
}
window.addEventListener('scroll', () => {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateHeader); }
}, { passive: true });
updateHeader();

// One entrance for the real machine; the rest of the page is always visible.
const heroMachine = document.querySelector('.hero-machine');
const heroImage = heroMachine.querySelector('img');
heroImage.decode().then(() => {
  if (!reducedMotion.matches) heroMachine.classList.add('is-ready');
}).catch(() => { /* A failed image never hides the surrounding content. */ });

document.querySelectorAll('.faq-list details').forEach(details => {
  const summary = details.querySelector('summary');
  let animation;
  let targetOpen = details.open;
  function finish() {
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    }
    details.open = targetOpen;
    details.style.overflow = '';
  }
  summary.addEventListener('click', event => {
    if (reducedMotion.matches || !details.animate) {
      targetOpen = !details.open;
      return;
    }
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    targetOpen = animation ? !targetOpen : !details.open;
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
    }
    details.open = true;
    const end = targetOpen ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 2;
    details.style.overflow = 'hidden';
    animation = details.animate({ height: [`${start}px`, `${end}px`] }, {
      duration: 240, easing: 'cubic-bezier(.22,.61,.36,1)'
    });
    animation.onfinish = finish;
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches && animation) finish();
  });
  window.addEventListener('resize', () => { if (animation) finish(); });
});

const form = document.querySelector('#request-form');
const service = form.querySelector('#service');
const area = form.querySelector('#area');
const crop = form.querySelector('#crop');
const locationField = form.querySelector('#location');
const status = form.querySelector('#form-status');
const retry = form.querySelector('#whatsapp-retry');

function clearPreparedMessage() {
  status.textContent = '';
  retry.hidden = true;
  retry.value = '';
}
function updateService() {
  const fieldWork = ['Опрыскивание', 'Удобрения и посев'].includes(service.value);
  area.required = fieldWork;
  crop.required = fieldWork;
  form.querySelector('#area-required').textContent = fieldWork ? 'обязательно' : 'необязательно';
  form.querySelector('#crop-required').textContent = fieldWork ? 'обязательно' : 'необязательно';
  form.querySelector('#area-hint').textContent = fieldWork ? 'Укажите площадь обработки'
    : service.value === 'Доставка грузов' ? 'Для доставки можно пропустить'
    : service.value ? 'Если площадь известна, укажите её' : 'Зависит от выбранной услуги';
  clearPreparedMessage();
}
service.addEventListener('change', updateService);
updateService();

for (const input of [locationField, crop]) {
  input.addEventListener('input', () => {
    input.setCustomValidity(input.value && !input.value.trim()
      ? (input === locationField ? 'Укажите район или координаты участка, а не только пробелы.' : 'Укажите культуру или груз, а не только пробелы.')
      : '');
  });
}
form.addEventListener('input', clearPreparedMessage);

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => {
    service.value = link.dataset.service;
    updateService();
  });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = ['Здравствуйте! Хочу запросить расчёт работ агродроном.'];
  const labels = { service: 'Услуга', area: 'Площадь, га', crop: 'Культура или груз', location: 'Расположение', note: 'Дополнительные сведения' };
  for (const [key, label] of Object.entries(labels)) {
    const value = String(data.get(key) || '').trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  const message=lines.join('\n');
  retry.value = message;
  retry.hidden = false;
  try { await navigator.clipboard.writeText(message);status.textContent='Запрос скопирован. Его можно вставить в переписку.'; }
  catch { retry.focus();retry.select();status.textContent='Запрос готов. Скопируйте текст ниже.'; }
});
