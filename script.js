'use strict';

// Актуальные публичные контакты V4: единое место для замены.
const CONTACTS = {
  phoneDisplay: '+7 905 955-50-06',
  phone: '+79059555006',
  max: "https://max.ru/u/f9LHodD0cOJ4aYRBqU1mQyNp67MUEM86ByT9lwaMOyiDO4nb9DzO4GPVeDw",
  telegram: "https://t.me/LPzxcvb"
};

// Ставки остекления за м², коэффициенты отделки и пороги условий заказа.
// Все суммы в рублях. Размеры интерфейса — мм; формулы отделки — метры.
const PRICING = {
  glazing: {
    exprof: { name: 'Exprof XS570 Siberica', label: 'Практичный', rate: 16500 },
    veka: { name: 'VEKA Softline 70', label: 'Стандарт', rate: 18000 },
    rehau: { name: 'REHAU Sib-Design', label: 'Премиальный', rate: 22000 }
  },
  inflationMultiplier: 1.2,
  rounding: 100,
  limits: { width: [300, 7500], height: [300, 4000], depth: [1, Infinity] },
  finishing: {
    sillWidthAllowance: 0.2,
    sills: {
      bfk: { depthRate: 1400, fixed: 200 },
      moeller: { depthRate: 8300, fixed: 250 },
      moellerLD: { depthRate: 15300, fixed: 250 }
    },
    slopes: {
      sandwich: { depthRate: 500, fixed: 240, accessories: 0 },
      qunell: { depthRate: 2000, fixed: 200, accessories: 440 },
      qunellColor: { depthRate: 6200, fixed: 200, accessories: 880 }
    },
    paint: { baseMultiplier: 1.1, areaRate: 2500 },
    variants: {
      basic: { tier: 'Базовый', name: 'Сэндвич-откосы + подоконник БФК', sill: 'bfk', slope: 'sandwich', divisor: 0.5, installation: 2500 },
      comfort: { tier: 'Комфорт', name: 'Сэндвич-откосы + подоконник Möller', sill: 'moeller', slope: 'sandwich', divisor: 0.65, installation: 3000 },
      premium: { tier: 'Премиум', name: 'Qunell белый + подоконник Möller', sill: 'moeller', slope: 'qunell', divisor: 0.65, installation: 3500 },
      basicPaint: { name: 'Сэндвич + БФК + полная покраска', sill: 'bfk', slope: 'sandwich', divisor: 0.5, installation: 2500, paint: true },
      qunellBFK: { name: 'Qunell белый + БФК', sill: 'bfk', slope: 'qunell', divisor: 0.65, installation: 3000 },
      qunellMoellerLD: { name: 'Qunell белый + Möller LD', sill: 'moellerLD', slope: 'qunell', divisor: 0.65, installation: 3500 },
      qunellColor: { name: 'Qunell цветной + Möller', sill: 'moeller', slope: 'qunellColor', divisor: 0.65, installation: 3500 }
    }
  },
  volumeConditions: [
    { minArea: 11, discount: '12–15%', months: 12 },
    { minArea: 9, discount: 'до 10%', months: 9 },
    { minArea: 8, discount: '7–9%', months: 6 },
    { minArea: 5, discount: '5–6%', months: 3 }
  ]
};

const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const areaFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
const roundPrice = value => Math.round(value / PRICING.rounding) * PRICING.rounding;
const formatPrice = value => `${money.format(value)} ₽`;

function calculateGlazing(width, height, profile) {
  const area = width * height / 1000000;
  return { area, price: roundPrice(area * PRICING.glazing[profile].rate) };
}

// Формулы отделки: (подоконник + откосы + комплектующие) / делитель + монтаж.
// Покраска: промежуточная сумма ×1.1 + площадь покраски ×2500.
// Финальный коэффициент ВСЕХ семи вариантов — PRICING.inflationMultiplier (×1.2).
function calculateFinishing(width, height, depth) {
  const w = width / 1000;
  const h = height / 1000;
  const d = depth / 1000;
  const config = PRICING.finishing;
  const sillLength = w + config.sillWidthAllowance;
  const slopeLength = w + 2 * h;
  return Object.fromEntries(Object.entries(config.variants).map(([key, variant]) => {
    const sill = config.sills[variant.sill];
    const slope = config.slopes[variant.slope];
    const sillCost = sillLength * (sill.depthRate * d + sill.fixed);
    const slopeCost = slopeLength * (slope.depthRate * d + slope.fixed);
    let subtotal = (sillCost + slopeCost + slope.accessories) / variant.divisor + variant.installation;
    if (variant.paint) {
      subtotal = subtotal * config.paint.baseMultiplier
        + (sillLength + slopeLength) * d * config.paint.areaRate;
    }
    return [key, roundPrice(subtotal * PRICING.inflationMultiplier)];
  }));
}

// Логика скидок: только показываем доступные условия, не уменьшаем цену.
function getVolumeCondition(area) {
  return PRICING.volumeConditions.find(condition => area >= condition.minArea) || null;
}

const phoneDisplay = CONTACTS.phoneDisplay;
document.querySelectorAll('[data-phone], [data-phone-icon]').forEach(link => {
  link.href = `tel:${CONTACTS.phone}`;
  if (link.hasAttribute('data-phone')) link.textContent = phoneDisplay;
  else link.setAttribute('aria-label', `Позвонить ${phoneDisplay}`);
});

document.querySelectorAll('[data-contact]').forEach(link => {
  const type = link.dataset.contact;
  link.href = type === 'call' ? 'tel:' + CONTACTS.phone : CONTACTS[type];
  if (type !== 'call') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
});

// Навигация: мобильное меню и оформление закреплённой шапки.
const header = document.querySelector('header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  navigation.classList.remove('open');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu(); menuButton.focus();
  }
});
document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
window.matchMedia('(min-width: 1024px)').addEventListener('change', closeMenu);
function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 8); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// На страницах кейсов остаются только контакты и навигация.
if (document.querySelector("#calculator-form")) {
// Интерфейс калькулятора. Ставки и названия берутся из конфигурации выше.
const calculator = document.querySelector('#calculator-form');
let calculatorType = 'glazing';
let currentCalculation = null;
let activeTildaSubmission = null;
const leadFields = ['form_source', 'page_url', 'calculator_type', 'calculator_result', 'calculator_parameters', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const utmKeys = leadFields.filter(key => key.startsWith('utm_'));
const query = new URLSearchParams(location.search);
const utm = Object.fromEntries(utmKeys.map(key => [key, query.get(key) || '']));
// Снимок параметров текущей страницы; без cookies и переноса старой кампании.
function syncLeadFields() {
  document.querySelectorAll('.prototype-form').forEach(form => {
    const calculation = currentCalculation;
    const source = form === calculator ? 'calculator_' + calculatorType : 'final_cta';
    const fields = {
      ...utm, form_source: source, page_url: location.href,
      calculator_type: calculation?.type || '',
      calculator_parameters: calculation ? JSON.stringify(calculation.parameters) : '',
      calculator_result: calculation ? JSON.stringify({
        price: calculation.price, currency: 'RUB',
        discount: calculation.discount, installment_months: calculation.installment
      }) : ''
    };
    leadFields.forEach(key => { form.elements.namedItem(key).value = fields[key]; });
  });
  syncCalculationToTilda();
}

function formatCalculationText(calculation) {
  let text = '';
  if (calculation) {
    const { type, parameters: p, price, discount, installment } = calculation;
    const lines = type === 'glazing'
      ? [
          'Тип: Остекление',
          'Размер: ' + p.width_mm + ' × ' + p.height_mm + ' мм',
          'Площадь: ' + areaFormat.format(p.area_m2) + ' м²',
          'Профиль: ' + p.profile,
          'Предварительная стоимость: ' + formatPrice(price)
        ]
      : [
          'Тип: Отделка',
          'Размер окна: ' + p.width_mm + ' × ' + p.height_mm + ' мм',
          'Глубина откоса: ' + p.depth_mm + ' мм',
          'Вариант: ' + p.variant,
          'Предварительная стоимость: ' + formatPrice(price)
        ];
    if (type === 'glazing' && (discount || installment)) {
      const conditions = [];
      if (discount) conditions.push('скидка ' + discount);
      if (installment) conditions.push('рассрочка до ' + installment + ' мес.');
      lines.push('Условия: ' + conditions.join(' или '));
    }
    text = lines.join('\n');
  }
  return text;
}

// POC сохраняется, но не перезаписывает снимок заявки во время отправки.
function syncCalculationToTilda() {
  const fields = [...document.querySelectorAll('textarea[name="calculator_result"]')].filter(element => element.form && !element.closest('.prototype-form'));
  if (fields.length !== 1) return false;
  if (activeTildaSubmission) return true;
  setTildaValue(fields[0], formatCalculationText(currentCalculation));
  return true;
}

// До 20 попыток за 10 секунд; последующие расчёты тоже выполняют поиск.
function waitForTildaCalculationField(attempt = 0) {
  const found = syncCalculationToTilda();
  if (!found && attempt < 19) {
    setTimeout(() => waitForTildaCalculationField(attempt + 1), 500);
    return;
  }
  const localDebug = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (localDebug && window.REMOK_DEBUG_LEADS === true) {
    console.debug(found ? 'Tilda calculator_result field found' : 'Tilda calculator_result field not found');
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => waitForTildaCalculationField(), { once: true });
} else {
  waitForTildaCalculationField();
}

// TILDA FORM INTEGRATION POINT
// Только штатная кнопка Tilda; никаких собственных запросов или endpoint.
const bridgeErrorText = 'Не удалось отправить заявку. Позвоните нам или напишите в Telegram/MAX.';
function bridgeDebug(message) {
  if (window.REMOK_DEBUG_LEADS === true) console.debug('Tilda bridge: ' + message);
}
function showLeadStatus(form, message) {
  if (message.startsWith(bridgeErrorText)) bridgeDebug('error');
  const status = form.querySelector('.form-status');
  status.textContent = message;
  status.hidden = false;
}
function findTildaTarget() {
  const fields = [...document.querySelectorAll('textarea[name="calculator_result"]')]
    .filter(field => field.closest('form') && !field.closest('.prototype-form'));
  const result = fields.length === 1 ? fields[0] : null;
  const form = result?.closest('form');
  const technical = Boolean(form?.matches('.t-form.js-form-proccess'));
  const names = technical ? [...form.querySelectorAll('input[name="Name"]')]
    .filter(input => input.form === form && !input.disabled) : [];
  const phones = technical ? [...form.querySelectorAll('input[name="phone"]')]
    .filter(input => input.form === form && !input.disabled) : [];
  const buttons = technical ? [...form.querySelectorAll('button[type="submit"], input[type="submit"]')]
    .filter(button => button.form === form && !button.disabled) : [];
  bridgeDebug('Tilda form found = ' + technical);
  bridgeDebug('Tilda Name found = ' + (names.length === 1));
  bridgeDebug('Tilda phone found = ' + (phones.length === 1));
  bridgeDebug('Tilda calculator_result found = ' + Boolean(result));
  if (!technical || names.length !== 1 || phones.length !== 1 || buttons.length !== 1) {
    bridgeDebug('aborted: technical form fields or submit missing/ambiguous');
    return null;
  }
  return { form, result, name: names[0], phone: phones[0], button: buttons[0] };
}
// Резервный native setter только если обычное присвоение не сохранило строку.
// POC и общий setter textarea не изменяются.
function setTildaLeadInput(field, value) {
  const text = String(value || '');
  setTildaValue(field, text);
  if (field.value !== text) {
    const prototype = field.ownerDocument.defaultView.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
function setTildaValue(field, value) {
  if (field.value === value) return;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}
function formatLeadMessage(data) {
  let calculation = null;
  if (data.calculator_type) {
    const result = JSON.parse(data.calculator_result);
    calculation = {
      type: data.calculator_type, parameters: JSON.parse(data.calculator_parameters),
      price: result.price, discount: result.discount, installment: result.installment_months
    };
  }
  const lines = [
    'Источник формы: ' + (data.form_source === 'final_cta' ? 'Финальный CTA' : 'Калькулятор'),
    'Имя: ' + (data.name || ''), 'Телефон: ' + data.phone, '',
    calculation ? formatCalculationText(calculation) : 'Расчёт: не выполнялся',
    '', 'Страница: ' + data.page_url
  ];
  utmKeys.forEach(key => { if (data[key]) lines.push('UTM ' + key.slice(4) + ': ' + data[key]); });
  return lines.join('\n');
}
function submitLead(formData, sourceForm) {
  if (activeTildaSubmission) return;
  if (!sourceForm?.matches('.prototype-form') || !sourceForm.reportValidity()) return;
  // FormData построен обработчиком именно из event.currentTarget, а не первой формы страницы.
  const data = Object.fromEntries(formData.entries());
  const namePresent = Boolean(String(data.name || '').trim());
  const phonePresent = Boolean(String(data.phone || '').trim());
  const sources = ['calculator_glazing', 'calculator_finishing', 'final_cta'];
  bridgeDebug('REMOK lead: name present = ' + namePresent);
  bridgeDebug('REMOK lead: phone present = ' + phonePresent);
  bridgeDebug('REMOK lead: form_source = ' + (sources.includes(data.form_source) ? data.form_source : 'unknown'));
  bridgeDebug('REMOK lead: calculation present = ' + Boolean(data.calculator_type && data.calculator_result));
  if (!namePresent || !phonePresent) {
    bridgeDebug('aborted: REMOK source ' + (!namePresent ? 'name' : 'phone') + ' missing');
    showLeadStatus(sourceForm, bridgeErrorText);
    return;
  }
  if (sourceForm === calculator && !data.calculator_type) return;
  const target = findTildaTarget();
  if (!target) {
    console.warn('Tilda bridge: reliable form/name/phone/result/submit not found; submission stopped');
    showLeadStatus(sourceForm, bridgeErrorText);
    return;
  }
  bridgeDebug('technical form found');
  bridgeDebug('name field found');
  bridgeDebug('phone field found');
  bridgeDebug('calculator_result found');

  try {
    setTildaLeadInput(target.name, data.name);
    setTildaLeadInput(target.phone, data.phone);
    setTildaValue(target.result, formatLeadMessage(data));
    bridgeDebug('fields populated');
  } catch {
    console.warn('Tilda bridge: field preparation failed; submission stopped');
    showLeadStatus(sourceForm, bridgeErrorText);
    return;
  }
  const namePopulated = Boolean(target.name.value.trim());
  const phonePopulated = Boolean(target.phone.value.trim());
  const resultPopulated = Boolean(target.result.value.trim());
  bridgeDebug('Tilda Name populated = ' + namePopulated);
  bridgeDebug('Tilda phone populated = ' + phonePopulated);
  if (!namePopulated || !phonePopulated || !resultPopulated ||
      target.name.value !== String(data.name) || target.phone.value !== String(data.phone)) {
    const stage = !namePopulated ? 'Tilda Name not populated' :
      !phonePopulated ? 'Tilda phone not populated' :
      !resultPopulated ? 'Tilda calculator_result not populated' : 'Tilda field value changed';
    bridgeDebug('aborted: ' + stage);
    showLeadStatus(sourceForm, bridgeErrorText);
    return;
  }
  // Маска не должна молча обрезать/изменять номер.
  if (target.phone.value.replace(/\D/g, '') !== data.phone.replace(/\D/g, '')) {
    console.warn('Tilda bridge: phone mask changed digits; submission stopped');
    showLeadStatus(sourceForm, bridgeErrorText);
    target.phone.focus();
    return;
  }
  // Не отключаем обязательные поля или согласия Tilda, не подставляем фиктивный Email.
  const missing = [...target.form.elements].find(field =>
    !field.disabled && field.type !== 'hidden' &&
    (field.required || field.getAttribute('data-tilda-req') === '1') &&
    (['checkbox', 'radio'].includes(field.type) ? !field.checked : !String(field.value || '').trim()));
  if (missing || !target.form.checkValidity()) {
    console.warn('Tilda bridge: native required field/validation prevents submission');
    showLeadStatus(sourceForm, bridgeErrorText + ' Проверьте обязательные поля в форме Tilda ниже.');
    target.form.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (missing) missing.focus();
    else target.form.reportValidity();
    return;
  }

  // Один технический канал для обеих форм: блокируем и повтор, и параллельную заявку.
  const buttons = [...document.querySelectorAll('.prototype-form button[type="submit"]')];
  const disabledBefore = buttons.map(button => button.disabled);
  buttons.forEach(button => { button.disabled = true; });
  sourceForm.setAttribute('aria-busy', 'true');
  showLeadStatus(sourceForm, 'Отправляем…');
  const submission = { sourceForm, target };
  activeTildaSubmission = submission;
  let observer;
  let timeout;
  function preventFallback(event) {
    // Не допускаем обычный HTML POST/перезагрузку, если скрипт Tilda ещё не инициализирован.
    // Обработчики Tilda продолжают получать submit (без stopPropagation).
    event.preventDefault();
  }
  function finish(success) {
    if (activeTildaSubmission !== submission) return;
    clearTimeout(timeout);
    observer.disconnect();
    target.form.removeEventListener('tildaform:aftersuccess', onSuccess);
    target.form.removeEventListener('submit', preventFallback);
    activeTildaSubmission = null;
    buttons.forEach((button, index) => { button.disabled = disabledBefore[index]; });
    sourceForm.removeAttribute('aria-busy');
    if (success) bridgeDebug('success');
    showLeadStatus(sourceForm, success
      ? 'Заявка отправлена. Мы свяжемся с вами.'
      : bridgeErrorText);
  }
  // Документированное событие: https://help.tilda.cc/tips/javascript
  function onSuccess(event) {
    if (event.target === target.form) finish(true);
  }
  const errorSelector = '.js-errorbox-all, .t-input-error';
  const visibleError = element => element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden' && Boolean(element.textContent.trim());
  const errorsBefore = new Map([...target.form.querySelectorAll(errorSelector)]
    .map(element => [element, visibleError(element)]));
  observer = new MutationObserver(records => {
    for (const element of target.form.querySelectorAll(errorSelector)) {
      const visible = visibleError(element);
      // Учитываем новый показ ошибки, а не старое сообщение предыдущей попытки.
      const changed = records.some(record =>
        (record.target === element || element.contains(record.target)) &&
        (record.type === 'childList' || record.type === 'characterData' ||
         (record.attributeName === 'style' && /display\s*:\s*none/.test(record.oldValue || ''))));
      if (visible && (!errorsBefore.get(element) || changed)) { finish(false); return; }
      errorsBefore.set(element, visible);
    }
  });
  target.form.addEventListener('tildaform:aftersuccess', onSuccess);
  target.form.addEventListener('submit', preventFallback);
  observer.observe(target.form, { subtree: true, attributes: true, attributeOldValue: true, childList: true, characterData: true });
  // Неизвестный итог не равен ошибке: не разрешаем повтор, пока Tilda ещё может доставить заявку.
  timeout = setTimeout(() => {
    if (activeTildaSubmission === submission) {
      showLeadStatus(sourceForm, 'Подтверждение отправки пока не получено. Не отправляйте повторно; проверьте форму Tilda ниже или свяжитесь с нами.');
    }
  }, 45000);
  try {
    bridgeDebug('submit triggered');
    target.button.click();
  } catch {
    finish(false);
  }
}

document.querySelector('#glazing-profiles').innerHTML = Object.entries(PRICING.glazing).map(([key, profile], index) =>
  `<label><input type="radio" name="profile" value="${key}" ${index === 0 ? 'checked' : ''}><span><strong>${profile.name}</strong><small>${profile.label} вариант</small></span></label>`
).join('');
Object.entries(PRICING.finishing.variants).forEach(([key, variant]) => {
  const parent = document.querySelector(variant.tier ? '#finish-main' : '#finish-additional');
  const label = document.createElement('label');
  label.className = 'finish-option';
  label.innerHTML = `<input type="radio" name="finish" value="${key}" ${key === 'basic' ? 'checked' : ''} disabled><span class="finish-card">${variant.tier ? `<strong>${variant.tier}</strong>` : ''}<span class="finish-name">${variant.name}</span><output data-finish-price="${key}">—</output></span>`;
  parent.append(label);
});

const widthInput = calculator.elements.namedItem('width');
const heightInput = calculator.elements.namedItem('height');
const depthInput = calculator.elements.namedItem('depth');
const inputMap = { width: widthInput, height: heightInput, depth: depthInput };
Object.entries(inputMap).forEach(([key, input]) => {
  input.min = PRICING.limits[key][0];
  if (Number.isFinite(PRICING.limits[key][1])) input.max = PRICING.limits[key][1];
});

function updateCalculation() {
  const activeInputs = calculatorType === 'glazing' ? [widthInput, heightInput] : [widthInput, heightInput, depthInput];
  const invalid = activeInputs.filter(input => input.validity.badInput || (input.value !== '' && !input.validity.valid));
  activeInputs.forEach(input => input.setAttribute('aria-invalid', String(invalid.includes(input))));
  const error = document.querySelector('#dimension-error');
  error.hidden = invalid.length === 0;
  error.textContent = invalid.length ? 'Проверьте размеры: ширина 300–7500 мм, высота 300–4000 мм, глубина — положительное число. Все значения — целые миллиметры.' : '';
  const valid = activeInputs.every(input => input.value !== '' && input.validity.valid && Number.isFinite(input.valueAsNumber));
  currentCalculation = null;
  document.querySelector('#volume-offer').hidden = true;
  document.querySelector('#glazing-price').textContent = '—';
  document.querySelector('#area-summary').textContent = 'Введите ширину и высоту окна';
  document.querySelectorAll('[data-finish-price]').forEach(output => { output.textContent = '—'; });
  document.querySelector('#finish-summary').textContent = 'Введите ширину, высоту и глубину откоса — покажем стоимость вариантов.';
  if (!activeTildaSubmission) calculator.querySelector('.form-status').hidden = true;
  if (!valid) { syncLeadFields(); return; }

  const width = widthInput.valueAsNumber;
  const height = heightInput.valueAsNumber;
  if (calculatorType === 'glazing') {
    const profile = calculator.elements.namedItem('profile').value;
    const result = calculateGlazing(width, height, profile);
    const available = getVolumeCondition(result.area);
    currentCalculation = {
      type: 'glazing', parameters: { width_mm: width, height_mm: height, area_m2: result.area, profile: PRICING.glazing[profile].name },
      price: result.price, discount: available?.discount || '', installment: available?.months || ''
    };
    document.querySelector('#glazing-price').textContent = formatPrice(result.price);
    document.querySelector('#area-summary').textContent = `Площадь ${areaFormat.format(result.area)} м²`;
    const condition = getVolumeCondition(result.area);
    if (condition) {
      document.querySelector('#volume-message').textContent = `Можно обсудить скидку ${condition.discount} или рассрочку до ${condition.months} месяцев`;
      document.querySelector('#volume-offer').hidden = false;
    }
  } else {
    const depth = depthInput.valueAsNumber;
    const prices = calculateFinishing(width, height, depth);
    if (!Object.values(prices).every(Number.isFinite)) {
      error.hidden = false;
      error.textContent = 'Проверьте глубину откоса: значение слишком велико для расчёта.';
      syncLeadFields();
      return;
    }
    const finishingVariant = calculator.elements.namedItem('finish').value;
    currentCalculation = {
      type: 'finishing', parameters: { width_mm: width, height_mm: height, depth_mm: depth, variant: PRICING.finishing.variants[finishingVariant].name },
      price: prices[finishingVariant], discount: '', installment: ''
    };
    document.querySelectorAll('[data-finish-price]').forEach(output => {
      output.textContent = `≈ ${formatPrice(prices[output.dataset.finishPrice])}`;
    });
    document.querySelector('#finish-summary').textContent = `Выбрано: ${PRICING.finishing.variants[finishingVariant].name}. Ориентировочно ${formatPrice(prices[finishingVariant])}.`;
  }
  syncLeadFields();
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(type) {
  calculatorType = type;
  tabs.forEach(tab => {
    const selected = tab.dataset.tab === type;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !selected;
    panel.querySelectorAll('input').forEach(input => { input.disabled = !selected; });
  });
  updateCalculation();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = tabs[1 - index];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (next) { event.preventDefault(); activateTab(next.dataset.tab); next.focus(); }
  });
});

const moreButton = document.querySelector('#more-options');
moreButton.addEventListener('click', () => {
  const open = moreButton.getAttribute('aria-expanded') !== 'true';
  moreButton.setAttribute('aria-expanded', String(open));
  moreButton.innerHTML = `${open ? 'Скрыть дополнительные варианты' : 'Показать ещё варианты'} <span aria-hidden="true">${open ? '−' : '+'}</span>`;
  const extra = document.querySelector('#finish-extra');
  extra.inert = !open;
  extra.classList.toggle('is-open', open);
});
calculator.addEventListener('input', event => {
  if (event.target.matches('input[type="number"], input[type="radio"]')) updateCalculation();
});
updateCalculation();

// Формы REMOK: валидация и единый штатный мост Tilda.
document.querySelectorAll('.prototype-form').forEach(form => {
  const phone = form.elements.namedItem('phone');
  function validatePhone() {
    const digits = phone.value.replace(/\D/g, '');
    const valid = /^[+\d\s()−-]+$/.test(phone.value) && digits.length >= 10 && digits.length <= 15;
    phone.setCustomValidity(valid ? '' : 'Введите номер телефона: от 10 до 15 цифр.');
    return valid;
  }
  phone.addEventListener('input', () => {
    validatePhone();
    if (!activeTildaSubmission) form.querySelector('.form-status').hidden = true;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (activeTildaSubmission) return;
    if (!validatePhone()) { phone.reportValidity(); return; }
    if (!form.reportValidity()) return;
    if (form === calculator && !currentCalculation) return;
    syncLeadFields();
    const sourceForm = event.currentTarget;
    submitLead(new FormData(sourceForm), sourceForm);
  });
});

}
