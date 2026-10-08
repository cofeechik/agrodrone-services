(() => {
  const scenarios = {
    spray: { title: 'Опрыскивание', description: 'Внесение средств защиты растений и листовых подкормок над посевами, садами и виноградниками.', module: 'RevoSpray 5 · этот модуль показан в 3D', image: 'assets/service-spray.jpg', alt: 'XAG P150 MAX распыляет раствор над посадками', request: 'Рассчитать опрыскивание' },
    spread: { title: 'Удобрения и посев', description: 'Разбрасывание гранулированных удобрений, семян трав, риса, рапса и сидератов.', module: 'RevoCast 5 · внешняя реконструкция сменного модуля в 3D', image: 'assets/service-spread.jpg', alt: 'XAG P150 MAX с бункером RevoCast разбрасывает гранулы', request: 'Рассчитать внесение' },
    cargo: { title: 'Доставка грузов', description: 'Перевозка саженцев, удобрений и урожая на склонах и участках без подъездной дороги.', module: 'RevoSling · рама и умный крюк в 3D; подвес укорочен для показа, не рабочая конфигурация', image: 'assets/service-cargo.jpg', alt: 'XAG P150 MAX с грузовой платформой перевозит груз', request: 'Обсудить маршрут' },
    map: { title: 'Карты полей', description: 'Выберите участок в окрестностях Кокшетау и посмотрите демонстрационный проход со съёмкой. После полёта камера покажет покрытие и рельеф.', module: 'Настоящие карта и рельеф · границы участков и миссия демонстрационные', image: 'assets/mapping.png', alt: 'Интерфейс XAG с примером планирования полётного маршрута', request: 'Обсудить съёмку' }
  };
  const parts = {
    all: { value: '80 <span>кг</span>', title: 'Полезная нагрузка', description: 'Одна платформа для опрыскивания, внесения гранул, карт полей и перевозки грузов. Модуль выбирается под задачу.', stats: [['20 м/с','максимальная скорость платформы'],['13,8 м/с','максимум с RevoSling'],['IPX6K','защита от воды']] },
    tank: { value: '80 <span>л</span>', title: 'Бак RevoSpray 5', description: 'Ёмкость для рабочего раствора. Выделен сам бак: распылители показаны отдельно во вкладке «Опрыскивание».', stats: [['80 л','объём при двух аккумуляторах'],['50 л','ограничение при одном аккумуляторе'],['RevoSpray 5','система внесения раствора']] },
    spray: { value: '32 <span>л/мин</span>', title: 'Центробежные распылители', description: 'Два распылителя под задними лучами дозируют раствор и формируют каплю. Подсвечены распылители и их наружные подводящие шланги.', stats: [['46 л/мин','с комплектом из четырёх форсунок'],['60–500 мкм','регулируемый размер капли'],['5–10 м','ширина обработки']] },
    rotors: { value: '1600 <span>мм</span>', title: 'Карбоновые винты', description: 'Четыре складных винта создают подъёмную силу и нисходящий поток для проникновения раствора в растительный полог.', stats: [['4 × 63″','диаметр и количество винтов'],['до 80 кг','полезная нагрузка всей платформы'],['до 20 м/с','скорость платформы, не обороты винтов']] },
    battery: { value: '1050 <span>Вт·ч</span>', title: 'Аккумулятор B141050', description: 'Быстрая смена батарей сокращает паузы между вылетами. В режиме одного аккумулятора бак ограничен 50 л, нагрузка RevoCast — 40 кг.', stats: [['≈7 мин','30–95% с двумя зарядными устройствами'],['≈12 мин','30–95% с одним CM13600S'],['до 1500','циклов; гарантия — 1500 циклов или 12 месяцев']] },
    navigation: { value: '±10 <span>см</span>', title: 'Навигация и препятствия', description: 'Выберите участок для демонстрационного прохода или откройте датчики дрона: две вертикальные антенны связи и поперечный корпус 4D-радара. Внутренняя электроника не моделировалась.', stats: [['1,5–100 м','дальность обнаружения 4D-радара'],['до 20 га','картографирование за один полёт'],['XRTK 7','мобильная станция для RTK']] },
    spread: { value: '115 <span>л</span>', title: 'Бункер RevoCast 5', description: 'Сменный модуль для семян и удобрений. В 3D показана внешняя реконструкция RevoCast 5 с бункером, шнековой подачей и разбрасывающим диском.', stats: [['до 300 кг/мин','подача; испытания на комплексном удобрении'],['5–9 м','ширина разбрасывания'],['1–10 мм','размер гранул']] }
  };
  const stage = document.querySelector('#drone-stage');
  const status = document.querySelector('#model-status');
  let viewerVisible = true;
  let activePart = 'all';
  let isolation = true;
  const isolationButton = document.querySelector('#isolation-toggle');
  const navigationModeButton=document.createElement('button');navigationModeButton.type='button';navigationModeButton.className='viewer-mode-button';navigationModeButton.hidden=true;navigationModeButton.textContent='Датчики дрона';navigationModeButton.setAttribute('aria-pressed','false');document.querySelector('.machine-airspace').append(navigationModeButton);
  let navigationHardware=false;
  navigationModeButton.addEventListener('click',()=>{
    navigationHardware=!navigationHardware;navigationModeButton.textContent=navigationHardware?'Карта и маршрут':'Датчики дрона';navigationModeButton.setAttribute('aria-pressed',String(navigationHardware));
    window.dispatchEvent(new CustomEvent('drone:navigation-mode',{detail:navigationHardware?'hardware':'map'}));
  });
  const service = document.querySelector('#request-service');
  const form = document.querySelector('#prototype-request');
  const area = document.querySelector('#request-area');
  const crop = document.querySelector('#request-crop');
  const requestStatus = document.querySelector('#request-status');
  const retry = document.querySelector('#request-retry');
  const applicationAirspace = document.querySelector('.scenario-airspace');
  const applicationStatus = document.querySelector('#application-model-status');
  const applicationNote = document.querySelector('.application-stage-note');
  const applicationPhoto = document.querySelector('#application-photo');
  const machinePhoto = document.querySelector('#machine-photo');
  let activeScenario = 'spray';
  let spreadFallback = false;
  let payloadState = stage.dataset.payloadState || 'loading';
  const applicationStates = new Map();

  function showApplicationState(state, message) {
    applicationAirspace.dataset.state = state;
    const photoOnly = activeScenario === 'cargo' && stage.dataset.cargoState !== 'ready';
    applicationPhoto.hidden = !photoOnly && state !== 'fallback';
    applicationNote.textContent = scenarios[activeScenario].title + (photoOnly || state === 'fallback'
      ? ' · фото производителя' : ' · демонстрационная 3D-сцена');
    document.querySelector('#application-scene-description').textContent = photoOnly || state === 'fallback'
      ? 'Материал производителя XAG, демонстрация техники.' : activeScenario === 'map'
      ? 'Открытые данные Кокшетау. Участки и покрытие демонстрационные, не результат реальной съёмки.'
      : 'Внешняя 3D-реконструкция техники и иллюстрация её работы.';
    applicationStatus.hidden = photoOnly || state === 'ready';
    applicationStatus.textContent = message || (state === 'ready' ? '' : state === 'loading'
      ? 'Загружаем 3D-сцену. Фото производителя доступно ниже.'
      : '3D-сцена недоступна. Откройте фото производителя ниже; услуги и форма работают.');
  }
  // 3D owns readiness: detail { scenario: key, state: loading|ready|fallback, message? }.
  window.addEventListener('drone:application-status', event => {
    const detail = event.detail || {};
    const key = detail.scenario || activeScenario;
    if (!scenarios[key] || !['loading', 'ready', 'fallback'].includes(detail.state)) return;
    const state=stage.dataset.state==='fallback'?'fallback':detail.state;
    applicationStates.set(key, { state, message: detail.message });
    if (key === activeScenario) showApplicationState(state, detail.message);
  });
  function updateMachinePhoto() { machinePhoto.hidden = activePart !== 'spread' || !spreadFallback; }
  function refreshPayloadStatus(message) {
    const rendererReady=stage.dataset.state==='ready';
    spreadFallback = payloadState === 'error' || stage.dataset.state==='fallback' || location.protocol==='file:';
    updateMachinePhoto();
    if (activePart === 'spread') {
      status.hidden = payloadState === 'ready' && rendererReady;
      status.textContent = message || (spreadFallback
        ? 'Модуль RevoCast 5 не загрузился. Показываем фото производителя.'
        : 'Загружаем 3D-модуль RevoCast 5.');
    }
    if (activeScenario === 'spread') showApplicationState(spreadFallback?'fallback':rendererReady&&payloadState==='ready'?'ready':'loading', message);
  }
  window.addEventListener('drone:payload', event => {
    const detail = event.detail || {};
    if (!['loading', 'ready', 'error'].includes(detail.state)) return;
    payloadState = detail.state;
    refreshPayloadStatus(detail.message);
  });
  // A modeled module stays primary; its manufacturer photo appears only on runtime failure.
  window.addEventListener('drone:module-status', event => {
    const detail = event.detail || {};
    if (detail.part !== 'spread' || !['loading', 'ready', 'fallback'].includes(detail.state)) return;
    spreadFallback = detail.state === 'fallback';
    updateMachinePhoto();
    if (activePart === 'spread' && detail.state !== 'ready') {
      status.hidden = false;
      status.textContent = detail.message || (spreadFallback
        ? 'Модуль RevoCast 5 не загрузился. Показываем фото производителя.'
        : 'Загружаем 3D-модуль RevoCast 5.');
    }
  });

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
    activeScenario = key;
    applicationAirspace.dataset.scenario = key;
    const knownState = applicationStates.get(key);
    showApplicationState(knownState?.state || (stage.dataset.state === 'fallback' ? 'fallback' : stage.dataset.state === 'ready' ? 'ready' : 'loading'), knownState?.message);
    if (key === 'spread' && stage.dataset.state !== 'fallback') refreshPayloadStatus();
    applicationPhoto.hidden = true; // Never show the previous service photo while decoding a new scenario.
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
      applicationPhoto.src = item.image; applicationPhoto.width = image.naturalWidth; applicationPhoto.height = image.naturalHeight;
      applicationPhoto.hidden = !(activeScenario === 'cargo' && stage.dataset.cargoState !== 'ready') && applicationAirspace.dataset.state !== 'fallback';
      document.querySelector('.scenario-photo').dataset.scenario = key;
      document.querySelector('#scenario-credit').textContent = key === 'map' ? 'Материал производителя XAG · демонстрационный интерфейс' : 'Фото производителя XAG · демонстрация работы техники';
    }).catch(() => {
      if (sequence !== photoRequest) return;
      document.querySelector('#scenario-credit').textContent = 'Фото выбранного сценария не загрузилось. Пока показан предыдущий снимок.';
      if (activeScenario === 'cargo' || applicationAirspace.dataset.state === 'fallback') {
        applicationStatus.hidden = false;
        applicationStatus.textContent = 'Фото выбранного сценария не загрузилось. Попробуйте обновить страницу; услуги и форма доступны.';
      }
    });
    window.dispatchEvent(new CustomEvent('drone:scenario', { detail: key }));
  }));
  function publishPart() {
    navigationModeButton.hidden=activePart!=='navigation';
    isolationButton.hidden = ['all','spread','navigation'].includes(activePart);
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
    updateMachinePhoto();
    if (activePart === 'spread') refreshPayloadStatus();
    preferences();
    publishPart();
  }));
  isolationButton.addEventListener('click', () => { isolation = !isolation; publishPart(); });
  function preferences() {
    const r=document.querySelector('#machine').getBoundingClientRect();
    const equipmentVisible=r.top<innerHeight&&r.bottom>document.querySelector('.header').offsetHeight;
    status.hidden = !equipmentVisible || (stage.dataset.state === 'ready' && !(activePart === 'spread' && payloadState !== 'ready'));
  }
  window.addEventListener('scroll',preferences,{passive:true});
  window.addEventListener('drone:visibility', e => { viewerVisible = e.detail; preferences(); });
  window.addEventListener('drone:ready', () => {
    preferences();
    showApplicationState('ready');
    payloadState = stage.dataset.payloadState || payloadState;
    refreshPayloadStatus();
  });
  // Module loading is blocked by browsers for file://, and a failed module must never hide the page.
  if (location.protocol === 'file:') {
    status.textContent = 'Для 3D откройте прототип через локальный сервер. Пока показан рендер.';
    showApplicationState('fallback', 'Для 3D откройте прототип через локальный сервер. Фото производителя доступно ниже.');
  }
  const loadingDeadline = setTimeout(() => {
    if (!stage.dataset.state) status.textContent = '3D пока не загрузилась. Рендер, услуги и контакты доступны; попробуйте обновить страницу.';
  }, 20000);
  const applicationDeadline = setTimeout(() => {
    if (applicationAirspace.dataset.state === 'loading') showApplicationState('fallback', '3D-сцена пока не загрузилась. Фото производителя доступно ниже; попробуйте обновить страницу.');
  }, 20000);
  window.addEventListener('drone:application-status', event => {
    if ((event.detail?.scenario || activeScenario) === activeScenario && event.detail?.state !== 'loading') clearTimeout(applicationDeadline);
  });
  window.addEventListener('drone:ready', () => clearTimeout(loadingDeadline), { once: true });
  window.addEventListener('drone:error', () => {
    clearTimeout(loadingDeadline); clearTimeout(applicationDeadline);
    applicationStates.clear(); showApplicationState('fallback');
    spreadFallback = true; updateMachinePhoto();
    status.hidden=false; status.textContent = activePart === 'spread'
      ? '3D недоступна в этом браузере. Показываем фото производителя RevoCast 5.'
      : '3D недоступна в этом браузере. Показываем сохранённый рендер.';
  });

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
