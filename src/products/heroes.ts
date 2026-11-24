// The five product heroes, rebuilt for the products page. Each driver shows its hero's finished
// frame at rest (the state right after that page's loader hands off) and, on play(), replays the
// hero's own opening and idle motion as specified by the product page source:
//   ShadowAD      src/shadowad/gl/bastion.ts + main.ts (dome of blocks, amber seams, scramble UI)
//   SysBastion    src/sysbastion/spiral.ts + style.css (card helix, letter-by-letter headline)
//   AEGIS-SHIELD  src/aegis-shield/main.ts + scene.ts (camera top-down to three-quarter, sonar)
//   AppSiege      src/appsiege/main.ts + gl/hero.ts (chrome ring, ribbon, dust, bloom)
//   DarkIntel360  src/darkintel360/main.ts heroIn + lampOn (probe, lines, typing, light)
// Everything runs on gsap's ticker and stops when the pointer leaves.
import { gsap } from 'gsap';
import { tiles } from '../sysbastion/content';
import { markSVG, patternCanvas } from '../sysbastion/patterns';

export interface Hero { play(): void; stop(): void; }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const outCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOut = (t: number) => 1 - (1 - t) ** 2;

/** Scramble text in: characters resolve left to right through random glyphs (shadowAD's scramble.ts). */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=-_/<>[]{}?!^';
function scrambleIn(el: HTMLElement, delay = 0) {
  const html = el.dataset.html ?? (el.dataset.html = el.innerHTML);
  const text = el.textContent ?? '';
  const L = text.length;
  const reveal = Array.from({ length: L }, (_, i) => (i / L) * 0.72 + Math.random() * 0.28);
  const s = { p: 0 };
  return gsap.to(s, {
    p: 1, delay, duration: 0.6 * (0.75 + Math.min(1.6, L / 60)), ease: 'none',
    onStart: () => { el.textContent = ''; },
    onUpdate: () => {
      let out = '';
      for (let i = 0; i < L; i++) {
        const r = reveal[i];
        out += s.p >= r || text[i] === ' ' ? text[i] : s.p >= r - 0.3 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ' ';
      }
      el.textContent = out;
    },
    onComplete: () => { el.innerHTML = html; },
  });
}

/* ------------------------------------------------------------------ ShadowAD */
export function shadowAD(root: HTMLElement): Hero {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-sa-canvas]')!;
  const g = canvas.getContext('2d')!;
  const ui = [...root.querySelectorAll<HTMLElement>('[data-sa-ui]')];
  const scr = [...root.querySelectorAll<HTMLElement>('[data-sa-scramble]')];
  const labels = [...root.querySelectorAll<HTMLElement>('[data-sa-label]')];
  const line = root.querySelector<SVGPolylineElement>('[data-sa-line]');
  let w = 0, h = 0, dpr = 1, t = 0;
  const st = { p: 1 };

  // Blocks: 7 rows on a dome, bottom rows first; door tunnel at the front (bastion.ts:59-105).
  type Block = { row: number; u: number; du: number; seed: number; delay: number; tilt: number };
  const blocks: Block[] = [];
  for (let row = 0; row < 7; row++) {
    const mid = ((row + 0.5) / 7) * (Math.PI / 2) * 0.97;
    const n = Math.max(2, Math.round(10 * Math.cos(mid)));
    for (let k = 0; k < n; k++) {
      const seed = Math.random();
      blocks.push({ row, u: -1 + (2 * (k + (row % 2 ? 0.5 : 0.25))) / (n + 0.5), du: 2 / (n + 0.5), seed, delay: (row / 7) * 0.55 + seed * 0.28, tilt: (Math.random() - 0.5) * 0.54 });
    }
  }
  const cubes = Array.from({ length: 16 }, () => ({ x: Math.random(), y: 0.12 + Math.random() * 0.6, s: 0.03 + Math.random() * 0.08, r: (Math.random() - 0.5) * 0.6 }));
  const snow = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 1.2, r: 0.6 + Math.random() * 1.2 }));

  const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r);
    g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath();
  };

  // Sky, ridges and vignette never change: painted once per size into their own canvases.
  const back = document.createElement('canvas'), front = document.createElement('canvas');
  function paintStatic() {
    for (const c of [back, front]) { c.width = canvas.width; c.height = canvas.height; }
    const b = back.getContext('2d')!; b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = b.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0f1117'); sky.addColorStop(0.56, '#2f333e'); sky.addColorStop(0.6, '#3a3f49'); sky.addColorStop(1, '#8f96a3');
    b.fillStyle = sky; b.fillRect(0, 0, w, h);
    b.fillStyle = '#20242c';
    b.beginPath(); b.moveTo(0, h * 0.6);
    for (let x = 0; x <= w; x += w / 12) b.lineTo(x, h * (0.54 + 0.05 * Math.sin(x * 0.011 + 1.3) + 0.03 * Math.sin(x * 0.031)));
    b.lineTo(w, h * 0.62); b.lineTo(0, h * 0.62); b.fill();
    const f = front.getContext('2d')!; f.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = f.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    f.fillStyle = v; f.fillRect(0, 0, w, h);
  }

  function draw() {
    if (!w) return;
    const p = st.p;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(back, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const portrait = h > w;
    const cx = w / 2 + Math.sin(t * 0.21) * w * 0.006, base = h * (portrait ? 0.76 : 0.79), R = portrait ? Math.min(h * 0.26, w * 0.4) : Math.min(h * 0.33, w * 0.2);
    const grow = span(p, 0.42, 0.7), glow = span(p, 0.4, 0.75), part = easeOut(span(p, 0.6, 1)), wire = 1 - span(p, 0.55, 0.92);
    // inner amber light (shows through every seam)
    const gl = g.createRadialGradient(cx, base - R * 0.4, R * 0.1, cx, base - R * 0.35, R * 1.25);
    gl.addColorStop(0, `rgba(255,214,140,${0.95 * glow})`); gl.addColorStop(0.45, `rgba(245,165,36,${0.75 * glow * (1 - part * 0.15)})`); gl.addColorStop(1, 'rgba(245,165,36,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(cx, base, R * 1.25, R * 1.15, 0, Math.PI, 0); g.fill();
    // blocks
    for (const b of blocks) {
      const a0 = (b.row / 7) * (Math.PI / 2) * 0.97, a1 = ((b.row + 1) / 7) * (Math.PI / 2) * 0.97;
      const y0 = base - R * Math.sin(a1), y1 = base - R * Math.sin(a0), hw = R * Math.cos((a0 + a1) / 2);
      const x = cx + b.u * hw, bw = b.du * hw * 0.9, bh = (y1 - y0) * 0.86;
      const s = outCubic(span(grow, b.delay / 0.83, b.delay / 0.83 + 0.25));
      if (s <= 0) continue;
      const dx = (x - cx) / R, dy = (y0 - base) / R;
      const drift = R * (0.03 + b.seed * 0.06) * part;
      const bob = Math.sin(t * 0.8 + b.seed * 20) * R * 0.006;
      g.save();
      g.translate(x + dx * drift, (y0 + y1) / 2 + dy * drift + bob);
      g.rotate(b.tilt * 0.35 * part); g.scale(s, s);
      const shade = 0.55 + 0.45 * Math.cos(b.u * Math.PI / 2);
      const c = Math.round(150 + 80 * shade);
      g.fillStyle = `rgb(${c - 34},${c - 30},${c - 20})`; rr(-bw / 2, -bh / 2, bw, bh, Math.min(bw, bh) * 0.22); g.fill();
      g.fillStyle = `rgb(${c},${c + 3},${c + 12})`; rr(-bw / 2, -bh / 2, bw, bh * 0.62, Math.min(bw, bh) * 0.22); g.fill();
      g.restore();
    }
    // door tunnel: three arches, lit from inside
    if (grow > 0.2) {
      const dw = R * 0.36, dh = R * 0.42, a = span(grow, 0.2, 0.6);
      g.globalAlpha = a;
      for (let i = 2; i >= 0; i--) {
        const k = 1 - i * 0.14;
        g.fillStyle = i === 0 ? '#120c05' : `rgb(${190 - i * 30},${194 - i * 30},${204 - i * 30})`;
        g.beginPath(); g.moveTo(cx - (dw * k) / 2, base); g.lineTo(cx - (dw * k) / 2, base - dh * k * 0.55);
        g.ellipse(cx, base - dh * k * 0.55, (dw * k) / 2, dh * k * 0.45, 0, Math.PI, 0); g.lineTo(cx + (dw * k) / 2, base); g.fill();
      }
      const dg = g.createRadialGradient(cx, base - dh * 0.25, 2, cx, base - dh * 0.25, dw * 0.6);
      dg.addColorStop(0, `rgba(255,200,110,${0.9 * glow})`); dg.addColorStop(1, 'rgba(245,165,36,0)');
      g.fillStyle = dg; g.fillRect(cx - dw, base - dh, dw * 2, dh);
      g.globalAlpha = 1;
    }
    // wireframe dome (amber), flickering
    if (wire > 0.01) {
      g.strokeStyle = `rgba(255,190,80,${wire * (0.85 + 0.09 * Math.sin(t * 7))})`; g.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const a = (i / 5) * (Math.PI / 2); g.beginPath(); g.ellipse(cx, base - R * Math.sin(a), R * Math.cos(a), R * Math.cos(a) * 0.18, 0, Math.PI, 2 * Math.PI); g.stroke(); }
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(cx, base, Math.abs(i / 3.4) * R, R, 0, i < 0 ? Math.PI : Math.PI * 1.5, i < 0 ? Math.PI * 1.5 : 2 * Math.PI); g.stroke(); }
    }
    // gold wire cubes, fading as the dome builds
    const ca = 0.85 - 0.72 * span(p, 0.3, 0.85);
    g.strokeStyle = `rgba(255,230,170,${ca * 0.7})`; g.fillStyle = `rgba(255,230,170,${ca})`;
    for (const c of cubes) {
      const s = c.s * h, x = c.x * w, y = c.y * h + Math.sin(t * 0.4 + c.x * 9) * 3;
      g.save(); g.translate(x, y); g.rotate(c.r); g.strokeRect(-s / 2, -s / 2, s, s); g.strokeRect(-s / 2 + s * 0.22, -s / 2 - s * 0.22, s, s);
      for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.arc((px * s) / 2, (py * s) / 2, 1.4, 0, 7); g.fill(); }
      g.restore();
    }
    // snow
    const sa = 0.85 * span(p, 0.5, 1);
    if (sa > 0.01) {
      g.fillStyle = `rgba(255,255,255,${sa})`;
      for (const f of snow) { const x = ((f.x + t * 0.012 * f.v) % 1) * w, y = ((f.y + t * 0.02 * f.v) % 1) * h; g.beginPath(); g.arc(x, y, f.r, 0, 7); g.fill(); }
    }
    // fog clears
    const fog = 0.86 * (1 - easeOut(span(p, 0.12, 0.78)));
    if (fog > 0.01) { g.fillStyle = `rgba(38,42,51,${fog})`; g.fillRect(0, 0, w, h); }
    // vignette
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(front, 0, 0);
    // UI and labels follow the build
    const uiA = span(p, 0.8, 0.95);
    ui.forEach((el) => { el.style.opacity = String(uiA); });
    const la = span(p, 0.82, 0.96);
    labels.forEach((el, i) => { el.style.opacity = String(span(la, i * 0.08, i * 0.08 + 0.35)); });
    if (line) line.style.opacity = String(0.75 * la);
  }

  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1 : 1.25);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    paintStatic();
    draw();
  };
  new ResizeObserver(size).observe(canvas);

  const tick = (_t: number, dt: number) => { t += Math.min(dt, 50) / 1000; draw(); };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      tl = gsap.timeline();
      tl.fromTo(st, { p: 0 }, { p: 1, duration: 3.6, ease: 'none' });
      scr.forEach((el, i) => tl!.add(scrambleIn(el), 2.9 + i * 0.08));
    },
    stop() {
      tl?.kill(); tl = null;
      scr.forEach((el) => { if (el.dataset.html) el.innerHTML = el.dataset.html; });
      gsap.to(st, { p: 1, duration: 0.35, ease: 'power2.out', onUpdate: draw, onComplete: () => gsap.ticker.remove(tick) });
    },
  };
}

/* ---------------------------------------------------------------- SysBastion */
export function sysBastion(root: HTMLElement): Hero {
  const scene = root.querySelector<HTMLElement>('[data-sb-scene]')!;
  const head = root.querySelector<HTMLElement>('[data-sb-headline]')!;
  const sub = root.querySelector<HTMLElement>('[data-sb-sub]')!;
  const mark = root.querySelector<HTMLElement>('[data-sb-mark]');
  if (mark) mark.innerHTML = markSVG;
  // headline split into letters (main.ts:53-58)
  head.innerHTML = head.textContent!.split(' ').map((wd) => `<span class="wd">${[...wd].map((c) => `<span class="lt">${c}</span>`).join('')}</span>`).join('<span class="sp"></span>');
  const letters = [...head.querySelectorAll<HTMLElement>('.lt')];

  const N = 14;
  const use = tiles.filter((x) => x.id !== 'outbound').slice(0, 12);
  const cards = Array.from({ length: N }, (_, k) => {
    const tile = use[k % use.length];
    const el = document.createElement('span');
    el.className = 'sb__card';
    el.innerHTML = `<i data-src="/sysbastion/ui/tile-${tile.id}.webp"></i><i data-group="${tile.group}"></i><b></b>`;
    scene.append(el);
    return { el, shade: el.querySelector('b') as HTMLElement };
  });
  // Load the panel images and draw the pattern backs only when the card is near the screen.
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    scene.querySelectorAll<HTMLElement>('[data-src]').forEach((i) => { i.style.backgroundImage = `url(${i.dataset.src})`; });
    const urls = new Map<string, string>();
    scene.querySelectorAll<HTMLElement>('[data-group]').forEach((i) => {
      const id = i.dataset.group as Parameters<typeof patternCanvas>[0];
      if (!urls.has(id)) urls.set(id, patternCanvas(id, 256).toDataURL());
      i.style.backgroundImage = `url(${urls.get(id)})`;
    });
  }, { rootMargin: '600px 0px' });
  io.observe(root);

  const st = { radius: 3, speed: 0.15, scale: 0.5 };
  let pos = 0;
  function layout() {
    const H = scene.clientHeight, U = H * 0.17;
    cards.forEach((c, k) => {
      let off = k - pos;
      off = ((off % N) + N) % N; if (off > N / 2) off -= N;
      const angle = off * 0.65;
      const k3 = st.radius / 3;
      const x = (3 * Math.sin(angle) - 0.05 * off) * k3, y = 0.4 * off, z = 2.1 * Math.cos(angle) * k3;
      const sc = st.scale / 0.5;
      c.el.style.transform = `translate3d(${x * U}px, ${-y * U}px, ${z * U}px) rotateY(${angle}rad) rotateZ(${0.06 * Math.sin(angle)}rad) scale(${sc})`;
      const facing = Math.cos(angle);
      c.shade.style.opacity = String(facing >= 0 ? 1 - Math.max(0.32, 0.5 + 0.5 * facing) : 0.3);
      c.el.style.display = Math.abs(off) > 5 ? 'none' : ''; // only the cards on screen exist
    });
  }
  new ResizeObserver(layout).observe(scene);
  layout();

  const tick = (_t: number, dt: number) => { pos += (st.speed * Math.min(dt, 50)) / 1000; layout(); };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      tl = gsap.timeline();
      tl.fromTo(st, { radius: 12, speed: 1, scale: 0.4 }, { radius: 3, speed: 0.15, scale: 0.5, duration: 2.2, ease: 'power3.out' }, 0);
      tl.fromTo(letters, { opacity: 0, y: '0.62em' }, { opacity: 1, y: 0, duration: 0.62, ease: 'expo.out', stagger: 0.045 }, 0.6);
      tl.fromTo(sub, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 1.5);
    },
    stop() {
      tl?.kill(); tl = null;
      gsap.ticker.remove(tick);
      gsap.to(st, { radius: 3, scale: 0.5, duration: 0.4, onUpdate: layout });
      gsap.to(letters, { opacity: 1, y: 0, duration: 0.3 });
      gsap.to(sub, { opacity: 1, y: 0, duration: 0.3 });
    },
  };
}

/* -------------------------------------------------------------- AEGIS-SHIELD */
export function aegis(root: HTMLElement): Hero {
  const cam = root.querySelector<HTMLElement>('[data-ag-cam]')!;
  const glow = root.querySelector<HTMLElement>('[data-ag-glow]')!;
  const words = root.querySelector<HTMLElement>('[data-ag-words]')!; // the spans keep their own rotateY tilt
  const lines = root.querySelectorAll<HTMLElement>('[data-ag-h1] .ln > span');
  const foot = root.querySelector<HTMLElement>('[data-ag-foot]')!;
  const rings = [...root.querySelectorAll<HTMLElement>('[data-ag-ring]')];
  const led = root.querySelector<HTMLElement>('[data-ag-led]');
  const cv = { rx: -24, ry: -34, s: 1, drift: 0 };
  const apply = () => { cam.style.transform = `rotateX(${cv.rx + Math.cos(cv.drift * 0.21) * 1.2}deg) rotateY(${cv.ry + Math.sin(cv.drift * 0.25) * 2}deg) scale(${cv.s})`; };
  apply();
  const tick = (_t: number, dt: number) => {
    cv.drift += Math.min(dt, 50) / 1000;
    apply();
    if (led) led.style.opacity = String(0.55 + 0.45 * Math.sin(cv.drift * 2.4) ** 2);
    // five sonar rings: each grows and fades, offset by a fifth of a 4.55 s cycle (scene.ts:353-360)
    rings.forEach((r, i) => {
      const c = ((cv.drift / 4.55 + i / 5) % 1);
      r.style.opacity = String((1 - c) ** 2 * 0.85);
      r.style.scale = String(0.3 + c * 2.4);
    });
  };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      tl = gsap.timeline();
      tl.fromTo(cv, { rx: -84, ry: 0, s: 0.86 }, { rx: -24, ry: -34, s: 1, duration: 1.3, ease: 'power2.inOut' }, 0);
      tl.fromTo(glow, { opacity: 0.35 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' }, 0);
      tl.fromTo(words, { opacity: 0, y: 40, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }, 0.8);
      tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: 'power3.out', stagger: 0.06 }, 0.85);
      tl.fromTo(foot, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 0.85);
    },
    stop() {
      tl?.kill(); tl = null;
      gsap.ticker.remove(tick);
      gsap.to(cv, { rx: -24, ry: -34, s: 1, duration: 0.4, onUpdate: apply });
      gsap.to(glow, { opacity: 1, duration: 0.3 });
      gsap.to(words, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
      gsap.to(lines, { yPercent: 0, duration: 0.3 });
      gsap.to(foot, { opacity: 1, y: 0, duration: 0.3 });
      rings.forEach((r, i) => { r.style.opacity = i === 0 ? '0.35' : '0'; r.style.scale = i === 0 ? '1' : '0.3'; });
    },
  };
}

/* ------------------------------------------------------------------ AppSiege */
// /appsiege/ (src/appsiege/main.ts + gl/hero.ts): when its loader finishes, 14 tendrils bloom,
// the chrome ring settles from 86% to full size and the dust fades in over 1.8 s (expo.out) while
// the brand, nav and caption fade up. Idle: the ring sways on Y (sin t*.25), bobs (sin t*.6) and
// tilts toward the pointer (x .18 rad, y .08 rad).
export function appSiege(root: HTMLElement): Hero {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-asg-dust]')!;
  const g = canvas.getContext('2d')!;
  const world = root.querySelector<HTMLElement>('[data-asg-world]')!;
  const ring = root.querySelector<HTMLElement>('[data-asg-ring]')!;
  const bloom = root.querySelector<SVGSVGElement>('[data-asg-bloom]')!;
  const ui = [...root.querySelectorAll<HTMLElement>('[data-asg-ui]')];
  bloom.innerHTML = Array.from({ length: 14 }, (_, i) => `<path transform="rotate(${(i / 14) * 360})" d="M0 -70 C 22 -95, 30 -140, 8 -175 M0 -70 C -22 -95, -30 -140, -8 -175"/>`).join('');
  const dust = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() ** 3 * 2.6, s: Math.random() }));
  const st = { intro: 1 };
  let w = 0, h = 0, dpr = 1, t = 0, px = 0, py = 0, tx = 0, ty = 0;
  function drawDust() {
    if (!w) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const a = st.intro;
    for (const d of dust) {
      const x = ((d.x + Math.sin(t * 0.3 + d.s * 6.28) * 0.006) % 1) * w;
      const y = ((d.y + t * 0.004 * (0.5 + d.s)) % 1) * h;
      g.globalAlpha = a * (0.45 + 0.55 * d.s);
      g.fillStyle = d.r > 2 ? '#e6f59a' : '#d4ec7c';
      g.beginPath(); g.arc(x, y, d.r, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  function place() {
    const sc = 0.86 + 0.14 * st.intro;
    const roty = Math.sin(t * 0.25) * 0.06 + px * 0.18, rotx = py * 0.08;
    ring.style.transform = `rotateX(${rotx}rad) rotateY(${roty}rad) scale(${sc})`;
    world.style.translate = `0 ${Math.sin(t * 0.6) * 4}px`;
    drawDust();
  }
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    place();
  };
  new ResizeObserver(size).observe(canvas);
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  const tick = (_t: number, dt: number) => {
    const s = Math.min(dt, 50) / 1000;
    t += s; px += (tx - px) * Math.min(1, s * 3); py += (ty - py) * Math.min(1, s * 3);
    place();
  };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      tl = gsap.timeline();
      tl.fromTo(bloom, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0)
        .to(bloom, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0.5)
        .fromTo(st, { intro: 0 }, { intro: 1, duration: 1.8, ease: 'expo.out', onUpdate: place }, 0.5)
        .fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.9);
    },
    stop() {
      tl?.kill(); tl = null;
      gsap.ticker.remove(tick);
      tx = ty = 0;
      gsap.to(bloom, { opacity: 0, duration: 0.2 });
      gsap.to(ui, { opacity: 1, duration: 0.3 });
      gsap.to({ v: 0 }, { v: 1, duration: 0.5, onUpdate() { px *= 0.85; py *= 0.85; place(); } });
      gsap.to(st, { intro: 1, duration: 0.4, onUpdate: place });
    },
  };
}

/* -------------------------------------------------------------- DarkIntel360 */
export function darkIntel(root: HTMLElement): Hero {
  const probe = root.querySelector<HTMLElement>('[data-di-probe]')!;
  const dark = root.querySelector<HTMLElement>('[data-di-dark]')!;
  const cone = root.querySelector<HTMLElement>('[data-di-cone]')!;
  const ins = root.querySelectorAll<HTMLElement>('[data-di-in]');
  const lines = root.querySelectorAll<HTMLElement>('[data-di-title] .ln > span');
  const typed = root.querySelector<HTMLElement>('[data-di-typed]')!;
  const orbit = root.querySelector<HTMLElement>('.di__orbit')!;
  const ring = root.querySelector<HTMLElement>('.di__ring')!;
  const full = typed.textContent ?? '';
  let t = 0;
  const place = () => {
    const rx = ring.offsetWidth / 2, ry = ring.offsetHeight / 2, a = t * 0.7;
    orbit.style.transform = `translate(${Math.cos(a) * rx}px, ${Math.sin(a) * ry}px)`;
    probe.style.translate = `0 ${Math.sin(t * 1.1) * 5}px`; // idle bob on its own property, so it never fights the fly-in tween
  };
  place();
  const tick = (_t: number, dt: number) => { t += Math.min(dt, 50) / 1000; place(); };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      root.classList.remove('is-lit');
      const W = root.clientWidth, H = root.clientHeight;
      const type = { n: 0 };
      tl = gsap.timeline();
      tl.set(dark, { opacity: 1 }).set(cone, { opacity: 0 }).set(typed, { textContent: '' });
      tl.fromTo(probe, { x: W * 0.28, y: H * 0.12 }, { x: 0, y: 0, duration: 2.4, ease: 'expo.out' }, 0);
      tl.fromTo(ins[0], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.2);
      tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.09 }, 0.3);
      tl.fromTo(ins[1], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, 0.9);
      tl.to(type, { n: full.length, duration: full.length * 0.055, ease: 'none', onUpdate: () => { typed.textContent = full.slice(0, Math.round(type.n)); } }, 1.3);
      // "Turn on the light": the lamp flickers on, then the purple comes up (main.ts lampOn)
      tl.add(() => root.classList.add('is-lit'), 3.0)
        .to(cone, { keyframes: [{ opacity: 1, duration: 0.06 }, { opacity: 0.1, duration: 0.07 }, { opacity: 0.9, duration: 0.05 }, { opacity: 0.3, duration: 0.1 }, { opacity: 0.85, duration: 0.5 }] }, 3.0)
        .to(dark, { opacity: 0.25, duration: 1.1, ease: 'power2.inOut' }, 3.5);
    },
    stop() {
      tl?.kill(); tl = null;
      gsap.ticker.remove(tick);
      root.classList.remove('is-lit');
      typed.textContent = full;
      gsap.to(probe, { x: 0, y: 0, duration: 0.5 });
      gsap.to([...ins, ...lines], { opacity: 1, y: 0, yPercent: 0, duration: 0.3 });
      gsap.to(dark, { opacity: 1, duration: 0.6 });
      gsap.to(cone, { opacity: 0, duration: 0.4 });
    },
  };
}
