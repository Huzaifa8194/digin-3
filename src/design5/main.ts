// /design5: Specimen. DigiInn360 drawn as a security document.
// One driver: scroll position turns a guilloche rosette through five plates (072 to 360).
// A UV lamp (difference lens) follows the pointer and shows the hidden ink: what we find and fix.
import './design5.css';
import '../inquiry';
import { gsap } from 'gsap';
import { boot, isTouch, onPage, prefersReducedMotion, scrollState } from '../engine';
import { startSelfCheck } from '../home/selfcheck';

const INK = '15,31,43', RED = '204,0,9', GREEN = '23,89,77';
const TAU = Math.PI * 2;
const mobile = () => innerWidth < 761;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// ---------- Guilloche: families of sine-modulated circles, the way security printers draw them ----------
type Band = { r0: number; a1: number; n1: number; a2: number; n2: number; J: number; pts: number; phase: number; rgb: string; alpha: number; upto?: number; gap?: number; jit?: number };

function band(ctx: CanvasRenderingContext2D, cx: number, cy: number, b: Band) {
  const upto = b.upto ?? 1;
  if (upto <= 0 || b.alpha <= 0.01) return;
  const whole = Math.floor(b.J), N = Math.max(2, Math.round(b.pts * upto)), jit = b.jit ?? 0;
  for (let j = 0; j < Math.ceil(b.J); j++) {
    const fade = j < whole ? 1 : b.J - whole; // a fractional curve fades in as the weave tightens
    const ph = b.phase + (j / b.J) * TAU;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = (i / b.pts) * TAU;
      const r = b.r0 + b.a1 * Math.sin(b.n1 * th + ph) + b.a2 * Math.sin(b.n2 * th - ph * 2) + (jit ? jit * Math.sin(47 * th + j * 1.7) : 0);
      const x = cx + r * Math.sin(th), y = cy - r * Math.cos(th);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${b.rgb},${(b.alpha * fade).toFixed(3)})`;
    ctx.stroke();
  }
}

// ---------- The rosette ----------
type Plate = { gap: number; dens: number; amp: number; eye: number; orbit: number; ring: number; num: number };
const PLATES: Plate[] = [
  { gap: 0, dens: 0.6, amp: 0.17, eye: 0, orbit: 0, ring: 0, num: 1 }, //     the note
  { gap: 1, dens: 0.45, amp: 0.2, eye: 0, orbit: 0, ring: 0, num: 0 }, // 072 gaps in the line work, closing as you read
  { gap: 0, dens: 1, amp: 0.09, eye: 0, orbit: 0, ring: 0, num: 0 }, //   144 the weave at its tightest
  { gap: 0, dens: 0.7, amp: 0.05, eye: 1, orbit: 0, ring: 0, num: 0 }, // 216 an eye that follows you
  { gap: 0, dens: 0.35, amp: 0.14, eye: 0, orbit: 1, ring: 0, num: 0 }, // 288 five services in orbit
  { gap: 0, dens: 0.8, amp: 0.17, eye: 0, orbit: 0, ring: 1, num: 1 }, //  360 sealed
];
const KEYS = ['gap', 'dens', 'amp', 'eye', 'orbit', 'ring', 'num'] as const;
const RING_TEXT = 'DIGIINN360  SEE RISK FROM EVERY ANGLE  DIGIINN360  SEE RISK FROM EVERY ANGLE  ';

function startRose() {
  onPage(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-rose]');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const reduced = prefersReducedMotion();
    const plates = [...document.querySelectorAll<HTMLElement>('[data-plate]')];
    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.d5-top__nav a')];
    let S = 0, dpr = 1, tops: number[] = [], frame = 0, cs = 0, px = 0, py = 0, tpx = 0, tpy = 0, lastKey = '', current = -1;
    const intro = { v: reduced ? 1 : 0 };
    const cur: Plate = { ...PLATES[0] };

    const size = () => {
      S = canvas.clientWidth;
      dpr = Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2);
      canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
      lastKey = '';
    };
    const measure = () => { tops = plates.map((el) => el.getBoundingClientRect().top + scrollY); };
    size(); measure();
    new ResizeObserver(() => { size(); measure(); }).observe(canvas);
    if (!isTouch()) addEventListener('pointermove', (e) => { tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    if (!reduced) gsap.to(intro, { v: 1, duration: 2.6, ease: 'power2.inOut', delay: 0.15 });

    // Where we are in the document, as a continuous plate index. Each plate holds for the first third of its section.
    const chapter = () => {
      const probe = (scrollState().y || scrollY) + innerHeight * 0.2;
      let i = 0;
      while (i < tops.length - 1 && probe >= tops[i + 1]) i++;
      if (i >= tops.length - 1) return tops.length - 1;
      return i + clamp(((probe - tops[i]) / (tops[i + 1] - tops[i]) - 0.35) / 0.65);
    };

    const draw = (t: number) => {
      const lw = mobile() ? 0.6 : 0.7, c = S / 2, R = S * 0.47, I = intro.v;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      ctx.lineWidth = lw; ctx.lineJoin = 'round';
      const dash = cur.gap > 0.02 ? [S * 0.034, S * 0.034 * cur.gap * 0.9] : [];

      // outer border band and its rules
      ctx.setLineDash([]);
      band(ctx, c, c, { r0: 0.955 * R, a1: 0.022 * R, n1: 60, a2: 0.008 * R, n2: 20, J: mobile() ? 3 : 5, pts: 900, phase: t * 0.12, rgb: GREEN, alpha: 0.72, upto: clamp(I * 1.5) });
      ctx.strokeStyle = `rgba(${INK},${0.45 * clamp(I * 2)})`;
      for (const rr of [0.992, 0.915, 0.585, 0.575]) { ctx.beginPath(); ctx.arc(c, c, rr * R, 0, TAU); ctx.stroke(); }

      // the weave
      ctx.setLineDash(dash);
      band(ctx, c, c, { r0: 0.72 * R, a1: 0.115 * R, n1: 10, a2: 0.028 * R, n2: 30, J: (mobile() ? 5 : 8) + (mobile() ? 8 : 16) * cur.dens, pts: 520, phase: -t * 0.07 + px * 0.5, rgb: INK, alpha: 0.6 * (1 - cur.orbit * 0.55), upto: clamp(I * 1.5 - 0.25), gap: cur.gap, jit: cur.gap * 0.012 * R });

      // the inner rosette: five petals, one for every 72 degrees
      band(ctx, c, c, { r0: 0.36 * R, a1: cur.amp * R, n1: 5, a2: 0.045 * R, n2: 15, J: mobile() ? 7 : 11, pts: 300, phase: t * 0.1 + py * 0.5, rgb: RED, alpha: 0.82 * (1 - cur.eye * 0.75), upto: clamp(I * 1.5 - 0.5), jit: cur.gap * 0.01 * R });
      ctx.setLineDash([]);

      if (cur.eye > 0.01) { // 216: the rosette looks back
        ctx.strokeStyle = `rgba(${INK},${0.55 * cur.eye})`;
        ctx.beginPath();
        for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU + t * 0.02, r1 = 0.13 * R, r2 = (0.29 + 0.025 * Math.sin(i * 5)) * R; ctx.moveTo(c + r1 * Math.sin(a), c - r1 * Math.cos(a)); ctx.lineTo(c + r2 * Math.sin(a), c - r2 * Math.cos(a)); }
        ctx.stroke();
        const ex = c + px * 0.07 * R, ey = c + py * 0.07 * R;
        ctx.fillStyle = `rgba(${INK},${cur.eye})`; ctx.beginPath(); ctx.arc(ex, ey, 0.1 * R, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(231,234,223,${cur.eye})`; ctx.beginPath(); ctx.arc(ex - 0.035 * R, ey - 0.035 * R, 0.022 * R, 0, TAU); ctx.fill();
      }
      if (cur.orbit > 0.01) { // 288: five services, 72 degrees apart
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + t * 0.05, ox = c + 0.72 * R * Math.sin(a), oy = c - 0.72 * R * Math.cos(a);
          band(ctx, ox, oy, { r0: 0.085 * R, a1: 0.03 * R, n1: 6, a2: 0, n2: 0, J: 5, pts: 140, phase: -t * 0.3 + k, rgb: RED, alpha: 0.9 * cur.orbit });
          ctx.fillStyle = `rgba(${INK},${cur.orbit})`; ctx.beginPath(); ctx.arc(ox, oy, 0.012 * R, 0, TAU); ctx.fill();
        }
      }
      if (cur.ring > 0.01) { // 360: the seal's legend
        ctx.fillStyle = `rgba(${INK},${0.95 * cur.ring})`;
        ctx.font = `500 ${Math.max(7, S * 0.022)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < RING_TEXT.length; i++) {
          const a = (i / RING_TEXT.length) * TAU + t * 0.03;
          ctx.save(); ctx.translate(c + 0.535 * R * Math.sin(a), c - 0.535 * R * Math.cos(a)); ctx.rotate(a); ctx.fillText(RING_TEXT[i], 0, 0); ctx.restore();
        }
      }
      if (cur.num > 0.01 && I > 0.6) {
        ctx.fillStyle = `rgba(${INK},${cur.num * clamp((I - 0.6) / 0.4)})`;
        ctx.font = `italic 900 ${0.15 * R}px "Bodoni Moda", Georgia, serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('360', c, c + 0.008 * R);
      }
    };

    gsap.ticker.add((t) => {
      if (document.hidden) return;
      if (frame++ % 45 === 0) measure();
      const target = chapter();
      cs += (target - cs) * (reduced ? 1 : 0.07);
      const i = Math.min(PLATES.length - 2, Math.floor(cs)), f = clamp(cs - i);
      for (const k of KEYS) cur[k] = PLATES[i][k] + (PLATES[i + 1][k] - PLATES[i][k]) * f;
      px += (tpx - px) * 0.08; py += (tpy - py) * 0.08;
      const atHero = cs < 0.5;
      if (atHero !== root.classList.contains('at-hero')) root.classList.toggle('at-hero', atHero);
      const now = Math.round(cs);
      if (now !== current) { current = now; navLinks.forEach((a, n) => (n === now - 1 ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'))); }
      if (reduced) { // still image: redraw only when the plate changes
        const key = `${cs.toFixed(3)}:${S}`;
        if (key !== lastKey) { lastKey = key; draw(0); }
        return;
      }
      if (mobile() && !atHero && frame & 1) return; // behind copy on phones: half rate
      draw(t);
    });
    document.fonts?.ready.then(() => { lastKey = ''; measure(); });
  });
}

// ---------- UV lamp ----------
function startLamp() {
  onPage(() => {
    const root = document.documentElement;
    const btn = document.querySelector<HTMLButtonElement>('[data-uv]');
    const hint = document.querySelector<HTMLElement>('[data-hint]');
    const invs = [...document.querySelectorAll<HTMLElement>('[data-inv]')];
    const touch = isTouch();
    let on = !touch, tx = innerWidth * 0.73, ty = innerHeight * 0.5, x = tx, y = ty, lx = -1, ly = -1, ls = -1;
    if (touch && hint) hint.textContent = 'UV lamp, top right: it shows the hidden ink.';
    const apply = () => {
      root.classList.toggle('uv-on', on);
      root.classList.toggle('uv-all', on && touch);
      if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'UV lamp on' : 'UV lamp off'; }
      lx = -1;
    };
    btn?.addEventListener('click', () => { on = !on; apply(); });
    if (!touch) addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    apply();
    gsap.ticker.add(() => {
      if (!on || touch) return;
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      const s = scrollState().y || scrollY;
      if (Math.abs(x - lx) < 0.3 && Math.abs(y - ly) < 0.3 && s === ls) return;
      lx = x; ly = y; ls = s;
      root.style.setProperty('--lx', `${x.toFixed(1)}px`);
      root.style.setProperty('--ly', `${y.toFixed(1)}px`);
      for (const el of invs) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        el.style.setProperty('--sx', `${(x - r.left).toFixed(1)}px`);
        el.style.setProperty('--sy', `${(y - r.top).toFixed(1)}px`);
      }
    });
  });
}

// ---------- Product seals: every stamp gets its own rosette (its symmetry is its signature) ----------
function startSeals() {
  onPage(() => {
    const reduced = prefersReducedMotion();
    const tints: Record<string, string> = { red: RED, green: GREEN, ink: INK };
    document.querySelectorAll<HTMLCanvasElement>('[data-seal]').forEach((cv) => {
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const n = Number(cv.dataset.seal) || 5, rgb = tints[cv.dataset.tint || 'ink'] || INK, st = { ph: 0 };
      const draw = () => {
        const S = cv.clientWidth, d = Math.min(devicePixelRatio || 1, 2);
        if (!S) return;
        if (cv.width !== Math.round(S * d)) { cv.width = Math.round(S * d); cv.height = Math.round(S * d); }
        ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, S, S); ctx.lineWidth = 0.6;
        const c = S / 2, R = S * 0.48;
        band(ctx, c, c, { r0: 0.9 * R, a1: 0.05 * R, n1: n * 6, a2: 0, n2: 0, J: 3, pts: 480, phase: -st.ph, rgb: INK, alpha: 0.55 });
        band(ctx, c, c, { r0: 0.48 * R, a1: 0.27 * R, n1: n, a2: 0.07 * R, n2: n * 3, J: 9, pts: 360, phase: st.ph, rgb, alpha: 0.85 });
        ctx.fillStyle = `rgba(${INK},0.9)`; ctx.beginPath(); ctx.arc(c, c, 0.035 * R, 0, TAU); ctx.fill();
      };
      new ResizeObserver(draw).observe(cv);
      const link = cv.closest('a');
      if (link && !reduced) {
        const turn = () => gsap.to(st, { ph: st.ph + TAU / n, duration: 1.6, ease: 'expo.out', overwrite: true, onUpdate: draw });
        link.addEventListener('pointerenter', turn);
        link.addEventListener('focus', turn);
      }
    });
  });
}

// Microtext rules: the line is made of words, as on a banknote
document.querySelectorAll<HTMLElement>('[data-micro]').forEach((el) => { el.textContent = 'DIGIINN360 SEE RISK FROM EVERY ANGLE '.repeat(60); });

startRose();
startLamp();
startSeals();
startSelfCheck();
boot();
