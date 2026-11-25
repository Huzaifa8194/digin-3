// Chapter 06: checks fall where you point and land in four columns, one per evidence layer.
// Landed balls are drawn through their column's pattern (the "goo" canvas); falling ones are
// faint white. Physics by matter.js on a fixed 60 Hz step, driven by the shared clock.
import type Matter from 'matter-js';
import { addTick } from './clock';
import { evidence } from './content';
import { dpr, reduced } from './device';
import { patternCanvas } from './patterns';

const FLOOR_FRAC = 0.5, TARGET_PER_COL = 25, PER_BALL = 4, MAX = 100, MIN_START = 5, MAX_START = 8, DIV = 8;
const HOLD_EVERY = 0.143, POP_DIE = 0.38, POP_IN = 0.42;
const backOut = (e: number) => { const s = 1.70158; return 1 + (s + 1) * (e - 1) ** 3 + s * (e - 1) ** 2; };

type Meta = { landed: boolean; color: string; scale: number; dying: boolean; dieT: number; idx: number; popT: number; popDelay: number };

export async function mountStats(root: HTMLElement, canvas: HTMLCanvasElement, goo: HTMLCanvasElement, counts: HTMLElement[]) {
  const { default: Mx } = (await import('matter-js')) as unknown as { default: typeof Matter };
  const { Engine, Composite, Bodies, Body, Events } = Mx;
  const still = reduced();
  const c = canvas.getContext('2d')!, g = goo.getContext('2d')!;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.4; engine.positionIterations = 12; engine.velocityIterations = 8;
  let W = 0, H = 0, floorY = 0, R = 1, rad = 24;
  let walls: Matter.Body[] = [];
  const balls: Matter.Body[] = [];
  const meta = new WeakMap<Matter.Body, Meta>();
  const score = [0, 0, 0, 0], shown = [0, 0, 0, 0];
  const props = { restitution: 0.3, friction: 0.04, frictionStatic: 0.2, frictionAir: 0.012, density: 0.0016 };
  const rMin = 0.6, rMax = 1.45;
  const radius = () => rad * (rMin + Math.random() * (rMax - rMin));
  const col = (x: number) => Math.min(3, Math.max(0, Math.floor(x / (W / 4))));
  const pats = evidence.cols.map((k) => patternCanvas(k.group, 256));
  const colors = evidence.cols.map((k) => (k.group === 'readers' ? '#f0452f' : k.group === 'hardening' ? '#f4c21b' : k.group === 'network' ? '#2a63e6' : '#f2b705'));
  let visible = false, inView = false, seen = 0;

  const remove = (b: Matter.Body) => { Composite.remove(engine.world, b); const i = balls.indexOf(b); if (i >= 0) balls.splice(i, 1); meta.delete(b); };
  const clearBalls = () => { for (const b of balls) Composite.remove(engine.world, b); balls.length = 0; };
  const layout = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    R = dpr(2, 2);
    canvas.width = goo.width = Math.floor(W * R); canvas.height = goo.height = Math.floor(H * R);
    floorY = H * FLOOR_FRAC;
    rad = Math.max(15, Math.min(48, Math.sqrt((0.68 * (W / 4) * (H - floorY)) / (TARGET_PER_COL * Math.PI))));
    if (walls.length) Composite.remove(engine.world, walls);
    walls = [
      Bodies.rectangle(W / 2, H + 40, W + 200, 80, { isStatic: true }),
      Bodies.rectangle(-40, H / 2, 80, H * 3, { isStatic: true }),
      Bodies.rectangle(W + 40, H / 2, 80, H * 3, { isStatic: true }),
      ...[0.25, 0.5, 0.75].map((f) => Bodies.rectangle(W * f, H / 2, DIV, H * 2, { isStatic: true })),
    ];
    Composite.add(engine.world, walls);
  };
  const seed = () => {
    for (let i = 0; i < 4; i++) {
      const n = MIN_START + Math.floor(Math.random() * (MAX_START - MIN_START + 1));
      const x0 = i * 0.25 * W + 8, x1 = (i + 1) * 0.25 * W - 8;
      let x = x0, y = H - 8, rowH = 0;
      for (let k = 0; k < n; k++) {
        const r = radius();
        if (x + r * 2 > x1 && x > x0) { x = x0; y -= rowH * 2 * 0.95; rowH = 0; }
        const b = Bodies.circle(x + r, y - r, r, props);
        meta.set(b, { landed: true, color: colors[i], scale: still ? 1 : 0, dying: false, dieT: 0, idx: i, popT: still ? POP_IN : 0, popDelay: 0.85 + k * 0.07 + Math.random() * 0.12 });
        balls.push(b); Composite.add(engine.world, b);
        x += r * 2 + 1; rowH = Math.max(rowH, r);
      }
      score[i] = n * PER_BALL;
      if (still) { shown[i] = score[i]; counts[i].textContent = String(score[i]); }
    }
  };
  layout(); seed();

  const kill = (b: Matter.Body) => {
    const m = meta.get(b); if (!m) return;
    m.dying = true; m.dieT = 0; b.isSensor = true;
    const s = Math.random() < 0.5 ? -1 : 1;
    Body.setVelocity(b, { x: s * (5 + Math.random() * 8), y: -(2 + Math.random() * 7) });
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.8);
  };
  const land = (b: Matter.Body, other: Matter.Body) => {
    const m = meta.get(b);
    if (!m || m.landed || m.dying || !(other === walls[0] || meta.get(other)?.landed)) return;
    if (b.position.y < floorY) { kill(b); return; }
    const i = col(b.position.x);
    m.landed = true; m.color = colors[i]; m.idx = i;
    score[i] = Math.min(MAX, score[i] + PER_BALL);
  };
  Events.on(engine, 'collisionStart', (e) => {
    for (const p of e.pairs) { if (meta.has(p.bodyA)) land(p.bodyA, p.bodyB); if (meta.has(p.bodyB)) land(p.bodyB, p.bodyA); }
  });

  const ptr = { x: 0, y: 0, inside: false, holding: false };
  let lastX = 0; const vel = { x: 0 }; let nextDrop = 0;
  const drop = (x: number, y: number) => {
    const r = radius();
    y = Math.min(y, floorY - rad * rMax * 2);
    const b = Bodies.circle(x, y, r, props);
    Body.setVelocity(b, { x: Math.max(-9, Math.min(9, vel.x * 0.8)), y: 1 + Math.random() });
    meta.set(b, { landed: false, color: '#fff', scale: 1, dying: false, dieT: 0, idx: -1, popT: POP_IN, popDelay: 0 });
    balls.push(b); Composite.add(engine.world, b);
    if (balls.length > 260) remove(balls[0]);
  };
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMove = (e: PointerEvent) => { const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.inside = true; };
  const onLeave = () => { ptr.inside = false; ptr.holding = false; };
  const onDown = (e: PointerEvent) => { const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.inside = ptr.holding = true; drop(p.x, p.y); nextDrop = performance.now() / 1000 + HOLD_EVERY; };
  const onUp = () => (ptr.holding = false);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerenter', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = window.setTimeout(() => { if (canvas.clientWidth !== W || canvas.clientHeight !== H) { layout(); clearBalls(); seed(); } }, 160); };
  addEventListener('resize', onResize);

  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; visible = e.intersectionRatio >= 0.35; root.classList.toggle('in', visible); }, { threshold: [0, 0.04, 0.35, 0.4] });
  io.observe(root);

  const step = 1000 / 60; let acc = 0;
  const off = addTick((_, dt) => {
    if (!inView) { acc = 0; return; }
    const t = performance.now() / 1000;
    vel.x = vel.x * 0.6 + (ptr.x - lastX) * 0.4; lastX = ptr.x;
    if ((ptr.holding || ptr.inside) && t >= nextDrop) { drop(ptr.x, ptr.y); nextDrop = t + (ptr.holding ? HOLD_EVERY : 0.5 + Math.random() * 0.3); }
    acc += dt * 1000;
    let n = 0;
    while (acc >= step && n < 5) { Engine.update(engine, step); acc -= step; n++; }
    if (acc > step) acc = 0;
    seen = visible ? seen + dt : 0;
    const dead: Matter.Body[] = [];
    for (const b of balls) { const m = meta.get(b)!; if (m.dying) { m.dieT += dt; m.scale = Math.max(0, 1 - m.dieT / POP_DIE); if (m.scale <= 0) dead.push(b); } }
    dead.forEach(remove);
    if (visible) for (const b of balls) {
      const m = meta.get(b)!;
      if (m.dying || m.popT >= POP_IN) continue;
      if (m.popDelay > 0) { m.popDelay -= dt; continue; }
      m.popT = Math.min(POP_IN, m.popT + dt); m.scale = backOut(m.popT / POP_IN);
    }
    if (visible && seen >= 0.75) for (let i = 0; i < 4; i++) if (shown[i] !== score[i]) {
      shown[i] += (score[i] - shown[i]) * Math.min(1, dt * 9);
      if (Math.abs(score[i] - shown[i]) < 0.5) shown[i] = score[i];
      counts[i].textContent = String(Math.round(shown[i]));
    }
    // asleep and settled: skip drawing
    if (seen > 1.6 && !ptr.inside && !ptr.holding && balls.every((b) => { const m = meta.get(b)!; return !m.dying && m.popT >= POP_IN && b.isSleeping; }) && shown.every((v, i) => v === score[i])) return;
    c.setTransform(R, 0, 0, R, 0, 0); c.clearRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((f, i) => {
      const k = Math.min(1, Math.max(0, (seen - 0.6 - i * 0.14) / 0.6)); if (k <= 0) return;
      const e = 1 - (1 - k) ** 3;
      c.beginPath(); c.moveTo(W * f, floorY); c.lineTo(W * f, floorY + (H - floorY) * e); c.stroke();
    });
    for (const b of balls) {
      const m = meta.get(b)!; if (m.landed) continue;
      const r = (b.circleRadius ?? rad) * m.scale; if (r < 0.5) continue;
      c.globalAlpha = m.dying ? 0.16 * m.scale : 0.16; c.beginPath(); c.arc(b.position.x, b.position.y, r, 0, Math.PI * 2); c.fillStyle = m.color; c.fill();
    }
    c.globalAlpha = 1;
    g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) {
      const x0 = (W / 4) * i;
      g.save(); g.beginPath(); let any = false;
      for (const b of balls) {
        const m = meta.get(b)!; if (!m.landed || m.idx !== i) continue;
        const r = (b.circleRadius ?? rad) * 1.09 * m.scale; if (r < 0.5) continue;
        g.moveTo(b.position.x + r, b.position.y); g.arc(b.position.x, b.position.y, r, 0, Math.PI * 2); any = true;
      }
      if (any) {
        g.clip();
        const top = floorY - rad * rMax * 3, w = W / 4, h = H - top, s = Math.max(w, h);
        g.drawImage(pats[i], x0 + (w - s) / 2, top + (h - s) / 2, s, s);
      }
      g.restore();
    }
  });
  return () => { off(); io.disconnect(); removeEventListener('pointerup', onUp); removeEventListener('resize', onResize); Composite.clear(engine.world, false); Engine.clear(engine); };
}
