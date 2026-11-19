// The monitor's picture: one 2D canvas redrawn only when the driver moves it.
import * as THREE from 'three';
import { MODULES, BOOT_LINES } from './data';
import { drawShieldPath } from './scene';

const CW = 1600, CH = 900, BAR = 54;
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = 'Archivo, system-ui, sans-serif';

export type ScreenState = { power: number; boot: number; menu: number; mod: number; time: number };

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createScreen(base: string) {
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const c = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const imgs = new Map<string, HTMLImageElement>();
  const loads = MODULES.map((m) => new Promise<void>((res) => {
    if (imgs.has(m.img)) return res();
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(); im.onerror = () => res();
    im.src = `${base}${m.img}`;
    imgs.set(m.img, im);
  }));
  const ready = Promise.all(loads);

  let lastKey = '';

  function bar(title: string, a: number) {
    c.globalAlpha = a;
    c.fillStyle = '#101216'; c.fillRect(0, 0, CW, BAR);
    c.fillStyle = 'rgba(233,238,243,.08)'; c.fillRect(0, BAR - 1, CW, 1);
    c.strokeStyle = '#35d0f0'; c.lineWidth = 3; drawShieldPath(c, 34, BAR / 2, 14); c.stroke();
    c.fillStyle = '#e9eef3'; c.font = `700 22px ${SANS}`; c.textBaseline = 'middle';
    c.fillText('AEGIS-SHIELD', 60, BAR / 2 + 1);
    c.fillStyle = 'rgba(233,238,243,.5)'; c.font = `500 18px ${MONO}`;
    c.fillText(title, 250, BAR / 2 + 1);
    c.textAlign = 'right';
    c.fillText('Mi713 · 6 endpoints · last 7 days', CW - 28, BAR / 2 + 1);
    c.textAlign = 'left';
    c.globalAlpha = 1;
  }

  function off(p: number) {
    const g = c.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, '#0d1013'); g.addColorStop(0.5, '#050607'); g.addColorStop(1, '#0a0c0e');
    c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    if (p > 0) {
      // Power-on: a bright line that opens into the picture.
      const h = CH * ss(0.0, 1, p);
      c.fillStyle = `rgba(53,208,240,${0.5 * (1 - p)})`;
      c.fillRect(0, CH / 2 - Math.max(2, h / 2), CW, Math.max(4, h));
    }
  }

  function boot(b: number) {
    c.fillStyle = '#06080a'; c.fillRect(0, 0, CW, CH);
    const a = ss(0, 0.15, b);
    c.globalAlpha = a;
    c.strokeStyle = '#35d0f0'; c.lineWidth = 6;
    drawShieldPath(c, 220, 250, 88); c.stroke();
    drawShieldPath(c, 220, 250, 56); c.fillStyle = 'rgba(53,208,240,.85)'; c.fill();
    c.fillStyle = '#e9eef3'; c.font = `800 74px ${SANS}`; c.textBaseline = 'alphabetic';
    c.fillText('AEGIS-SHIELD', 350, 250);
    c.fillStyle = 'rgba(233,238,243,.55)'; c.font = `500 24px ${MONO}`;
    c.fillText('threat hunting and endpoint defence · Digiinn360', 354, 296);
    const n = Math.floor(ss(0.12, 0.85, b) * BOOT_LINES.length + 0.001);
    c.font = `500 25px ${MONO}`;
    for (let i = 0; i < n; i++) {
      const y = 420 + i * 38;
      const line = BOOT_LINES[i];
      c.fillStyle = i === BOOT_LINES.length - 1 ? '#ff4d3d' : '#35d0f0';
      c.fillText(i === BOOT_LINES.length - 1 ? '[ !! ]' : '[ ok ]', 140, y);
      c.fillStyle = 'rgba(233,238,243,.82)';
      c.fillText(line, 260, y);
    }
    // progress
    c.fillStyle = 'rgba(233,238,243,.1)'; c.fillRect(140, 850, CW - 280, 4);
    c.fillStyle = '#35d0f0'; c.fillRect(140, 850, (CW - 280) * ss(0.05, 0.9, b), 4);
    c.globalAlpha = 1;
  }

  function menu(m: number, time: number) {
    c.fillStyle = '#07090c'; c.fillRect(0, 0, CW, CH);
    bar('Hunting console', 1);
    c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(233,238,243,.55)'; c.font = `500 22px ${MONO}`; c.textAlign = 'center';
    c.fillText('Signed in as analyst · 235 detections waiting', CW / 2, 160);
    c.fillStyle = '#e9eef3'; c.font = `800 64px ${SANS}`;
    c.fillText('Where do we start?', CW / 2, 236);
    const cols = 4, tw = 300, th = 210, gap = 26;
    const x0 = (CW - (cols * tw + (cols - 1) * gap)) / 2, y0 = 300;
    const hot = Math.floor(time * 1.2) % MODULES.length;
    MODULES.forEach((mod, i) => {
      const a = ss(i * 0.06, i * 0.06 + 0.4, m);
      const x = x0 + (i % cols) * (tw + gap), y = y0 + Math.floor(i / cols) * (th + gap) + (1 - a) * 30;
      c.globalAlpha = a;
      const on = i === hot;
      c.fillStyle = on ? 'rgba(53,208,240,.14)' : 'rgba(233,238,243,.04)';
      c.fillRect(x, y, tw, th);
      c.strokeStyle = on ? '#35d0f0' : 'rgba(233,238,243,.14)'; c.lineWidth = on ? 3 : 1.5;
      c.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      c.textAlign = 'left';
      c.fillStyle = on ? '#35d0f0' : 'rgba(233,238,243,.45)'; c.font = `500 20px ${MONO}`;
      c.fillText(String(i + 1).padStart(2, '0'), x + 24, y + 42);
      c.fillStyle = '#e9eef3'; c.font = `800 38px ${SANS}`;
      c.fillText(mod.tab, x + 24, y + th - 34);
      c.textAlign = 'center';
    });
    c.globalAlpha = 1; c.textAlign = 'left';
  }

  function module(i: number, t: number, first: boolean, last: boolean) {
    const m = MODULES[i];
    const im = imgs.get(m.img);
    c.fillStyle = '#1b1d21'; c.fillRect(0, 0, CW, CH);
    const fadeIn = first ? 1 : ss(0, 0.07, t);
    const fadeOut = last ? 1 : 1 - ss(0.93, 1, t);
    const a = fadeIn * fadeOut;
    if (im && im.complete && im.naturalWidth) {
      const aw = CW, ah = CH - BAR, ar = aw / ah;
      // Whole dashboard, fitted by width.
      let fw = m.w, fh = m.w / ar;
      if (fh > m.h) { fh = m.h; fw = fh * ar; }
      const full = [(m.w - fw) / 2, 0, fw, fh];
      // Evidence rect grown to the screen's aspect.
      let [fx, fy, fW, fH] = m.focus;
      if (fW / fH > ar) { const nh = fW / ar; fy -= (nh - fH) / 2; fH = nh; } else { const nw = fH * ar; fx -= (nw - fW) / 2; fW = nw; }
      fx = Math.max(0, Math.min(m.w - fW, fx)); fy = Math.max(0, Math.min(m.h - fH, fy));
      const z = ss(0.22, 0.62, t);
      const sx = full[0] + (fx - full[0]) * z, sy = full[1] + (fy - full[1]) * z;
      const sw = full[2] + (fW - full[2]) * z, sh = full[3] + (fH - full[3]) * z;
      c.globalAlpha = a;
      c.drawImage(im, sx, sy, sw, sh, 0, BAR, aw, ah);
      // Pin the evidence before the zoom, frame it after.
      const k = aw / sw;
      const [ex, ey, ew, eh] = m.focus;
      const rx = (ex - sx) * k, ry = BAR + (ey - sy) * k, rw = ew * k, rh = eh * k;
      const pin = ss(0.08, 0.2, t) * (1 - ss(0.85, 0.95, t));
      if (pin > 0) {
        c.globalAlpha = a * pin;
        c.fillStyle = 'rgba(5,6,8,.45)';
        c.fillRect(0, BAR, aw, Math.max(0, ry - BAR));
        c.fillRect(0, ry + rh, aw, CH - (ry + rh));
        c.fillRect(0, ry, Math.max(0, rx), rh);
        c.fillRect(rx + rw, ry, aw - (rx + rw), rh);
        c.strokeStyle = '#35d0f0'; c.lineWidth = 4;
        const L = 34;
        const corner = (x: number, y: number, dx: number, dy: number) => { c.beginPath(); c.moveTo(x + dx * L, y); c.lineTo(x, y); c.lineTo(x, y + dy * L); c.stroke(); };
        corner(rx + 3, ry + 3, 1, 1); corner(rx + rw - 3, ry + 3, -1, 1); corner(rx + 3, ry + rh - 3, 1, -1); corner(rx + rw - 3, ry + rh - 3, -1, -1);
      }
    }
    c.globalAlpha = 1;
    bar(`${String(i + 1).padStart(2, '0')} / ${m.tab}`, 1);
    if (a < 1) { c.fillStyle = `rgba(7,9,12,${1 - a})`; c.fillRect(0, BAR, CW, CH - BAR); }
  }

  function finish() {
    // Scanlines and a soft vignette sell the glass.
    c.fillStyle = 'rgba(0,0,0,.07)';
    for (let y = 0; y < CH; y += 4) c.fillRect(0, y, CW, 1);
    const v = c.createRadialGradient(CW / 2, CH / 2, CH * 0.45, CW / 2, CH / 2, CW * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    c.fillStyle = v; c.fillRect(0, 0, CW, CH);
  }

  function render(s: ScreenState) {
    const menuTick = s.menu > 0 && s.mod <= 0 ? Math.floor(s.time * 1.2) : 0;
    const key = [s.power.toFixed(3), s.boot.toFixed(3), s.menu.toFixed(3), s.mod.toFixed(4), menuTick].join('|');
    if (key === lastKey) return;
    lastKey = key;
    if (s.mod > 0) {
      const n = MODULES.length;
      const i = Math.min(n - 1, Math.floor(s.mod));
      const t = Math.min(1, s.mod - i);
      module(i, t, false, i === n - 1);
    } else if (s.menu > 0) menu(s.menu, s.time);
    else if (s.boot > 0) boot(s.boot);
    else off(s.power);
    finish();
    tex.needsUpdate = true;
  }

  return { tex, render, ready, invalidate: () => { lastKey = ''; } };
}
