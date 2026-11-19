// Generated artwork: one bold two-colour pattern per control group. Used for the spiral card
// backs, the crests on card fronts and in the Chapter 03 headline, the tool wheel and the
// physics balls in Chapter 06. Drawn once into canvases and cached.
import type { GroupId } from './content';

type Painter = (c: CanvasRenderingContext2D, s: number) => void;

export const palette: Record<GroupId, { bg: string; fg: string; glow: string }> = {
  uac: { bg: '#f2b705', fg: '#6b5636', glow: 'rgba(160,128,40,0.32)' },
  hardening: { bg: '#f4c21b', fg: '#e8432c', glow: 'rgba(220,90,40,0.3)' },
  scripts: { bg: '#e6c0f2', fg: '#5e4a3a', glow: 'rgba(160,110,170,0.3)' },
  powershell: { bg: '#8fb6ff', fg: '#1c2a57', glow: 'rgba(60,90,170,0.3)' },
  network: { bg: '#bfe0ff', fg: '#2a63e6', glow: 'rgba(60,110,220,0.3)' },
  readers: { bg: '#f0452f', fg: '#1a1a1a', glow: 'rgba(200,60,40,0.3)' },
  tools: { bg: '#86d7a4', fg: '#14532d', glow: 'rgba(40,120,70,0.3)' },
};

const painters: Record<GroupId, Painter> = {
  // Keyholes on a checker: the gatekeeper.
  uac(c, s) {
    const n = 4, u = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x + y) % 2) continue;
      const cx = x * u + u / 2, cy = y * u + u / 2;
      c.beginPath(); c.arc(cx, cy - u * 0.1, u * 0.2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(cx - u * 0.1, cy); c.lineTo(cx + u * 0.1, cy); c.lineTo(cx + u * 0.17, cy + u * 0.36); c.lineTo(cx - u * 0.17, cy + u * 0.36); c.closePath(); c.fill();
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!((x + y) % 2)) continue;
      c.beginPath(); c.roundRect(x * u + u * 0.08, y * u + u * 0.08, u * 0.84, u * 0.84, u * 0.18); c.fill();
    }
  },
  // Masonry: the mason.
  hardening(c, s) {
    const rows = 6, h = s / rows, w = s / 3, g = s * 0.018;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? -w / 2 : 0;
      for (let i = -1; i < 4; i++) { c.beginPath(); c.roundRect(off + i * w + g, r * h + g, w - g * 2, h - g * 2, g * 1.5); c.fill(); }
    }
  },
  // Big and small dots: lines of a script, read not run.
  scripts(c, s) {
    const n = 3, u = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      c.beginPath(); c.arc(x * u + u / 2, y * u + u / 2, u * 0.3, 0, Math.PI * 2); c.fill();
    }
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
      c.beginPath(); c.arc(x * u, y * u, u * 0.09, 0, Math.PI * 2); c.fill();
    }
  },
  // Chevrons: the prompt.
  powershell(c, s) {
    const rows = 4, h = s / rows;
    c.lineWidth = h * 0.22; c.lineJoin = 'miter'; c.strokeStyle = c.fillStyle as string;
    for (let r = 0; r < rows; r++) for (let i = -1; i < 4; i++) {
      const x = i * s / 3 + (r % 2 ? s / 6 : 0), y = r * h + h * 0.18;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + h * 0.42, y + h * 0.32); c.lineTo(x, y + h * 0.64); c.stroke();
    }
  },
  // Waves: traffic, held back.
  network(c, s) {
    const rows = 5, h = s / rows;
    c.lineWidth = h * 0.26; c.lineCap = 'round'; c.strokeStyle = c.fillStyle as string;
    for (let r = 0; r < rows; r++) {
      c.beginPath();
      for (let x = -10; x <= s + 10; x += 4) {
        const y = r * h + h / 2 + Math.sin((x / s) * Math.PI * 4 + r) * h * 0.22;
        x < -9 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
  },
  // Diamond checker: printed matter.
  readers(c, s) {
    const n = 5, u = s / n;
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
      if ((x + y) % 2) continue;
      const cx = x * u, cy = y * u;
      c.beginPath(); c.moveTo(cx, cy - u * 0.62); c.lineTo(cx + u * 0.62, cy); c.lineTo(cx, cy + u * 0.62); c.lineTo(cx - u * 0.62, cy); c.closePath(); c.fill();
    }
  },
  // Stripes and studs: a toolbox.
  tools(c, s) {
    const n = 6, u = s / n;
    c.save(); c.translate(s / 2, s / 2); c.rotate(-Math.PI / 4); c.translate(-s, -s);
    for (let i = 0; i < n * 3; i += 2) c.fillRect(i * u, 0, u, s * 2);
    c.restore();
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      c.beginPath(); c.arc((x + 0.5) * s / 3, (y + 0.5) * s / 3, u * 0.32, 0, Math.PI * 2);
      c.fillStyle = palette.tools.bg; c.fill(); c.lineWidth = u * 0.12; c.strokeStyle = palette.tools.fg; c.stroke();
    }
  },
};

const cache = new Map<string, HTMLCanvasElement>();
export function patternCanvas(id: GroupId, size = 512): HTMLCanvasElement {
  const key = `${id}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  c.fillStyle = palette[id].bg; c.fillRect(0, 0, size, size);
  c.fillStyle = palette[id].fg;
  painters[id](c, size);
  cache.set(key, cv);
  return cv;
}

/** The crest silhouette (rounded top, pointed bottom), same proportions as the reference's. */
export function crestPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const a = w * 0.16;
  c.beginPath();
  c.moveTo(x + a, y);
  c.lineTo(x + w - a, y);
  c.arcTo(x + w, y, x + w, y + a, a);
  c.lineTo(x + w, y + h * 0.5);
  c.quadraticCurveTo(x + w, y + h * 0.86, x + w / 2, y + h);
  c.quadraticCurveTo(x, y + h * 0.86, x, y + h * 0.5);
  c.lineTo(x, y + a);
  c.arcTo(x, y, x + a, y, a);
  c.closePath();
}

/** A crest as a data URL, for <img> use (headline crest, tool wheel). */
const urlCache = new Map<string, string>();
export function crestURL(id: GroupId, size = 160, glyph?: string): string {
  const key = `${id}:${size}:${glyph ?? ''}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  const h = Math.round(size * 1.05);
  cv.width = size; cv.height = h;
  const c = cv.getContext('2d')!;
  crestPath(c, 0, 0, size, h);
  c.save(); c.clip();
  c.drawImage(patternCanvas(id, 256), 0, 0, size, size * 1.05);
  if (glyph) {
    c.fillStyle = palette[id].bg;
    c.beginPath(); c.arc(size / 2, h * 0.46, size * 0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = palette[id].fg;
    c.font = `700 ${Math.round(size * 0.26)}px "SB Sans", system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(glyph, size / 2, h * 0.47);
  }
  c.restore();
  const url = cv.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}

/** SysBastion mark: a shield with a check, as in the film's title cards. */
export const markSVG = `<svg viewBox="0 0 24 26" aria-hidden="true"><path d="M12 1.2 2.6 4.6v7.1c0 6 3.9 10.9 9.4 13.1 5.5-2.2 9.4-7.1 9.4-13.1V4.6L12 1.2Z" fill="currentColor"/><path d="m7.4 13.1 3.2 3.2 6-6.4" fill="none" stroke="var(--mark-cut, #000)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The mark as a bitmap with a transparent check, for canvas and WebGL (loader, rays). */
export function markCanvas(size: number, color = '#000'): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = Math.round(size * 26 / 24);
  const c = cv.getContext('2d')!;
  c.scale(size / 24, size / 24);
  c.fillStyle = color;
  c.fill(new Path2D('M12 1.2 2.6 4.6v7.1c0 6 3.9 10.9 9.4 13.1 5.5-2.2 9.4-7.1 9.4-13.1V4.6L12 1.2Z'));
  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = 2.3; c.lineCap = 'round'; c.lineJoin = 'round';
  c.stroke(new Path2D('m7.4 13.1 3.2 3.2 6-6.4'));
  return cv;
}
