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

/** Illustrated landscape for a window or a reduced-motion world: outlined shapes, flat fills. */
export function landscape(i: number) {
  const p = PALS[i], r = rng(i + 3), id = `l${i}`;
  let stars = '';
  if (p.stars) {
    const pts: [number, number][] = [];
    for (let k = 0; k < 26; k++) {
      const x = r() * 1600, y = r() * 430, s = r() * 2.2 + 0.8;
      stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
      if (k < 6) pts.push([x, y]);
    }
    pts.sort((a, b) => a[0] - b[0]);
    stars += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 8"/>`;
    pts.forEach(([x, y]) => (stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="#fff" opacity=".25"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="3.5" fill="#fff"/>`));
  }
  const sun = p.sun ? `<circle cx="${(300 + r() * 1000).toFixed(0)}" cy="190" r="70" fill="${p.sun}" stroke="${INK}" stroke-width="4"/>` : '';
  let clouds = '';
  for (let k = 0; k < 3; k++) {
    const x = 200 + r() * 1200, y = 120 + r() * 220, w = 160 + r() * 200;
    clouds += `<g fill="${p.cloud}" opacity=".9"><ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 9}"/><ellipse cx="${x - w / 6}" cy="${y - w / 12}" rx="${w / 5}" ry="${w / 9}"/><ellipse cx="${x + w / 7}" cy="${y - w / 10}" rx="${w / 6}" ry="${w / 10}"/></g>`;
  }
  const rocks = Array.from({ length: 3 }, () => {
    const x = 200 + r() * 1200, y = 780 + r() * 60, s = 18 + r() * 26;
    return `<path d="M${x - s} ${y} L${x - s * 0.6} ${y - s * 0.8} L${x + s * 0.5} ${y - s} L${x + s} ${y} Z" fill="${p.far}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBot}"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#${id})"/>${stars}${sun}${clouds}
<path d="${ridge(r, 560, 260, 5)}" fill="${p.far}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="${ridge(r, 640, 120, 7)}" fill="${p.mid}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<rect x="-10" y="660" width="1620" height="90" fill="${p.lake}" stroke="${INK}" stroke-width="4"/>
<g stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"><path d="M240 690h90M720 712h140M1180 696h80M480 728h60"/></g>
<path d="${ridge(r, 760, 50, 6)}" fill="${p.near}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${rocks}
</svg>`;
}
