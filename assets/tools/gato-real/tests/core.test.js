const assert = require('assert');
require('../core.js');
const G = globalThis.GDH;
let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };
const D = (s) => G.parseKey(s);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const fresh = () => G.defaultState();
const WED = D('2026-09-16'), NOW = new Date(2026, 8, 16, 18, 20);
const chg = (S, d, type, delta, extra = {}) => G.applyChange(S, typeof d === 'string' ? D(d) : d, type, delta, { now: NOW, ...extra });

console.log('datas e épocas');
t('época: 31 ago pertence à anterior, 1 set à nova', () => {
  assert.equal(G.seasonFor(D('2026-08-31')), '2025-2026');
  assert.equal(G.seasonFor(D('2026-09-01')), '2026-2027');
  assert.equal(G.seasonFor(D('2027-01-15')), '2026-2027');
});
t('segunda-feira da semana', () => assert.equal(G.dateKey(G.mondayOf(D('2026-09-20'))), '2026-09-14'));
t('data longa em PT sem maiúsculas a mais', () => assert.equal(G.longDate(WED), 'quarta-feira, 16 de setembro'));
t('formatação de horas usa vírgula', () => { assert.equal(G.fmtH(6.5), '6,5h'); assert.equal(G.fmtSigned(-1), '−1h'); assert.equal(G.fmtSigned(0.5), '+0,5h'); });

console.log('horas extra e gatos');
t('0,5h não dá gato; completar 1h dá', () => {
  const S = fresh();
  let r = chg(S, WED, 'extra', 0.5); assert.ok(r.ok && !r.reward);
  r = chg(S, WED, 'extra', 0.5); assert.ok(r.ok && r.reward && r.reward.kind === 'normal' && r.reward.source === '2026-09-16');
  assert.equal(G.extraOf(S, WED), 1);
  assert.equal(S.catsBySeason['2026-2027'].length, 1);
});
t('+2h de uma vez dá 2 gatos; +1h dá 1', () => {
  const S = fresh(), r = chg(S, WED, 'extra', 2);
  assert.ok(r.ok); assert.equal(r.rewards.length, 2); assert.equal(G.extraOf(S, WED), 2);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);
  assert.notEqual(r.rewards[0].id, r.rewards[1].id);
  const T = fresh(), r1 = chg(T, WED, 'extra', 1);
  assert.equal(r1.rewards.length, 1); assert.equal(G.extraOf(T, WED), 1);
});
t('+2h com 1h já feito só acrescenta 1h e 1 gato (não passa das 2h)', () => {
  const S = fresh(); chg(S, WED, 'extra', 1);
  const r = chg(S, WED, 'extra', 2);
  assert.ok(r.ok); assert.equal(G.extraOf(S, WED), 2); assert.equal(r.rewards.length, 1);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);
  assert.equal(chg(S, WED, 'extra', 1).reason, 'dayCap'); assert.equal(chg(S, WED, 'extra', 2).reason, 'dayCap');
});
t('+2h perto do limite semanal encolhe para o que falta', () => {
  const S = fresh();
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']) chg(S, day, 'extra', 2);   // 8h
  assert.ok(chg(S, '2026-09-18', 'extra', 1.5 + 0.5).ok);                                                  // 10h
  assert.equal(G.weekExtraTotal(S, WED), 10);
  const T = fresh();
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']) chg(T, day, 'extra', 2);
  chg(T, '2026-09-18', 'extra', 1);                                                                        // 9h
  const r = chg(T, '2026-09-18', 'extra', 2);                                                              // cabe só +1h
  assert.ok(r.ok); assert.equal(G.extraOf(T, D('2026-09-18')), 2); assert.equal(G.weekExtraTotal(T, WED), 10);
  assert.equal(chg(T, '2026-09-18', 'extra', 1).reason, 'weekCap');
});
t('máx. 2h extra por dia; 3.ª hora recusada com motivo', () => {
  const S = fresh();
  for (let i = 0; i < 4; i++) assert.ok(chg(S, WED, 'extra', 0.5).ok);
  const r = chg(S, WED, 'extra', 0.5);
  assert.deepEqual([r.ok, r.reason], [false, 'dayCap']);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);
});
t('baixar de 2h para 1,5h retira o 2.º gato; para 1h mantém o 1.º', () => {
  const S = fresh();
  for (let i = 0; i < 4; i++) chg(S, WED, 'extra', 0.5);
  chg(S, WED, 'extra', -0.5); assert.equal(S.catsBySeason['2026-2027'].length, 1);   // 2 → 1,5h: perde a 2.ª hora completa
  chg(S, WED, 'extra', -0.5); assert.equal(S.catsBySeason['2026-2027'].length, 1);   // 1,5 → 1h: mantém
  chg(S, WED, 'extra', -0.5); assert.equal(S.catsBySeason['2026-2027'].length, 0);   // 1 → 0,5h: já não há hora completa
  chg(S, WED, 'extra', -0.5); assert.equal(S.catsBySeason['2026-2027'].length, 0);
});
t('limite semanal de 10h extra (seg–sex)', () => {
  const S = fresh();
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'])
    for (let i = 0; i < 4; i++) { const r = chg(S, day, 'extra', 0.5); if (!r.ok) { assert.equal(r.reason, 'weekCap'); } }
  assert.equal(G.weekExtraTotal(S, WED), 10);
  assert.equal(chg(S, '2026-09-14', 'extra', 0.5).reason, 'weekCap');
});
t('gatos não se repetem enquanto houver por descobrir', () => {
  const S = fresh(); const used = new Set();
  const rng = seq(0, 0, 0, 0);   // sempre o primeiro livre
  for (let i = 0; i < 5; i++) { const id = G.addCat(S, 'x' + i, '2026-2027', rng).id; assert.ok(!used.has(id)); used.add(id); }
  assert.deepEqual([...used], [1, 2, 3, 4, 5]);
});
t('fim de semana: 4h e 8h dão gatos mágicos; descer retira-os', () => {
  const S = fresh(), SAT = '2026-09-19';
  let n = 0; for (let i = 0; i < 16; i++) { const r = chg(S, SAT, 'special', 0.5); if (r.reward) n++; }
  assert.equal(n, 2);
  const list = S.catsBySeason['2026-2027'];
  assert.deepEqual(list.map(x => x.threshold), [4, 8]);
  assert.ok(/^magic-cat-\d{3}$/.test(list[0].id));
  for (let i = 0; i < 4; i++) chg(S, SAT, 'special', -0.5);      // 8 → 6
  assert.deepEqual(S.catsBySeason['2026-2027'].map(x => x.threshold), [4]);
  assert.equal(G.specialOf(S, D(SAT)), 6);
});
t('+8h de uma vez ao sábado desbloqueia os dois gatos mágicos (4h e 8h)', () => {
  const S = fresh(), r = chg(S, '2026-09-19', 'special', 8);
  assert.ok(r.ok); assert.deepEqual(r.rewards.map(x => x.threshold), [4, 8]);
  assert.equal(G.specialOf(S, D('2026-09-19')), 8); assert.equal(S.catsBySeason['2026-2027'].length, 2);
  assert.notEqual(r.rewards[0].id, r.rewards[1].id);
});
t('fim de semana: máximo de 8h por dia (+4h e depois +8h dá 8h, não 12h)', () => {
  const S = fresh(), SAT = '2026-09-19';
  const r1 = chg(S, SAT, 'special', 4);
  assert.equal(r1.rewards.length, 1); assert.equal(G.specialOf(S, D(SAT)), 4);
  const r2 = chg(S, SAT, 'special', 8);                                  // só acrescenta o que falta
  assert.ok(r2.ok); assert.equal(G.specialOf(S, D(SAT)), 8);
  assert.equal(r2.rewards.length, 1); assert.equal(r2.rewards[0].threshold, 8);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);                    // os dois gatos mágicos, nem mais
  assert.equal(chg(S, SAT, 'special', 4).reason, 'specialCap');
  assert.equal(chg(S, SAT, 'special', 0.5).reason, 'specialCap');
  assert.equal(G.specialOf(S, D(SAT)), 8);
});
t('fim de semana: +4h e +4h chegam às 8h e dão os dois gatos; +1h, +2h e +4h não passam das 8h', () => {
  const S = fresh(), SAT = '2026-09-19';
  assert.equal(chg(S, SAT, 'special', 4).rewards.length, 1);
  assert.equal(chg(S, SAT, 'special', 4).rewards.length, 1);
  assert.equal(G.specialOf(S, D(SAT)), 8);
  const T = fresh();
  assert.equal(chg(T, SAT, 'special', 1).rewards, undefined);
  assert.equal(chg(T, SAT, 'special', 2).rewards, undefined);            // 3h
  assert.equal(chg(T, SAT, 'special', 4).rewards.length, 1);             // 7h cruza 4h
  const r = chg(T, SAT, 'special', 4);                                   // 7h → 8h (só 1h) cruza 8h
  assert.equal(r.rewards.length, 1); assert.equal(G.specialOf(T, D(SAT)), 8);
});
t('feriado em dia útil também tem máximo de 8h', () => {
  const S = fresh(); S.holidays['2026-10-05'] = 'Feriado';
  assert.ok(chg(S, '2026-10-05', 'special', 8).ok);
  assert.equal(chg(S, '2026-10-05', 'special', 1).reason, 'specialCap');
});
t('dados antigos com mais de 8h ao fim de semana passam a 8h', () => {
  const S = G.normalize({ entries: { '2026-09-19': { special: 12 }, '2026-09-20': { special: 6 } } }, NOW);
  assert.equal(S.entries['2026-09-19'].special, 8); assert.equal(S.entries['2026-09-20'].special, 6);
});
t('descer com o − retira o gato mágico ao passar abaixo da marca', () => {
  const S = fresh(), SAT = '2026-09-19';
  chg(S, SAT, 'special', 8);
  for (let i = 0; i < 4; i++) chg(S, SAT, 'special', -0.5);              // 8 → 6
  assert.deepEqual(S.catsBySeason['2026-2027'].map(x => x.threshold), [4]);
  for (let i = 0; i < 4; i++) chg(S, SAT, 'special', -0.5);              // 6 → 4 (ainda tem a marca de 4h)
  assert.equal(S.catsBySeason['2026-2027'].length, 1);
  chg(S, SAT, 'special', -0.5);                                          // 3,5h
  assert.equal(S.catsBySeason['2026-2027'].length, 0);
});
t('dia útil: +1h e depois +2h dá o total de 2h e os 2 gatos (sem 3.º)', () => {
  const S = fresh();
  assert.equal(chg(S, WED, 'extra', 1).rewards.length, 1);
  const r = chg(S, WED, 'extra', 2);
  assert.equal(G.extraOf(S, WED), 2); assert.equal(r.rewards.length, 1);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);
  const T = fresh(); assert.equal(chg(T, WED, 'extra', 2).rewards.length, 2);
});
t('extra não se aplica a fins de semana nem feriados (e vice-versa)', () => {
  const S = fresh(); S.holidays['2026-10-05'] = 'Feriado';
  assert.equal(chg(S, '2026-09-19', 'extra', 0.5).reason, 'special');
  assert.equal(chg(S, '2026-10-05', 'extra', 0.5).reason, 'special');
  assert.ok(chg(S, '2026-10-05', 'special', 0.5).ok);
  assert.equal(chg(S, WED, 'special', 0.5).reason, 'notSpecial');
});

console.log('BO (banco de horas)');
t('saldo = extras + ajustes − usado', () => {
  const S = fresh();
  for (let i = 0; i < 4; i++) chg(S, WED, 'extra', 0.5);      // +2
  chg(S, '2026-09-15', 'extra', 0.5); chg(S, '2026-09-15', 'extra', 0.5); // +1
  assert.equal(G.bankBalance(S, NOW), 3);
  assert.ok(chg(S, '2026-09-17', 'used', 0.5).ok);
  assert.equal(G.bankBalance(S, NOW), 2.5);
  assert.ok(chg(S, '2026-09-17', 'adjustment', -0.5).ok);
  assert.equal(G.bankBalance(S, NOW), 2);
});
t('BO nunca fica negativo por ajuste ou uso', () => {
  const S = fresh();
  assert.equal(chg(S, WED, 'adjustment', -0.5).reason, 'bank');
  assert.equal(chg(S, WED, 'used', 0.5).reason, 'bank');
  assert.ok(chg(S, WED, 'adjustment', 0.5).ok);                 // positivo ok
  assert.equal(G.bankBalance(S, NOW), 0.5);
});
t('baixa e justificação não mexem no BO, mesmo com ajuste', () => {
  const S = fresh();
  chg(S, WED, 'extra', 0.5); chg(S, WED, 'extra', 0.5);       // BO 1
  assert.ok(chg(S, '2026-09-17', 'adjustment', -0.5).ok);       // BO 0,5
  assert.equal(G.bankBalance(S, NOW), 0.5);
  assert.ok(chg(S, '2026-09-17', 'baixa', 1).ok);               // ajuste deixa de contar
  assert.equal(G.bankBalance(S, NOW), 1);
  assert.equal(G.isBaixa(S, D('2026-09-17')), true);
  assert.ok(chg(S, '2026-09-17', 'justificacao', 1).ok);        // troca para justificação
  assert.equal(G.isBaixa(S, D('2026-09-17')), false);
  assert.equal(G.isJustif(S, D('2026-09-17')), true);
  assert.equal(G.bankBalance(S, NOW), 1);
});
t('retirar baixa não pode empurrar o BO abaixo de zero', () => {
  const S = fresh();
  S.entries['2026-09-17'] = { adjustment: -2, baixa: true };
  assert.equal(chg(S, '2026-09-17', 'baixa', 1).reason, 'bank');
  assert.equal(G.isBaixa(S, D('2026-09-17')), true);
});
t('trocar 8h por 1 dia de férias desconta 8h ao BO', () => {
  const S = fresh();
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']) for (let i = 0; i < 4; i++) chg(S, day, 'extra', 0.5);
  assert.equal(G.bankBalance(S, NOW), 8);
  assert.ok(G.convertBank(S, NOW).ok);
  assert.equal(G.bankBalance(S, NOW), 0);
  assert.equal(G.convertBank(S, NOW).reason, 'bank');
});
t('troca de 2026 não estraga o BO da época seguinte nem as férias de 2027', () => {
  const S = fresh();
  S.vacations.bankLog = ['2026-09-10']; S.vacations.bankDays = 1;
  const later = new Date(2027, 8, 20);                          // época 2027-2028
  assert.equal(G.bankBalance(S, later), 0);
  assert.equal(G.vacationStats(S, 2027).bo, 0);
  assert.equal(G.vacationStats(S, 2026).bo, 1);
});
t('BO conta só o período atual: horas de agosto não entram em setembro', () => {
  const S = fresh();
  for (const k of ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27']) S.entries[k] = { extra: 2 };   // época 2025-2026
  S.entries['2026-09-15'] = { extra: 1 };                                                                       // época 2026-2027
  assert.equal(G.bankBalance(S, NOW), 1);
  assert.equal(G.bankBalance(S, new Date(2026, 7, 28)), 8);
});
t('só existem duas regras de férias: 24 ou 22 dias fixos', () => {
  assert.equal(G.allowanceFor(G.normalize({ vacations: { allowance: 22 } }, NOW), 2026), 22);
  assert.equal(G.allowanceFor(G.normalize({ vacations: { allowance: 24 } }, NOW), 2026), 24);
  assert.equal(G.allowanceFor(G.normalize({ vacations: { allowance: 30 } }, NOW), 2026), 24);
  const auto = G.normalize({ vacations: { autoAllowance: true } }, NOW);
  assert.equal(auto.vacations.autoAllowance, false); assert.equal(G.allowanceFor(auto, 2026), 24);
});
t('migração: bankDays antigo passa a bankLog', () => {
  const S = G.normalize({ vacations: { year: 2026, bankDays: 2, days: { '2026-12-28': 'bo' } } }, NOW);
  assert.equal(S.vacations.bankLog.length, 2);
  assert.equal(G.vacationStats(S, 2026).bo, 2);
  assert.equal(G.vacationStats(S, 2026).boFree, 1);
});
t('migração: lista antiga de gatos vai para a época atual', () => {
  const S = G.normalize({ cats: [3, 5] }, NOW);
  assert.equal(S.catsBySeason['2026-2027'].length, 2);
});

console.log('férias');
t('ciclo de um toque: férias → via BO → feriado → nada', () => {
  const S = fresh(); S.vacations.bankLog = ['2026-09-10']; S.vacations.bankDays = 1;
  const k = '2026-12-22', seen = [];
  for (let i = 0; i < 4; i++) { const r = G.cycleVacationDay(S, k); assert.ok(r.ok); seen.push(r.next); }
  assert.deepEqual(seen, ['vacation', 'bo', 'holiday', 'clear']);
  assert.equal(S.vacations.days[k], undefined); assert.equal(S.holidays[k], undefined);
});
t('sem trocas livres o ciclo salta "via BO"', () => {
  const S = fresh(); const k = '2026-12-22', seen = [];
  for (let i = 0; i < 3; i++) seen.push(G.cycleVacationDay(S, k).next);
  assert.deepEqual(seen, ['vacation', 'holiday', 'clear']);
});
t('não deixa marcar mais dias do que os disponíveis; fins de semana não contam', () => {
  const S = fresh(); S.vacations.allowance = 1; S.vacations.carryoverMode = 'manual';
  assert.ok(G.cycleVacationDay(S, '2026-12-22').ok);
  assert.equal(G.cycleVacationDay(S, '2026-12-23').reason, 'noDays');
  assert.equal(G.cycleVacationDay(S, '2026-12-26').reason, 'weekend');
});
t('dias transitados automáticos = direito do ano anterior − marcados', () => {
  const S = fresh(); S.vacations.days['2026-07-01'] = true; S.vacations.days['2026-07-02'] = 'bo';
  assert.equal(G.carryoverFor(S, 2027), 22);
  assert.equal(G.vacationStats(S, 2027).total, 24 + 22);
});
t('sem dados no ano anterior não há dias transitados automáticos', () => {
  const S = fresh(); assert.equal(G.carryoverFor(S, 2026), 0);
  S.entries['2025-05-05'] = { extra: 1 }; assert.equal(G.carryoverFor(S, 2026), 24);
  S.vacations.carryoverMode = 'manual'; S.vacations.carryoverDays = 3; assert.equal(G.carryoverFor(S, 2026), 3);
});
t('regra automática: 22 dias se houve baixa no ano anterior', () => {
  const S = fresh(); S.vacations.autoAllowance = true;
  assert.equal(G.allowanceFor(S, 2027), 24);
  S.entries['2026-03-03'] = { baixa: true };
  assert.equal(G.allowanceFor(S, 2027), 22);
});
t('desfazer troca devolve 8h; recusa se todos os dias estão em uso', () => {
  const S = fresh(); S.vacations.allowance = 1; S.vacations.carryoverMode = 'manual';
  S.entries['2026-09-01'] = { extra: 2 }; S.entries['2026-09-02'] = { extra: 2 }; S.entries['2026-09-03'] = { extra: 2 }; S.entries['2026-09-04'] = { extra: 2 };
  assert.ok(G.convertBank(S, NOW).ok);
  assert.equal(G.bankBalance(S, NOW), 0);
  assert.ok(G.cycleVacationDay(S, '2026-12-22').ok);           // usa o dia normal
  assert.ok(G.cycleVacationDay(S, '2026-12-23').ok);           // usa o dia convertido
  assert.equal(G.undoConversion(S).reason, 'inUse');           // os 2 dias estão marcados → não dá para desfazer
});
t('desfazer troca com dia livre funciona', () => {
  const S = fresh();
  S.entries['2026-09-01'] = { extra: 2 }; S.entries['2026-09-02'] = { extra: 2 }; S.entries['2026-09-03'] = { extra: 2 }; S.entries['2026-09-04'] = { extra: 2 };
  G.convertBank(S, NOW);
  assert.ok(G.undoConversion(S).ok);
  assert.equal(G.bankBalance(S, NOW), 8);
  assert.equal(S.vacations.bankLog.length, 0);
});

console.log('feriados nacionais');
t('Páscoa 2025, 2026, 2027', () => {
  assert.equal(G.dateKey(G.easter(2025)), '2025-04-20');
  assert.equal(G.dateKey(G.easter(2026)), '2026-04-05');
  assert.equal(G.dateKey(G.easter(2027)), '2027-03-28');
});
t('feriados móveis de 2026', () => {
  const h = G.nationalHolidays(2026);
  assert.equal(h['2026-04-03'], 'Sexta-feira Santa');
  assert.equal(h['2026-06-04'], 'Corpo de Deus');
  assert.equal(Object.keys(h).length, 13);
});
t('adicionar feriados só em dias úteis e sem tocar em férias marcadas', () => {
  const S = fresh(); S.vacations.days['2026-12-08'] = true;
  const r = G.addNationalHolidays(S, 2026);
  assert.equal(r.skipped, 1);
  assert.equal(S.holidays['2026-12-08'], undefined);
  assert.equal(S.holidays['2026-12-25'], 'Natal');
  assert.equal(S.holidays['2026-04-05'], undefined);           // domingo
  assert.equal(G.addNationalHolidays(S, 2026).added, 0);        // idempotente
});

console.log('registo');
t('baixa: datas seguidas agrupadas', () => {
  const S = fresh();
  ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-14'].forEach(k => S.entries[k] = { baixa: true });
  S.entries['2026-09-30'] = { baixa: true }; S.entries['2026-10-01'] = { baixa: true };
  assert.deepEqual(G.baixaRanges(S, NOW), ['8–10 de setembro', '14 de setembro', '30 de setembro–1 de outubro']);
});
t('períodos de pagamento vão de 15 a 15', () => {
  const S = fresh();
  S.entries['2026-09-12'] = { special: 4 };   // período 15 ago – 15 set
  S.entries['2026-09-19'] = { special: 8 };   // período 15 set – 15 out
  const p = G.paymentPeriods(S, D('2026-09-20'));
  assert.equal(G.paymentLabel(p[0]), '15 set – 15 out'); assert.equal(p[0].hours, 8);
  assert.equal(G.paymentLabel(p[1]), '15 ago – 15 set'); assert.equal(p[1].hours, 4);
});
t('resumo semanal: feriado em dia útil tem 0h base', () => {
  const S = fresh(); S.holidays['2026-09-16'] = 'Feriado';
  assert.equal(G.weekSummary(S, D('2026-09-14')).total, 32);
});
t('tipo de dia', () => {
  const S = fresh();
  assert.equal(G.dayKind(S, WED), 'trabalho');
  S.entries['2026-09-16'] = { extra: 2 }; assert.equal(G.dayKind(S, WED), 'descanso');
  S.entries['2026-09-16'] = { baixa: true }; assert.equal(G.dayKind(S, WED), 'baixa');
  S.vacations.days['2026-09-15'] = true; assert.equal(G.dayKind(S, D('2026-09-15')), 'ferias');
  assert.equal(G.dayKind(S, D('2026-09-19')), 'fimdesemana');
});

console.log('lembretes');
const at = (h, m = 0) => new Date(2026, 8, 16, h, m);
t('antes das 17h nada', () => assert.equal(G.reminderStep(at(16, 59), fresh()).fire, null));
t('o alarme só acorda às 17:00:20 e o lembrete das 17:00 aparece na mesma', () => {
  const S = fresh();
  assert.ok(G.reminderStep(new Date(2026, 8, 16, 17, 0, 20), S).fire);
});
t('navegador aberto às 20:10: não aparece do nada, espera pelas 20:30', () => {
  const S = fresh();
  let r = G.reminderStep(at(20, 10), S); assert.equal(r.fire, null); S.reminderRuntime = r.runtime;
  assert.equal(G.reminderStep(at(20, 29), S).fire, null);
  assert.ok(G.reminderStep(at(20, 30), S).fire);
});
t('às 17:00 dispara; a meia hora seguinte volta a disparar', () => {
  const S = fresh();
  let r = G.reminderStep(at(17, 0), S); assert.ok(r.fire); S.reminderRuntime = r.runtime;
  assert.equal(G.reminderStep(at(17, 10), S).fire, null);
  r = G.reminderStep(at(17, 30), S); assert.ok(r.fire);
});
t('depois de acrescentar 1h, só volta a lembrar passada 1h', () => {
  const S = fresh();
  let r = G.reminderStep(at(17, 0), S); S.reminderRuntime = r.runtime;
  const added = at(17, 5).getTime();
  S.entries['2026-09-16'] = { extra: 1, updatedAt: added };
  r = G.reminderStep(at(17, 6), S); assert.equal(r.fire, null); S.reminderRuntime = r.runtime;
  assert.equal(G.reminderStep(at(18, 0), S).fire, null);
  assert.ok(G.reminderStep(at(18, 6), S).fire);
});
t('duas horas extra: sem lembretes', () => {
  const S = fresh(); S.entries['2026-09-16'] = { extra: 2, updatedAt: 1 };
  assert.equal(G.reminderStep(at(19, 0), S).fire, null);
});
t('sem rajada de lembretes depois de o computador acordar', () => {
  const S = fresh();
  let r = G.reminderStep(at(17, 0), S); S.reminderRuntime = r.runtime;
  r = G.reminderStep(at(20, 3), S); assert.ok(r.fire); S.reminderRuntime = r.runtime;
  assert.equal(G.reminderStep(at(20, 4), S).fire, null);
  assert.equal(G.reminderStep(at(20, 20), S).fire, null);
  assert.ok(G.reminderStep(at(20, 30), S).fire);
});
t('sem lembretes em fins de semana, feriados, férias e baixa', () => {
  const sat = new Date(2026, 8, 19, 17, 30);
  assert.equal(G.reminderStep(sat, fresh()).fire, null);
  for (const mut of [S => S.holidays['2026-09-16'] = 'F', S => S.vacations.days['2026-09-16'] = true, S => S.entries['2026-09-16'] = { baixa: true }, S => S.settings.notifications = false]) {
    const S = fresh(); mut(S); assert.equal(G.reminderStep(at(17, 30), S).fire, null);
  }
});
t('18:00 como primeiro lembrete', () => {
  const S = fresh(); S.settings.reminderStart = 18;
  assert.equal(G.reminderStep(at(17, 30), S).fire, null);
  assert.ok(G.reminderStep(at(18, 0), S).fire);
});

console.log('conquistas');
t('22 conquistas, nenhuma desbloqueada num estado vazio', () => {
  const a = G.achievements(fresh(), NOW); assert.equal(a.length, 22); assert.equal(a.filter(x => x.got).length, 0);
  assert.equal(new Set(a.map(x => x.id)).size, 22);
});
t('gatos e horas desbloqueiam as conquistas certas', () => {
  const S = fresh(); chg(S, WED, 'extra', 2); chg(S, '2026-09-19', 'special', 8);
  const got = id => G.achievements(S, NOW).find(x => x.id === id).got;
  ['c1', 'dupla', 'm1', 'm8'].forEach(id => assert.ok(got(id), id));
  ['c10', 'w3', 'g5', 'hol', 'ferias'].forEach(id => assert.ok(!got(id), id));
});
t('conquistas de gatos não se perdem quando começa outra época', () => {
  const S = fresh(); S.catsBySeason['2025-2026'] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, kind: 'normal', source: 'x' }));
  const a = G.achievements(S, NOW); assert.ok(a.find(x => x.id === 'c10').got); assert.ok(!a.find(x => x.id === 'c25').got);
});
t('semana com 3h extra dá "Semana curiosa"; 6h dá "Semana traquina"', () => {
  const S = fresh(); chg(S, '2026-09-14', 'extra', 2); chg(S, '2026-09-15', 'extra', 1);
  let a = G.achievements(S, NOW); assert.ok(a.find(x => x.id === 'w3').got); assert.ok(!a.find(x => x.id === 'w6').got);
  chg(S, '2026-09-15', 'extra', 1); chg(S, '2026-09-16', 'extra', 2);
  a = G.achievements(S, NOW); assert.ok(a.find(x => x.id === 'w6').got);
});
t('conquistas de descanso só contam depois de já haver registos', () => {
  const S = fresh();
  assert.ok(!G.achievements(S, NOW).find(x => x.id === 'sofa').got);      // sem registos: nada
  S.entries['2026-08-31'] = { extra: 0.5 };
  const a = G.achievements(S, NOW);
  assert.ok(a.find(x => x.id === 'sofa').got); assert.ok(a.find(x => x.id === 'soneca').got);
});
t('BO, troca e férias', () => {
  const S = fresh(); S.entries['2026-09-01'] = { used: 0.5 };
  assert.ok(G.achievements(S, NOW).find(x => x.id === 'sesta').got);
  S.vacations.bankLog = ['2026-09-10']; S.vacations.days['2026-09-02'] = true;
  const a = G.achievements(S, NOW);
  ['troca', 'ferias', 'novelo'].forEach(id => assert.ok(a.find(x => x.id === id).got, id));
});

console.log(`\n${passed} testes passaram${process.exitCode ? ' — HÁ FALHAS' : ''}`);
