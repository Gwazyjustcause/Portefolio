/* Gato das Horas — ficheiros e nomes dos gatos.
   As imagens ficam nas tuas pastas assets/cats/cat-001.png … cat-520.png e
   assets/magical_cats/magic-cat-001.png … magic-cat-100.png (como já tinhas). */
(function (root) {
  'use strict';
  const G = root.GDH;
  const DIR = 'assets/cats', MAGIC_DIR = 'assets/magical_cats';
  const names = () => root.GDH_NAMES || { n: [], m: [] };

  const path = r => r.kind === 'magic' ? `${MAGIC_DIR}/${r.id}.png` : `${DIR}/cat-${G.pad3(r.id)}.png`;
  const number = r => r.kind === 'magic' ? G.magicNumber(r.id) : Number(r.id);
  const name = r => {
    const list = r.kind === 'magic' ? names().m : names().n;
    return list[number(r) - 1] || (r.kind === 'magic' ? `Gato mágico ${number(r)}` : `Gato ${number(r)}`);
  };
  const tag = r => `#${G.pad3(number(r))}`;
  const foundOn = r => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.source || '')) return '';
    const d = G.parseKey(r.source);
    return `${d.getDate()} de ${G.MONTHS[d.getMonth()]}`;
  };
  const shortDate = r => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.source || '')) return '';
    const d = G.parseKey(r.source);
    return `${d.getDate()} ${G.MONTHS_SHORT[d.getMonth()]}`;
  };
  // "Selos" do álbum (só dependem do número de gatos descobertos)
  const STAMPS = [1, 10, 25, 50, 100, 250, 520];
  const stampLabel = n => n === 1 ? '1.º visitante' : n === 520 ? 'Álbum completo' : `${n} gatos`;

  G.cats = { path, number, name, tag, foundOn, shortDate, STAMPS, stampLabel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
