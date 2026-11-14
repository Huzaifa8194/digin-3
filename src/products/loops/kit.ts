// Tiny drawing kit for the product loops: a fixed design space (1000 × 780) scaled to the canvas,
// beats with hard cuts, and a HUD so every loop reads like the UI it sits in.

export const W = 1000;
export const H = 780;

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** Local progress of t inside [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const out = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)); // expo.out
export const snap = (t: number) => 1 - Math.pow(1 - clamp(t), 4); // quart.out
export const back = (t: number) => { const c = 1.9; const x = clamp(t) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const C = {
  ink: '#eef3f9', soft: '#c9d3df', mut: '#7f8da0', dim: 'rgba(238,243,249,0.12)', line: 'rgba(238,243,249,0.18)',
  surface: '#0b1422', red: '#ff5a63', amber: '#ffb547', ok: '#7ee0a1',
};

type TextOpts = { size?: number; w?: number; color?: string; align?: CanvasTextAlign; mono?: boolean; alpha?: number; ls?: number; base?: CanvasTextBaseline };

export class Pen {
  constructor(public ctx: CanvasRenderingContext2D, public acc: string) {}
  text(s: string, x: number, y: number, o: TextOpts = {}) {
    const c = this.ctx;
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    c.fillStyle = o.color ?? C.ink;
    c.textAlign = o.align ?? 'left';
    c.textBaseline = o.base ?? 'alphabetic';
    const size = o.size ?? 24;
    c.font = o.mono ? `${o.w ?? 500} ${size}px "JetBrains Mono", ui-monospace, Consolas, monospace` : `${o.w ?? 800} ${size}px Manrope, Arial, sans-serif`;
    if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${(o.ls ?? (o.mono ? 0.06 : -0.045)) * size}px`;
    c.fillText(s, x, y);
    c.restore();
  }
  label(s: string, x: number, y: number, color = this.acc, align: CanvasTextAlign = 'left', size = 15) {
    this.text(s.toUpperCase(), x, y, { mono: true, size, color, align, w: 500 });
  }
  line(x1: number, y1: number, x2: number, y2: number, color = C.line, w = 2, p = 1) {
    const c = this.ctx;
    if (p <= 0) return;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
  }
  box(x: number, y: number, w: number, h: number, o: { r?: number; stroke?: string; fill?: string; lw?: number; alpha?: number } = {}) {
    const c = this.ctx;
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    c.beginPath(); c.roundRect(x, y, w, h, o.r ?? 10);
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.lw ?? 2; c.stroke(); }
    c.restore();
  }
  dot(x: number, y: number, r: number, color: string, alpha = 1, glow = 0) {
    const c = this.ctx;
    c.save(); c.globalAlpha *= alpha;
    if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.restore();
  }
  ring(x: number, y: number, r: number, color: string, w = 2, from = 0, to = 1, alpha = 1) {
    const c = this.ctx;
    if (to <= from) return;
    c.save(); c.globalAlpha *= alpha;
    c.beginPath(); c.arc(x, y, r, -Math.PI / 2 + from * Math.PI * 2, -Math.PI / 2 + to * Math.PI * 2);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); c.restore();
  }
  check(x: number, y: number, s: number, p: number, color = this.acc, w = 6) {
    const a = clamp(p * 2), b = clamp(p * 2 - 1);
    this.line(x - s * 0.5, y, x - s * 0.15, y + s * 0.35, color, w, a);
    if (b > 0) this.line(x - s * 0.15, y + s * 0.35, x + s * 0.55, y - s * 0.4, color, w, b);
  }
  cross(x: number, y: number, s: number, p: number, color = C.red, w = 6) {
    this.line(x - s, y - s, x + s, y + s, color, w, clamp(p * 2));
    this.line(x + s, y - s, x - s, y + s, color, w, clamp(p * 2 - 1));
  }
  /** Toggle switch, the product UIs' own control. on: 0..1 */
  toggle(x: number, y: number, on: number, color = this.acc, scale = 1) {
    const w = 52 * scale, h = 30 * scale;
    const c = this.ctx;
    c.save();
    c.beginPath(); c.roundRect(x, y, w, h, h / 2);
    c.fillStyle = on > 0.5 ? color : '#26303d'; c.globalAlpha = 0.35 + 0.65 * Math.max(on, 0.4); c.fill();
    c.globalAlpha = 1;
    c.beginPath(); c.arc(x + h / 2 + (w - h) * on, y + h / 2, h / 2 - 4 * scale, 0, Math.PI * 2);
    c.fillStyle = on > 0.5 ? '#fff' : '#8d97a5'; c.fill();
    c.restore();
  }
  /** Big kinetic headline: each line slams up from below its own clip. */
  slam(lines: string[], t: number, o: { size?: number; y?: number; accentLine?: number } = {}) {
    const size = o.size ?? 104;
    const lh = size * 0.98;
    const y0 = (o.y ?? H / 2) - ((lines.length - 1) * lh) / 2 + size * 0.34;
    const c = this.ctx;
    lines.forEach((s, i) => {
      const p = out(seg(t, i * 0.09, 0.45 + i * 0.09));
      const y = y0 + i * lh;
      c.save();
      c.beginPath(); c.rect(0, y - size * 0.95, W, size * 1.2); c.clip();
      const sc = 1.12 - 0.12 * p;
      c.translate(W / 2, y + (1 - p) * size * 0.9); c.scale(sc, sc);
      this.text(s, 0, 0, { size, align: 'center', color: i === o.accentLine ? this.acc : C.ink });
      c.restore();
    });
  }
}

export type Beat = { d: number; f: (p: Pen, t: number, time: number) => void };

const fmt = (s: number) => `00:${String(Math.floor(s)).padStart(2, '0')}.${String(Math.floor((s % 1) * 100)).padStart(2, '0')}`;

/** Plays a list of beats on a canvas. Hard cut + accent flash between beats, HUD on top. */
export class Loop {
  private ctx: CanvasRenderingContext2D;
  private pen: Pen;
  private total: number;
  private grid?: HTMLCanvasElement;
  t = 0;
  constructor(private canvas: HTMLCanvasElement, private beats: Beat[], private name: string, private acc: string) {
    this.ctx = canvas.getContext('2d')!;
    this.pen = new Pen(this.ctx, acc);
    this.total = beats.reduce((a, b) => a + b.d, 0);
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.grid = undefined;
    this.draw();
  }
  advance(dt: number) { this.t = (this.t + dt) % this.total; this.draw(); }
  /** A still frame for reduced motion: the given beat at its settled end. */
  still(beat = 1) { let t = 0; for (let i = 0; i < beat; i++) t += this.beats[i].d; this.t = t + this.beats[beat].d * 0.92; this.draw(); }

  private background(cw: number, ch: number) {
    if (!this.grid || this.grid.width !== cw || this.grid.height !== ch) {
      const g = document.createElement('canvas');
      g.width = cw; g.height = ch;
      const x = g.getContext('2d')!;
      x.fillStyle = C.surface; x.fillRect(0, 0, cw, ch);
      const step = Math.max(18, Math.round(cw / 34));
      x.fillStyle = 'rgba(238,243,249,0.07)';
      for (let i = step / 2; i < cw; i += step) for (let j = step / 2; j < ch; j += step) x.fillRect(i, j, 1.5, 1.5);
      const glow = x.createRadialGradient(cw * 0.6, ch * 0.45, 0, cw * 0.6, ch * 0.45, Math.max(cw, ch) * 0.7);
      glow.addColorStop(0, this.acc + '22'); glow.addColorStop(1, 'transparent');
      x.fillStyle = glow; x.fillRect(0, 0, cw, ch);
      this.grid = g;
    }
    this.ctx.drawImage(this.grid, 0, 0);
  }

  draw() {
    const { ctx: c, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.background(cw, ch);
    const s = Math.min(cw / W, ch / H);
    const ox = (cw - W * s) / 2, oy = (ch - H * s) / 2;
    c.setTransform(s, 0, 0, s, ox, oy);

    let acc = 0, i = 0;
    while (i < this.beats.length - 1 && this.t >= acc + this.beats[i].d) acc += this.beats[i++].d;
    const beat = this.beats[i];
    const lt = (this.t - acc) / beat.d;
    beat.f(this.pen, lt, this.t);

    // cut: an accent flash and a scan bar in the first ~90 ms of every beat
    const cut = (this.t - acc) / 0.09;
    if (cut < 1) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 0.22 * (1 - cut); c.fillStyle = this.acc; c.fillRect(0, 0, cw, ch);
      c.globalAlpha = 0.9 * (1 - cut); c.fillRect(0, ch * cut, cw, 3);
      c.restore();
    }

    // HUD
    const p = this.pen;
    p.label(`${this.name} / illustrative`, 40, 52, C.mut, 'left', 14);
    p.label(fmt(this.t), W - 40, 52, this.acc, 'right', 14);
    p.label(`${String(i + 1).padStart(2, '0')} / ${String(this.beats.length).padStart(2, '0')}`, 40, H - 34, C.mut, 'left', 14);
    let x = 150; const bw = W - 190, gap = 6;
    this.beats.forEach((b, k) => {
      const w = (b.d / this.total) * bw - gap;
      c.fillStyle = C.dim; c.fillRect(x, H - 44, w, 4);
      const f = k < i ? 1 : k === i ? lt : 0;
      c.fillStyle = this.acc; c.fillRect(x, H - 44, w * f, 4);
      x += w + gap;
    });
  }
}
