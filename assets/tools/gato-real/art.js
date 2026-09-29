/* Gato das Horas — ilustrações em SVG (cenas, objetos e ícones).
   Traço castanho grosso + cores lisas, para combinar com os gatos. */
(function (root) {
  'use strict';
  const INK = '#4a2a1e';

  /* ---------- paletas ---------- */
  const PAL = {
    day: {
      sky1: '#bfe8ff', sky2: '#eefaff', hill: '#b9e394', hill2: '#a3d47f', fence: '#f4d29f', fenceShade: '#e6b97c',
      lawn: '#c3e585', lawn2: '#b3db74', tuft: '#8dbd52', deck: '#efbf82', deck2: '#e2a96a', deckHi: '#f8dcac',
      trunk: '#a8703f', bloom: '#ffc6d8', bloom2: '#ffa9c3', leaf: '#93d17b', stone: '#e7ddcf', stoneShade: '#d2c6b4',
      ink: INK, cloud: '#ffffff'
    },
    night: {
      sky1: '#1b1f4e', sky2: '#3d3a86', hill: '#2f6078', hill2: '#295367', fence: '#9a7a9c', fenceShade: '#81607f',
      lawn: '#3f8483', lawn2: '#377a7a', tuft: '#2b6465', deck: '#94667f', deck2: '#825670', deckHi: '#b183a0',
      trunk: '#6f4a4a', bloom: '#eaa3c2', bloom2: '#d98bb0', leaf: '#3f8f6f', stone: '#8d8aa8', stoneShade: '#77749a',
      ink: '#2b1a30', cloud: '#5c5aa6'
    }
  };

  /* ---------- ícones (sprite) ---------- */
  const S = 'stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
  const sprite = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="gdh-wobble" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
  <symbol id="i-house" viewBox="0 0 32 32"><path d="M4 15 16 5l12 10" fill="none" ${S}/><path d="M7 14v13h18V14" fill="var(--f1,#ffe2b0)" ${S}/><path d="M13 27v-8h6v8" fill="var(--f2,#e7a86a)" ${S}/><circle cx="16" cy="11.5" r="1.6" fill="currentColor"/></symbol>
  <symbol id="i-notebook" viewBox="0 0 32 32"><rect x="6" y="4" width="20" height="24" rx="3.5" fill="var(--f1,#ffe2b0)" ${S}/><path d="M11 10h10M11 15h10M11 20h6" fill="none" ${S}/><path d="M6 9h-2M6 15h-2M6 21h-2" fill="none" ${S}/></symbol>
  <symbol id="i-paw" viewBox="0 0 32 32"><ellipse cx="16" cy="21" rx="7" ry="5.6" fill="var(--f1,#ffb4c8)" ${S}/><ellipse cx="7.5" cy="14" rx="2.6" ry="3.3" fill="var(--f1,#ffb4c8)" ${S}/><ellipse cx="13" cy="8.8" rx="2.6" ry="3.5" fill="var(--f1,#ffb4c8)" ${S}/><ellipse cx="19.5" cy="8.8" rx="2.6" ry="3.5" fill="var(--f1,#ffb4c8)" ${S}/><ellipse cx="24.8" cy="14" rx="2.6" ry="3.3" fill="var(--f1,#ffb4c8)" ${S}/></symbol>
  <symbol id="i-book" viewBox="0 0 32 32"><path d="M5 6.5C9 4.5 13 5 16 8c3-3 7-3.500 11-1.500V26c-4-2-8-1.500-11 1.500C13 24.500 9 24 5 26z" fill="var(--f1,#ffd3df)" ${S}/><path d="M16 8v19" fill="none" ${S}/><path d="M18.5 15.500c1-1.800 3.200-1.600 4.200-.2M9 15c1-1.600 3-1.500 4 .1" fill="none" ${S}/></symbol>
  <symbol id="i-sun" viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="var(--f1,#ffd15c)" ${S}/><path d="M16 3.500v3M16 25.500v3M3.500 16h3M25.500 16h3M7.200 7.200l2.100 2.100M22.700 22.700l2.100 2.100M7.200 24.800l2.100-2.100M22.700 9.300l2.100-2.100" fill="none" ${S}/></symbol>
  <symbol id="i-moon" viewBox="0 0 32 32"><path d="M23 21.500A10 10 0 0 1 11.500 6a10 10 0 1 0 11.500 15.500Z" fill="var(--f1,#ffe58a)" ${S}/></symbol>
  <symbol id="i-gear" viewBox="0 0 32 32"><path d="M14 4h4l.8 3.300 2.700 1.200 2.900-1.800 2.800 2.800-1.800 2.900 1.200 2.700 3.300.8v4l-3.300.8-1.200 2.700 1.800 2.900-2.800 2.800-2.900-1.800-2.700 1.200L18 28h-4l-.8-3.300-2.700-1.200-2.900 1.800-2.800-2.800 1.800-2.900-1.200-2.700L4 14.400v-4l3.300-.8 1.200-2.700-1.800-2.900 2.800-2.800 2.900 1.800 2.700-1.200Z" transform="translate(0 2) scale(.88) translate(2 -.5)" fill="var(--f1,#ffe2b0)" ${S}/><circle cx="16" cy="16" r="4" fill="var(--f2,#fff)" ${S}/></symbol>
  <symbol id="i-fish" viewBox="0 0 32 20"><path d="M3 10c4-6 12-7 17-1l7-5v12l-7-5c-5 6-13 5-17-1Z" fill="var(--f1,#bfeaf0)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="8.500" r="1.400" fill="currentColor"/></symbol>
  <symbol id="i-star" viewBox="0 0 32 32"><path d="m16 4 3.500 7.500 8 1-5.900 5.600 1.500 8-7.100-4-7.100 4 1.500-8L4.500 12.500l8-1Z" fill="var(--f1,#ffd15c)" ${S}/></symbol>
  <symbol id="i-sparkle" viewBox="0 0 32 32"><path d="M16 3c1 7 3 10 13 13-10 3-12 6-13 13-1-7-3-10-13-13 10-3 12-6 13-13Z" fill="var(--f1,#fff3a8)" ${S}/></symbol>
  <symbol id="i-chev" viewBox="0 0 32 32"><path d="m9 12 7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-left" viewBox="0 0 32 32"><path d="m19 8-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-right" viewBox="0 0 32 32"><path d="m13 8 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 32 32"><path d="M16 8v16M8 16h16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></symbol>
  <symbol id="i-minus" viewBox="0 0 32 32"><path d="M8 16h16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></symbol>
  <symbol id="i-close" viewBox="0 0 32 32"><path d="m9 9 14 14M23 9 9 23" fill="none" stroke="currentColor" stroke-width="3.400" stroke-linecap="round"/></symbol>
  <symbol id="i-check" viewBox="0 0 32 32"><path d="m8 17 5.500 5.500L24 10" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-flag" viewBox="0 0 32 32"><path d="M8 27V5" fill="none" ${S}/><path d="M8 6c5-2.500 8 2.500 15 0v11c-7 2.500-10-2.500-15 0Z" fill="var(--f1,#ff8d8d)" ${S}/></symbol>
  <symbol id="i-cup" viewBox="0 0 32 32"><path d="M6 12h17v7a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7Z" fill="var(--f1,#fff)" ${S}/><path d="M23 14h2.500a3 3 0 0 1 0 6H22" fill="none" ${S}/><path d="M11 4c-1.500 2 1.500 3 0 5M17 4c-1.500 2 1.500 3 0 5" fill="none" ${S}/></symbol>
  <symbol id="i-note" viewBox="0 0 32 32"><path d="M6 5h20v16l-6 6H6Z" fill="var(--f1,#fff0a0)" ${S}/><path d="M20 27v-6h6M11 11h10M11 16h7" fill="none" ${S}/></symbol>
  <symbol id="i-zzz" viewBox="0 0 32 32"><path d="M6 8h9l-9 8h9M18 16h7l-7 6h7" fill="none" ${S}/></symbol>
  <symbol id="i-heart" viewBox="0 0 32 32"><path d="M16 27C7 20 4 15 4 11a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 4-3 9-12 16Z" fill="var(--f1,#ff8fb0)" ${S}/></symbol>
  <symbol id="i-lock" viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="13" rx="3.500" fill="var(--f1,#d9cdbd)" ${S}/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" ${S}/></symbol>
  <symbol id="i-download" viewBox="0 0 32 32"><path d="M16 5v15M9 14l7 7 7-7M6 26h20" fill="none" ${S}/></symbol>
  <symbol id="i-upload" viewBox="0 0 32 32"><path d="M16 22V7M9 13l7-7 7 7M6 26h20" fill="none" ${S}/></symbol>
  <symbol id="i-calendar" viewBox="0 0 32 32"><rect x="5" y="7" width="22" height="20" rx="4" fill="var(--f1,#fff)" ${S}/><path d="M5 13h22M11 4v6M21 4v6" fill="none" ${S}/></symbol>
  <symbol id="i-umbrella" viewBox="0 0 32 32"><path d="M4 16C5 8 11 4 16 4s11 4 12 12Z" fill="var(--f1,#ff8d8d)" ${S}/><path d="M16 16v10a3 3 0 0 0 6 0" fill="none" ${S}/><path d="M10 15c1-6 3-10 6-11M22 15c-1-6-3-10-6-11" fill="none" ${S}/></symbol>
</defs></svg>`;
  const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  /* ---------- peixinho ---------- */
  const fish = (x, y, rot = 0, c = '#bfeaf0', s = 1) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-9 0c3-5 9-5.500 13-1l5-3.500v9l-5-3.500c-4 4.500-10 4-13-1Z" fill="${c}" stroke="${INK}" stroke-width="1.600" stroke-linejoin="round"/><circle cx="-5" cy="-.8" r="1" fill="${INK}"/></g>`;

  /* ---------- quintal ---------- */
  function yard({ night = false, variant = 'work', W = 406, H = 250 } = {}) {
    const P = night ? PAL.night : PAL.day, ink = P.ink;
    const sw = `stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

    // luzinhas / estrelas / nuvens
    const stars = night ? [[24, 18], [70, 34], [118, 12], [166, 30], [214, 10], [262, 26], [310, 14], [352, 36], [30, 52], [388, 54], [190, 48]]
      .map(([x, y], i) => `<g class="twinkle" style="animation-delay:${(i * .37).toFixed(2)}s" transform="translate(${x} ${y})"><path d="M0-4v8M-4 0h8" stroke="#fff6c8" stroke-width="1.700" stroke-linecap="round"/></g>`).join('') : '';
    const clouds = night ? '' : `
      <g class="cloud c1"><path d="M40 34c0-8 9-12 15-8 3-7 15-6 17 2 7-1 11 6 6 10H46c-6 0-9-2-6-4Z" fill="${P.cloud}" opacity=".95"/></g>
      <g class="cloud c2"><path d="M232 22c0-6 7-9 12-6 2-5 11-5 13 1 5-1 8 4 4 8h-24c-4 0-6-2-5-3Z" fill="${P.cloud}" opacity=".9"/></g>`;

    // fim de semana: círculo mágico no relvado
    const magic = variant === 'magic' ? `
      <g class="magic-circle" transform="translate(228 150)" opacity="${night ? .95 : .8}">
        <ellipse rx="112" ry="36" fill="${night ? '#8f6bd6' : '#c9a8ff'}" opacity=".18"/>
        <ellipse rx="112" ry="36" fill="none" stroke="${night ? '#d9c2ff' : '#8b62d1'}" stroke-width="2.200" stroke-dasharray="3 7" stroke-linecap="round"/>
        <ellipse rx="84" ry="26" fill="none" stroke="${night ? '#d9c2ff' : '#8b62d1'}" stroke-width="1.600"/>
      </g>` : '';

    // feriado: bandeirinhas na vedação
    const bunting = variant === 'holiday' ? (() => {
      const cols = ['#ff8d8d', '#ffd15c', '#7fd6c2', '#a99bff', '#ffa9c3'];
      let s = `<path d="M-4 46Q100 76 203 50T410 46" fill="none" stroke="${ink}" stroke-width="2"/>`;
      for (let i = 0; i < 15; i++) {
        const x = 8 + i * 27, y = 46 + Math.sin(i / 14 * Math.PI * 2) * 4 + (i % 7 < 4 ? 8 : 6);
        s += `<path d="M${x} ${y - 6} l12 0 l-6 13 Z" fill="${cols[i % 5]}" stroke="${ink}" stroke-width="1.700" stroke-linejoin="round"/>`;
      }
      return s;
    })() : '';

    // férias: chapéu-de-sol no relvado
    const parasol = variant === 'ferias' ? `
      <g transform="translate(348 128)"><path d="M0 60V-6" stroke="${ink}" stroke-width="3.500" stroke-linecap="round"/>
        <path d="M-40 6C-36-26 -12-40 0-40S36-26 40 6Z" fill="#ff8d8d" ${sw}/><path d="M-13 6C-11-22-5-38 0-40M13 6C11-22 5-38 0-40" fill="none" stroke="#fff" stroke-width="2.600"/>
        <path d="M-40 6q10 8 20 0q10 8 20 0q10 8 20 0q10 8 20 0" fill="#ffb0b0" ${sw}/></g>` : '';

    const pickets = Array.from({ length: 19 }, (_, i) => {
      const x = -8 + i * 23;
      return `<path d="M${x} 66q7-11 14 0v44h-14Z" fill="${P.fence}" ${sw}/><path d="M${x + 3} 72v34" stroke="${P.fenceShade}" stroke-width="2" stroke-linecap="round"/>`;
    }).join('');

    const tufts = [[46, 128], [102, 150], [190, 118], [286, 134], [332, 168], [24, 176], [150, 184], [250, 182], [386, 132], [70, 112], [216, 172]]
      .map(([x, y]) => `<path d="M${x} ${y}l-3-6M${x} ${y}v-8M${x} ${y}l3-6" stroke="${P.tuft}" stroke-width="2.300" stroke-linecap="round" fill="none"/>`).join('');
    const flowers = night ? '' : [[64, 156, '#fff'], [176, 140, '#ffe27a'], [300, 118, '#fff'], [368, 152, '#ffb3c9'], [120, 122, '#ffb3c9']]
      .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.200" fill="${c}" stroke="${ink}" stroke-width="1.400"/><circle cx="${x}" cy="${y}" r="1" fill="#ffb02e"/>`).join('');

    // planks do deck
    const planks = Array.from({ length: 9 }, (_, i) => `<path d="M${i * 46 - 12} ${H - 44}v44" stroke="${P.deck2}" stroke-width="2.600"/>`).join('');

    return `<svg class="yard-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Quintal do Gato das Horas">
      <defs><linearGradient id="sky-${night ? 'n' : 'd'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky1}"/><stop offset="1" stop-color="${P.sky2}"/></linearGradient></defs>
      <rect width="${W}" height="120" fill="url(#sky-${night ? 'n' : 'd'})"/>
      ${stars}${clouds}
      <path d="M0 74q40-22 90-10t100-4q60-14 110 4t106-2V110H0Z" fill="${P.hill}"/>
      <path d="M0 88q60-16 120-2t130-4q70-10 156 4V110H0Z" fill="${P.hill2}"/>
      <g filter="url(#gdh-wobble)">
        <path d="M296 84 V50" stroke="${P.trunk}" stroke-width="7" stroke-linecap="round"/>
        <g ${sw}><circle cx="296" cy="36" r="24" fill="${P.bloom}"/><circle cx="272" cy="52" r="17" fill="${P.bloom}"/><circle cx="320" cy="52" r="17" fill="${P.bloom}"/></g>
        <circle cx="286" cy="30" r="4" fill="${P.bloom2}"/><circle cx="306" cy="42" r="3.500" fill="${P.bloom2}"/><circle cx="274" cy="50" r="3" fill="${P.bloom2}"/><circle cx="322" cy="50" r="3" fill="${P.bloom2}"/>
        <g ${sw}><ellipse cx="44" cy="82" rx="30" ry="18" fill="${P.leaf}"/><ellipse cx="82" cy="88" rx="20" ry="13" fill="${P.leaf}"/></g>
      </g>
      <rect y="104" width="${W}" height="${H - 104}" fill="${P.lawn}"/>
      <path d="M0 132q90-14 180 0t226-6V170q-90 12-180 0T0 168Z" fill="${P.lawn2}" opacity=".7"/>
      ${tufts}${flowers}${magic}
      <g filter="url(#gdh-wobble)">
        <path d="M-6 76h${W + 12}v7h-${W + 12}ZM-6 94h${W + 12}v7h-${W + 12}Z" fill="${P.fenceShade}" ${sw}/>
        ${pickets}
      </g>
      ${bunting}
      ${parasol}
      <g filter="url(#gdh-wobble)">
        <rect x="-6" y="${H - 50}" width="${W + 12}" height="60" fill="${P.deck}" ${sw}/>
        <rect x="-4" y="${H - 47}" width="${W + 8}" height="7" fill="${P.deckHi}"/>
        ${planks}
      </g>
      ${night ? `<g class="fireflies"><circle class="ff f1" cx="60" cy="150" r="2.600" fill="#fff6a8"/><circle class="ff f2" cx="250" cy="130" r="2.200" fill="#fff6a8"/><circle class="ff f3" cx="340" cy="176" r="2.600" fill="#fff6a8"/></g>` : `<g class="petals"><path class="petal p1" d="M300 60q3-5 6 0q-3 5-6 0Z" fill="${P.bloom2}"/><path class="petal p2" d="M290 66q3-5 6 0q-3 5-6 0Z" fill="${P.bloom}"/><path class="petal p3" d="M312 62q3-5 6 0q-3 5-6 0Z" fill="${P.bloom2}"/></g>`}
    </svg>`;
  }

  /* ---------- objetos dos slots ---------- */
  // Almofada (zabuton)
  const cushion = () => `<svg viewBox="0 0 100 44" class="obj-cushion" aria-hidden="true">
    <ellipse cx="50" cy="38" rx="42" ry="5" fill="#000" opacity=".12"/>
    <path d="M8 26q0-14 14-16h56q14 2 14 16-2 12-14 12H22Q10 38 8 26Z" fill="#ff9db8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M18 16q32-6 64 0" fill="none" stroke="#ffc4d5" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="24" r="3.400" fill="#ffd15c" stroke="${INK}" stroke-width="2"/></svg>`;

  // Caixa de cartão aberta: [atrás, à frente] para o gato ficar "dentro"
  const boxBack = () => `<svg viewBox="0 0 100 78" class="obj-box back" aria-hidden="true">
    <ellipse cx="50" cy="72" rx="44" ry="5" fill="#000" opacity=".12"/>
    <path d="M14 30 4 14h20l4 12ZM86 30l10-16H76l-4 12Z" fill="#cf9558" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 26h72l6 12H8Z" fill="#8a5a30" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const boxFront = () => `<svg viewBox="0 0 100 78" class="obj-box front" aria-hidden="true">
    <path d="M8 38h84l-6 32q-1 4-6 4H20q-5 0-6-4Z" fill="#dfa869" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M8 38h84" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 38v12h20V38" fill="#f2d39c" stroke="${INK}" stroke-width="2.400" stroke-linejoin="round"/>
    <path d="M18 56h14M68 60h14" stroke="#c48a4f" stroke-width="2.600" stroke-linecap="round"/></svg>`;
  // Orelhas/olhos à espreita dentro da caixa (meia hora)
  const boxPeek = () => `<svg viewBox="0 0 100 40" class="peek" aria-hidden="true"><path d="M26 40 30 12l14 14ZM74 40 70 12 56 26Z" fill="#5a3b2b" stroke="${INK}" stroke-width="2.200" stroke-linejoin="round"/>
    <ellipse cx="42" cy="34" rx="4" ry="5" fill="#ffe27a"/><ellipse cx="58" cy="34" rx="4" ry="5" fill="#ffe27a"/><circle cx="42" cy="35" r="1.800" fill="${INK}"/><circle cx="58" cy="35" r="1.800" fill="${INK}"/></svg>`;

  // Anel mágico (fim de semana)
  const ring = (lit) => `<svg viewBox="0 0 100 40" class="obj-ring ${lit ? 'lit' : ''}" aria-hidden="true">
    <ellipse cx="50" cy="22" rx="44" ry="14" fill="${lit ? '#c9a8ff' : '#8f7fb8'}" opacity="${lit ? .5 : .3}"/>
    <ellipse cx="50" cy="22" rx="44" ry="14" fill="none" stroke="${lit ? '#fff' : '#d9cff2'}" stroke-width="2.600" stroke-dasharray="${lit ? '0' : '3 6'}" stroke-linecap="round"/>
    <ellipse cx="50" cy="22" rx="30" ry="9" fill="none" stroke="${lit ? '#fff' : '#d9cff2'}" stroke-width="1.600" opacity=".8"/></svg>`;

  /* ---------- frasco de peixinhos (BO) ---------- */
  function jar(hours, night) {
    const n = Math.max(0, Math.min(8, Math.round(hours)));
    const spots = [[30, 66, -8], [44, 64, 6], [24, 54, 10], [38, 52, -10], [30, 42, 4], [44, 40, -6], [26, 32, 8], [40, 30, -4]];
    const cols = ['#bfeaf0', '#ffd0a8', '#d8c8ff', '#c8f0b8'];
    return `<svg viewBox="0 0 66 88" class="obj-jar" aria-hidden="true">
      <path d="M14 26q-6 2-6 10v36q0 10 10 10h30q10 0 10-10V36q0-8-6-10Z" fill="${night ? '#5a6aa8' : '#e9fbff'}" fill-opacity="${night ? .55 : .75}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="16" y="14" width="34" height="13" rx="4" fill="#e3a96a" stroke="${INK}" stroke-width="3"/>
      <path d="M16 20h34" stroke="${INK}" stroke-width="2" opacity=".35"/>
      ${spots.slice(0, n).map(([x, y, r], i) => fish(x + 3, y + 4, r, cols[i % 4], .95)).join('')}
      <path d="M15 40v26" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>`;
  }

  /* ---------- praia (Férias) ---------- */
  function beach(night) {
    const c = night ? { sky1: '#2b2f6b', sky2: '#6a4f92', sea: '#3c6fa8', sea2: '#4b82bd', sand: '#d1a37a', ink: '#2b1a30' }
      : { sky1: '#ffe9b3', sky2: '#ffd2c2', sea: '#7fd6e6', sea2: '#9de4ef', sand: '#ffe1a8', ink: INK };
    return `<svg class="beach-svg" viewBox="0 0 406 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="bsky${night ? 'n' : 'd'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky1}"/><stop offset="1" stop-color="${c.sky2}"/></linearGradient></defs>
      <rect width="406" height="120" fill="url(#bsky${night ? 'n' : 'd'})"/>
      ${night ? '<circle cx="328" cy="30" r="14" fill="#fff3b0" stroke="#2b1a30" stroke-width="2.600"/>' : '<circle cx="328" cy="32" r="18" fill="#ffd15c" stroke="#4a2a1e" stroke-width="2.600"/><path d="M328 4v6M328 54v6M300 32h6M350 32h6M308 12l4 4M344 48l4 4M308 52l4-4M344 16l4-4" stroke="#4a2a1e" stroke-width="2.600" stroke-linecap="round"/>'}
      <rect y="56" width="406" height="30" fill="${c.sea}"/><path d="M0 62q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="${c.sea2}" stroke-width="4" stroke-linecap="round"/>
      <path d="M0 78q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" opacity=".7"/>
      <path d="M0 86q60-8 130-2t150 0 126 2V120H0Z" fill="${c.sand}" stroke="${c.ink}" stroke-width="2.600" stroke-linejoin="round"/>
      <g transform="translate(60 64)"><path d="M0 52V-2" stroke="${c.ink}" stroke-width="3.500" stroke-linecap="round"/><path d="M-34 8C-30-20-10-32 0-32S30-20 34 8Z" fill="#ff8d8d" stroke="${c.ink}" stroke-width="2.600" stroke-linejoin="round"/><path d="M-11 8C-9-14-4-30 0-32M11 8C9-14 4-30 0-32" fill="none" stroke="#fff" stroke-width="2.400"/></g>
      <g stroke="${c.ink}" stroke-width="2.400" stroke-linejoin="round"><path d="M372 100q4-14 14-18l6 10Z" fill="#ffb0c8"/><path d="M366 104h30" stroke-linecap="round"/></g>
    </svg>`;
  }

  /* ---------- caixa do prémio (animação) ---------- */
  const rewardBox = () => `<svg viewBox="0 0 160 120" class="rw-box" aria-hidden="true">
    <ellipse cx="80" cy="112" rx="66" ry="7" fill="#000" opacity=".16"/>
    <g class="rw-lid"><path d="M18 34h124l4 22H14Z" fill="#e8b47a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M62 34v22h36V34" fill="#f6dcae" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
    <path d="M20 56h120l-8 50q-1 6-8 6H36q-7 0-8-6Z" fill="#dda468" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M32 78h22M106 86h22" stroke="#c48a4f" stroke-width="3.500" stroke-linecap="round"/></svg>`;

  root.GDH = Object.assign(root.GDH || {}, { art: { INK, PAL, sprite, icon, fish, yard, cushion, boxBack, boxFront, boxPeek, ring, jar, beach, rewardBox } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
