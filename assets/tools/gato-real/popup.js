/* Gato das Horas — janela principal (popup). Toda a lógica de horas está em core.js. */
(() => {
  'use strict';
  const G = GDH, A = G.art, C = G.cats;
  const $ = s => document.querySelector(s);
  const ic = A.icon;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => new Date();
  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const h = G.fmtH, hs = G.fmtSigned;

  let S = G.defaultState();
  const t0 = now();
  const ui = {
    tab: 'home', weekStart: G.mondayOf(t0), openDay: null, acc: {}, calMonth: new Date(t0.getFullYear(), t0.getMonth(), 1),
    line: '', lineKey: '', enter: true, arrived: new Set(), prev: {}, pending: new Set(), queue: []
  };

  /* ---------- guardar / alterar ---------- */
  async function mutate(fn) {
    S = await G.store.load(now());
    const res = fn(S);
    if (res && res.ok === false) { render(); return res; }
    await G.store.save(S);
    render();
    return res || { ok: true };
  }

  const REASONS = {
    weekCap: 'Já tens 10h extra esta semana. Chega por agora! 💤',
    specialCap: 'O máximo ao fim de semana ou feriado é 8h por dia.',
    dayCap: 'Duas horas extra por dia é o limite. Vai descansar!',
    bank: 'O BO não chega para isso.',
    special: 'Este controlo não se aplica a fins de semana e feriados.',
    notSpecial: 'As horas especiais são só para fins de semana e feriados.',
    noDays: 'Já não tens mais dias de férias disponíveis.',
    weekend: 'Fins de semana não contam como férias.',
    inUse: 'Retira primeiro um dia de férias marcado.'
  };

  async function change(k, type, delta) {
    let res, rewards = [];
    await mutate(st => {
      res = G.applyChange(st, G.parseKey(k), type, delta, { now: now() });
      if (res.ok && res.rewards) {
        rewards = res.rewards.map(r => ({ ...r, eventId: uid(), timestamp: Date.now() }));
        const last = rewards[rewards.length - 1];
        st.lastReward = last; st.lastRewardSeen = last.eventId;
      }
      return res;
    });
    if (!res.ok) { if (REASONS[res.reason]) toast(REASONS[res.reason]); return; }
    if (rewards.length) { ui.queue = rewards.slice(1); showReward(rewards[0]); }
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(text, withCat = true) {
    const el = $('#toast');
    el.innerHTML = `${withCat ? '<img src="assets/mascot/gato.png" alt="">' : ''}<span>${esc(text)}</span>`;
    el.classList.remove('hidden');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  /* ---------- peças comuns ---------- */
  function stepper(k, type, label, display, value, step = 0.5) {
    const mins = step * 60;
    return `<div class="ctl"><label>${label}</label><div class="stepper">
      <button class="sbtn" type="button" data-act="step" data-k="${k}" data-t="${type}" data-d="${-step}" aria-label="${label}: menos ${mins} minutos">${ic('minus')}</button>
      <output data-bump="${type}-${k}" data-val="${value}">${display}</output>
      <button class="sbtn plus" type="button" data-act="step" data-k="${k}" data-t="${type}" data-d="${step}" aria-label="${label}: mais ${mins} minutos">${ic('plus')}</button>
    </div></div>`;
  }

  function controls(d) {
    const k = G.dateKey(d);
    if (G.isSpecialDay(S, d)) {
      const sp = G.specialOf(S, d);
      const q = (n, magic) => `<button class="qbtn ${magic ? 'magic' : ''} ${magic && sp >= n ? 'hit' : ''}" type="button" data-act="step" data-k="${k}" data-t="special" data-d="${n}" aria-label="Adicionar ${n} hora${n > 1 ? 's' : ''}${magic ? ', gato mágico' : ''}"><b>+${n}h</b>${magic ? `<small>${sp >= n ? '✓ gato mágico' : '✦ gato mágico'}</small>` : '<small>&nbsp;</small>'}</button>`;
      return `<div class="controls one">${stepper(k, 'special', 'Horas especiais', h(sp), sp)}</div>
        <div class="eyebrow" style="margin-top:12px">Adicionar de uma vez</div>
        <div class="quick two">${q(4, true)}${q(8, true)}</div>
        <p class="hint" style="margin-top:6px">Não entram no BO. Contam para o pagamento do fim de semana. Máximo de 8h por dia; os gatos mágicos vêm às 4h e às 8h.</p>`;
    }
    const extra = G.extraOf(S, d), adj = G.adjustOf(S, d), used = G.usedOf(S, d);
    const baixa = G.isBaixa(S, d), just = G.isJustif(S, d);
    const wk = G.weekExtraTotal(S, d);
    const qx = n => `<button class="qbtn cat ${extra >= n ? 'hit' : ''}" type="button" data-act="step" data-k="${k}" data-t="extra" data-d="${n}" aria-label="Adicionar ${n} hora${n > 1 ? 's' : ''} extra, ${n} gato${n > 1 ? 's' : ''}"><b>+${n}h</b><small><svg class="ic"><use href="#i-paw"/></svg>${extra >= n ? '✓ ' : ''}${n} gato${n > 1 ? 's' : ''}</small></button>`;
    return `<div class="controls">
        ${stepper(k, 'extra', 'Horas extra', h(extra), extra)}
        ${stepper(k, 'adjustment', 'Ajuste', adj ? hs(adj) : '0', adj)}
        ${stepper(k, 'used', 'BO usado', h(used), used)}
      </div>
      <div class="eyebrow" style="margin-top:12px">Horas extra de uma vez</div>
      <div class="quick two">${qx(1)}${qx(2)}</div>
      <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:12px">
        <button class="toggle red ${baixa ? 'on' : ''}" type="button" data-act="flag" data-k="${k}" data-t="baixa">${ic('cup')}${baixa ? 'Retirar baixa' : 'Baixa'}</button>
        <button class="toggle gold ${just ? 'on' : ''}" type="button" data-act="flag" data-k="${k}" data-t="justificacao">${ic('note')}${just ? 'Retirar justificação' : 'Justificação'}</button>
      </div>
      <p class="hint" style="margin-top:8px">Extra esta semana: <b>${h(wk)}</b> de ${G.LIMITS.WEEK_EXTRA}h · máx. ${G.LIMITS.DAY_EXTRA}h por dia. Ajustes de ±30 min mexem no BO, exceto em dias de baixa ou justificação.</p>`;
  }

  /* ---------- QUINTAL ---------- */
  function homeScene(d) {
    const night = S.settings.mode === 'night', kind = G.dayKind(S, d), k = G.dateKey(d), special = G.isSpecialDay(S, d);
    const variant = kind === 'fimdesemana' ? 'magic' : kind === 'feriado' ? 'holiday' : kind === 'ferias' ? 'ferias' : 'work';
    const sleeping = kind === 'descanso' || kind === 'baixa';
    const bank = G.bankBalance(S, d);
    const extra = G.extraOf(S, d), used = G.usedOf(S, d), adj = G.adjustOf(S, d);

    // placa
    let sign;
    if (kind === 'baixa') sign = ['HOJE', '<span class="n word">Baixa</span>', 'não mexe no BO'];
    else if (kind === 'justificacao') sign = ['HOJE', '<span class="n word">Justificado</span>', `${h(Math.abs(adj))} registadas`];
    else if (kind === 'ferias') sign = ['HOJE', '<span class="n word">Férias</span>', G.vacationKind(S, d) === 'bo' ? 'via BO' : 'bom descanso'];
    else if (kind === 'feriado') sign = ['FERIADO', `<span class="n" data-bump="total" data-val="${G.dayTotal(S, d)}">${h(G.dayTotal(S, d))}</span>`, esc(S.holidays[k] || 'horas especiais')];
    else if (kind === 'fimdesemana') sign = ['HOJE', `<span class="n" data-bump="total" data-val="${G.dayTotal(S, d)}">${h(G.dayTotal(S, d))}</span>`, 'horas especiais'];
    else {
      const parts = [`${h(G.LIMITS.BASE - used)} base`];
      if (extra) parts.push(`+${h(extra)}`);
      if (adj) parts.push(hs(adj));
      sign = ['HOJE', `<span class="n" data-bump="total" data-val="${G.dayTotal(S, d)}">${h(G.dayTotal(S, d))}</span>`, parts.join(' · ')];
    }

    // mensagem da mascote (estável até mudar o tipo de dia / horas extra)
    const key = `${kind}|${extra}|${Math.floor(d.getHours() / 4)}`;
    if (ui.lineKey !== key) { ui.lineKey = key; ui.line = G.mascotLine(S, d); }

    // slots
    const todays = G.catsForDay(S, d, d);
    const img = (r, cls = '') => {
      const arrive = ui.arrived.has(`${r.kind}:${r.id}`) ? ' arrive' : '';
      return `<img class="cat${arrive}" src="${C.path(r)}" alt="${esc(C.name(r))}" title="${esc(C.name(r))}" data-act="cat" data-kind="${r.kind}" data-id="${r.id}" data-src="${r.source}">`;
    };
    let slots = '', tags = '';
    if (special) {
      const sp = G.specialOf(S, d), magic = todays.filter(x => x.kind === 'magic');
      G.LIMITS.MAGIC_STEPS.forEach((n, i) => {
        const r = magic.find(x => x.threshold === n), lit = sp >= n;
        slots += `<div class="slot magic ${i ? 'b' : 'a'}">${A.ring(lit)}${r ? img(r) : ''}</div>`;
        tags += `<span class="slot-tag ${i ? 'b' : 'a'} ${lit ? 'done' : ''}">${n}h especiais</span>`;
      });
    } else {
      const cats = todays.filter(x => x.kind === 'normal');
      for (let i = 0; i < 2; i++) {
        const r = cats[i], half = !r && Math.floor(extra) === i && extra % 1 >= 0.5;
        if (i === 0) slots += `<div class="slot cushion a">${A.cushion()}${r ? img(r) : half ? '<span class="q">…</span>' : `<svg class="ic ghost-paw"><use href="#i-paw"/></svg>`}</div>`;
        else slots += `<div class="slot box b">${A.boxBack()}${r ? img(r) : half ? A.boxPeek() : '<span class="q">?</span>'}${A.boxFront()}</div>`;
        tags += `<span class="slot-tag ${i ? 'b' : 'a'} ${r ? 'done' : ''}">${i + 1}.ª hora</span>`;
      }
    }

    return `<div class="scene" data-kind="${kind}">
      ${A.yard({ night, variant })}
      <button class="celestial" type="button" data-act="mode" aria-label="${night ? 'Mudar para modo dia' : 'Mudar para modo noite'}" title="${night ? 'Modo dia' : 'Modo noite'}">${ic(night ? 'moon' : 'sun')}</button>
      <div class="sign"><span class="k">${sign[0]}</span>${sign[1]}<small>${sign[2]}</small></div>
      <div class="bubble" id="bubble">${esc(ui.line)}</div>
      <img class="mascot ${sleeping ? 'sleeping' : ''}" id="mascot" src="assets/mascot/${sleeping ? 'gato-dormir' : 'gato'}.png" alt="Gato das Horas" data-act="mascot" draggable="false">
      ${kind === 'baixa' ? `<span class="mascot-prop">${ic('cup')}</span>` : ''}
      ${slots}${tags}
      <div class="jar" data-act="go" data-tab="week" title="BO: ${h(bank)}">${A.jar(bank, night)}<span data-bump="jar" data-val="${bank}">${h(bank)}</span></div>
    </div>`;
  }

  const KIND_TITLE = { trabalho: 'Dia de trabalho', descanso: 'Já chega por hoje', baixa: 'Dia de baixa', justificacao: 'Dia justificado', feriado: 'Feriado', fimdesemana: 'Fim de semana', ferias: 'Dia de férias' };
  const KIND_CHIP = {
    baixa: ['red', 'cup', 'Baixa'], justificacao: ['gold', 'note', 'Justificação'], feriado: ['red', 'flag', 'Feriado'],
    fimdesemana: ['purple', 'sparkle', 'Fim de semana'], ferias: ['gold', 'sun', 'Férias'], descanso: ['purple', 'zzz', 'Descanso']
  };

  function viewHome() {
    const d = now(), kind = G.dayKind(S, d);
    const wk = G.weekSummary(S, G.mondayOf(d)), wkExtra = G.weekExtraTotal(S, d);
    const uniq = new Set((S.catsBySeason[G.seasonFor(d)] || []).filter(x => x.kind === 'normal').map(x => x.id)).size;
    const chip = KIND_CHIP[kind];
    return `${homeScene(d)}
      <div class="card">
        <div class="row between" style="margin-bottom:10px">
          <div><div class="eyebrow">O teu dia</div><div class="h2">${KIND_TITLE[kind]}</div></div>
          ${chip ? `<span class="chip ${chip[0]}">${ic(chip[1])}${chip[2]}</span>` : ''}
        </div>
        ${controls(d)}
      </div>
      <div class="stats">
        <div class="stat"><span class="k">Semana</span><span class="v" data-bump="wk" data-val="${wk.total}">${h(wk.total)}</span></div>
        <div class="stat"><span class="k">Extra</span><span class="v">${G.num(wkExtra)}<small>/${G.LIMITS.WEEK_EXTRA}h</small></span><div class="meter"><i class="pink" style="width:${Math.min(100, wkExtra / G.LIMITS.WEEK_EXTRA * 100)}%"></i></div></div>
        <button class="stat" type="button" data-act="go" data-tab="cats"><span class="k">Gatos</span><span class="v">${uniq}<small>/${G.LIMITS.NORMAL_CATS}</small></span><div class="meter"><i style="width:${uniq / G.LIMITS.NORMAL_CATS * 100}%"></i></div></button>
      </div>`;
  }

  /* ---------- REGISTO ---------- */
  function acc(id, icon, title, sub, body) {
    const open = !!ui.acc[id];
    return `<div class="card tight acc ${open ? 'open' : ''}">
      <button class="acc-head" type="button" data-act="acc" data-id="${id}" aria-expanded="${open}">${ic(icon)}<span><span class="h2" style="font-size:14px">${title}</span>${sub ? `<br><span class="hint">${sub}</span>` : ''}</span>${ic('chev', 'chev')}</button>
      ${open ? `<div class="acc-body">${body}</div>` : ''}</div>`;
  }

  function dayRow(d) {
    const k = G.dateKey(d), we = G.isWeekend(d), today = k === G.dateKey(now()), open = ui.openDay === k;
    const chips = [];
    const chipHTML = (c, i, t) => `<span class="chip ${c}">${ic(i)}${t}</span>`;
    if (G.isHoliday(S, d)) chips.push(chipHTML('red', 'flag', esc(S.holidays[k])));
    const vk = G.vacationKind(S, d);
    if (vk) chips.push(chipHTML(vk === 'bo' ? 'teal' : 'gold', vk === 'bo' ? 'fish' : 'sun', vk === 'bo' ? 'Férias via BO' : 'Férias'));
    if (G.isSpecialDay(S, d)) { const sp = G.specialOf(S, d); if (sp) chips.push(chipHTML('purple', 'sparkle', `${h(sp)} especiais`)); }
    else {
      if (G.isBaixa(S, d)) chips.push(chipHTML('red', 'cup', 'Baixa'));
      if (G.isJustif(S, d)) chips.push(chipHTML('gold', 'note', 'Justificação'));
      const e = G.extraOf(S, d), a = G.adjustOf(S, d), u = G.usedOf(S, d);
      if (e) chips.push(chipHTML('pink', 'paw', `+${h(e)} extra`));
      if (a) chips.push(chipHTML('purple', 'sparkle', `ajuste ${hs(a)}`));
      if (u) chips.push(chipHTML('teal', 'fish', `BO −${h(u)}`));
    }
    if (!chips.length) chips.push(`<span class="hint">${we ? 'Descanso' : 'Dia normal'}</span>`);
    return `<div class="day ${open ? 'open' : ''}">
      <button class="day-head" type="button" data-act="day" data-k="${k}" aria-expanded="${open}">
        <span class="leaf ${we ? 'we' : ''} ${today ? 'today' : ''}"><i>${G.WEEKDAYS_SHORT[d.getDay()].toUpperCase()}</i><b>${d.getDate()}</b></span>
        <span class="sum"><span class="chips">${chips.join('')}</span></span>
        <span class="tot">${h(G.dayTotal(S, d))}<small>${G.isSpecialDay(S, d) ? 'ESPECIAIS' : 'TOTAL'}</small></span>
        ${ic('chev', 'chev')}
      </button>
      ${open ? `<div class="day-body">${controls(d)}</div>` : ''}</div>`;
  }

  function viewWeek() {
    const d = now(), sum = G.seasonSummary(S, d), ws = G.weekSummary(S, ui.weekStart);
    const days = ws.days, first = days[0], last = days[6];
    const range = first.getMonth() === last.getMonth() ? `${first.getDate()}–${last.getDate()} ${G.MONTHS_SHORT[last.getMonth()]}` : `${first.getDate()} ${G.MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${G.MONTHS_SHORT[last.getMonth()]}`;
    const isThisWeek = G.dateKey(ui.weekStart) === G.dateKey(G.mondayOf(d));
    const ranges = G.baixaRanges(S, d);
    const periods = G.paymentPeriods(S, d);
    const per = p => `<div class="period"><div><b style="font-size:12px">${G.paymentLabel(p)}</b><div class="hint">${p.status === 'atual' ? 'período atual · em curso' : p.status === 'anterior' ? 'fecho anterior · pronto a pagar' : 'período anterior'}</div></div><b class="h">${h(p.hours)}</b></div>`;
    const older = periods.slice(2);
    return `<div class="tiles3">
        <div class="stat"><span class="k">Extra ganho</span><span class="v">${h(sum.extra)}</span></div>
        <div class="stat"><span class="k">BO usado</span><span class="v">${h(sum.used + sum.converted)}</span></div>
        <div class="stat" style="background:var(--teal-l)"><span class="k">BO agora</span><span class="v" data-bump="bo2" data-val="${sum.balance}">${h(sum.balance)}</span></div>
      </div>
      <div class="card">
        <div class="week-head">
          <button class="icon-btn" type="button" data-act="week" data-d="-7" aria-label="Semana anterior">${ic('left')}</button>
          <div class="mid"><div class="eyebrow">${isThisWeek ? 'Esta semana' : 'Semana'}</div><div class="h2">${range}</div></div>
          <button class="icon-btn" type="button" data-act="week" data-d="7" aria-label="Semana seguinte">${ic('right')}</button>
        </div>
        <div class="chips" style="margin:10px 0 4px;justify-content:center">
          <span class="chip">${ic('calendar')}${h(ws.total)}</span>
          <span class="chip pink">${ic('paw')}${h(ws.extra)} extra</span>
          <span class="chip teal">${ic('fish')}${h(ws.used)} BO</span>
          ${ws.adjust ? `<span class="chip purple">${ic('sparkle')}${hs(ws.adjust)}</span>` : ''}
          ${ws.special ? `<span class="chip purple">${ic('sparkle')}${h(ws.special)} especiais</span>` : ''}
        </div>
        ${days.map(dayRow).join('')}
        ${isThisWeek ? '' : `<div style="text-align:center;margin-top:6px"><button class="btn small" type="button" data-act="week" data-d="0">Voltar a esta semana</button></div>`}
      </div>
      ${acc('abs', 'cup', 'Baixas e justificações', `${sum.baixaDays} dia${sum.baixaDays === 1 ? '' : 's'} de baixa · ${sum.justifiedDays} justificação${sum.justifiedDays === 1 ? '' : 'ões'}`,
        `<div class="eyebrow">Baixa · ${G.seasonFor(d)}</div>
         ${ranges.length ? `<div class="chips" style="margin:6px 0 10px">${ranges.map(r => `<span class="chip red">${ic('cup')}${r}</span>`).join('')}</div>` : '<p class="hint" style="margin:4px 0 10px">Sem dias de baixa registados.</p>'}
         <div class="eyebrow">Justificações</div>
         <p style="margin-top:4px"><b>${sum.justifiedDays} dia${sum.justifiedDays === 1 ? '' : 's'}</b> · ${h(sum.justifiedHours)}</p>`)}
      ${acc('pay', 'sparkle', 'Fim de semana a pagar', 'períodos de dia 15 a dia 15', `${periods.slice(0, 2).map(per).join('')}
         ${older.length ? `<button class="btn small" type="button" style="margin-top:10px" data-act="acc" data-id="older">${ui.acc.older ? 'Esconder' : 'Ver'} períodos anteriores (${older.length})</button>${ui.acc.older ? older.map(per).join('') : ''}` : ''}
         <p class="hint" style="margin-top:10px">Conta só as horas especiais de sábados, domingos e feriados.</p>`)}
      <p class="hint" style="text-align:center">Período anual ${G.seasonFor(d)} · reinicia a 1 de setembro. Fins de semana não entram no BO.</p>`;
  }

  /* ---------- GATOS ---------- */
  function polaroid(r, isNew) {
    return `<button class="polaroid ${isNew ? 'new' : ''}" type="button" data-act="cat" data-kind="${r.kind}" data-id="${r.id}" data-src="${r.source}">
      <span class="pic"><img src="${C.path(r)}" alt="${esc(C.name(r))}"></span><small>${esc(C.name(r))}</small><small class="d">${C.tag(r)}${C.shortDate(r) ? ' · ' + C.shortDate(r) : ''}</small></button>`;
  }
  function sticker(r) {
    return `<button class="sticker" type="button" data-act="cat" data-kind="${r.kind}" data-id="${r.id}" data-src="${r.source}" title="${esc(C.name(r))}"><img src="${C.path(r)}" alt="${esc(C.name(r))}"><small>${C.tag(r)}</small></button>`;
  }
  function viewCats() {
    const d = now(), all = S.catsBySeason[G.seasonFor(d)] || [];
    const normal = all.filter(x => x.kind === 'normal'), magic = all.filter(x => x.kind === 'magic');
    const uniqN = [...new Map(normal.map(x => [x.id, x])).values()].sort((a, b) => a.id - b.id);
    const uniqM = [...new Map(magic.map(x => [x.id, x])).values()];
    const n = uniqN.length, total = G.LIMITS.NORMAL_CATS, next = C.STAMPS.find(s => s > n);
    const recent = normal.slice(-5).reverse(), todayKey = G.dateKey(d);
    const recentM = magic.slice(-5).reverse(), moreM = magic.slice(0, -5).reverse();
    const pct = n / total * 100;
    const ach = G.achievements(S, d), gotN = ach.filter(a => a.got).length;
    const achBody = `<div class="ach-list">${[...ach].sort((a, b) => b.got - a.got).map(a => `<div class="ach ${a.got ? 'got' : ''}"><span class="ach-ic">${ic(a.got ? a.icon : 'lock')}</span><span class="ach-tx"><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></span>${a.prog ? `<em>${G.num(a.prog[0])}/${a.prog[1]}</em>` : ''}</div>`).join('')}</div>`;
    return `<div class="card book-cover">
        <svg class="ic paw"><use href="#i-paw"/></svg>
        <div class="eyebrow">Livro de gatos · ${G.seasonFor(d)}</div>
        <div class="big" data-bump="n" data-val="${n}">${n}<small> / ${total} gatos</small></div>
        <div class="track"><i style="width:${pct}%"></i>${n ? `<svg class="ic swim" style="left:${Math.max(4, Math.min(96, pct))}%"><use href="#i-fish"/></svg>` : ''}</div>
        <div class="hint">${n ? (next ? `Próxima conquista: <b>${C.stampLabel(next)}</b> — faltam ${next - n}.` : 'Álbum completo! 🎉') : 'O livro está à espera do primeiro visitante.'}</div>
      </div>
      <div class="card">
        <div class="row between"><div><div class="eyebrow">Últimas visitas</div><div class="h2">${recent.length ? 'As tuas 5 últimas chegadas' : 'Ainda ninguém veio'}</div></div><span class="hint">${n}/${total}</span></div>
        ${recent.length ? `<div class="polaroids" style="margin-top:12px">${recent.map((r, i) => polaroid(r, i === 0 && r.source === todayKey)).join('')}</div>` : `<div class="empty" style="padding:14px 0 4px"><svg class="ic"><use href="#i-paw"/></svg><p class="hint">Cada hora extra pode trazer um visitante novo.</p></div>`}
      </div>
      ${acc('album', 'book', 'Coleção completa', `${n}/${total} descobertos`, n ? `<div class="sticker-grid">${uniqN.map(sticker).join('')}</div>` : '<p class="hint">Ainda não descobriste nenhum gato.</p>')}
      ${magic.length ? `<div class="card magic-book"><div class="stars"></div>
          <div class="row between"><div><div class="eyebrow">Grimório · coleção mágica</div><div class="h2">${uniqM.length}/${G.LIMITS.MAGIC_CATS} descobertos</div></div><span class="hint" style="color:#cfc6ff">Fins de semana · 4h / 8h</span></div>
          <div class="polaroids" style="margin-top:12px">${recentM.map(r => polaroid(r, false)).join('')}</div>
          ${moreM.length ? `<button class="btn small gold" type="button" style="margin-top:12px" data-act="acc" data-id="magic">${ui.acc.magic ? 'Esconder mágicos' : `Ver mais mágicos (${moreM.length})`}</button>${ui.acc.magic ? `<div class="sticker-grid" style="margin-top:12px">${moreM.map(sticker).join('')}</div>` : ''}` : ''}
        </div>`
        : `<div class="card magic-book"><div class="stars"></div><div class="empty" style="padding:14px 0"><svg class="ic" style="color:#e6e0ff"><use href="#i-sparkle"/></svg><div class="h2">Grimório fechado</div><p class="hint" style="color:#cfc6ff;margin-top:4px">Trabalhar 4h ou 8h num sábado, domingo ou feriado abre uma página. Descansar também é ótimo. 🌙</p></div></div>`}
      <div class="card"><div class="row between"><div><div class="eyebrow">Por descobrir</div><div class="h2">O resto está escondido</div></div><span class="hint">${total - n} por descobrir</span></div>
        <div class="mystery">${'<div>?</div>'.repeat(6)}</div><p class="hint" style="margin-top:8px;text-align:center">Os gatos só aparecem depois de serem desbloqueados.</p></div>
      ${acc('ach', 'star', 'Conquistas', `${gotN}/${ach.length} desbloqueadas`, achBody)}`;
  }

  /* ---------- FÉRIAS ---------- */
  function viewVac() {
    const night = S.settings.mode === 'night', cm = ui.calMonth, year = cm.getFullYear();
    const st = G.vacationStats(S, year), v = S.vacations;
    const first = new Date(year, cm.getMonth(), 1), offset = (first.getDay() || 7) - 1, days = new Date(year, cm.getMonth() + 1, 0).getDate();
    const todayKey = G.dateKey(now());
    let cells = '<span class="cd empty"></span>'.repeat(offset);
    for (let i = 1; i <= days; i++) {
      const dt = new Date(year, cm.getMonth(), i), k = G.dateKey(dt), we = G.isWeekend(dt), vk = v.days[k], hol = S.holidays[k];
      const cls = hol ? 'hol' : vk === 'bo' ? 'bo' : vk ? 'vac' : '';
      const icon = hol ? 'flag' : vk === 'bo' ? 'fish' : vk ? 'sun' : '';
      cells += `<button class="cd ${we ? 'we' : ''} ${cls} ${k === todayKey ? 'today' : ''}" type="button" ${we ? 'disabled' : ''} data-act="cal" data-k="${k}" ${hol ? `title="${esc(hol)}"` : ''} aria-label="${i} de ${G.MONTHS[cm.getMonth()]}${hol ? ', ' + esc(hol) : vk === 'bo' ? ', férias via BO' : vk ? ', férias' : ''}">${i}${icon ? ic(icon) : ''}</button>`;
    }
    const upcoming = Object.keys(v.days).filter(k => k >= todayKey && G.yearOfKey(k) === year).sort()[0];
    const until = upcoming ? Math.max(0, Math.round((G.parseKey(upcoming) - G.parseKey(todayKey)) / 86400000)) : null;
    const bank = G.bankBalance(S, now()), canUndo = v.bankLog.length > 0;
    return `<div class="beach">${A.beach(night)}<img class="m" src="assets/mascot/gato.png" alt=""><div class="ttl outlined">Férias</div></div>
      <div class="card">
        <div class="row between">
          <div><div class="eyebrow">Dias disponíveis em ${year}</div><div class="vac-big"><span class="n" data-bump="vac" data-val="${st.remaining}">${st.remaining}</span><span class="muted">dias</span></div></div>
          <div class="year-nav"><button class="icon-btn" type="button" data-act="calyear" data-d="-1" aria-label="Ano anterior">${ic('left')}</button><b>${year}</b><button class="icon-btn" type="button" data-act="calyear" data-d="1" aria-label="Ano seguinte">${ic('right')}</button></div>
        </div>
        <div class="tiles3" style="margin-top:10px">
          <div class="stat"><span class="k">Este ano</span><span class="v">${st.annual}<small> d</small></span></div>
          <div class="stat"><span class="k">Transitados</span><span class="v">${st.carry}<small> d</small></span></div>
          <div class="stat" style="background:var(--teal-l)"><span class="k">Via BO</span><span class="v">${st.bo}<small> d</small></span></div>
        </div>
        <p class="hint" style="margin-top:10px">${st.used} de ${st.total} dias marcados${upcoming ? ` · Próximas férias ${until === 0 ? '<b>hoje</b>' : `em <b>${until} dia${until === 1 ? '' : 's'}</b>`}` : ''}</p>
      </div>
      <div class="card">
        <div class="cal-head">
          <button class="icon-btn" type="button" data-act="calmonth" data-d="-1" aria-label="Mês anterior">${ic('left')}</button>
          <div class="h2" style="text-transform:capitalize">${G.MONTHS[cm.getMonth()]} ${year}</div>
          <button class="icon-btn" type="button" data-act="calmonth" data-d="1" aria-label="Mês seguinte">${ic('right')}</button>
        </div>
        <div class="cal-week">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(x => `<span>${x}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="legend"><span><i style="background:var(--gold)"></i>Férias</span><span><i style="background:var(--teal)"></i>Férias via BO</span><span><i style="background:var(--red-l)"></i>Feriado</span></div>
        <p class="hint" style="margin-top:8px">Um toque num dia útil muda: <b>Férias → Férias via BO → Feriado → limpar</b>. "Via BO" só aparece se tiveres trocas livres.</p>
      </div>
      <div class="card" style="background:var(--teal-l)">
        <div class="row between"><div><div class="eyebrow">Banco de horas</div><div class="h2">${h(bank)} disponíveis</div><p class="hint">Troca 8h do BO por mais 1 dia de férias (${st.boFree > 0 ? `${st.boFree} por marcar` : 'nenhum por marcar'}).</p></div>${A.jar(bank, night).replace('class="obj-jar"', 'class="obj-jar" style="width:44px;flex:none"')}</div>
        <div class="row" style="margin-top:10px;gap:8px"><button class="btn teal" style="flex:1" type="button" data-act="convert" ${bank < 8 ? 'disabled' : ''}>${ic('fish')}Trocar 8h por 1 dia</button><button class="btn" type="button" data-act="undo" ${canUndo ? '' : 'disabled'}>Desfazer</button></div>
      </div>
      <div class="card">
        <div class="eyebrow">Definições de férias</div>
        <div class="field"><span>Regra de férias</span><select id="vacAllowance"><option value="24" ${Number(v.allowance) !== 22 ? 'selected' : ''}>24 dias · regra da empresa</option><option value="22" ${Number(v.allowance) === 22 ? 'selected' : ''}>22 dias</option></select></div>
        <div class="field"><span>Dias transitados</span><select id="vacCarryMode"><option value="auto" ${v.carryoverMode !== 'manual' ? 'selected' : ''}>Automático</option><option value="manual" ${v.carryoverMode === 'manual' ? 'selected' : ''}>Manual</option></select></div>
        <div class="field"><span>Transitados de ${year - 1}</span><input id="vacCarry" type="number" min="0" max="60" step="1" value="${v.carryoverMode === 'manual' ? Number(v.carryoverDays || 0) : st.carry}" ${v.carryoverMode === 'manual' ? '' : 'disabled'}></div>
        <div class="field"><span>Feriados nacionais<br><span class="hint">Municipais: marca-os no calendário.</span></span><button class="btn small pink" type="button" data-act="holidays">${ic('flag')}Adicionar ${year}</button></div>
        <p class="hint" style="margin-top:6px">${st.annual} dias deste ano + ${st.carry} transitados + ${st.bo} via BO. Confirma a regra com os recursos humanos.</p>
      </div>`;
  }

  const VIEWS = { home: viewHome, week: viewWeek, cats: viewCats, vac: viewVac };
  const TABS = [['home', 'house', 'Quintal'], ['week', 'notebook', 'Registo'], ['cats', 'book', 'Gatos'], ['vac', 'umbrella', 'Férias']];

  /* ---------- desenhar ---------- */
  function render() {
    const d = now(), night = S.settings.mode === 'night';
    document.body.classList.toggle('night', night);
    $('#todayLabel').textContent = G.cap(G.longDate(d));
    const bank = G.bankBalance(S, d), uniq = new Set((S.catsBySeason[G.seasonFor(d)] || []).filter(x => x.kind === 'normal').map(x => x.id)).size;
    $('#hudBo').innerHTML = `${ic('fish')}<span data-bump="hudbo" data-val="${bank}">${h(bank)}</span>`;
    $('#hudCats').innerHTML = `${ic('paw')}<span data-bump="hudcats" data-val="${uniq}">${uniq}</span>`;
    $('#settingsBtn').innerHTML = ic('gear');
    document.querySelectorAll('#dock button').forEach((b, i) => {
      const [id, icon, label] = TABS[i];
      b.innerHTML = `${ic(icon)}<span>${label}</span>`;
      b.classList.toggle('on', ui.tab === id);
      b.setAttribute('aria-current', ui.tab === id ? 'page' : 'false');
    });
    const view = $('#view'), top = view.scrollTop;
    view.innerHTML = `<div class="page ${ui.enter ? 'enter' : ''}">${VIEWS[ui.tab]()}</div>`;
    ui.enter = false; view.scrollTop = top;
    ui.arrived = new Set();
    view.querySelectorAll('[data-bump]').forEach(el => {
      const k = el.dataset.bump, v = el.dataset.val;
      if (ui.prev[k] !== undefined && ui.prev[k] !== v) el.classList.add('bump');
      ui.prev[k] = v;
    });
  }

  function go(tab) { if (ui.tab !== tab) { ui.tab = tab; ui.enter = true; $('#view').scrollTop = 0; } render(); }

  /* ---------- cliques ---------- */
  $('#view').addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act, k = el.dataset.k;
    if (a === 'step') change(k, el.dataset.t, Number(el.dataset.d));
    else if (a === 'flag') change(k, el.dataset.t, 1);
    else if (a === 'day') { ui.openDay = ui.openDay === k ? null : k; render(); }
    else if (a === 'acc') { ui.acc[el.dataset.id] = !ui.acc[el.dataset.id]; render(); }
    else if (a === 'go') go(el.dataset.tab);
    else if (a === 'week') { ui.weekStart = Number(el.dataset.d) === 0 ? G.mondayOf(now()) : G.addDays(ui.weekStart, Number(el.dataset.d)); ui.openDay = null; render(); }
    else if (a === 'cat') showCat({ kind: el.dataset.kind, id: el.dataset.kind === 'magic' ? el.dataset.id : Number(el.dataset.id), source: el.dataset.src });
    else if (a === 'mode') mutate(st => { st.settings.mode = st.settings.mode === 'night' ? 'day' : 'night'; });
    else if (a === 'mascot') petMascot(el);
    else if (a === 'cal') mutate(st => G.cycleVacationDay(st, k)).then(r => { if (r && r.ok === false && REASONS[r.reason]) toast(REASONS[r.reason]); });
    else if (a === 'calmonth') { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + Number(el.dataset.d), 1); render(); }
    else if (a === 'calyear') { ui.calMonth = new Date(ui.calMonth.getFullYear() + Number(el.dataset.d), ui.calMonth.getMonth(), 1); render(); }
    else if (a === 'convert') mutate(st => G.convertBank(st, now())).then(r => { if (r?.ok === false) toast(REASONS[r.reason] || 'Não foi possível trocar.'); else toast('Troca feita! Marca o dia como "Férias via BO".'); });
    else if (a === 'undo') mutate(st => G.undoConversion(st)).then(r => { if (r?.ok === false) toast(REASONS[r.reason] || 'Nada para desfazer.'); });
    else if (a === 'holidays') mutate(st => { const r = G.addNationalHolidays(st, ui.calMonth.getFullYear()); ui.holidayResult = r; return { ok: true }; })
      .then(() => { const r = ui.holidayResult; toast(r.added ? `${r.added} feriado${r.added === 1 ? '' : 's'} adicionado${r.added === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} ignorado${r.skipped === 1 ? '' : 's'} por já serem férias)` : ''}.` : 'Os feriados nacionais já estavam todos marcados.'); });
  });
  $('#view').addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'vacAllowance') mutate(st => { st.vacations.autoAllowance = false; st.vacations.allowance = t.value === '22' ? 22 : 24; });
    else if (t.id === 'vacCarryMode') mutate(st => { st.vacations.carryoverMode = t.value; });
    else if (t.id === 'vacCarry') mutate(st => { st.vacations.carryoverDays = Math.max(0, Math.min(60, Math.floor(Number(t.value) || 0))); });
  });
  $('#dock').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) go(b.dataset.tab); });
  $('#hudBo').addEventListener('click', () => go('week'));
  $('#hudCats').addEventListener('click', () => go('cats'));
  $('#settingsBtn').addEventListener('click', openSettings);

  /* ---------- mascote ---------- */
  function petMascot(el) {
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    const scene = el.closest('.scene'), r = el.getBoundingClientRect(), sr = scene.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
      const hEl = document.createElement('span');
      hEl.innerHTML = ic('heart'); hEl.firstChild.classList.add('heart');
      const svg = hEl.firstChild;
      svg.style.left = `${r.left - sr.left + r.width / 2 - 10 + (i - 1) * 16}px`;
      svg.style.top = `${r.top - sr.top + 12}px`;
      svg.style.setProperty('--dx', `${(i - 1) * 14}px`); svg.style.setProperty('--r', `${(i - 1) * 16}deg`);
      svg.style.animationDelay = `${i * .12}s`;
      scene.appendChild(svg);
      setTimeout(() => svg.remove(), 1600);
    }
    ui.line = G.mascotLine(S, now());
    const b = $('#bubble'); if (b) { b.textContent = ui.line; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  }

  /* ---------- prémio / detalhe de gato ---------- */
  const layer = () => $('#layer');
  function closeLayer(after) { layer().innerHTML = ''; if (after) after(); }

  function confetti(magical) {
    const cols = magical ? ['#ffd15c', '#c9a8ff', '#ffffff', '#8fe3ff'] : ['#ff9db8', '#ffd15c', '#72d1c5', '#ffffff', '#ff8686'];
    return `<div class="confetti">${Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2, r = 90 + (i % 4) * 26;
      return `<i style="--x:${Math.round(Math.cos(a) * r)}px;--y:${Math.round(Math.sin(a) * r * .8 - 20)}px;--r:${(i * 47) % 360}deg;background:${cols[i % cols.length]};${i % 3 === 0 ? 'border-radius:50%' : ''}"></i>`;
    }).join('')}</div>`;
  }

  function showReward(reward) {
    const magical = reward.kind === 'magic', key = `${reward.kind}:${reward.id}`;
    layer().innerHTML = `<div class="veil" data-close></div>
      <div class="modal ${magical ? 'magic' : ''}" role="dialog" aria-modal="true" aria-label="${magical ? 'Gato mágico desbloqueado' : 'Novo gato'}">
        ${confetti(magical)}
        <div class="kicker">${magical ? '✦ RITUAL COMPLETO ✦' : 'NOVA VISITA'}</div>
        <div class="cat-big">${A.rewardBox()}<img class="cat" src="${C.path(reward)}" alt="${esc(C.name(reward))}"></div>
        <h2>${magical ? 'Gato mágico!' : 'Um gato chegou!'}</h2>
        <span class="tag">${esc(C.name(reward))} · ${C.tag(reward)}</span>
        <p class="meta">${magical ? `A magia acordou com ${reward.threshold}h de fim de semana.` : 'Uma hora extra, um novo amigo.'}</p>
        <button class="btn ${magical ? 'gold' : 'pink'}" type="button" data-close id="closeReward">${magical ? 'Guardar no grimório' : 'Guardar no álbum'}</button>
      </div>`;
    $('#closeReward').focus();
    ui.pending.add(key);
  }
  function showCat(r) {
    const magical = r.kind === 'magic', found = C.foundOn(r);
    layer().innerHTML = `<div class="veil" data-close></div>
      <div class="modal plain ${magical ? 'magic' : ''}" role="dialog" aria-modal="true" aria-label="${esc(C.name(r))}">
        <div class="kicker">${magical ? 'GATO MÁGICO' : 'GATO ' + C.tag(r)}</div>
        <div class="cat-big" style="margin-top:6px"><img class="cat" src="${C.path(r)}" alt="${esc(C.name(r))}"></div>
        <h2>${esc(C.name(r))}</h2>
        ${magical ? `<span class="tag">${C.tag(r)}</span>` : ''}
        <p class="meta">${found ? `Chegou a ${found}.` : 'Visitante de tempos antigos.'}</p>
        <button class="btn" type="button" data-close id="closeReward">Fechar</button>
      </div>`;
    $('#closeReward').focus();
  }
  layer().addEventListener('click', e => {
    if (!e.target.closest('[data-close]')) return;
    if (ui.queue.length) { showReward(ui.queue.shift()); return; }      // vários gatos de seguida
    const p = ui.pending; ui.pending = new Set();
    closeLayer(() => { if (p.size) { ui.arrived = p; render(); } });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && layer().innerHTML) { const p = ui.pending; ui.pending = new Set(); ui.queue = []; closeLayer(() => { if (p.size) { ui.arrived = p; render(); } }); } });

  /* ---------- configurações ---------- */
  function openSettings() {
    const st = S.settings;
    layer().innerHTML = `<div class="veil" data-close-plain></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Configurações">
        <div class="row between"><h2>Configurações</h2><button class="icon-btn" type="button" data-close-plain aria-label="Fechar">${ic('close')}</button></div>
        <div class="field"><span><b>Modo visual</b><br><span class="hint">Dia ou noite no quintal.</span></span>
          <div class="seg" id="segMode"><button type="button" data-v="day" class="${st.mode === 'day' ? 'on' : ''}">☀ Dia</button><button type="button" data-v="night" class="${st.mode === 'night' ? 'on' : ''}">☾ Noite</button></div></div>
        <div class="field"><span><b>Lembretes</b><br><span class="hint">Um cartão discreto nas páginas, sem som.</span></span>
          <label class="switch"><input type="checkbox" id="notif" ${st.notifications ? 'checked' : ''} aria-label="Lembretes"><i></i></label></div>
        <div class="field"><span><b>Primeiro lembrete</b><br><span class="hint">Depois, de meia em meia hora.</span></span>
          <div class="seg" id="segStart"><button type="button" data-v="17" class="${st.reminderStart === 17 ? 'on' : ''}">17:00</button><button type="button" data-v="18" class="${st.reminderStart === 18 ? 'on' : ''}">18:00</button></div></div>
        <div class="field"><span><b>Cópia de segurança</b><br><span class="hint">Guarda os teus registos num ficheiro.</span></span>
          <div class="row" style="gap:6px"><button class="btn small" type="button" id="exportBtn">${ic('download')}Exportar</button><button class="btn small" type="button" id="importBtn">${ic('upload')}Importar</button></div></div>
        <input type="file" id="importFile" accept=".json,application/json" class="hidden">
        <div class="field"><span><b>Abrir num separador</b><br><span class="hint">Útil para importar ficheiros.</span></span><button class="btn small" type="button" id="tabBtn">Abrir</button></div>
        <div class="field"><span><b>Reiniciar ${G.seasonFor(now())}</b><br><span class="hint">Apaga registos e gatos deste período. Os anteriores ficam.</span></span><button class="btn small pink" type="button" id="resetBtn">Reiniciar</button></div>
        <p class="hint" style="text-align:center;margin-top:8px">Gato das Horas 2.0 🐾</p>
      </section>`;
    const sheet = layer().querySelector('.sheet');
    layer().querySelectorAll('[data-close-plain]').forEach(b => b.onclick = () => closeLayer());
    sheet.querySelector('#segMode').onclick = e => { const v = e.target.dataset.v; if (v) mutate(s => { s.settings.mode = v; }).then(openSettings); };
    sheet.querySelector('#segStart').onclick = e => { const v = e.target.dataset.v; if (v) mutate(s => { s.settings.reminderStart = Number(v); }).then(openSettings); };
    sheet.querySelector('#notif').onchange = e => mutate(s => { s.settings.notifications = e.target.checked; });
    sheet.querySelector('#exportBtn').onclick = exportData;
    sheet.querySelector('#importBtn').onclick = () => sheet.querySelector('#importFile').click();
    sheet.querySelector('#importFile').onchange = importData;
    sheet.querySelector('#tabBtn').onclick = () => { chrome.tabs?.create ? chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1') }) : window.open('popup.html?tab=1'); };
    sheet.querySelector('#resetBtn').onclick = resetSeason;
  }

  function exportData() {
    const { entries, catsBySeason, settings, vacations, holidays } = S;
    const blob = new Blob([JSON.stringify({ app: 'gato-das-horas', version: 2, exportedAt: new Date().toISOString(), data: { entries, catsBySeason, settings, vacations, holidays } }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `gato-das-horas-${G.dateKey(now())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Cópia de segurança guardada.');
  }
  async function importData(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const obj = JSON.parse(await f.text()), raw = obj.data || obj;
      if (!raw || typeof raw.entries !== 'object' || Array.isArray(raw.entries)) throw new Error('formato');
      const n = G.normalize(raw, now());
      if (!confirm(`Substituir os registos atuais pelos do ficheiro (${Object.keys(n.entries).length} dias)?`)) return;
      S = n; await G.store.save(S); closeLayer(); render(); toast('Registos importados.');
    } catch (err) { toast('Não consegui ler esse ficheiro.'); }
    e.target.value = '';
  }
  async function resetSeason() {
    if (!confirm('Apagar os registos e gatos deste período? Os períodos anteriores serão preservados.')) return;
    await mutate(st => {
      const season = G.seasonFor(now());
      st.entries = Object.fromEntries(Object.entries(st.entries).filter(([k]) => G.seasonOfKey(k) !== season));
      st.catsBySeason[season] = [];
      st.vacations.bankLog = st.vacations.bankLog.filter(k => G.seasonOfKey(k) !== season);
      st.vacations.bankDays = st.vacations.bankLog.length;
      // dias "via BO" que ficaram sem troca voltam a ser férias normais
      const years = new Set(Object.keys(st.vacations.days).map(G.yearOfKey));
      years.forEach(y => { let over = G.vacationStats(st, y).boMarked - G.conversionsInYear(st, y); Object.keys(st.vacations.days).sort().reverse().forEach(k => { if (over > 0 && G.yearOfKey(k) === y && st.vacations.days[k] === 'bo') { st.vacations.days[k] = true; over--; } }); });
    });
    closeLayer(); toast('Período reiniciado.');
  }

  /* ---------- arranque ---------- */
  async function init() {
    if (location.search.includes('tab=1')) document.documentElement.classList.add('in-tab');
    document.body.insertAdjacentHTML('afterbegin', A.sprite());
    S = await G.store.load(now());
    render();
    const lr = S.lastReward;
    if (lr && lr.eventId && lr.eventId !== S.lastRewardSeen && Date.now() - (lr.timestamp || 0) < 12 * 3600e3) {
      S.lastRewardSeen = lr.eventId; await G.store.save(S); showReward(lr);
    }
  }
  // Alterações feitas noutro sítio (por ex. o botão "+1h" numa página)
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (!['entries', 'catsBySeason', 'settings', 'vacations', 'holidays', 'lastReward'].some(k => k in changes)) return;
    S = await G.store.load(now()); render();
    const lr = S.lastReward;
    if (changes.lastReward && lr?.eventId && lr.eventId !== S.lastRewardSeen && !layer().innerHTML) {
      S.lastRewardSeen = lr.eventId; await G.store.save(S); showReward(lr);
    }
  });
  init();
})();
