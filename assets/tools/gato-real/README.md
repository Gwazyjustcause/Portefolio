# Gato das Horas 2.1

Chrome extension (Manifest V3). All interface text is in Portuguese (PT-PT).

## Install / upgrade (keeps your data)

1. Close nothing, just **copy these files over your current `Gato das Horas` folder** (same folder = same extension = your saved hours stay).
   **Do not overwrite `assets/cats/` and `assets/magical_cats/`**: those are your own images. The zip does not contain them.
2. Open `chrome://extensions`, press the reload arrow on Gato das Horas.
3. Old files `cat.css`, `motion.css`, `content.css`, `icon.svg` are no longer used and can be deleted.

Loading it from a *different* folder creates a new, empty extension. Use Configurações → Exportar / Importar to move data.
The "…-com-gatos-de-teste" zip is a standalone build with 128 px placeholder cats, only for trying it out.

## Files

| File | What it does |
|---|---|
| `core.js` | All the time-tracking logic (hours, BO, caps, cats, férias, reminders). No DOM. Shared by everything else. |
| `art.js` | SVG illustrations: yard scenes, cushion/box, fish jar, beach, icons. |
| `popup.html/css/js` | The window: Quintal, Registo, Gatos, Férias, settings, reward animation. |
| `content.js` | The reminder card and cat reward inside web pages (Shadow DOM, no sound, no focus stealing). |
| `background.js` | Alarm that decides when to remind. |
| `cats.js`, `cat-names.js` | Cat file paths and names (edit `cat-names.js` freely: position N = cat N). |
| `tests/core.test.js` | `node tests/core.test.js` runs 43 tests on the logic. |

## Data format

Same storage keys as 1.x (`entries`, `catsBySeason`, `settings`, `vacations`, `holidays`). Existing data is migrated automatically.
New optional field: `vacations.bankLog` (one date per 8h→1 day conversion; replaces the plain `bankDays` counter, which is kept in sync).

## 2.1

- Fim de semana e feriados: máximo de **8h por dia**. Os botões +4h e +8h só acrescentam o que falta (4h + 8h = 8h, não 12h) e dão só os gatos mágicos das marcas que ainda não tinham sido atingidas. Valores antigos acima de 8h passam a 8h.
- Dia útil: +1h e depois +2h dá 2h no total e o gato que faltava; +2h de uma vez dá os 2 gatos.
- **Conquistas** (22): escondidas num único dropdown no fim do separador Gatos, fechado por defeito. São calculadas dos registos (não guardam nada) e não se perdem quando começa uma nova época.
