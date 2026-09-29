/* Gato das Horas — cartão de lembrete dentro das páginas.
   Vive num Shadow DOM (não herda nem estraga o estilo do site), não rouba o foco,
   não tem som, e recolhe-se sozinho para uma patinha depois de uns segundos. */
(() => {
  'use strict';
  if (window.__gatoDasHoras) return;
  window.__gatoDasHoras = true;
  const G = GDH, C = G.cats;
  const url = p => chrome.runtime.getURL(p);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;margin:0}
  .wrap{position:fixed;right:18px;bottom:18px;z-index:2147483647;font:600 13px/1.3 ui-rounded,'Nunito','Trebuchet MS','Segoe UI',system-ui,sans-serif;color:var(--ink)}
  .wrap{--ink:#4a2a1e;--card:#fffdf5;--card2:#fff0d0;--pink:#ff9db8;--gold:#ffcf5a;--soft:#8a6650}
  .wrap.night{--ink:#141034;--card:#2f3370;--card2:#383d7f;--pink:#e58aac;--soft:#b9b0e3;color:#f7eeff}
  .card{position:relative;display:flex;align-items:center;gap:10px;width:334px;padding:12px 12px 12px 92px;background:var(--card);border:3px solid var(--ink);border-radius:20px;box-shadow:0 4px 0 var(--ink),0 12px 30px rgba(0,0,0,.18);animation:in .45s cubic-bezier(.2,1.4,.4,1) both}
  .card.out{animation:out .25s ease-in both}
  .mascot{position:absolute;left:4px;bottom:-4px;width:76px;height:auto;transform-origin:50% 100%;animation:hop 2.6s ease-in-out infinite;pointer-events:none;filter:drop-shadow(0 2px 0 rgba(74,42,30,.2))}
  .copy{flex:1;min-width:0}
  .copy b{display:block;font-size:14px;line-height:1.2}
  .copy span{display:block;margin-top:2px;font-size:11px;font-weight:600;color:var(--soft)}
  .btns{display:flex;gap:6px;margin-top:8px}
  button{font:inherit;color:#4a2a1e;cursor:pointer;border:3px solid var(--ink);border-radius:12px;padding:5px 11px;background:var(--gold);box-shadow:0 3px 0 var(--ink);font-weight:800;font-size:12px}
  button:active{transform:translateY(3px);box-shadow:none}
  button:focus-visible{outline:3px solid #ab9dff;outline-offset:2px}
  button.add{background:var(--pink)}
  button.later{background:var(--card2);color:inherit}
  button.x{position:absolute;right:8px;top:6px;border:0;background:none;box-shadow:none;padding:0 4px;font-size:18px;line-height:1;color:var(--soft)}
  .msg{margin-top:6px;font-size:11px;color:var(--soft)}
  .dot{display:none;width:52px;height:52px;padding:0;border-radius:50%;background:var(--card);align-items:center;justify-content:center;animation:in .35s cubic-bezier(.2,1.4,.4,1) both}
  .dot img{width:38px;height:auto}
  .wrap.min .card{display:none}.wrap.min .dot{display:flex}
  .dot:after{content:'';position:absolute;right:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#ff8686;border:2px solid var(--ink)}
  .toast{position:relative;width:236px;padding:14px 14px 12px;text-align:center;background:linear-gradient(160deg,#fff7df,#ffe4ee);color:#4a2a1e;border:3px solid var(--ink);border-radius:22px;box-shadow:0 5px 0 var(--ink),0 12px 30px rgba(0,0,0,.2);animation:in .5s cubic-bezier(.2,1.5,.4,1) both}
  .toast.magic{background:linear-gradient(160deg,#5b4bb5,#2c2868);color:#fff}
  .toast .k{font-size:10px;letter-spacing:1.6px;font-weight:800}
  .toast img{display:block;width:120px;height:120px;object-fit:contain;margin:2px auto;animation:pop .7s cubic-bezier(.2,1.6,.4,1) both}
  .toast b{display:block;font-size:15px}
  .toast span{display:block;margin-top:2px;font-size:11px;opacity:.85}
  .toast button.x{color:inherit}
  @keyframes in{from{opacity:0;transform:translateY(18px) scale(.92)}}
  @keyframes out{to{opacity:0;transform:translateY(14px) scale(.95)}}
  @keyframes hop{0%,100%{transform:none}50%{transform:translateY(-3px) rotate(-2deg)}}
  @keyframes pop{0%{transform:scale(.3) rotate(-12deg);opacity:0}70%{transform:scale(1.1) rotate(4deg);opacity:1}100%{transform:none}}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important}}
  @media (max-width:420px){.card{width:calc(100vw - 32px)}}`;

  let host = null, shadow = null, wrap = null, shownAt = 0, minTimer = 0, toastTimer = 0, night = false;

  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'gato-das-horas-root';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CSS}</style><div class="wrap"></div>`;
    wrap = shadow.querySelector('.wrap');
    (document.body || document.documentElement).appendChild(host);
  }
  function unmountIfEmpty() { if (wrap && !wrap.children.length && host) { host.remove(); host = shadow = wrap = null; } }
  const clearAll = () => { clearTimeout(minTimer); clearTimeout(toastTimer); if (wrap) wrap.innerHTML = ''; unmountIfEmpty(); };

  async function themeFromState() {
    try { const S = await G.store.load(new Date()); night = S.settings.mode === 'night'; return S; } catch { return null; }
  }

  async function showReminder(key) {
    const S = await themeFromState();
    if (!S || S.settings.notifications === false) return;
    if (G.extraOf(S, G.parseKey(key)) >= G.LIMITS.DAY_EXTRA) return;
    clearAll(); mount();
    wrap.classList.toggle('night', night); wrap.classList.remove('min');
    shownAt = Date.now();
    wrap.innerHTML = `
      <div class="card" role="status" aria-live="polite">
        <img class="mascot" src="${url('assets/mascot/gato.png')}" alt="">
        <div class="copy"><b>Vais ficar mais 1 hora?</b><span>Pode vir um gato novo. 🐾</span>
          <div class="btns"><button class="add" type="button">Adicionar 1h</button><button class="later" type="button">Agora não</button></div>
          <div class="msg" hidden></div></div>
        <button class="x" type="button" aria-label="Fechar">×</button>
      </div>
      <button class="dot" type="button" aria-label="Lembrete do Gato das Horas: abrir"><img src="${url('assets/mascot/gato.png')}" alt=""></button>`;
    const q = s => wrap.querySelector(s);
    q('.add').onclick = () => addHour(key);
    q('.later').onclick = () => dismiss();
    q('.x').onclick = () => dismiss();
    q('.dot').onclick = () => { wrap.classList.remove('min'); armMinimise(); };
    armMinimise();
  }
  function armMinimise() { clearTimeout(minTimer); minTimer = setTimeout(() => wrap && wrap.classList.add('min'), 20000); }
  function dismiss() {
    const card = wrap && wrap.querySelector('.card');
    if (!card) return clearAll();
    card.classList.add('out'); setTimeout(clearAll, 240);
  }

  const REASON = {
    dayCap: 'Duas horas extra por dia é o limite. Vai descansar! 💤',
    weekCap: 'Já tens 10h extra esta semana. Chega por agora! 💤',
    special: 'Hoje não é dia útil normal — usa a janela do Gato das Horas.'
  };

  async function addHour(key) {
    try {
      const S = await G.store.load(new Date());
      const res = G.applyChange(S, G.parseKey(key), 'extra', 1, { now: new Date() });
      if (!res.ok) {
        const m = wrap && wrap.querySelector('.msg');
        if (m) { m.hidden = false; m.textContent = REASON[res.reason] || 'Não foi possível adicionar.'; }
        return;
      }
      let reward = null;
      if (res.reward) {
        reward = { ...res.reward, eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now() };
        S.lastReward = reward; S.lastRewardSeen = reward.eventId;   // já a mostramos aqui
      }
      await G.store.save(S);
      clearAll();
      if (reward) showReward(reward);
    } catch (e) { /* extensão recarregada: ignora */ }
  }

  function showReward(r) {
    mount(); wrap.classList.toggle('night', night); wrap.classList.remove('min');
    const magical = r.kind === 'magic';
    wrap.innerHTML = `<div class="toast ${magical ? 'magic' : ''}" role="status" aria-live="polite">
      <div class="k">${magical ? '✦ RITUAL COMPLETO ✦' : 'NOVA VISITA'}</div>
      <img src="${url(C.path(r))}" alt="${esc(C.name(r))}">
      <b>${magical ? 'Gato mágico!' : 'Um gato chegou!'}</b>
      <span>${esc(C.name(r))} · ${C.tag(r)} foi para o álbum 🐾</span>
      <button class="x" type="button" aria-label="Fechar">×</button></div>`;
    wrap.querySelector('.x').onclick = clearAll;
    clearTimeout(toastTimer); toastTimer = setTimeout(clearAll, 7500);
  }

  chrome.runtime.onMessage.addListener(m => { if (m && m.type === 'showReminder') showReminder(m.key); });
  // Se a hora foi adicionada noutro separador (ou na janela), este cartão já não faz sentido.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !wrap || !wrap.querySelector('.card, .dot')) return;
    if (changes.entries || changes.settings) {
      G.store.load(new Date()).then(S => {
        const e = S.entries[G.dateKey(new Date())] || {};
        if (Number(e.updatedAt || 0) >= shownAt || S.settings.notifications === false || Number(e.extra || 0) >= G.LIMITS.DAY_EXTRA) clearAll();
      }).catch(() => {});
    }
  });
  try { chrome.runtime.sendMessage({ type: 'contentReady' }).catch(() => {}); } catch (e) { /* sem contexto */ }
})();
