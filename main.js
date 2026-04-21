/* =========================================================================
   AI-Брусника · лендинг v3 (апрель 2026)
   Цифры обновлены по v13.2 документа.
   ПРОИЗВОДИТЕЛЬНОСТЬ: убраны ScrollTrigger pin, Lenis и параллакс —
   заменены на native scroll + CSS scroll-snap + IntersectionObserver.
   ========================================================================= */

/* =========================================================================
   UTILITIES
   ========================================================================= */
const easeOut = t => 1 - Math.pow(1 - t, 3);

function animateCounter(el, from, to, duration, format) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = format(from + (to - from) * easeOut(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================================
   NATIVE SMOOTH SCROLL для якорных ссылок
   (Lenis убран — он добавлял нагрузку на каждый кадр через RAF)
   ========================================================================= */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.pageYOffset - 40;
        window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
    }
  });
});

/* =========================================================================
   HERO — reveal on load
   ========================================================================= */
const heroLines = document.querySelectorAll('.hero-title .line');
heroLines.forEach((el, i) => setTimeout(() => el.classList.add('in'), 120 * i + 80));

setTimeout(() => {
  ['.hero-lead', '.hero-lead-2', '.hero-score', '.hero-micro'].forEach(sel => {
    document.querySelector(sel)?.classList.add('in');
  });
}, 500);

/* =========================================================================
   INTERSECTIONOBSERVER: GENERIC REVEAL
   ========================================================================= */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add('in');
    revealIO.unobserve(el);
  });
}, { rootMargin: '-8% 0px', threshold: 0.05 });

document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

/* =========================================================================
   BACKGROUND SECTION TRANSITIONS
   ========================================================================= */
const bgColors = {
  hero:   '#000',
  losses: '#070708',
  mixer:  '#0a0612',
  system: '#040408',
  day:    '#0b0508',
  econ:   '#050a08',
  pilot:  '#060608',
  wait:   '#0b0605',
  cta:    '#060508',
};
const bgIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.body.style.backgroundColor = bgColors[entry.target.id] ?? '#000';
    }
  });
}, { rootMargin: '-40% 0px', threshold: 0 });

Object.keys(bgColors).forEach(id => {
  const el = document.getElementById(id);
  if (el) bgIO.observe(el);
});

/* =========================================================================
   HERO LOSS COUNTER — точка планирования 412 (v13.2)
   ========================================================================= */
const heroLossEl = document.getElementById('heroLoss');
if (heroLossEl) {
  const lossIO = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    animateCounter(heroLossEl, 0, 412, 1600, v => '−' + Math.round(v));
    lossIO.disconnect();
  }, { rootMargin: '-10% 0px' });
  lossIO.observe(heroLossEl);
}

/* =========================================================================
   LOSSES — bars animate on entry
   ========================================================================= */
const lossesChartEl = document.getElementById('lossesChart');
if (lossesChartEl) {
  const lossBarsIO = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;

    const bars = lossesChartEl.querySelectorAll('.bar-fill');
    bars.forEach((bar, i) => {
      setTimeout(() => {
        bar.style.width = bar.dataset.w + '%';
      }, i * 250);
    });

    const pctEl = document.getElementById('lossPct');
    const lblEl = document.getElementById('lossPctLabel');
    if (pctEl) {
      animateCounter(pctEl, 0, 100, 2000, v => {
        const n = Math.round(v);
        if (lblEl) {
          if (n < 25)       lblEl.textContent = 'Слой 1 · Медиаинфляция';
          else if (n < 55)  lblEl.textContent = 'Слой 2 · Управленческий туман';
          else if (n < 80)  lblEl.textContent = 'Слой 3 · Ручные операции';
          else if (n < 95)  lblEl.textContent = 'Слой 4 · Регуляторика';
          else               lblEl.textContent = 'Всего: 370–470 млн ₽ · 3 года';
        }
        return n + '%';
      });
    }

    lossBarsIO.disconnect();
  }, { rootMargin: '-10% 0px', threshold: 0.1 });
  lossBarsIO.observe(lossesChartEl);
}

document.querySelectorAll('.loss-row').forEach(r => {
  r.addEventListener('click', () => r.classList.toggle('open'));
});

/* =========================================================================
   A/B MIXER — цифры обновлены под v13.2
   Год 1: NET А = -4 → -1/кв.;   NET Б = +14 → +3,5/кв.
   Год 2: NET А = +77 → +19,25/кв.; NET Б = +210 → +52,5/кв.
   Год 3: NET А = +166 → +41,5/кв.; NET Б = +448 → +112/кв.
   ========================================================================= */
const QUARTERS = 12;
const qA = [-1, -1, -1, -1, 19.25, 19.25, 19.25, 19.25, 41.5, 41.5, 41.5, 41.5];
const qB = [3.5, 3.5, 3.5, 3.5, 52.5, 52.5, 52.5, 52.5, 112, 112, 112, 112];
let mixer = ['A','A','B','B','B','B','B','B','B','B','B','B'];

const mixerGrid   = document.getElementById('mixerGrid');
const mixerNetEl  = document.getElementById('mixerNet');
const chartSvg    = document.getElementById('mixerChart');
const chartEnd    = document.getElementById('chartEnd');

function renderGrid() {
  if (!mixerGrid) return;
  mixerGrid.innerHTML = '';
  for (let i = 0; i < QUARTERS; i++) {
    const btn = document.createElement('button');
    btn.className = 'mixer-q ' + mixer[i].toLowerCase();
    if ((i + 1) % 4 === 0 && i < QUARTERS - 1) btn.classList.add('year-end');
    btn.innerHTML = `<div class="q">Q${i + 1}</div><div class="m">${mixer[i]}</div>`;
    btn.onclick = () => {
      mixer[i] = mixer[i] === 'A' ? 'B' : 'A';
      document.querySelectorAll('.strat-chip').forEach(c => c.classList.remove('active'));
      renderGrid(); renderChart(); renderNet();
    };
    mixerGrid.appendChild(btn);
  }
}

function renderNet() {
  if (!mixerNetEl) return;
  let total = 0;
  for (let i = 0; i < QUARTERS; i++) total += mixer[i] === 'A' ? qA[i] : qB[i];
  mixerNetEl.textContent = (total >= 0 ? '+' : '−') + Math.abs(Math.round(total)) + ' млн ₽';
}

function renderChart() {
  if (!chartSvg) return;
  const W = 900, H = 220, PX = 40, PY = 20;
  const plotW = W - PX * 2, plotH = H - PY * 2;
  let sum = 0;
  const pts = [];
  for (let i = 0; i < QUARTERS; i++) {
    sum += mixer[i] === 'A' ? qA[i] : qB[i];
    pts.push(sum);
  }
  const yMax = qB.reduce((a, b) => a + b, 0);
  const yMin = Math.min(qA.reduce((a, b) => a + b, 0), 0);
  const yRange = yMax - yMin;
  const x = i => PX + (i / (QUARTERS - 1)) * plotW;
  const y = v => PY + plotH - ((v - yMin) / yRange) * plotH;
  const zeroY = y(0);

  const parts = [];
  parts.push(`<line x1="${PX}" x2="${W - PX}" y1="${zeroY}" y2="${zeroY}" class="axis-ln" />`);
  [0, Math.round(yMax / 2), Math.round(yMax)].forEach(v => {
    parts.push(`<text x="${PX - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="middle" class="ax-label">${v}</text>`);
  });
  [1, 4, 8, 12].forEach(q => {
    parts.push(`<text x="${x(q - 1)}" y="${H - 4}" text-anchor="middle" class="ax-label">Q${q}</text>`);
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p)}`).join(' ');
  const areaD = pathD + ` L ${x(QUARTERS - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`;

  parts.push(`<defs>
    <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bf5af2" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#bf5af2" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff6b2b"/>
      <stop offset="100%" stop-color="#bf5af2"/>
    </linearGradient>
  </defs>`);
  parts.push(`<path d="${areaD}" fill="url(#gArea)" />`);
  parts.push(`<path d="${pathD}" fill="none" stroke="url(#gLine)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`);
  pts.forEach((p, i) => {
    const fill = mixer[i] === 'A' ? '#ff9055' : '#d178ff';
    parts.push(`<circle cx="${x(i)}" cy="${y(p)}" r="4" fill="${fill}" stroke="#0a0a0e" stroke-width="2" />`);
  });

  chartSvg.innerHTML = parts.join('');
  const finalNet = pts[pts.length - 1];
  if (chartEnd) chartEnd.textContent = (finalNet >= 0 ? '+' : '−') + Math.abs(Math.round(finalNet)) + ' на Q12';
}

function setStrategy(s) {
  if (s === 'smart')  mixer = ['A','A','B','B','B','B','B','B','B','B','B','B'];
  if (s === 'all-a')  mixer = Array(12).fill('A');
  if (s === 'all-b')  mixer = Array(12).fill('B');
  if (s === 'half')   mixer = ['A','A','A','A','A','A','B','B','B','B','B','B'];
  renderGrid(); renderChart(); renderNet();
}

document.querySelectorAll('.strat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.strat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    setStrategy(chip.dataset.strategy);
  });
});

renderGrid(); renderChart(); renderNet();

/* Animate SVG line on first viewport entry (GSAP опционально) */
if (chartSvg && typeof gsap !== 'undefined') {
  const chartIO = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    const path = chartSvg.querySelector('path[fill="none"]');
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out' });
    chartIO.disconnect();
  }, { rootMargin: '-10% 0px' });
  const mixerSection = document.getElementById('mixer');
  if (mixerSection) chartIO.observe(mixerSection);
}

/* =========================================================================
   AGENTS CATALOG
   ========================================================================= */
const AGENTS = [
  {n:'DataQuality',   dom:'data',    d:'Проверка свежести и согласованности данных stage-слоя',                     kpi:'Расхождение <2%'},
  {n:'Reconciler',    dom:'data',    d:'Сверка CRM, 1С и рекламных кабинетов, разрешение конфликтов',              kpi:'≥95% auto-match'},
  {n:'AnomalyDetector',dom:'data',   d:'Детекция выбросов по CPL/CPO/CR, алерты в Telegram за 15 мин',            kpi:'False positive <10%'},
  {n:'Reporter',      dom:'data',    d:'Отчёты по расписанию и on-demand (утренний дайджест, Q&A)',                kpi:'Время отчёта <1 мин'},
  {n:'Campaigner',    dom:'media',   d:'Оркестратор запуска кампаний: креативы, UTM, параметры',                   kpi:'Запуск 1–4 ч (vs 1,5 мес)'},
  {n:'Bidder',        dom:'media',   d:'Управление ставками в кабинетах по сигналам воронки',                      kpi:'CPL −10–15%'},
  {n:'Reallocator',   dom:'media',   d:'Реаллокация бюджета между каналами по real-time сигналам',                 kpi:'Сохраняет 1,5–2% spend'},
  {n:'CreativeTester',dom:'media',   d:'A/B/n тест креативов, автоматический выбор победителей',                  kpi:'Цикл теста ×3–5'},
  {n:'DraftWriter',   dom:'content', d:'Bulk-генерация черновиков под бриф и канал (ChatGPT)',                     kpi:'20–30 карточек/нед'},
  {n:'BrandEditor',   dom:'content', d:'Адаптация под брендбук Брусники, финальная полировка (Claude)',            kpi:'Правок редактором <20%'},
  {n:'ChannelAdapter',dom:'content', d:'Переупаковка контента под 13 каналов',                                     kpi:'Reuse 5–7×'},
  {n:'SEOOptimizer',  dom:'content', d:'Оптимизация текстов под поисковые запросы',                               kpi:'Органика +10–15% (Y2)'},
  {n:'DataAnchor',    dom:'content', d:'Поиск бенчмарков и данных с источниками (Perplexity)',                     kpi:'100% цифр с источниками'},
  {n:'LeadQualifier', dom:'crm',     d:'Скоринг входящих лидов и маршрутизация в отделы',                         kpi:'Точность ≥75%'},
  {n:'DuplicateKiller',dom:'crm',    d:'Выявление и слияние дублей лидов',                                        kpi:'Дубли −80%'},
  {n:'Reactivator',   dom:'crm',     d:'Ре-ангажирование неактивной базы',                                        kpi:'CR 3–5%'},
  {n:'ScoreModel',    dom:'crm',     d:'Предиктивная модель вероятности сделки',                                   kpi:'AUC ≥0,75'},
  {n:'ERiRMarker',    dom:'sec',     d:'Автомаркировка креативов ЕРИР + аудит-лог',                               kpi:'0 пропущенных'},
  {n:'CopyGuard',     dom:'sec',     d:'Проверка соответствия креативов ФАС до публикации',                       kpi:'0 нарушений ФАС'},
  {n:'PIIGuard',      dom:'sec',     d:'Маскирование PII перед отправкой в LLM',                                  kpi:'0 утечек'},
  {n:'Auditor',       dom:'sec',     d:'Журналирование действий всех агентов',                                    kpi:'100% в аудит-логе'},
  {n:'DigestBuilder', dom:'cd',      d:'Утренний дайджест в 08:30 — метрики, аномалии, решения',                  kpi:'08:30 ±5 мин, 7/7'},
  {n:'VoiceQA',       dom:'cd',      d:'Голосовой Q&A по данным в Telegram',                                      kpi:'30–60 сек'},
  {n:'Simulator',     dom:'cd',      d:'Моделирование ценовых и бюджетных решений',                               kpi:'Прогноз за 1 мин'},
  {n:'Alerter',       dom:'cd',      d:'Критические алерты (перерасход, аномалия, сбой)',                         kpi:'Доставка <2 мин'},
  {n:'CostTracker',   dom:'cd',      d:'Мониторинг MarTech-расходов в реал-тайм',                                 kpi:'Budget variance <5%'},
  {n:'Triage',        dom:'cd',      d:'Приоритизация событий для КД — что решать сейчас',                        kpi:'Топ-3 /день'},
];
const DOMAIN_NAMES = {data:'Данные', media:'Медиа', content:'Контент', crm:'CRM', sec:'ИБ', cd:'КД'};
const agentsGrid = document.getElementById('agentsGrid');

function renderAgents(filter = 'all') {
  if (!agentsGrid) return;
  const list = filter === 'all' ? AGENTS : AGENTS.filter(a => a.dom === filter);
  agentsGrid.innerHTML = list.map(a => `
    <div class="agent">
      <div class="top"><div class="n">${a.n}</div><div class="dom">${DOMAIN_NAMES[a.dom]}</div></div>
      <div class="d">${a.d}</div>
      <div class="kpi">${a.kpi}</div>
    </div>`).join('');
}
renderAgents();

document.querySelectorAll('.agents-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.agents-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderAgents(tab.dataset.domain);
  });
});

/* =========================================================================
   ECONOMICS — SENSITIVITY CALCULATOR
   GRID обновлена под v13.2:
   CPL \\ CR    1,5%     2,0%     2,5%
   12          +540     +740     +900
   15          +470     +672     +820
   18          +400     +580     +740
   22          +310     +460     +600
   ========================================================================= */
const GRID = {
  12: {1.5: 540, 2.0: 740, 2.5: 900},
  15: {1.5: 470, 2.0: 672, 2.5: 820},
  18: {1.5: 400, 2.0: 580, 2.5: 740},
  22: {1.5: 310, 2.0: 460, 2.5: 600},
};
const CPL_KEYS = [12, 15, 18, 22];
const CR_KEYS  = [1.5, 2.0, 2.5];

function lookupGrid(cpl, cr) {
  cpl = Math.max(CPL_KEYS[0], Math.min(CPL_KEYS[CPL_KEYS.length - 1], cpl));
  cr  = Math.max(CR_KEYS[0],  Math.min(CR_KEYS[CR_KEYS.length - 1], cr));
  let c0 = CPL_KEYS[0], c1 = CPL_KEYS[CPL_KEYS.length - 1];
  for (let i = 0; i < CPL_KEYS.length - 1; i++) {
    if (cpl >= CPL_KEYS[i] && cpl <= CPL_KEYS[i + 1]) { c0 = CPL_KEYS[i]; c1 = CPL_KEYS[i + 1]; break; }
  }
  let r0 = CR_KEYS[0], r1 = CR_KEYS[CR_KEYS.length - 1];
  for (let i = 0; i < CR_KEYS.length - 1; i++) {
    if (cr >= CR_KEYS[i] && cr <= CR_KEYS[i + 1]) { r0 = CR_KEYS[i]; r1 = CR_KEYS[i + 1]; break; }
  }
  const fc = c0 === c1 ? 0 : (cpl - c0) / (c1 - c0);
  const fr = r0 === r1 ? 0 : (cr - r0) / (r1 - r0);
  const v0 = GRID[c0][r0] * (1 - fr) + GRID[c0][r1] * fr;
  const v1 = GRID[c1][r0] * (1 - fr) + GRID[c1][r1] * fr;
  return v0 * (1 - fc) + v1 * fc;
}

function adoptionFactor(a) {
  if (a <= 65) return 0.45 + (a - 30) * (1 - 0.45) / (65 - 30);
  return 1.0 + (a - 65) * (1.22 - 1.0) / (90 - 65);
}

const cplS  = document.getElementById('cplSlider');
const crS   = document.getElementById('crSlider');
const adS   = document.getElementById('adoptSlider');
const cplV  = document.getElementById('cplVal');
const crV   = document.getElementById('crVal');
const adV   = document.getElementById('adoptVal');
const netNum  = document.getElementById('netNum');
const detCpl  = document.getElementById('detCpl');
const detRoi  = document.getElementById('detRoi');
const detMoic = document.getElementById('detMoic');
const detRev  = document.getElementById('detRev');
const detBe   = document.getElementById('detBe');

// Инвестиции обновлены: 134 → 114 (v13.2)
const INVEST = 114;

function updateCalc() {
  if (!cplS || !crS || !adS) return;
  const cpl   = parseFloat(cplS.value);
  const cr    = parseFloat(crS.value);
  const adopt = parseFloat(adS.value);
  const net   = Math.round(lookupGrid(cpl, cr) * adoptionFactor(adopt));

  cplV.textContent  = cpl.toString().replace('.0', '').replace('.', ',');
  crV.textContent   = cr.toFixed(1).replace('.', ',');
  adV.textContent   = adopt;
  netNum.textContent = net;
  detCpl.textContent  = `CPL ${cplV.textContent} × CR ${crV.textContent}% × ${adopt}%`;
  detRoi.textContent  = (net / INVEST).toFixed(1).replace('.', ',') + '×';
  detMoic.textContent = ((net + INVEST) / INVEST).toFixed(1).replace('.', ',') + '×';
  detRev.textContent  = '~' + (net / 0.4 / 1000).toFixed(1).replace('.', ',') + ' млрд';
  detBe.textContent   = net >= 450 ? 'месяц 12–14' : net >= 300 ? 'месяц 15–18' : 'месяц 19–24';
}

[cplS, crS, adS].forEach(s => s?.addEventListener('input', updateCalc));
updateCalc();

/* =========================================================================
   PILOT — GANTT CHART
   ПЕРЕРАБОТАНО: явная шкала W1…W24 (каждые 2 недели — тик, каждые 4 — подпись);
   модули отмечаются явными границами старт/финиш, ширина = (end-start)/24.
   v13.2: DWH MVP заменён на "Stage-слой" (DWH строит Брусника отдельно).
   ========================================================================= */
const GANTT = [
  {name: 'Discovery · доступы · NDA',       s: 0,  e: 3,  c: 'g1'},
  {name: 'Stage-слой (3–5 источников)',     s: 3,  e: 9,  c: 'g1'},
  {name: 'Контент-завод базовый',           s: 4,  e: 10, c: 'g2'},
  {name: 'AnomalyDetector',                 s: 6,  e: 12, c: 'g3'},
  {name: 'ERiRMarker',                      s: 6,  e: 12, c: 'g3'},
  {name: 'Campaigner',                      s: 10, e: 18, c: 'g3'},
  {name: 'Интерфейс КД (Telegram)',         s: 10, e: 16, c: 'g2'},
  {name: 'Voice Q&A',                       s: 14, e: 20, c: 'g2'},
  {name: 'Simulator (MVP)',                 s: 16, e: 22, c: 'g2'},
  {name: 'Gate 3 · review',                 s: 23, e: 24, c: 'g3'},
];
const WEEKS_TOTAL = 24;

const ganttBody = document.getElementById('ganttBody');
if (ganttBody) {
  // Шкала: W1 … W24, каждые 2 недели — тик, каждые 4 — жирная подпись
  let scaleHTML = `<div class="gantt-scale"><div class="gantt-scale-name">МОДУЛЬ / НЕДЕЛЯ</div><div class="gantt-scale-weeks">`;
  for (let w = 1; w <= WEEKS_TOTAL; w++) {
    const isMajor = w === 1 || w % 4 === 0;
    const cls = 'gw' + (isMajor ? ' gw-major' : '');
    scaleHTML += `<div class="${cls}"><span>W${w}</span></div>`;
  }
  scaleHTML += `</div></div>`;

  // Фоновая сетка с вертикальными линиями каждые 4 недели — общая на все строки
  let rowsHTML = '';
  GANTT.forEach((g, i) => {
    const left  = (g.s / WEEKS_TOTAL * 100).toFixed(2);
    const width = ((g.e - g.s) / WEEKS_TOTAL * 100).toFixed(2);
    const span  = g.e - g.s;
    // Для коротких плашек (1–2 недели) — компактная подпись одной неделей,
    // для совсем узких (≤1.5 нед) подпись выводится слева, снаружи бара.
    const label = span <= 2 ? `W${g.e}` : `W${g.s + 1}–W${g.e}`;
    const barCls = span <= 2 ? ` short${span <= 1 ? ' tiny' : ''}` : '';
    rowsHTML += `
      <div class="gantt-row">
        <div class="name">${g.name}</div>
        <div class="track">
          <div class="track-grid">
            ${[...Array(WEEKS_TOTAL)].map((_, w) => {
              const maj = (w + 1) % 4 === 0;
              return `<div class="tg${maj ? ' tg-major' : ''}"></div>`;
            }).join('')}
          </div>
          <div class="gantt-bar ${g.c}${barCls}" data-left="${left}" data-width="${width}" style="left:${left}%">
            <span class="gantt-bar-label">${label}</span>
          </div>
        </div>
      </div>`;
  });

  ganttBody.innerHTML = scaleHTML + rowsHTML;

  // Animate bars on entry
  const ganttIO = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    document.querySelectorAll('.gantt-bar').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.width = bar.dataset.width + '%';
      }, 60 * i);
    });
    ganttIO.disconnect();
  }, { rootMargin: '-5% 0px', threshold: 0.15 });
  ganttIO.observe(ganttBody);
}

/* =========================================================================
   WAIT SECTION — bar + counter on entry
   ========================================================================= */
const waitFillEl = document.getElementById('waitFill');
const waitBigEl  = document.getElementById('waitBig');

const waitIO = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting) return;
  if (waitFillEl) waitFillEl.style.width = '100%';
  if (waitBigEl) {
    // 412 млн / 36 мес ≈ 11,4 → округляем до 11
    animateCounter(waitBigEl, 0, 11, 1400, v => String(Math.round(v)));
  }
  waitIO.disconnect();
}, { rootMargin: '-10% 0px', threshold: 0.1 });
const waitTimelineEl = document.querySelector('.wait-timeline');
if (waitTimelineEl) waitIO.observe(waitTimelineEl);

/* =========================================================================
   ПАРАЛЛАКС и пин системных карточек УДАЛЕНЫ
   Система теперь скроллится натирвно (horizontal scroll с CSS scroll-snap).
   Это устраняет подвисание к середине сайта и снимает зависимость от ScrollTrigger.
   ========================================================================= */
