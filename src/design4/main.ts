// /design4: The trace. One red thread; each section gives it a different form.
import './design4.css';
import '../inquiry';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, isMobile, isTouch, onPage, onScroll, prefersReducedMotion, scrollState } from '../engine';
import { startButtons } from '../engine/fill';

const RED = '#e10600';
const reduced = () => prefersReducedMotion();

// ---------- HERO: a verlet rope pinned at both ends, weaving through the headline ----------
function startRope() {
  onPage(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-rope]');
    const hero = canvas?.parentElement;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d')!;
    const N = 46;
    type P = { x: number; y: number; px: number; py: number };
    let pts: P[] = [], seg = 0, W = 0, H = 0, dpr = 1;
    const pin = () => ({ ax: W * 0.66, ay: 0, bx: W * 0.62, by: H });
    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = hero.getBoundingClientRect(); W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const { ax, ay, bx, by } = pin();
      seg = (Math.hypot(bx - ax, by - ay) * 1.08) / (N - 1);
      pts = Array.from({ length: N }, (_, i) => { const t = i / (N - 1); const x = ax + (bx - ax) * t + Math.sin(t * Math.PI) * 60; const y = ay + (by - ay) * t; return { x, y, px: x, py: y }; });
    };
    build();
    new ResizeObserver(build).observe(hero);
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    if (!isTouch()) hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; mouse.vx = x - mouse.x; mouse.vy = y - mouse.y; mouse.x = x; mouse.y = y; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    if (isTouch()) hero.addEventListener('touchmove', (e) => { const r = hero.getBoundingClientRect(); const t = e.touches[0]; mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top; }, { passive: true });

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < N - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
      ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
      ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(225,6,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      [pts[0], pts[N - 1]].forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill(); });
    };
    if (reduced()) { draw(); return; }

    let on = false;
    const tick = (t: number) => {
      const { ax, ay, bx, by } = pin();
      for (let i = 1; i < N - 1; i++) {
        const p = pts[i];
        const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985;
        p.px = p.x; p.py = p.y;
        p.x += vx + Math.sin(t * 0.9 + i * 0.25) * 0.06;     // idle: a draught moves the thread
        p.y += vy + 0.12;                                      // a little weight
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 110 && d > 0.01) { const f = (110 - d) / 110; p.x += (dx / d) * f * 7 + mouse.vx * f * 0.25; p.y += (dy / d) * f * 7 + mouse.vy * f * 0.25; }
      }
      mouse.vx *= 0.8; mouse.vy *= 0.8;
      for (let k = 0; k < 14; k++) {
        pts[0].x = ax; pts[0].y = ay; pts[N - 1].x = bx; pts[N - 1].y = by;
        for (let i = 0; i < N - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
          const diff = (d - seg) / d / 2;
          if (i > 0) { a.x += dx * diff; a.y += dy * diff; }
          if (i + 1 < N - 1) { b.x -= dx * diff; b.y -= dy * diff; }
        }
      }
      draw();
    };
    ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; on ? gsap.ticker.add(tick) : gsap.ticker.remove(tick); } });
    draw();
  });
}

// ---------- the global thread: anchors joined and drawn as you scroll ----------
function startThread() {
  onPage(() => {
    const svg = document.querySelector<SVGSVGElement>('[data-thread]');
    const path = svg?.querySelector<SVGPathElement>('path');
    const main = document.querySelector<HTMLElement>('main');
    if (!svg || !path || !main) return;
    let samples: { y: number; l: number }[] = [], total = 0;
    const measure = () => {
      const mr = main.getBoundingClientRect();
      const ox = mr.left, oy = mr.top + scrollY;
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-anchor]')].sort((a, b) => +a.dataset.anchor! - +b.dataset.anchor!);
      const pts = nodes.map((n) => { const r = n.getBoundingClientRect(); return { x: r.left - ox, y: r.top + scrollY - oy, i: +n.dataset.anchor! }; });
      // subpath break between anchors 6 and 7: the pulse draws that stretch itself
      const groups: (typeof pts)[] = [[]];
      pts.forEach((p) => { if (p.i === 7) groups.push([]); groups[groups.length - 1].push(p); });
      let d = '';
      groups.forEach((g) => {
        if (!g.length) return;
        d += `M${g[0].x},${g[0].y}`;
        for (let i = 0; i < g.length - 1; i++) {
          const a = g[i], b = g[i + 1];
          const my = (b.y - a.y) * 0.5;
          d += ` C${a.x},${a.y + my} ${b.x},${b.y - my} ${b.x},${b.y}`;   // vertical-tangent curves: a hanging thread
        }
      });
      svg.setAttribute('width', String(main.scrollWidth));
      svg.setAttribute('height', String(main.scrollHeight));
      path.setAttribute('d', d);
      total = path.getTotalLength();
      path.style.strokeDasharray = `${total}`;
      samples = [];
      for (let l = 0; l <= total; l += 10) samples.push({ y: path.getPointAtLength(l).y, l });
      update();
    };
    const update = () => {
      if (!samples.length) return;
      if (reduced()) { path.style.strokeDashoffset = '0'; return; }
      const mr = main.getBoundingClientRect();
      const target = -mr.top + innerHeight * 0.68;
      let lo = 0;
      for (const s of samples) { if (s.y <= target) lo = s.l; else if (s.y > target + 400) break; }
      path.style.strokeDashoffset = String(total - lo);
    };
    ScrollTrigger.addEventListener('refresh', measure);
    document.fonts?.ready.then(measure);
    measure();
    onScroll(update);
  });
}

// ---------- TEST: the attack path pans sideways (desktop pin; phone: native swipe) ----------
function startTest() {
  onPage(() => {
    const section = document.querySelector<HTMLElement>('[data-test]');
    const track = section?.querySelector<HTMLElement>('[data-track]');
    const line = section?.querySelector<HTMLElement>('[data-track-line]');
    if (!section || !track || !line) return;
    const stations = [...track.querySelectorAll<HTMLElement>('.d4-station')];
    if (isMobile() || reduced()) { stations.forEach((s) => s.classList.add('is-hit')); return; }
    const dist = () => track.scrollWidth - innerWidth + parseFloat(getComputedStyle(section).paddingLeft);
    gsap.set(line, { scaleX: 0 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: (s) => stations.forEach((st, i) => st.classList.toggle('is-hit', s.progress > (i + 0.2) / (stations.length + 0.4))) } });
    tl.to(track, { x: () => -dist(), ease: 'none' }, 0).to(line, { scaleX: 1, ease: 'none' }, 0);
  });
}

// ---------- PROTECT: the wall flips on in a wave as you scroll ----------
function startWall() {
  onPage(() => {
    const wall = document.querySelector<HTMLElement>('[data-wall]');
    if (!wall) return;
    const tiles = [...wall.querySelectorAll<HTMLElement>('.d4-switch')];
    const count = wall.querySelector<HTMLElement>('[data-wall-count]');
    const order = [0, 1, 3, 2, 4, 6, 5, 7, 8]; // a diagonal wave
    let shown = -1;
    const set = (n: number) => {
      if (n === shown) return; shown = n;
      tiles.forEach((t, i) => t.classList.toggle('is-on', order.indexOf(i) < n));
      if (count) count.textContent = String(n);
    };
    if (reduced()) { set(9); return; }
    ScrollTrigger.create({ trigger: wall, start: 'top 75%', end: 'bottom 55%', onUpdate: (s) => set(Math.round(s.progress * 9)) });
  });
}

// ---------- WATCH: the thread as a live pulse with labelled events ----------
function startPulse() {
  onPage(() => {
    const box = document.querySelector<HTMLElement>('[data-pulse]');
    const canvas = box?.querySelector<HTMLCanvasElement>('[data-pulse-canvas]');
    const tagHost = box?.querySelector<HTMLElement>('[data-pulse-tags]');
    if (!box || !canvas || !tagHost) return;
    const ctx = canvas.getContext('2d')!;
    const EVENTS = ['Unknown autorun entry', 'Leaked credentials on a forum', 'Suspicious PowerShell', 'New program at boot', 'Exposed data set', 'Macro-enabled attachment'];
    let W = 0, H = 0, dpr = 1, buf: number[] = [];
    const step = 3;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); const r = box.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; buf = new Array(Math.ceil(W / step) + 2).fill(0); };
    size(); new ResizeObserver(size).observe(box);
    const tags: { el: HTMLElement; x: number }[] = [];
    let spike = 0, next = 1.2, ev = 0, acc = 0;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(243,243,239,0.08)'; ctx.lineWidth = 1;
      for (let y = H * 0.25; y < H; y += H * 0.25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.beginPath();
      buf.forEach((v, i) => { const x = i * step, y = H / 2 - v * H * 0.42; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(225,6,0,0.7)'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
      const lx = (buf.length - 1) * step, ly = H / 2 - buf[buf.length - 1] * H * 0.42;
      ctx.beginPath(); ctx.arc(Math.min(lx, W - 4), ly, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    };
    if (reduced()) { buf = buf.map((_, i) => (i % 70 === 40 ? 0.8 : 0)); draw(); return; }
    const tick = (t: number, dms: number) => {
      const dt = Math.min(0.05, dms / 1000);
      acc += dt * 140;
      while (acc >= step) {
        acc -= step;
        let v = Math.sin(t * 7) * 0.02 + (Math.random() - 0.5) * 0.03;
        if (spike > 0) { const k = spike; v += k > 0.66 ? (1 - k) * 3 : k > 0.33 ? -(0.66 - k) * 2.4 + 1 : k * 1.2; spike -= 0.09; }
        buf.shift(); buf.push(v);
        tags.forEach((g) => { g.x -= step; });
      }
      next -= dt;
      if (next <= 0) {
        spike = 1; next = 1.4 + Math.random() * 1.2;
        const el = document.createElement('span'); el.className = 'd4-pulse__tag'; el.textContent = EVENTS[ev++ % EVENTS.length];
        tagHost.appendChild(el); tags.push({ el, x: W - 6 });
      }
      for (let i = tags.length - 1; i >= 0; i--) {
        const g = tags[i];
        g.el.style.transform = `translate(${g.x.toFixed(0)}px, ${(H / 2 - H * 0.42).toFixed(0)}px)`;
        g.el.style.opacity = String(Math.min(1, g.x / (W * 0.3)));
        if (g.x < -200) { g.el.remove(); tags.splice(i, 1); }
      }
      draw();
    };
    ScrollTrigger.create({ trigger: box, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)) });
  });
}

// ---------- WATCH: one velocity marquee ----------
function startMarquee() {
  onPage(() => {
    const track = document.querySelector<HTMLElement>('[data-marquee-track]');
    if (!track || reduced()) return;
    const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
    onScroll(({ velocity }) => { const dir = velocity < 0 ? -1 : 1; gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(velocity) / 8, 5)), duration: 0.4, overwrite: true }); });
  });
}

// ---------- BUILD: a stitched preview follows the pointer, a different stitch per service ----------
function startStitch() {
  onPage(() => {
    const list = document.querySelector<HTMLElement>('[data-index]');
    const canvas = document.querySelector<HTMLCanvasElement>('[data-stitch-canvas]');
    if (!list || !canvas || isTouch() || reduced()) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = 260 * dpr; canvas.height = 320 * dpr;
    let kind = 0, prog = 0, active = false;
    const x = gsap.quickTo(canvas, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(canvas, 'y', { duration: 0.6, ease: 'power3.out' });
    const rot = gsap.quickTo(canvas, 'rotate', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0, px = 0, py = 0;
    const stitch = (k: number, p: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, 260, 320);
      ctx.fillStyle = '#f3f3ef'; ctx.fillRect(0, 0, 260, 320);
      ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const segs: [number, number, number, number][] = [];
      if (k === 0) { for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) { const x0 = 30 + c * 36, y0 = 30 + r * 30; segs.push([x0, y0, x0 + 18, y0 + 15], [x0 + 18, y0 + 15, x0 + 36, y0]); } }       // zigzag: testing
      else if (k === 1) { for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) { if (r === 5 && c === 3) continue; const x0 = 32 + c * 34, y0 = 34 + r * 33; segs.push([x0, y0, x0 + 20, y0 + 20], [x0 + 20, y0, x0, y0 + 20]); } } // cross-stitch with one gap: compliance
      else if (k === 2) { for (let r = 0; r < 7; r++) for (let i = 0; i < 22; i++) { const x0 = 20 + i * 10, y0 = 50 + r * 38 + (i % 7 === 3 ? -16 : 0); segs.push([x0, y0, x0 + 6, y0 + (i % 7 === 3 ? 16 : 0)]); } }  // running stitch with pulses: monitoring
      else if (k === 3) { for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { const x0 = 24 + c * 44 + (r % 2) * 22, y0 = 28 + r * 34; segs.push([x0, y0, x0 + 40, y0], [x0, y0, x0, y0 + 30]); } }                  // brick: infrastructure
      else { for (let a = 0; a < 60; a++) { const t = a / 60, r0 = 8 + t * 110, a0 = t * Math.PI * 9; const r1 = 8 + (a + 1) / 60 * 110, a1 = (a + 1) / 60 * Math.PI * 9; segs.push([130 + Math.cos(a0) * r0, 160 + Math.sin(a0) * r0, 130 + Math.cos(a1) * r1, 160 + Math.sin(a1) * r1]); } } // spiral: data
      const n = Math.floor(segs.length * p);
      ctx.beginPath(); for (let i = 0; i < n; i++) { const s = segs[i]; ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); } ctx.stroke();
    };
    const tick = () => { if (!active && prog <= 0) return; prog = Math.min(1, prog + 0.035); stitch(kind, prog); };
    gsap.ticker.add(tick);
    list.querySelectorAll<HTMLAnchorElement>('[data-stitch]').forEach((a) => a.addEventListener('pointerenter', () => {
      kind = +a.dataset.stitch!; prog = 0; active = true;
      gsap.to(canvas, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    }));
    const hide = () => { active = false; gsap.to(canvas, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'expo.out' }); };
    list.addEventListener('pointerleave', hide);
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; x(px + 170); y(py); rot(gsap.utils.clamp(-10, 10, (px - lastX) * 0.5)); lastX = px; }, { passive: true });
    onScroll(() => { if (!list.contains(document.elementFromPoint(px, py))) hide(); });
  });
}

// ---------- TALK: the thread signs the closing line ----------
function startSign() {
  onPage(() => {
    const sign = document.querySelector<SVGSVGElement>('[data-sign]');
    if (!sign) return;
    ScrollTrigger.create({ trigger: sign, start: 'top 85%', once: true, onEnter: () => sign.classList.add('is-signed') });
  });
}

void scrollState;
boot(() => {
  startRope();
  startTest();
  startWall();
  startPulse();
  startMarquee();
  startStitch();
  startSign();
  startButtons();
  startThread();
});
