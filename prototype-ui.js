(() => {
  const scenarios = {
    spray: { title: 'Опрыскивание', description: 'Внесение средств защиты растений и листовых подкормок над посевами, садами и виноградниками.', module: 'RevoSpray 5 · этот модуль показан в 3D', image: 'assets/service-spray.jpg', alt: 'XAG P150 MAX распыляет раствор над посадками', request: 'Рассчитать опрыскивание' },
    spread: { title: 'Удобрения и посев', description: 'Разбрасывание гранулированных удобрений, семян трав, риса, рапса и сидератов.', module: 'RevoCast 5 · сменный бункер показан на фото; в 3D остаётся RevoSpray', image: 'assets/service-spread.jpg', alt: 'XAG P150 MAX с бункером RevoCast разбрасывает гранулы', request: 'Рассчитать внесение' },
    cargo: { title: 'Доставка грузов', description: 'Перевозка саженцев, удобрений и урожая на склонах и участках без подъездной дороги.', module: 'Грузовой модуль показан на фото; в 3D остаётся RevoSpray', image: 'assets/service-cargo.jpg', alt: 'XAG P150 MAX с грузовой платформой перевозит груз', request: 'Обсудить маршрут' },
    map: { title: 'Карты полей', description: 'Съёмка границ и рельефа встроенной камерой для подготовки маршрута обработки.', module: 'Интерфейс планирования маршрута · не карта выполненного заказа', image: 'assets/mapping.png', alt: 'Интерфейс XAG с примером планирования полётного маршрута', request: 'Обсудить съёмку' }
  };
  const parts = {
    tank: { value: '80 <span>л</span>', title: 'Бак для раствора', description: 'Модуль RevoSpray 5 для жидких растворов. Остальные части модели приглушены, чтобы рассмотреть форму бака.' },
    battery: { value: 'Верхний<br>блок', title: 'Серый корпус оборудования', description: 'Рассмотрите верхний блок и его расположение над баком. Внутреннее устройство не моделировалось: это внешний корпус по фотографиям.' },
    rotors: { value: '4 <span>винта</span>', title: 'Винты и ступицы', description: 'Четыре узла вращаются отдельно. Скорость здесь демонстрационная, не рабочие обороты настоящего дрона.' },
    all: { value: 'XAG<br>P150 MAX', title: 'Дрон целиком', description: 'Наша модель с баком RevoSpray 5. Восстановлена по фотографиям для сайта, не является заводским CAD.' }
  };
  const stage = document.querySelector('#drone-stage');
  const status = document.querySelector('#model-status');
  const motion = document.querySelector('#motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motionOverride = null;
  let viewerVisible = true;
  const toolbar = document.querySelector('.model-toolbar');
  let activePart = 'all';
  let isolation = true;
  const isolationButton = document.querySelector('#isolation-toggle');
  const service = document.querySelector('#request-service');
  const form = document.querySelector('#prototype-request');
  const area = document.querySelector('#request-area');
  const crop = document.querySelector('#request-crop');
  const requestStatus = document.querySelector('#request-status');
  const retry = document.querySelector('#request-retry');

  function clearMessage() { requestStatus.textContent = ''; retry.hidden = true; retry.removeAttribute('href'); }
  function updateRequirements() {
    const needed = ['Опрыскивание', 'Удобрения и посев'].includes(service.value);
    area.required = crop.required = needed;
    document.querySelector('#area-hint').textContent = document.querySelector('#crop-hint').textContent = needed ? 'обязательно' : 'необязательно';
    clearMessage();
  }
  service.addEventListener('change', updateRequirements);
  updateRequirements();
  let photoRequest = 0;
  document.querySelectorAll('button[data-scenario]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.scenario;
    const item = scenarios[key];
    document.querySelectorAll('button[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector('#scenario-title').textContent = item.title;
    document.querySelector('#scenario-description').textContent = item.description;
    document.querySelector('#scenario-module').textContent = item.module;
    document.querySelector('#scenario-request').firstChild.textContent = item.request + ' ';
    service.value = item.title;
    updateRequirements();
    const sequence = ++photoRequest;
    const image = new Image();
    image.src = item.image;
    image.decode().then(() => {
      if (sequence !== photoRequest) return;
      const displayed = document.querySelector('#scenario-image');
      displayed.src = item.image; displayed.alt = item.alt;
      displayed.width = image.naturalWidth; displayed.height = image.naturalHeight;
      document.querySelector('.scenario-photo').dataset.scenario = key;
      document.querySelector('#scenario-credit').textContent = key === 'map' ? 'Материал производителя XAG · демонстрационный интерфейс' : 'Фото производителя XAG · демонстрация работы техники';
    }).catch(() => { if (sequence === photoRequest) document.querySelector('#scenario-credit').textContent = 'Фото выбранного сценария не загрузилось. Пока показан предыдущий снимок.'; });
    window.dispatchEvent(new CustomEvent('drone:scenario', { detail: key }));
  }));
  function publishPart() {
    isolationButton.hidden = activePart === 'all';
    isolationButton.setAttribute('aria-pressed', String(isolation));
    isolationButton.textContent = isolation ? 'Показать остальной дрон' : 'Выделить выбранную часть';
    window.dispatchEvent(new CustomEvent('drone:part', { detail: { part: activePart, isolation } }));
  }
  document.querySelectorAll('button[data-part]').forEach(button => button.addEventListener('click', () => {
    activePart = button.dataset.part; isolation = true;
    document.querySelectorAll('button[data-part]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    const item = parts[activePart];
    document.querySelector('#part-panel').dataset.part = activePart;
    document.querySelector('#part-value').innerHTML = item.value;
    document.querySelector('#part-title').textContent = item.title;
    document.querySelector('#part-description').textContent = item.description;
    publishPart();
  }));
  isolationButton.addEventListener('click', () => { isolation = !isolation; publishPart(); });
  motion.addEventListener('click', () => {
    const enabled = motionOverride === null ? !reduced.matches : motionOverride;
    motionOverride = !enabled;
    preferences();
    window.dispatchEvent(new CustomEvent('drone:motion', { detail: { enabled: motionOverride } }));
  });
  function preferences() {
    const enabled = motionOverride === null ? !reduced.matches : motionOverride;
    motion.hidden = stage.dataset.state !== 'ready';
    motion.setAttribute('aria-pressed', String(!enabled));
    motion.textContent = enabled ? 'Остановить вращение' : 'Включить вращение';
    toolbar.hidden = !viewerVisible;
    if (stage.dataset.state === 'ready') status.textContent = enabled ? 'XAG P150 MAX · винты вращаются' : reduced.matches && motionOverride === null ? 'Вращение отключено настройками устройства' : 'Вращение остановлено';
  }
  reduced.addEventListener('change', () => { motionOverride = null; preferences(); });
  window.addEventListener('drone:visibility', e => { if (viewerVisible !== e.detail) { viewerVisible = e.detail; toolbar.hidden = !viewerVisible; } });
  window.addEventListener('drone:ready', preferences);
  // Module loading is blocked by browsers for file://, and a failed module must never hide the page.
  if (location.protocol === 'file:') status.textContent = 'Для 3D откройте прототип через локальный сервер. Пока показан рендер.';
  const loadingDeadline = setTimeout(() => {
    if (!stage.dataset.state) status.textContent = '3D пока не загрузилась. Рендер, услуги и контакты доступны; попробуйте обновить страницу.';
  }, 20000);
  window.addEventListener('drone:ready', () => clearTimeout(loadingDeadline), { once: true });
  window.addEventListener('drone:error', () => { clearTimeout(loadingDeadline); motion.hidden = true; status.textContent = '3D недоступна в этом браузере. Показываем сохранённый рендер.'; });

  for (const input of [crop, document.querySelector('#request-location')]) input.addEventListener('input', () => {
    input.setCustomValidity(input.value && !input.value.trim() ? 'Введите данные, а не только пробелы.' : '');
  });
  form.addEventListener('input', clearMessage);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = ['Здравствуйте! Хочу запросить расчёт работ агродроном.'];
    for (const [key, label] of Object.entries({ service: 'Услуга', area: 'Площадь, га', crop: 'Культура или груз', location: 'Расположение' })) {
      const value = String(data.get(key) || '').trim();
      if (value) lines.push(`${label}: ${value}`);
    }
    const url = `https://wa.me/77477386296?text=${encodeURIComponent(lines.join('\n'))}`;
    retry.href = url; retry.hidden = false;
    requestStatus.textContent = 'Сообщение подготовлено, но ещё не отправлено. Если WhatsApp не открылся, нажмите ссылку ниже.';
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { /* Retry stays available. */ }
  });
})();
