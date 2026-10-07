// The visitor sends the prepared message; no data is submitted to a server.
const siteConfig = { whatsapp: '77477386296' };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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

// One-time, short entrances. No hidden content when JS or motion is unavailable.
const revealElements = [...document.querySelectorAll('[data-reveal]')];
let revealObserver;
function enableReveals() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealElements.forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${index % 2 * 70}ms`);
    element.classList.add('will-reveal');
    revealObserver.observe(element);
  });
}
enableReveals();
reducedMotion.addEventListener('change', event => {
  if (event.matches) {
    revealObserver?.disconnect();
    revealElements.forEach(element => element.classList.add('is-visible'));
  }
});

document.querySelectorAll('.faq-list details').forEach(details => {
  const summary = details.querySelector('summary');
  let animation;
  summary.addEventListener('click', event => {
    if (reducedMotion.matches || !details.animate) return;
    event.preventDefault();
    if (animation) return;
    const closing = details.open;
    const start = details.getBoundingClientRect().height;
    if (!closing) details.open = true;
    const end = closing ? summary.getBoundingClientRect().height + 2 : details.getBoundingClientRect().height;
    details.style.overflow = 'hidden';
    animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: 240, easing: 'cubic-bezier(.22,.61,.36,1)' });
    animation.onfinish = () => {
      if (closing) details.open = false;
      details.style.overflow = '';
      animation = null;
    };
  });
});

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => { document.querySelector('#service').value = link.dataset.service; });
});
document.querySelector('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = ['Здравствуйте! Хочу запросить расчёт работ агродроном.'];
  const labels = { service: 'Услуга', area: 'Площадь, га', crop: 'Культура или груз', location: 'Расположение', note: 'Дополнительные сведения' };
  for (const [key, label] of Object.entries(labels)) {
    const value = String(data.get(key) || '').trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  window.open(`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
});
