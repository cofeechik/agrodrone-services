(() => {
  const scenarios = {
    spray: { title: 'Опрыскивание', description: 'Внесение средств защиты растений и листовых подкормок над посевами, садами и виноградниками.', module: 'RevoSpray 5 · этот модуль показан в 3D', image: 'assets/service-spray.jpg', alt: 'XAG P150 MAX распыляет раствор над посадками', request: 'Рассчитать опрыскивание' },
    spread: { title: 'Удобрения и посев', description: 'Разбрасывание гранулированных удобрений, семян трав, риса, рапса и сидератов.', module: 'RevoCast 5 · сменный бункер показан на фото; в 3D остаётся RevoSpray', image: 'assets/service-spread.jpg', alt: 'XAG P150 MAX с бункером RevoCast разбрасывает гранулы', request: 'Рассчитать внесение' },
    cargo: { title: 'Доставка грузов', description: 'Перевозка саженцев, удобрений и урожая на склонах и участках без подъездной дороги.', module: 'Грузовой модуль показан на фото; в 3D остаётся RevoSpray', image: 'assets/service-cargo.jpg', alt: 'XAG P150 MAX с грузовой платформой перевозит груз', request: 'Обсудить маршрут' },
    map: { title: 'Карты полей', description: 'Съёмка границ и рельефа встроенной камерой для подготовки маршрута обработки.', module: 'Интерфейс планирования маршрута · не карта выполненного заказа', image: 'assets/mapping.png', alt: 'Интерфейс XAG с примером планирования полётного маршрута', request: 'Обсудить съёмку' }
  };
  const parts = {
    all: { value: '80 <span>кг</span>', title: 'Полезная нагрузка', description: 'Одна платформа для опрыскивания, внесения гранул, карт полей и перевозки грузов. Модуль выбирается под задачу.', stats: [['20 м/с','максимальная скорость платформы'],['13,8 м/с','максимум с RevoSling'],['IPX6K','защита от воды']] },
    tank: { value: '80 <span>л</span>', title: 'Бак и распыление', description: 'RevoSpray 5: меньше остановок на заправку, размер капли под культуру и норму внесения.', stats: [['32 л/мин','подача с двумя форсунками'],['46 л/мин','с комплектом из четырёх форсунок'],['5–10 м / 60–500 мкм','ширина обработки / размер капли']] },
    rotors: { value: '1600 <span>мм</span>', title: 'Карбоновые винты', description: 'Четыре складных винта создают подъёмную силу и нисходящий поток для проникновения раствора в растительный полог.', stats: [['4 × 63″','диаметр и количество винтов'],['до 80 кг','полезная нагрузка всей платформы'],['до 20 м/с','скорость платформы, не обороты винтов']] },
    battery: { value: '1050 <span>Вт·ч</span>', title: 'Аккумулятор B141050', description: 'Быстрая смена батарей сокращает паузы между вылетами. В режиме одного аккумулятора бак ограничен 50 л, нагрузка RevoCast — 40 кг.', stats: [['≈7 мин','30–95% с двумя зарядными устройствами'],['≈12 мин','30–95% с одним CM13600S'],['до 1500','циклов; гарантия — 1500 циклов или 12 месяцев']] },
    navigation: { value: '±10 <span>см</span>', title: 'Навигация и препятствия', description: 'RTK помогает точно вести маршрут, а 4D-радар обнаруживает препятствия. Показана вся платформа: внутренние датчики в 3D не воспроизводились.', stats: [['1,5–100 м','дальность обнаружения 4D-радара'],['до 20 га','картографирование за один полёт'],['XRTK 7','мобильная станция для RTK']] },
    spread: { value: '115 <span>л</span>', title: 'Бункер RevoCast 5', description: 'Сменный модуль для семян и удобрений. Здесь показано настоящее фото производителя: бункер не подменяется баком в 3D.', stats: [['до 300 кг/мин','подача; испытания на комплексном удобрении'],['5–9 м','ширина разбрасывания'],['1–10 мм','размер гранул']] }
  };
  const stage = document.querySelector('#drone-stage');
  const status = document.querySelector('#model-status');
  let viewerVisible = true;
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
    isolationButton.hidden = ['all','battery','navigation','spread'].includes(activePart);
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
    document.querySelector('#part-stats').replaceChildren(...item.stats.map(([value,label]) => {
      const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=label;dd.textContent=value;row.append(dt,dd);return row;
    }));
    document.querySelector('#machine-photo').hidden=activePart!=='spread';
    publishPart();
  }));
  isolationButton.addEventListener('click', () => { isolation = !isolation; publishPart(); });
  function preferences() {
    status.hidden = stage.dataset.state === 'ready' || !viewerVisible;
  }
  window.addEventListener('drone:visibility', e => { viewerVisible = e.detail; preferences(); });
  window.addEventListener('drone:ready', preferences);
  // Module loading is blocked by browsers for file://, and a failed module must never hide the page.
  if (location.protocol === 'file:') status.textContent = 'Для 3D откройте прототип через локальный сервер. Пока показан рендер.';
  const loadingDeadline = setTimeout(() => {
    if (!stage.dataset.state) status.textContent = '3D пока не загрузилась. Рендер, услуги и контакты доступны; попробуйте обновить страницу.';
  }, 20000);
  window.addEventListener('drone:ready', () => clearTimeout(loadingDeadline), { once: true });
  window.addEventListener('drone:error', () => { clearTimeout(loadingDeadline); status.hidden=false; status.textContent = '3D недоступна в этом браузере. Показываем сохранённый рендер.'; });

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
