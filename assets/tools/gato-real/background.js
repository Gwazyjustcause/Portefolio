/* Gato das Horas — lembretes em segundo plano.
   A lógica de quando lembrar está em core.js (reminderStep) e é testada. */
importScripts('core.js');

const ALARM = 'gato-das-horas-lembrete';

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM);
  if (!existing) chrome.alarms.create(ALARM, { periodInMinutes: 0.5 });
}

async function sendReminder(key, slot) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(tab => tab.id
    ? chrome.tabs.sendMessage(tab.id, { type: 'showReminder', key, slot }).catch(() => {})
    : Promise.resolve()));
}

let ticking = false;
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const now = new Date();
    const S = await GDH.store.load(now);
    const r = GDH.reminderStep(now, S);
    if (r.changed && JSON.stringify(r.runtime) !== JSON.stringify(S.reminderRuntime || {})) {
      await chrome.storage.local.set({ reminderRuntime: r.runtime });
    }
    if (r.fire) await sendReminder(GDH.dateKey(now), r.fire);
  } finally { ticking = false; }
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm().then(tick); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm().then(tick); });
chrome.alarms.onAlarm.addListener(a => { if (a.name === ALARM) tick(); });
chrome.runtime.onMessage.addListener(m => { if (m && m.type === 'contentReady') tick(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.entries || changes.settings || changes.holidays || changes.vacations)) tick();
});
ensureAlarm();
