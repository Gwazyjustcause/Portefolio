/* Gato das Horas — núcleo de lógica (partilhado por popup, página e fundo).
   Sem DOM. Tudo o que mexe em horas, BO, gatos e férias vive aqui, para haver
   uma única fonte de verdade. Testado em tests/core.test.js */
(function (root) {
  'use strict';

  const LIMITS = {
    BASE: 8,            // horas base de um dia útil
    DAY_EXTRA: 2,       // máx. horas extra por dia útil
    WEEK_EXTRA: 10,     // máx. horas extra por semana (seg–sex)
    SPECIAL: 8,         // máx. horas especiais (fim de semana / feriado) por dia
    ADJUST: 8,          // ajuste máximo (±) por dia
    NORMAL_CATS: 520,
    MAGIC_CATS: 100,
    MAGIC_STEPS: [4, 8] // horas especiais que desbloqueiam um gato mágico
  };
  const HALF_HOUR = 30 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  /* ---------- datas ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = d => { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate() - day + 1); x.setHours(0, 0, 0, 0); return x; };
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  const isWeekday = d => !isWeekend(d);
  // Período anual: 1 de setembro a 31 de agosto
  const seasonFor = d => d.getMonth() >= 8 ? `${d.getFullYear()}-${d.getFullYear() + 1}` : `${d.getFullYear() - 1}-${d.getFullYear()}`;
  const seasonOfKey = k => seasonFor(parseKey(k));
  const yearOfKey = k => Number(k.slice(0, 4));

  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const longDate = d => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

  /* ---------- formatação ---------- */
  const num = n => String(Math.round(n * 100) / 100).replace('.', ',').replace('-', '−');
  const fmtH = n => `${num(n)}h`;
  const fmtSigned = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}h`;

  /* ---------- estado ---------- */
  const defaultSettings = () => ({ mode: 'day', notifications: true, reminderStart: 17 });
  const defaultVacations = () => ({ year: new Date().getFullYear(), allowance: 24, autoAllowance: false, carryoverMode: 'auto', carryoverDays: 0, days: {}, bankDays: 0, bankLog: [] });
  const defaultState = () => ({ entries: {}, catsBySeason: {}, settings: defaultSettings(), vacations: defaultVacations(), holidays: {}, lastReward: {}, lastRewardSeen: '', reminderRuntime: {} });
  const STORAGE_KEYS = ['entries', 'catsBySeason', 'settings', 'vacations', 'holidays', 'lastReward', 'lastRewardSeen', 'reminderRuntime', 'cats'];

  // Aceita dados guardados por qualquer versão anterior e devolve um estado válido.
  function normalize(raw, now = new Date()) {
    const S = defaultState();
    raw = raw || {};
    S.entries = raw.entries && typeof raw.entries === 'object' ? raw.entries : {};
    for (const v of Object.values(S.entries)) if (v && Number(v.special) > LIMITS.SPECIAL) v.special = LIMITS.SPECIAL;
    S.catsBySeason = raw.catsBySeason && typeof raw.catsBySeason === 'object' ? raw.catsBySeason : {};
    S.holidays = raw.holidays && typeof raw.holidays === 'object' ? raw.holidays : {};
    const st = raw.settings || {};
    S.settings = { mode: st.mode === 'night' ? 'night' : 'day', notifications: st.notifications !== false, reminderStart: Number(st.reminderStart) === 18 ? 18 : 17 };
    S.vacations = { ...defaultVacations(), ...(raw.vacations || {}) };
    S.vacations.allowance = Number(S.vacations.allowance) === 22 ? 22 : 24;   // só existem duas regras: 24 ou 22 dias
    S.vacations.autoAllowance = false;
    S.vacations.days = { ...(raw.vacations?.days || {}) };
    // migração: gatos antigos sem época
    const season = seasonFor(now);
    if (!S.catsBySeason[season] && Array.isArray(raw.cats) && raw.cats.length)
      S.catsBySeason[season] = raw.cats.map((id, i) => ({ id, kind: 'normal', source: `legacy-${i}` }));
    // migração: "bankDays" (contador) -> "bankLog" (uma data por troca de 8h)
    if (!Array.isArray(raw.vacations?.bankLog)) {
      const n = Math.max(0, Math.floor(Number(S.vacations.bankDays) || 0));
      const y = Number(S.vacations.year) || now.getFullYear();
      const when = y === now.getFullYear() ? dateKey(now) : `${y}-12-31`;
      S.vacations.bankLog = Array.from({ length: n }, () => when);
    }
    S.vacations.bankDays = S.vacations.bankLog.length;
    S.lastReward = raw.lastReward && typeof raw.lastReward === 'object' ? raw.lastReward : {};
    S.lastRewardSeen = raw.lastRewardSeen || '';
    S.reminderRuntime = raw.reminderRuntime && typeof raw.reminderRuntime === 'object' ? raw.reminderRuntime : {};
    return S;
  }

  const store = {
    async load(now = new Date()) {
      const raw = await chrome.storage.local.get(STORAGE_KEYS);
      return normalize(raw, now);
    },
    async save(S) {
      const { entries, catsBySeason, settings, vacations, holidays, lastReward, lastRewardSeen } = S;
      await chrome.storage.local.set({ entries, catsBySeason, settings, vacations, holidays, lastReward, lastRewardSeen });
    }
  };

  /* ---------- leitura de um dia ---------- */
  const entryOf = (S, d) => S.entries[dateKey(d)] || {};
  const extraOf = (S, d) => Number(entryOf(S, d).extra || 0);
  const adjustOf = (S, d) => Number(entryOf(S, d).adjustment || 0);
  const usedOf = (S, d) => Number(entryOf(S, d).used || 0);
  const specialOf = (S, d) => Number(entryOf(S, d).special || 0);
  const isBaixa = (S, d) => entryOf(S, d).baixa === true;
  const isJustif = (S, d) => entryOf(S, d).justificacao === true;
  const isExempt = (S, d) => isBaixa(S, d) || isJustif(S, d);
  const isHoliday = (S, d) => !!S.holidays[dateKey(d)];
  const isSpecialDay = (S, d) => isWeekend(d) || isHoliday(S, d);
  const vacationKind = (S, d) => S.vacations.days[dateKey(d)]; // true | 'bo' | undefined

  // Tipo de dia, por ordem de prioridade (usado para a cena e as mensagens)
  function dayKind(S, d) {
    if (isHoliday(S, d)) return 'feriado';
    if (isBaixa(S, d)) return 'baixa';
    if (isJustif(S, d)) return 'justificacao';
    if (isWeekend(d)) return 'fimdesemana';
    if (vacationKind(S, d)) return 'ferias';
    if (extraOf(S, d) >= LIMITS.DAY_EXTRA) return 'descanso';
    return 'trabalho';
  }

  // Total do dia (fórmula original): base − BO usado + extra + ajuste; nos dias especiais, as horas especiais.
  function dayTotal(S, d) {
    if (isSpecialDay(S, d)) return specialOf(S, d);
    return LIMITS.BASE - usedOf(S, d) + extraOf(S, d) + adjustOf(S, d);
  }

  /* ---------- BO (banco de horas) ---------- */
  function seasonEntries(S, season) {
    return Object.entries(S.entries).filter(([k]) => seasonOfKey(k) === season);
  }
  const conversionsInSeason = (S, season) => S.vacations.bankLog.filter(k => seasonOfKey(k) === season).length;
  const conversionsInYear = (S, y) => S.vacations.bankLog.filter(k => yearOfKey(k) === y).length;

  // Uma única definição de saldo — usada em todo o lado. Conta só o período atual (1 set – 31 ago).
  function bankBalance(S, now = new Date()) {
    const season = seasonFor(now);
    const sum = seasonEntries(S, season).reduce((a, [, v]) =>
      a + Number(v.extra || 0) + (v.baixa || v.justificacao ? 0 : Number(v.adjustment || 0)) - Number(v.used || 0), 0);
    return sum - conversionsInSeason(S, season) * LIMITS.BASE;
  }

  function seasonSummary(S, now = new Date()) {
    const season = seasonFor(now);
    const es = seasonEntries(S, season);
    const sum = f => es.reduce((a, [, v]) => a + f(v), 0);
    const justified = es.filter(([, v]) => v.justificacao === true);
    return {
      season,
      extra: sum(v => Number(v.extra || 0)),
      used: sum(v => Number(v.used || 0)),
      adjust: sum(v => (v.baixa || v.justificacao ? 0 : Number(v.adjustment || 0))),
      converted: conversionsInSeason(S, season) * LIMITS.BASE,
      balance: bankBalance(S, now),
      baixaDays: es.filter(([, v]) => v.baixa === true).length,
      justifiedDays: justified.length,
      justifiedHours: justified.reduce((a, [, v]) => a + Math.abs(Number(v.adjustment || 0)), 0)
    };
  }

  /* ---------- semana ---------- */
  const weekDays = start => Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekExtraTotal = (S, anyDayInWeek) => weekDays(mondayOf(anyDayInWeek)).slice(0, 5).reduce((a, d) => a + extraOf(S, d), 0);
  function weekSummary(S, start) {
    const days = weekDays(start);
    const workdays = days.filter(d => isWeekday(d) && !isHoliday(S, d));
    const extra = days.reduce((a, d) => a + extraOf(S, d), 0);
    const used = days.reduce((a, d) => a + usedOf(S, d), 0);
    const adjust = days.reduce((a, d) => a + adjustOf(S, d), 0);
    const special = days.reduce((a, d) => a + specialOf(S, d), 0);
    const cats = (S.catsBySeason[seasonFor(days[0])] || []).filter(x => x.kind === 'normal' && days.some(d => dateKey(d) === x.source)).length;
    return { days, extra, used, adjust, special, cats, total: workdays.length * LIMITS.BASE - used + extra + adjust };
  }

  /* ---------- gatos ---------- */
  const randomUnused = (usedIds, total, rng = Math.random) => {
    const free = [];
    for (let i = 1; i <= total; i++) if (!usedIds.has(i)) free.push(i);
    return free.length ? free[Math.floor(rng() * free.length)] : Math.floor(rng() * total) + 1;
  };
  const catsOf = (S, season) => S.catsBySeason[season] || (S.catsBySeason[season] = []);
  const magicNumber = id => Number(String(id).replace('magic-cat-', ''));
  const magicId = n => `magic-cat-${pad3(n)}`;
  const pad3 = n => String(n).padStart(3, '0');

  function addCat(S, source, season, rng) {
    const list = catsOf(S, season);
    const used = new Set(list.filter(x => x.kind === 'normal').map(x => x.id));
    const reward = { id: randomUnused(used, LIMITS.NORMAL_CATS, rng), kind: 'normal', source };
    list.push(reward);
    return reward;
  }
  function removeCat(S, source, season) {
    const list = catsOf(S, season);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'normal' && list[i].source === source) { list.splice(i, 1); return; }
  }
  function addMagic(S, source, threshold, season, rng) {
    const list = catsOf(S, season);
    const used = new Set(list.filter(x => x.kind === 'magic').map(x => magicNumber(x.id)));
    const reward = { id: magicId(randomUnused(used, LIMITS.MAGIC_CATS, rng)), kind: 'magic', source, threshold };
    list.push(reward);
    return reward;
  }
  function removeMagic(S, source, threshold, season) {
    const list = catsOf(S, season);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'magic' && list[i].source === source && list[i].threshold === threshold) { list.splice(i, 1); return; }
  }
  const catsForDay = (S, d, now = new Date()) => (S.catsBySeason[seasonFor(now)] || []).filter(x => x.source === dateKey(d));

  /* ---------- alterar um dia ---------- */
  // Devolve { ok:true, reward?, rewards? } ou { ok:false, reason }. Muta S.
  // Um só passo pode desbloquear vários gatos (ex.: +8h ao sábado passa as marcas de 4h e 8h).
  function applyChange(S, d, type, delta, opts = {}) {
    const now = opts.now || new Date();
    const rng = opts.rng || Math.random;
    const season = seasonFor(now);
    const k = dateKey(d);
    const e = { ...(S.entries[k] || {}) };
    const special = isSpecialDay(S, d);
    const rewards = [];

    if (type === 'special') {
      if (!special) return { ok: false, reason: 'notSpecial' };
      // Os botões rápidos (+4h, +8h) só acrescentam o que falta até ao máximo de 8h; os prémios são os dos marcos atravessados.
      const old = specialOf(S, d), next = Math.max(0, Math.min(LIMITS.SPECIAL, old + delta));
      if (next === old) return { ok: false, reason: delta > 0 ? 'specialCap' : 'limit' };
      e.special = next;
      for (const step of LIMITS.MAGIC_STEPS) {
        if (old < step && next >= step) rewards.push(addMagic(S, k, step, season, rng));
        if (old >= step && next < step) removeMagic(S, k, step, season);
      }
    } else if (type === 'extra') {
      if (special) return { ok: false, reason: 'special' };
      const old = extraOf(S, d);
      let next;
      if (delta > 0) {
        // Os botões rápidos (+1h, +2h) encolhem para caber nos limites em vez de falharem.
        const weekRoom = LIMITS.WEEK_EXTRA - weekExtraTotal(S, d), dayRoom = LIMITS.DAY_EXTRA - old;
        if (weekRoom <= 0) return { ok: false, reason: 'weekCap' };
        if (dayRoom <= 0) return { ok: false, reason: 'dayCap' };
        next = old + Math.min(delta, weekRoom, dayRoom);
      } else {
        next = Math.max(0, old + delta);
        if (next === old) return { ok: false, reason: 'limit' };
      }
      e.extra = next;
      e.updatedAt = Date.now();
      // um gato por cada hora completa atravessada (+2h de uma vez = 2 gatos)
      for (let hr = Math.floor(old) + 1; hr <= Math.floor(next); hr++) rewards.push(addCat(S, k, season, rng));
      for (let hr = Math.floor(old); hr > Math.floor(next); hr--) removeCat(S, k, season);
    } else if (type === 'adjustment') {
      if (special) return { ok: false, reason: 'special' };
      const old = adjustOf(S, d), next = Math.max(-LIMITS.ADJUST, Math.min(LIMITS.ADJUST, old + delta));
      if (next === old) return { ok: false, reason: 'limit' };
      if (!isExempt(S, d) && bankBalance(S, now) - old + next < 0) return { ok: false, reason: 'bank' };
      e.adjustment = next;
    } else if (type === 'baixa' || type === 'justificacao') {
      if (special) return { ok: false, reason: 'special' };
      const other = type === 'baixa' ? isJustif(S, d) : isBaixa(S, d);
      const on = type === 'baixa' ? !isBaixa(S, d) : !isJustif(S, d);
      const adj = Number(e.adjustment || 0);
      const now0 = isExempt(S, d) ? 0 : adj;
      const willBeExempt = on || other;
      if (bankBalance(S, now) - now0 + (willBeExempt ? 0 : adj) < 0) return { ok: false, reason: 'bank' };
      if (type === 'baixa') { e.baixa = on; if (on) e.justificacao = false; }
      else { e.justificacao = on; if (on) e.baixa = false; }
    } else if (type === 'used') {
      if (special) return { ok: false, reason: 'special' };
      const old = usedOf(S, d), next = Math.max(0, Math.min(LIMITS.BASE, old + delta));
      const available = bankBalance(S, now) + old;
      if (next === old) return { ok: false, reason: 'limit' };
      if (next > available) return { ok: false, reason: 'bank' };
      e.used = next;
    } else {
      return { ok: false, reason: 'unknown' };
    }
    S.entries[k] = e;
    return rewards.length ? { ok: true, reward: rewards[0], rewards } : { ok: true };
  }

  /* ---------- conquistas (calculadas dos registos; não guardam nada) ---------- */
  function achievements(S, now = new Date()) {
    const todayKey = dateKey(now);
    const uniq = (list, kind) => new Set(list.filter(x => x.kind === kind).map(x => x.id)).size;
    let maxCats = 0, maxMagic = 0;
    for (const list of Object.values(S.catsBySeason)) { maxCats = Math.max(maxCats, uniq(list, 'normal')); maxMagic = Math.max(maxMagic, uniq(list, 'magic')); }
    const keys = Object.keys(S.entries).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    const first = keys[0] || null;
    let maxDay = 0, maxSpecial = 0, holidayBig = false, usedAny = false;
    const weeks = {};
    for (const [k, v] of Object.entries(S.entries)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const d = parseKey(k), sp = Number(v.special || 0);
      maxDay = Math.max(maxDay, Number(v.extra || 0));
      if (isWeekday(d)) { const w = dateKey(mondayOf(d)); weeks[w] = (weeks[w] || 0) + Number(v.extra || 0); }
      maxSpecial = Math.max(maxSpecial, sp);
      if (sp >= 4 && isWeekday(d) && isHoliday(S, d)) holidayBig = true;
      if (Number(v.used || 0) > 0) usedAny = true;
    }
    const maxWeek = Math.max(0, ...Object.values(weeks));
    // fim de semana de sofá: um sábado+domingo já passados, sem horas especiais, depois de já haver registos
    let sofa = false;
    if (first) for (let d = parseKey(first); d < now && !sofa; d = addDays(d, 1)) {
      if (d.getDay() !== 6) continue;
      const sun = addDays(d, 1);
      if (dateKey(sun) >= todayKey) break;
      if (dateKey(d) > first && !specialOf(S, d) && !specialOf(S, sun) && !isHoliday(S, d)) sofa = true;
    }
    // semana de soneca: uma semana normal (≥3 dias de trabalho) já passada, sem horas extra, depois de já haver registos
    let soneca = false;
    if (first) for (let m = addDays(mondayOf(parseKey(first)), 7); m < mondayOf(now) && !soneca; m = addDays(m, 7)) {
      const days = weekDays(m).slice(0, 5), working = days.filter(d => !isHoliday(S, d) && !vacationKind(S, d) && !isExempt(S, d));
      if (working.length >= 3 && days.reduce((a, d) => a + extraOf(S, d), 0) === 0) soneca = true;
    }
    const ferias = Object.keys(S.vacations.days).some(k => k < todayKey);
    const troca = S.vacations.bankLog.length > 0, bank = bankBalance(S, now);
    const A = (id, title, desc, icon, got, prog) => ({ id, title, desc, icon, got: !!got, prog: !got && prog ? prog : null });
    return [
      A('c1', '1.º visitante', 'O teu primeiro gato.', 'paw', maxCats >= 1, [maxCats, 1]),
      A('c10', '10 gatos', 'Dez gatos numa época.', 'paw', maxCats >= 10, [maxCats, 10]),
      A('c25', '25 gatos', 'Vinte e cinco gatos numa época.', 'paw', maxCats >= 25, [maxCats, 25]),
      A('c50', '50 gatos', 'Cinquenta gatos numa época.', 'paw', maxCats >= 50, [maxCats, 50]),
      A('c100', '100 gatos', 'Cem gatos numa época.', 'star', maxCats >= 100, [maxCats, 100]),
      A('c250', '250 gatos', 'Duzentos e cinquenta gatos numa época.', 'star', maxCats >= 250, [maxCats, 250]),
      A('c520', 'Álbum completo', 'Os 520 gatos numa época.', 'star', maxCats >= 520, [maxCats, 520]),
      A('dupla', 'Dupla de gatos', 'Dois gatos no mesmo dia (2h extra).', 'heart', maxDay >= 2, [maxDay, 2]),
      A('w3', 'Semana curiosa', '3h extra numa semana.', 'heart', maxWeek >= 3, [maxWeek, 3]),
      A('w6', 'Semana traquina', '6h extra numa semana.', 'heart', maxWeek >= 6, [maxWeek, 6]),
      A('w10', 'Semana de tigre', '10h extra numa semana (o limite).', 'heart', maxWeek >= 10, [maxWeek, 10]),
      A('m1', 'Primeira magia', 'O primeiro gato mágico (4h ao fim de semana).', 'sparkle', maxMagic >= 1, [maxMagic, 1]),
      A('m8', 'Feiticeiro', '8h num fim de semana ou feriado (o máximo).', 'sparkle', maxSpecial >= 8, [maxSpecial, 8]),
      A('g5', 'Grimório aberto', '5 gatos mágicos.', 'sparkle', maxMagic >= 5, [maxMagic, 5]),
      A('g25', 'Grande grimório', '25 gatos mágicos.', 'sparkle', maxMagic >= 25, [maxMagic, 25]),
      A('hol', 'Gato de feriado', '4h ou mais num feriado.', 'sun', holidayBig),
      A('sofa', 'Fim de semana de sofá', 'Um fim de semana inteiro sem trabalhar.', 'zzz', sofa),
      A('soneca', 'Semana de soneca', 'Uma semana normal sem horas extra.', 'zzz', soneca),
      A('sesta', 'Sesta merecida', 'Usaste horas do BO para trabalhar menos.', 'fish', usedAny),
      A('novelo', 'Novelo cheio', 'Um BO de 8h ou mais.', 'fish', bank >= 8 || troca, [Math.max(0, bank), 8]),
      A('troca', 'Troca de peixinhos', 'Trocaste 8h de BO por um dia de férias.', 'fish', troca),
      A('ferias', 'Férias felinas', 'Um dia de férias já gozado.', 'umbrella', ferias)
    ];
  }

  /* ---------- pagamento de fim de semana (períodos 15 → 15) ---------- */
  const paymentStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); if (x.getDate() < 15) x.setMonth(x.getMonth() - 1); x.setDate(15); return x; };
  const paymentEnd = d => { const x = new Date(d); x.setMonth(x.getMonth() + 1); return x; };
  const paymentHours = (S, start, end) => Object.entries(S.entries).reduce((t, [k, v]) => { const d = parseKey(k); return d >= start && d < end ? t + Number(v.special || 0) : t; }, 0);
  function paymentPeriods(S, now = new Date()) {
    const current = paymentStart(now), out = [];
    for (let i = 0; i < 12; i++) {
      const start = new Date(current); start.setMonth(start.getMonth() - i);
      const end = paymentEnd(start), hours = paymentHours(S, start, end);
      if (i < 2 || hours > 0) out.push({ start, end, hours, status: i === 0 ? 'atual' : i === 1 ? 'anterior' : 'antigo' });
    }
    return out;
  }
  const dayMonth = d => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const paymentLabel = p => `${dayMonth(p.start)} – ${dayMonth(p.end)}`;

  /* ---------- baixa: datas agrupadas ---------- */
  function baixaRanges(S, now = new Date()) {
    const dates = seasonEntries(S, seasonFor(now)).filter(([, v]) => v.baixa === true).map(([k]) => parseKey(k)).sort((a, b) => a - b);
    const groups = [];
    dates.forEach(d => {
      const g = groups[groups.length - 1];
      if (g && Math.round((d - g[g.length - 1]) / 86400000) === 1) g.push(d); else groups.push([d]);
    });
    const one = d => `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
    return groups.map(g => {
      const a = g[0], b = g[g.length - 1];
      if (g.length === 1) return one(a);
      return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} de ${MONTHS[a.getMonth()]}` : `${one(a)}–${one(b)}`;
    });
  }

  /* ---------- férias ---------- */
  function allowanceFor(S, y) {
    const v = S.vacations;
    if (v.autoAllowance) {
      const hadBaixa = Object.entries(S.entries).some(([k, e]) => yearOfKey(k) === y - 1 && e.baixa === true);
      return hadBaixa ? 22 : 24;
    }
    return Number(v.allowance || 24);
  }
  const markedDaysInYear = (S, y) => Object.keys(S.vacations.days).filter(k => yearOfKey(k) === y);
  const boMarkedInYear = (S, y) => markedDaysInYear(S, y).filter(k => S.vacations.days[k] === 'bo');
  function carryoverFor(S, y) {
    if (S.vacations.carryoverMode === 'manual') return Math.max(0, Number(S.vacations.carryoverDays || 0));
    // automático: só faz sentido se o ano anterior tiver dados; sem dados não inventa dias transitados
    const hadData = markedDaysInYear(S, y - 1).length > 0 || Object.keys(S.entries).some(k => yearOfKey(k) === y - 1);
    if (!hadData) return 0;
    return Math.max(0, allowanceFor(S, y - 1) - markedDaysInYear(S, y - 1).length);
  }
  function vacationStats(S, y) {
    const annual = allowanceFor(S, y), carry = carryoverFor(S, y), bo = conversionsInYear(S, y);
    const used = markedDaysInYear(S, y).length, total = annual + carry + bo;
    return { year: y, annual, carry, bo, used, total, remaining: Math.max(0, total - used), boFree: bo - boMarkedInYear(S, y).length, boMarked: boMarkedInYear(S, y).length };
  }
  // Um toque: (nada) → Férias → Férias via BO → Feriado → (nada). "Via BO" só se houver trocas livres.
  function cycleVacationDay(S, k) {
    const y = yearOfKey(k), d = parseKey(k);
    if (isWeekend(d)) return { ok: false, reason: 'weekend' };
    const st = vacationStats(S, y), cur = S.vacations.days[k], hol = !!S.holidays[k];
    let next;
    if (hol) next = 'clear';
    else if (cur === true) next = st.boFree > 0 ? 'bo' : 'holiday';
    else if (cur === 'bo') next = 'holiday';
    else next = 'vacation';
    if (next === 'vacation') {
      if (st.used >= st.total) return { ok: false, reason: 'noDays' };
      S.vacations.days[k] = true; delete S.holidays[k];
    } else if (next === 'bo') { S.vacations.days[k] = 'bo'; delete S.holidays[k]; }
    else if (next === 'holiday') { delete S.vacations.days[k]; S.holidays[k] = 'Feriado'; }
    else { delete S.vacations.days[k]; delete S.holidays[k]; }
    return { ok: true, next };
  }
  function convertBank(S, now = new Date()) {
    if (bankBalance(S, now) < LIMITS.BASE) return { ok: false, reason: 'bank' };
    S.vacations.bankLog.push(dateKey(now));
    S.vacations.bankDays = S.vacations.bankLog.length;
    return { ok: true };
  }
  function undoConversion(S) {
    const log = S.vacations.bankLog;
    if (!log.length) return { ok: false, reason: 'none' };
    const y = yearOfKey(log[log.length - 1]);
    const st = vacationStats(S, y);
    if (st.boFree <= 0) {
      const marked = boMarkedInYear(S, y).sort();
      if (!marked.length) return { ok: false, reason: 'none' };
      delete S.vacations.days[marked[marked.length - 1]];
    } else if (st.used > st.total - 1) return { ok: false, reason: 'inUse' };
    log.pop();
    S.vacations.bankDays = log.length;
    return { ok: true };
  }

  /* ---------- feriados nacionais (Portugal) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function nationalHolidays(y) {
    const e = easter(y), out = {};
    const put = (d, name) => { out[dateKey(d)] = name; };
    put(new Date(y, 0, 1), 'Ano Novo');
    put(addDays(e, -2), 'Sexta-feira Santa');
    put(e, 'Domingo de Páscoa');
    put(new Date(y, 3, 25), 'Dia da Liberdade');
    put(new Date(y, 4, 1), 'Dia do Trabalhador');
    put(addDays(e, 60), 'Corpo de Deus');
    put(new Date(y, 5, 10), 'Dia de Portugal');
    put(new Date(y, 7, 15), 'Assunção de Nossa Senhora');
    put(new Date(y, 9, 5), 'Implantação da República');
    put(new Date(y, 10, 1), 'Todos os Santos');
    put(new Date(y, 11, 1), 'Restauração da Independência');
    put(new Date(y, 11, 8), 'Imaculada Conceição');
    put(new Date(y, 11, 25), 'Natal');
    return out;
  }
  // Junta os feriados nacionais (só dias úteis; não mexe em dias já marcados como férias).
  function addNationalHolidays(S, y) {
    let added = 0, skipped = 0;
    for (const [k, name] of Object.entries(nationalHolidays(y))) {
      if (isWeekend(parseKey(k))) continue;
      if (S.holidays[k]) continue;
      if (S.vacations.days[k]) { skipped++; continue; }
      S.holidays[k] = name; added++;
    }
    return { added, skipped };
  }

  /* ---------- lembretes (usado pelo service worker) ---------- */
  const startOfHour = (d, h) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
  const nextHalfHour = (now, start) => now <= start ? start : new Date(start.getTime() + Math.ceil((now - start.getTime()) / HALF_HOUR) * HALF_HOUR);

  // Devolve { runtime, fire } — fire é o "slot" a mostrar ou null. Não faz I/O.
  function reminderStep(now, S) {
    const key = dateKey(now), e = S.entries[key] || {}, extra = Number(e.extra || 0), st = S.settings;
    let rt = { ...(S.reminderRuntime || {}) };
    const blocked = isWeekend(now) || isHoliday(S, now) || !!S.vacations.days[key] || isBaixa(S, now) || isJustif(S, now);
    if (blocked || st.notifications === false || extra >= LIMITS.DAY_EXTRA) {
      return { runtime: rt.date === key && Object.keys(rt).length ? {} : rt, fire: null, changed: rt.date === key && Object.keys(rt).length > 0 };
    }
    const startHour = st.reminderStart === 18 ? 18 : 17, start = startOfHour(now, startHour);
    if (now < start) return { runtime: rt, fire: null, changed: false };
    const updatedAt = Number(e.updatedAt || 0);
    if (rt.date !== key || rt.startHour !== startHour) {
      // Primeiro lembrete do dia: à hora marcada (tolerância de 5 min por causa do intervalo do alarme).
      // Se o navegador só abrir mais tarde, espera pela próxima meia hora em vez de aparecer do nada.
      const late = now.getTime() - start.getTime();
      rt = { date: key, startHour, nextAt: late < 5 * 60 * 1000 ? start.getTime() : nextHalfHour(now, start).getTime(), lastExtra: extra, lastUpdatedAt: updatedAt, lastSlot: '' };
    }
    if (extra > Number(rt.lastExtra || 0) && updatedAt >= Number(rt.lastUpdatedAt || 0)) rt.nextAt = updatedAt + HOUR;
    rt.lastExtra = extra;
    rt.lastUpdatedAt = Math.max(Number(rt.lastUpdatedAt || 0), updatedAt);
    let fire = null;
    if (now.getTime() >= Number(rt.nextAt || 0)) {
      const slot = `${key}-${rt.nextAt}`;
      if (rt.lastSlot !== slot) { fire = slot; rt.lastSlot = slot; }
      // avança para o próximo meio-hora *futuro* (evita rajadas depois de o PC estar suspenso)
      while (rt.nextAt <= now.getTime()) rt.nextAt += HALF_HOUR;
    }
    return { runtime: rt, fire, changed: true };
  }

  /* ---------- mensagens da mascote (PT-PT) ---------- */
  function mascotLine(S, now = new Date(), rng = Math.random) {
    const kind = dayKind(S, now), h = now.getHours();
    const pick = a => a[Math.floor(rng() * a.length)];
    switch (kind) {
      case 'descanso': return pick(['Zzz… duas horas extra já chegam. Vai descansar!', 'Hoje já demos tudo. Descansa, sim?']);
      case 'baixa': return pick(['Melhoras! Descansa bem. 🍵', 'Hoje é dia de mimos e sossego.']);
      case 'justificacao': return 'Dia justificado. Fica registado.';
      case 'feriado': return pick(['Feriado! Aproveita o dia. ☀️', 'Hoje só se trabalha se mesmo for preciso.']);
      case 'ferias': return pick(['Boas férias! Ao sol e ao sossego. ☀️', 'Férias! O relógio pode esperar.']);
      case 'fimdesemana': return pick(['Fim de semana. Descansar também conta! 💤', 'Os gatos mágicos vêm a 4h e 8h, mas o sofá também é ótimo.']);
      default: {
        const e = extraOf(S, now);
        if (e >= 1) return pick(['Uma hora extra! Já chegou uma visita. 🐾', 'Que dedicação! Mas não te esqueças de parar.']);
        if (h < 12) return pick(['Bom dia! Um dia de cada vez. 🐾', 'Café, alongamento e mãos à obra!']);
        if (h < 14) return pick(['Já almoçaste? Faz uma pausa!', 'Bebe um pouco de água. 💧']);
        if (h < 17) return pick(['Boa tarde! Falta pouco.', 'Estica as costas, gatinho humano.']);
        return pick(['Tudo bem por hoje? Só ficas se quiseres.', 'Já são horas de pensar em sair…']);
      }
    }
  }

  root.GDH = Object.assign(root.GDH || {}, {
    LIMITS, HALF_HOUR, HOUR, pad, dateKey, parseKey, addDays, mondayOf, isWeekend, isWeekday, seasonFor, seasonOfKey, yearOfKey,
    MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT, cap, longDate, num, fmtH, fmtSigned,
    defaultState, normalize, store, entryOf, extraOf, adjustOf, usedOf, specialOf, isBaixa, isJustif, isExempt, isHoliday, isSpecialDay,
    vacationKind, dayKind, dayTotal, seasonEntries, bankBalance, seasonSummary, weekDays, weekExtraTotal, weekSummary,
    randomUnused, catsOf, magicNumber, magicId, pad3, addCat, addMagic, catsForDay, applyChange,
    paymentPeriods, paymentLabel, baixaRanges, allowanceFor, carryoverFor, vacationStats, cycleVacationDay, convertBank, undoConversion,
    easter, nationalHolidays, addNationalHolidays, reminderStep, mascotLine, achievements, conversionsInYear, conversionsInSeason
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
