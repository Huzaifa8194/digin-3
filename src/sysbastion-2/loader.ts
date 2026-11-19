// Loader: a small badge floats on ice blue while the page loads, then its cover swings open and
// the inside page becomes a hole that grows until the site fills the screen. A 2D canvas paints
// the surround and cuts the page shapes out of it; the cover is a CSS 3D element on top.
import { addTick } from './clock';
import { coarse, isMobile, reduced } from './device';

const P = {
  surround: '#d3e0f8', bookW: 120, bookWMobile: 84, perspective: 2110, floatAmp: 17.5, floatSpeed: 1.6,
  thickness: 30, pages: 2, pageFan: 10.5, minLoad: 1.2, holdAt100: 0.35, countLag: 5, countMin: 0.4, maxWait: 10,
  openDur: 1.1, openDeg: 165, tiltX: 12, tiltY: 22, tiltZ: -8, shiftX: 0.32, shiftDelay: 0.35, shiftDur: 0.9,
  revealDelay: 0.55, revealDur: 0.7, expandDelay: 0.7, expandDur: 1.5, expandMargin: 1.06,
  spiralDelay: 0.9, spiralDur: 2.2, titleDelay: 1.5,
};
const ART_W = 309.182, ART_H = 417, D2R = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const inOutCubic = (e: number) => (e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2);
const outCubic = (e: number) => 1 - (1 - e) ** 3;
const inOutSine = (e: number) => -(Math.cos(Math.PI * e) - 1) / 2;
const rx = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const ry = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const rz = (v: number[], a: number) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };

/** Load tracker: scenes register work and report steps. */
const tasks = new Map<string, { done: number; total: number }>();
export function task(name: string, total: number) {
  const t = { done: 0, total: Math.max(1, total) };
  tasks.set(name, t);
  return { step: (n = 1) => { t.done = Math.min(t.total, t.done + n); }, finish: () => { t.done = t.total; } };
}
const progress = () => { let d = 0, a = 0; for (const t of tasks.values()) { d += t.done; a += t.total; } return a ? d / a : 0; };

export function runLoader(root: HTMLElement, onTick: (sinceOpen: number) => void, onDone: () => void) {
  const mask = root.querySelector<HTMLCanvasElement>('[data-mask]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const groupEl = root.querySelector<HTMLElement>('[data-group]')!;
  const cover = root.querySelector<HTMLElement>('[data-cover]')!;
  const art = root.querySelector<HTMLElement>('[data-art]')!;
  const pct = root.querySelector<HTMLElement>('[data-pct]')!;
  const ctx = mask.getContext('2d')!;
  const rm = reduced();
  const mobile = isMobile() || coarse();
  let W = 0, H = 0, R = 1;
  const resize = () => {
    const r = root.getBoundingClientRect();
    W = r.width; H = r.height; R = Math.min(2, devicePixelRatio || 1);
    mask.width = Math.round(W * R); mask.height = Math.round(H * R);
  };
  resize();
  addEventListener('resize', resize);

  let last = performance.now(), T = 0, shown = 0, hold: number | null = null, open: number | null = null, lastPct = -1, done = false;
  const area = (poly: number[][]) => { let a = 0; for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; } return a; };
  const fill = (polys: number[][][], style?: string) => {
    if (style) ctx.fillStyle = style;
    ctx.beginPath();
    for (const p0 of polys) {
      const p = area(p0) < 0 ? [...p0].reverse() : p0;
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.closePath();
    }
    ctx.fill('nonzero');
  };

  const frame = (ts: number) => {
    const dt = Math.min(0.5, (ts - last) / 1000); last = ts; T += dt;
    let target = progress(); if (T > P.maxWait) target = 1;
    const gap = target - shown;
    shown += Math.min(gap, Math.max(gap * Math.min(1, dt * P.countLag), dt * P.countMin));
    if (target >= 1 && shown > 0.995) shown = 1;
    if (open === null && shown >= 1 && T >= P.minLoad) { hold ??= T; if (T - hold >= P.holdAt100) open = T; }
    const l = open === null ? -1 : T - open;
    const n = Math.round(shown * 100);
    if (n !== lastPct) { lastPct = n; pct.textContent = `${n}%`; }
    const opening = l >= 0;
    const f = opening ? clamp01(l / P.openDur) : 0;
    const Tq = inOutCubic(f);
    const te = opening ? inOutSine(clamp01((l - P.expandDelay) / P.expandDur)) : 0;
    const I = opening ? outCubic(clamp01((l - P.revealDelay) / P.revealDur)) : 0;
    const ne = opening ? inOutCubic(clamp01((l - P.shiftDelay) / P.shiftDur)) : 0;
    const L = Math.min(mobile ? P.bookWMobile : P.bookW, W * 0.5), Rh = (ART_H / ART_W) * L;
    const cx = W / 2, cy = H / 2;
    let z, B, V, ae, oe, Hs;
    if (rm) { z = 0; B = V = ae = 0; oe = 1; Hs = 0; root.style.opacity = String(1 - (opening ? clamp01(l / 0.5) : 0)); }
    else {
      z = (P.openDeg * Tq + (180 - P.openDeg) * te) * D2R;
      const e = Tq * (1 - te), fl = (1 - f) * P.floatAmp;
      B = (P.tiltX * e + Math.sin(T * P.floatSpeed * 0.8) * fl * 0.5) * D2R;
      V = (P.tiltY * e + Math.sin(T * P.floatSpeed) * fl) * D2R;
      ae = P.tiltZ * e * D2R;
      const half = W / 2;
      oe = 1 + (Math.max(half / ((1.5 - P.shiftX) * L), half / ((0.5 + P.shiftX) * L), H / Rh) * P.expandMargin - 1) * te;
      Hs = P.shiftX * L * oe * ne;
    }
    stage.style.perspective = `${P.perspective}px`;
    groupEl.style.transform = `translate3d(${Hs}px,0,0) rotateX(${B}rad) rotateY(${V}rad) rotateZ(${ae}rad) scale(${oe})`;
    cover.style.width = `${L}px`; cover.style.height = `${Rh}px`; cover.style.left = `${-L / 2}px`; cover.style.top = `${-Rh / 2}px`;
    cover.style.transform = `rotateY(${-z}rad)`;
    art.style.transform = `scale(${L / ART_W})`;
    const proj = (x: number, y: number, zz: number) => {
      let r = [x * oe, y * oe, zz * oe];
      r = rz(r, ae); r = ry(r, V); r = rx(r, B); r[0] += Hs;
      const k = 1 - r[2] / P.perspective;
      return [cx + r[0] / k, cy + r[1] / k];
    };
    const hinge = (rad: number, y: number, ang: number) => proj(-L / 2 + rad * Math.cos(ang), y, rad * Math.sin(ang));
    const page = (a: number, b: number, hh: number, ang: number) => [hinge(a, -hh, ang), hinge(b, -hh, ang), hinge(b, hh, ang), hinge(a, hh, ang)];
    const back = [proj(-L / 2, -Rh / 2, -P.thickness), proj(L / 2, -Rh / 2, -P.thickness), proj(L / 2, Rh / 2, -P.thickness), proj(-L / 2, Rh / 2, -P.thickness)];
    const inner = page(-1, L, Rh / 2, 0);
    const coverPoly = page(-1, L, Rh / 2, z);
    const holes = [inner];
    if (area(coverPoly) < 0) holes.push(coverPoly);
    for (let i = 0; i < P.pages; i++) { const a = z - (i + 1) * P.pageFan * D2R; if (a > 0.5 * D2R) holes.push(page(-1, L, Rh / 2, a)); }
    ctx.setTransform(R, 0, 0, R, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.surround; ctx.fillRect(0, 0, W, H);
    fill([back], '#000');
    ctx.globalCompositeOperation = 'destination-out';
    fill(holes);
    ctx.globalCompositeOperation = 'source-over';
    if (I < 1) fill(holes, `rgba(0,0,0,${(1 - I).toFixed(3)})`);
    onTick(l);
    const end = Math.max(P.expandDelay + P.expandDur, P.revealDelay + P.revealDur);
    if (opening && l >= (rm ? 0.5 : end)) {
      if (!done) { done = true; removeEventListener('resize', resize); off(); onDone(); }
    }
  };
  const off = addTick(() => frame(performance.now()));
  return off;
}

export const LOADER = P;
