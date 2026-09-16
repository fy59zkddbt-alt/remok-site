'use strict';

// Актуальные публичные контакты V4: единое место для замены.
const CONTACTS = {
  phoneDisplay: '+7 905 955-50-06',
  phone: '+79059555006',
  whatsapp: "https://wa.me/79059555006?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%2C%20%D1%85%D0%BE%D1%87%D1%83%20%D1%80%D0%B0%D1%81%D1%81%D1%87%D0%B8%D1%82%D0%B0%D1%82%D1%8C%20%D1%81%D1%82%D0%BE%D0%B8%D0%BC%D0%BE%D1%81%D1%82%D1%8C%20%D0%BE%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%D0%BB%D0%B8%20%D0%BE%D1%82%D0%B4%D0%B5%D0%BB%D0%BA%D0%B8",
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
// Заявка хранится только в памяти страницы до перезагрузки. Сетевых запросов нет.
const prototypeState = { lastRequest: null };

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
  calculator.querySelector('.form-status').hidden = true;
  if (!valid) return;

  const width = widthInput.valueAsNumber;
  const height = heightInput.valueAsNumber;
  if (calculatorType === 'glazing') {
    const profile = calculator.elements.namedItem('profile').value;
    const result = calculateGlazing(width, height, profile);
    currentCalculation = { calculatorType, width, height, profile, price: result.price };
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
      return;
    }
    const finishingVariant = calculator.elements.namedItem('finish').value;
    currentCalculation = { calculatorType, width, height, depth, finishingVariant, price: prices[finishingVariant] };
    document.querySelectorAll('[data-finish-price]').forEach(output => {
      output.textContent = `≈ ${formatPrice(prices[output.dataset.finishPrice])}`;
    });
    document.querySelector('#finish-summary').textContent = `Выбрано: ${PRICING.finishing.variants[finishingVariant].name}. Ориентировочно ${formatPrice(prices[finishingVariant])}.`;
  }
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

// Формы прототипа: валидация, подготовка объекта заявки, без отправки и хранения на диске.
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
    form.querySelector('.form-status').hidden = true;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validatePhone()) { phone.reportValidity(); return; }
    if (form === calculator) {
      updateCalculation();
      if (!currentCalculation) { form.reportValidity(); return; }
      prototypeState.lastRequest = { ...currentCalculation, phone: phone.value.trim() };
    } else {
      prototypeState.lastRequest = { calculatorType: null, phone: phone.value.trim() };
    }
    const status = form.querySelector('.form-status');
    status.textContent = 'Это прототип: данные не отправлены. Для связи воспользуйтесь телефоном или мессенджером.';
    status.hidden = false;
  });
});

}
