// One palette per module. The same values paint the console window (SVG), the world sky (CSS)
// and the world landscape (WebGL), so a window and the world behind it always match.
export type Pal = {
  skyTop: string; skyBot: string; far: string; mid: string; near: string; lake: string; cloud: string;
  stars: boolean; sun?: string;
};

export const INK = '#2a1145';

export const PALS: Pal[] = [
  // 0 Live map: violet dusk over teal hills and a lilac lake
  { skyTop: '#6a4fd6', skyBot: '#e19ae9', far: '#3f2b86', mid: '#2f8a78', near: '#226a5c', lake: '#ae6ce8', cloud: '#f7c6f1', stars: false },
  // 1 Forums: night, constellations, mint shore
  { skyTop: '#22145f', skyBot: '#7a4fd8', far: '#4b2f92', mid: '#3a2f78', near: '#2b8577', lake: '#7660e6', cloud: '#a98af0', stars: true },
  // 2 Data leaks: clear blue over a desert
  { skyTop: '#4a6ae6', skyBot: '#b4cbf7', far: '#c4704f', mid: '#dc8c55', near: '#b85b3e', lake: '#e6a768', cloud: '#ffffff', stars: false, sun: '#fff1c9' },
  // 3 Credentials: lilac and magenta
  { skyTop: '#8a57de', skyBot: '#f4b8e0', far: '#6a3fb8', mid: '#b360d2', near: '#8b40b2', lake: '#e6a8f4', cloud: '#fbd7f2', stars: false },
  // 4 Botnet data: storm purple over lime marsh
  { skyTop: '#1d0d3b', skyBot: '#55309a', far: '#2f1c5a', mid: '#5f9b3e', near: '#3e7a2f', lake: '#8a5cf0', cloud: '#6e4fb8', stars: true },
  // 5 Phishing: open sea under an aqua sky
  { skyTop: '#3b7bd8', skyBot: '#a4e3ea', far: '#2f5fae', mid: '#2f9d90', near: '#1f6f6a', lake: '#3b60d2', cloud: '#ffffff', stars: false, sun: '#fdf6d8' },
  // 6 Websites hacked: burnt sunset over plum ridges
  { skyTop: '#6b3fb8', skyBot: '#f6a28d', far: '#8b3f7a', mid: '#b2506f', near: '#6f2d5a', lake: '#ee8eb3', cloud: '#ffd2c4', stars: false, sun: '#ffe2b0' },
];

// Deterministic noise so a window looks the same on every visit.
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/** A ridge path across the frame: smooth quadratic hills from y0 up to peaks. */
function ridge(r: () => number, y0: number, amp: number, n: number, w = 1600, h = 900) {
  const step = w / n;
  let d = `M-20 ${h + 20} L-20 ${y0}`;
  let px = -20, py = y0;
  for (let i = 0; i <= n; i++) {
    const x = i * step + (r() - 0.5) * step * 0.4;
    const y = y0 - r() * amp;
    const cx = (px + x) / 2, cy = Math.min(py, y) - r() * amp * 0.5;
    d += ` Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    px = x; py = y;
  }
  return d + ` L${w + 20} ${py} L${w + 20} ${h + 20} Z`;
}

/** Illustrated valley for a window or a reduced-motion world: cliffs frame an open centre, soft fills, fine ink. */
export function landscape(i: number) {
  const p = PALS[i], r = rng(i + 3), id = `l${i}`;
  const line = `stroke="${INK}" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round"`;
  let stars = '';
  const nStars = p.stars ? 30 : 10;
  for (let k = 0; k < nStars; k++) {
    const x = r() * 1600, y = r() * 480, sz = r() * 2.4 + 1;
    stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${sz.toFixed(1)}" fill="#fff" opacity="${((p.stars ? 0.45 : 0.25) + r() * 0.4).toFixed(2)}"/>`;
  }
  if (p.stars) {
    const pts: [number, number][] = [[330, 150], [560, 330], [800, 120], [1010, 470], [1240, 300], [1430, 160]].map(([x, y]) => [x + (r() - 0.5) * 80, y + (r() - 0.5) * 60]);
    stars += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-dasharray="6 10"/>`;
    pts.forEach(([x, y]) => (stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="26" fill="url(#${id}s)"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6" fill="#fff"/>`));
  }
  const sx = (1100 + r() * 250).toFixed(0);
  const sun = p.sun ? `<circle cx="${sx}" cy="200" r="150" fill="url(#${id}s)" opacity=".8"/><circle cx="${sx}" cy="200" r="62" fill="${p.sun}" opacity=".95"/>` : '';
  let clouds = '';
  for (let k = 0; k < 2; k++) {
    const x = k ? 1150 + r() * 250 : 200 + r() * 250, y = 160 + r() * 200, w = 200 + r() * 160;
    clouds += `<g fill="${p.cloud}" opacity=".75"><ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 10}"/><ellipse cx="${x - w / 7}" cy="${y - w / 13}" rx="${w / 5}" ry="${w / 9}"/><ellipse cx="${x + w / 8}" cy="${y - w / 11}" rx="${w / 6}" ry="${w / 10}"/></g>`;
  }
  // cliffs: tall at the edges, falling toward a low horizon in the middle
  const lc = 180 + r() * 120, rc = 160 + r() * 140;
  const left = `M-20 920 L-20 ${lc} C 160 ${lc - 30} 260 ${lc + 120} 340 ${lc + 200} S 520 520 640 600 L 640 920 Z`;
  const right = `M1620 920 L1620 ${rc} C 1460 ${rc + 10} 1380 ${rc + 150} 1300 ${rc + 230} S 1110 520 960 600 L 960 920 Z`;
  const ledgeL = `M-20 ${lc + 160} C 120 ${lc + 150} 220 ${lc + 260} 300 ${lc + 330}`;
  const ledgeR = `M1620 ${rc + 180} C 1500 ${rc + 190} 1420 ${rc + 280} 1340 ${rc + 350}`;
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset=".85" stop-color="${p.skyBot}"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.far}" stop-opacity=".75"/><stop offset=".7" stop-color="${p.far}"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.near}"/></linearGradient>
<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyBot}" stop-opacity="0"/><stop offset="1" stop-color="${p.skyBot}" stop-opacity=".55"/></linearGradient>
<radialGradient id="${id}s"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1600" height="900" fill="url(#${id})"/>${stars}${sun}${clouds}
<rect x="0" y="420" width="1600" height="180" fill="url(#${id}h)"/>
<path d="M-20 600 C 300 580 520 592 800 586 S 1300 578 1620 596 L1620 640 L-20 640 Z" fill="${p.far}" ${line}/>
<path d="${left}" fill="url(#${id}c)" ${line}/>
<path d="${right}" fill="url(#${id}c)" ${line}/>
<path d="${ledgeL} M 120 ${lc + 60} C 200 ${lc + 110} 240 ${lc + 170} 280 ${lc + 230} ${ledgeR}" fill="none" stroke="${INK}" stroke-opacity=".3" stroke-width="2"/>
<path d="M-20 626 C 400 612 1000 640 1620 618 L1620 920 L-20 920 Z" fill="${p.lake}" ${line}/>
<path d="M-20 700 C 420 676 900 720 1620 690 L1620 920 L-20 920 Z" fill="url(#${id}g)" ${line}/>
<g stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"><path d="M300 652h90M760 660h150M1180 646h80"/></g>
</svg>`;
}
