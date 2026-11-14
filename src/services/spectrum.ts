// The driver module (signature). One value, p ∈ [0, 4], is "where you are between seeing the risk
// and staying ahead". It drives the sculpture's shape and colour, the rail, the stage label and the
// page accent (--svc-mix). The hero sets p from the step you point at; the chapters set it from
// scroll. Everything draws on gsap.ticker, only while the stage is visible.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { isMobile, isTouch, onPage, prefersReducedMotion } from '../engine';

const RISK = ['#3a1424', '#5a1a2c', '#851f33', '#b3243a', '#e02a3f', '#ff4552', '#ff7a7f', '#ffb8b3', '#ffeae6'];
const AHEAD = ['#0f2240', '#14305a', '#1a4479', '#215c9f', '#2b76c6', '#4b94ea', '#7db3f6', '#b9d6fd', '#eaf3ff'];
const NAMES = [
  'Offensive Security Services',
  'Governance, Risk & Compliance (GRC)',
  'Security Operations & Managed Security',
  'Network & Infrastructure Security',
  'Data & Application Security',
];
const tau = Math.PI * 2;

type Pt = { x: number; y: number; z: number; tex: number };
function geometry(rows: number, cols: number): Pt[][] {
  const noise = new SimplexNoise();
  return Array.from({ length: rows }, (_, r) => {
    const lat = (r / (rows - 1) - 0.5) * Math.PI;
    return Array.from({ length: cols }, (_, c) => {
      const lon = (c / (cols - 1)) * tau;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      return { x, y, z, tex: noise.noise3d(x * 2.2, y * 2.2, z * 2.2) };
    });
  });
}

function draw(ctx: CanvasRenderingContext2D, strands: Pt[][], p: number, time: number, px: number, py: number) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  const mix = p / 4;
  const lerp = gsap.utils.interpolate;
  const scale = Math.min(w * 0.38, h * 0.36);
  const cx = w * (isMobile() ? 0.5 : 0.46), cy = h * 0.48;
  const angle = time * 0.00019 + p * 0.83 + px * 0.34;
  const pitch = 0.46 + py * 0.23;
  const ca = Math.cos(angle), sa = Math.sin(angle), cp = Math.cos(pitch), sp = Math.sin(pitch);

  const glow = ctx.createRadialGradient(cx, cy, scale * 0.1, cx, cy, scale * 1.5);
  glow.addColorStop(0, lerp('rgba(255,42,58,0.30)', 'rgba(61,140,255,0.28)', mix));
  glow.addColorStop(0.62, lerp('rgba(90,20,36,0.20)', 'rgba(15,36,74,0.22)', mix));
  glow.addColorStop(1, 'rgba(5,10,20,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const bands = Array.from({ length: 9 }, () => new Path2D());
  const freq = 9 + p; // the shape changes continuously with p: each step has its own ripple
  strands.forEach((strand, row) => {
    let lx = 0, ly = 0;
    strand.forEach(({ x, y, z, tex }, col) => {
      const ripple = Math.sin(y * freq + z * 4 - time * 0.0008);
      const rad = 0.89 + tex * 0.22 + ripple * (0.11 + mix * 0.05);
      const sx = (x * ca - z * sa) * rad, sz = (x * sa + z * ca) * rad, sy = y * rad;
      const depth = sz * cp + sy * sp;
      const scy = sy * cp - sz * sp;
      const persp = 2.8 / (2.8 - depth);
      const X = cx + (sx - scy * 0.18) * scale * persp;
      const Y = cy + scy * scale * persp;
      const tone = Math.max(0, Math.min(8, Math.floor((depth + 0.9) * 4.2 - x * 0.85 + 1)));
      if (col && (row % 3 !== 0 || depth > -0.4)) { bands[tone].moveTo(lx, ly); bands[tone].lineTo(X, Y); }
      lx = X; ly = Y;
    });
  });
  bands.forEach((band, i) => {
    ctx.strokeStyle = lerp(RISK[i], AHEAD[i], mix) as string;
    ctx.globalAlpha = 0.38 + i * 0.073;
    ctx.lineWidth = Math.max(0.65, scale / 225);
    ctx.stroke(band);
  });
  ctx.globalAlpha = 1;
}

export function startSpectrum() {
  onPage(() => {
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    const canvas = stage?.querySelector<HTMLCanvasElement>('[data-sculpture]');
    const ctx = canvas?.getContext('2d');
    const chapters = document.querySelector<HTMLElement>('[data-chapters]');
    if (!stage || !canvas || !ctx || !chapters) return;

    const reduced = prefersReducedMotion();
    const mobile = isMobile();
    let strands: Pt[][] = []; // built after first paint (see start)
    const fill = stage.querySelector<HTMLElement>('[data-rail-fill]');
    const dot = stage.querySelector<HTMLElement>('[data-rail-dot]');
    const track = dot?.parentElement;
    const num = stage.querySelector<HTMLElement>('[data-stage-num]');
    const name = stage.querySelector<HTMLElement>('[data-stage-name]');
    const steps = [...document.querySelectorAll<HTMLAnchorElement>('[data-step-preview]')];
    const root = document.documentElement;

    const s = { p: 0, target: 0, px: 0, py: 0, aimX: 0, aimY: 0, visible: true, shown: -1 };

    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.75);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      render(gsap.ticker.time * 1000);
    };

    const apply = () => {
      const mix = s.p / 4;
      root.style.setProperty('--svc-mix', `${(mix * 100).toFixed(1)}%`);
      if (fill) fill.style.scale = `1 ${mix}`;
      if (dot && track) dot.style.translate = `0 ${(mix * track.clientHeight).toFixed(1)}px`;
      const i = Math.round(s.p);
      if (i !== s.shown) {
        s.shown = i;
        if (num) num.textContent = `0${i + 1}`;
        if (name) name.textContent = NAMES[i];
        steps.forEach((a, k) => a.classList.toggle('is-previewed', k === i));
      }
    };
    const render = (time: number) => { apply(); draw(ctx, strands, s.p, reduced ? 0 : time, s.px, s.py); };

    // Hero: the step you point at previews its place on the spectrum.
    const setTarget = (t: number) => {
      s.target = t;
      if (reduced) { s.p = t; render(0); }
    };
    steps.forEach((a, k) => {
      a.addEventListener('pointerenter', () => setTarget(k));
      a.addEventListener('focus', () => setTarget(k));
    });
    document.querySelector('.svc-steps')?.addEventListener('pointerleave', () => { if (window.scrollY < innerHeight * 0.6) setTarget(0); });

    // Chapters: scroll sets the position, 0 → 4 across the five sections.
    ScrollTrigger.create({
      trigger: chapters,
      start: 'top 60%',
      end: 'bottom 60%',
      onUpdate: (self) => setTarget(reduced ? Math.round(self.progress * 4) : self.progress * 4),
      onToggle: (self) => stage.classList.toggle('is-chapters', self.isActive),
      onLeaveBack: () => setTarget(0),
    });
    // The index owns the screen (stage fades out); the contact brings it back, fully blue:
    // the page ends where the headline does, on "Stay ahead".
    const fade = { out: 0, back: 0 };
    const setOpacity = () => {
      const o = Math.max(0, Math.min(1, 1 - fade.out + fade.back));
      stage.style.opacity = o.toFixed(3);
      s.visible = o > 0.01;
      stage.classList.toggle('is-finale', fade.back > 0.05);
      if (reduced && s.visible) render(0);
    };
    ScrollTrigger.create({ trigger: '.svc-index', start: 'top 95%', end: 'top 35%', onUpdate: (self) => { fade.out = self.progress; setOpacity(); } });
    ScrollTrigger.create({ trigger: '.svc-contact', start: 'top 85%', end: 'top 25%', onUpdate: (self) => { fade.back = self.progress; setOpacity(); } });

    if (!isTouch() && !reduced) {
      addEventListener('pointermove', (e) => { s.aimX = e.clientX / innerWidth - 0.5; s.aimY = e.clientY / innerHeight - 0.5; }, { passive: true });
    }

    // Start after the page has painted and loaded: on a throttled phone, building and drawing the
    // sculpture before first paint delays the hero text. The stage fades in when it is ready.
    const start = () => {
      strands = mobile ? geometry(36, 80) : geometry(66, 137);
      new ResizeObserver(fit).observe(canvas);
      fit();
      gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out' });
      if (reduced) return;
      let last = 0;
      gsap.ticker.add((t) => {
        if (!s.visible) return;
        const ms = t * 1000;
        if (mobile && ms - last < 33) return; // ~30 fps on phones is plenty for a slow sculpture
        last = ms;
        const k = 1 - Math.pow(0.9, gsap.ticker.deltaRatio());
        s.p += (s.target - s.p) * k;
        s.px += (s.aimX - s.px) * 0.05;
        s.py += (s.aimY - s.py) * 0.05;
        render(ms);
      });
    };
    const later = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 300));
    if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
  });
}
