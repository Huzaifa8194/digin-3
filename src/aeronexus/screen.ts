// Phone screens for the AeroNexus page. Same drawing code as the film "The Handover"
// (aeronexus-promo/stage-src/world.ts), so the page and the film show the same device.
export const MODES = ['home', 'games', 'apps', 'kiosk', 'camblock', 'file', 'remote', 'dark', 'lost', 'wipe', 'setup'] as const;
export type Mode = (typeof MODES)[number];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
let lostLines = ['This phone belongs to', 'DigiInn360 Field Ops.', 'Please hand it to the', 'driver or call the office.'];
export function setLost(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean); const out: string[] = []; let line = '';
  for (const w of words) { if ((line + ' ' + w).trim().length > 22 && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line);
  lostLines = out.length ? out.slice(0, 5) : ['Locked by your', 'IT administrator.'];
}
export const SW = 420, SH = 880;
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
const APPS = [
  { n: 'Orders', c: '#f97316' }, { n: 'Maps', c: '#22c55e' }, { n: 'Camera', c: '#64748b' }, { n: 'Chat', c: '#3b82f6' },
  { n: 'Docs', c: '#eab308' }, { n: 'Scanner', c: '#a855f7' }, { n: 'Mail', c: '#ef4444' }, { n: 'Files', c: '#0ea5e9' },
  { n: 'Clock', c: '#475569' }, { n: 'Notes', c: '#f59e0b' }, { n: 'AeroNexus', c: 'teal' }, { n: 'Settings', c: '#334155' },
];
function glyph(c: CanvasRenderingContext2D, name: string, x: number, y: number, s: number, dim = false) {
  c.save(); c.translate(x, y); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = s * 0.09; c.lineCap = 'round'; c.lineJoin = 'round';
  if (dim) c.globalAlpha *= 0.55;
  const k = s / 100;
  switch (name) {
    case 'Camera': rr(c, -30 * k, -18 * k, 60 * k, 42 * k, 8 * k); c.stroke(); c.beginPath(); c.arc(0, 3 * k, 12 * k, 0, 7); c.stroke(); rr(c, -12 * k, -26 * k, 24 * k, 9 * k, 3 * k); c.fill(); break;
    case 'Maps': c.beginPath(); c.arc(0, -8 * k, 15 * k, Math.PI, 0); c.lineTo(0, 28 * k); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, -8 * k, 5 * k, 0, 7); c.fill(); break;
    case 'Chat': rr(c, -28 * k, -22 * k, 56 * k, 38 * k, 12 * k); c.stroke(); c.beginPath(); c.moveTo(-12 * k, 16 * k); c.lineTo(-18 * k, 28 * k); c.lineTo(2 * k, 16 * k); c.stroke(); break;
    case 'Orders': rr(c, -24 * k, -28 * k, 48 * k, 56 * k, 6 * k); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-12 * k, (-12 + i * 13) * k); c.lineTo(12 * k, (-12 + i * 13) * k); c.stroke(); } break;
    case 'Docs': c.beginPath(); c.moveTo(-20 * k, -28 * k); c.lineTo(8 * k, -28 * k); c.lineTo(22 * k, -14 * k); c.lineTo(22 * k, 28 * k); c.lineTo(-20 * k, 28 * k); c.closePath(); c.stroke(); break;
    case 'Scanner': for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(a * 26 * k, b * 12 * k); c.lineTo(a * 26 * k, b * 26 * k); c.lineTo(a * 12 * k, b * 26 * k); c.stroke(); } c.beginPath(); c.moveTo(-18 * k, 0); c.lineTo(18 * k, 0); c.stroke(); break;
    case 'Mail': rr(c, -28 * k, -20 * k, 56 * k, 40 * k, 6 * k); c.stroke(); c.beginPath(); c.moveTo(-26 * k, -16 * k); c.lineTo(0, 4 * k); c.lineTo(26 * k, -16 * k); c.stroke(); break;
    case 'Files': c.beginPath(); c.moveTo(-28 * k, -18 * k); c.lineTo(-8 * k, -18 * k); c.lineTo(-2 * k, -10 * k); c.lineTo(28 * k, -10 * k); c.lineTo(28 * k, 22 * k); c.lineTo(-28 * k, 22 * k); c.closePath(); c.stroke(); break;
    case 'Clock': c.beginPath(); c.arc(0, 0, 26 * k, 0, 7); c.stroke(); c.beginPath(); c.moveTo(0, -14 * k); c.lineTo(0, 0); c.lineTo(10 * k, 8 * k); c.stroke(); break;
    case 'Notes': for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-22 * k, (-20 + i * 13) * k); c.lineTo((i == 3 ? 4 : 22) * k, (-20 + i * 13) * k); c.stroke(); } break;
    case 'Settings': c.beginPath(); c.arc(0, 0, 11 * k, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * 18 * k, Math.sin(a) * 18 * k); c.lineTo(Math.cos(a) * 27 * k, Math.sin(a) * 27 * k); c.stroke(); } break;
    case 'Route': c.beginPath(); c.moveTo(-20 * k, 24 * k); c.bezierCurveTo(-20 * k, -4 * k, 20 * k, 8 * k, 20 * k, -18 * k); c.stroke(); c.beginPath(); c.arc(-20 * k, 24 * k, 6 * k, 0, 7); c.fill(); c.beginPath(); c.arc(20 * k, -22 * k, 7 * k, 0, 7); c.fill(); break;
    case 'Games': rr(c, -30 * k, -16 * k, 60 * k, 34 * k, 16 * k); c.stroke(); c.beginPath(); c.moveTo(-17 * k, 0); c.lineTo(-5 * k, 0); c.moveTo(-11 * k, -6 * k); c.lineTo(-11 * k, 6 * k); c.stroke(); c.beginPath(); c.arc(12 * k, -3 * k, 3.5 * k, 0, 7); c.arc(20 * k, 5 * k, 3.5 * k, 0, 7); c.fill(); break;
    case 'AeroNexus': { // the app icon: tethered device (logo C)
      rr(c, -22 * k, -32 * k, 26 * k, 46 * k, 7 * k); c.lineWidth = s * 0.07; c.stroke();
      c.setLineDash([0.1, 9 * k]); c.beginPath(); c.moveTo(4 * k, -20 * k); c.quadraticCurveTo(24 * k, -20 * k, 24 * k, 0); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(24 * k, 6 * k, 5.5 * k, 0, 7); c.fill(); break; }
  }
  c.restore();
}
function iconTile(c: CanvasRenderingContext2D, a: { n: string; c: string }, x: number, y: number, s: number, alpha = 1, dim = false) {
  if (alpha <= 0.01) return;
  c.save(); c.globalAlpha = alpha;
  if (a.c === 'teal') { const g = c.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); g.addColorStop(0, '#2dd4bf'); g.addColorStop(1, '#0f766e'); c.fillStyle = g; }
  else c.fillStyle = dim ? '#3a4456' : a.c;
  rr(c, x - s / 2, y - s / 2, s, s, s * 0.26); c.fill();
  glyph(c, a.n, x, y, s * 0.78, dim);
  c.fillStyle = 'rgba(255,255,255,.88)'; c.font = `600 ${Math.round(s * 0.2)}px Hanken Grotesk, sans-serif`; c.textAlign = 'center';
  c.fillText(a.n, x, y + s * 0.74);
  c.restore();
}
function statusBar(c: CanvasRenderingContext2D, time: string, cast = false) {
  c.fillStyle = '#fff'; c.font = '600 24px Hanken Grotesk, sans-serif'; c.textAlign = 'left'; c.fillText(time, 34, 46);
  c.textAlign = 'right'; c.fillText('▮▮▮  92%', SW - 30, 46);
  if (cast) { c.fillStyle = '#2dd4bf'; rr(c, SW / 2 - 60, 22, 120, 34, 17); c.fill(); c.fillStyle = '#05231f'; c.font = '700 18px Hanken Grotesk'; c.textAlign = 'center'; c.fillText('● Screen shared', SW / 2, 45); }
}
function wallpaper(c: CanvasRenderingContext2D, warm = 0) {
  const g = c.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, warm ? '#3a2a33' : '#123341'); g.addColorStop(0.55, '#101b2c'); g.addColorStop(1, '#0b1220');
  c.fillStyle = g; c.fillRect(0, 0, SW, SH);
}
export function drawScreen(c: CanvasRenderingContext2D, m: Mode, p: number, clock: number) {
  const hh = Math.floor(clock), mm = Math.round((clock - hh) * 60);
  const time = `${hh}:${String(mm).padStart(2, '0')}`;
  c.save(); c.clearRect(0, 0, SW, SH);
  const grid = (alphaOf: (i: number) => number, dimOf: (i: number) => boolean = () => false, extra?: () => void) => {
    wallpaper(c, m === 'games' ? 1 : 0); statusBar(c, time, m === 'remote');
    c.fillStyle = 'rgba(255,255,255,.92)'; c.font = '700 64px Hanken Grotesk, sans-serif'; c.textAlign = 'center'; c.fillText(time, SW / 2, 160);
    c.font = '500 20px Hanken Grotesk'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('Field device · Company owned', SW / 2, 194);
    APPS.forEach((a, i) => iconTile(c, a, 72 + (i % 4) * 92, 290 + Math.floor(i / 4) * 128, 66, alphaOf(i), dimOf(i)));
    extra && extra();
  };
  if (m === 'home') grid(() => 1);
  else if (m === 'games') {            // someone installs a game: a new icon pops onto the last row
    grid(() => 1, () => false, () => {
      const k = ease(p * 1.6); iconTile(c, { n: 'Games', c: '#e11d48' }, 72, 290 + 3 * 128, 66 * (0.6 + 0.4 * k), k);
      if (p > 0.3) { c.globalAlpha = clamp((p - 0.3) * 4); c.fillStyle = 'rgba(15,23,42,.92)'; rr(c, 34, 720, SW - 68, 92, 18); c.fill(); c.fillStyle = '#fbbf24'; c.font = '700 22px Hanken Grotesk'; c.textAlign = 'left'; c.fillText('Installing “Games”…', 60, 760); c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '500 18px Hanken Grotesk'; c.fillText('Unknown source · not approved', 60, 790); }
    });
  } else if (m === 'apps') {           // the admin's app policy lands: Games hidden, Scanner installed
    // p runs over 3.6 s from "Install": Route installs, then Games is removed, then Clock and Notes are hidden
    grid((i) => (APPS[i].n === 'Clock' || APPS[i].n === 'Notes') ? 1 - ease((p - 0.42) * 4) : 1, () => false, () => {
      const k = ease(p * 4); iconTile(c, { n: 'Route', c: '#14b8a6' }, 164, 290 + 3 * 128, 66 * (0.7 + 0.3 * k), k);
      const g = ease((p - 0.15) * 4); iconTile(c, { n: 'Games', c: '#e11d48' }, 72, 290 + 3 * 128, 66 * (1 - 0.35 * g), 1 - g);
    });
  } else if (m === 'kiosk') {          // one app, full screen, locked
    c.fillStyle = '#f8fafc'; c.fillRect(0, 0, SW, SH); c.fillStyle = '#0f766e'; c.fillRect(0, 0, SW, 120);
    c.fillStyle = '#fff'; c.font = '700 30px Hanken Grotesk'; c.textAlign = 'left'; c.fillText('Orders', 34, 86);
    for (let i = 0; i < 5; i++) { const y = 160 + i * 112; c.fillStyle = '#fff'; rr(c, 24, y, SW - 48, 96, 14); c.fill(); c.strokeStyle = '#e2e8f0'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#0f172a'; c.font = '700 22px Hanken Grotesk'; c.fillText(`Order #${2041 + i}`, 46, y + 40); c.fillStyle = '#64748b'; c.font = '500 18px Hanken Grotesk'; c.fillText(['Warehouse B · 12 items', 'Gate 4 · pickup', 'Store 17 · drop', 'Depot · return', 'Hub · 3 items'][i], 46, y + 70);
      c.fillStyle = i < 2 ? '#14b8a6' : '#cbd5e1'; rr(c, SW - 120, y + 30, 72, 34, 17); c.fill(); }
    const k = ease(p * 3); c.globalAlpha = k; c.fillStyle = '#0e1726'; rr(c, SW / 2 - 120, SH - 104, 240, 58, 29); c.fill();
    c.fillStyle = '#2dd4bf'; c.font = '700 22px Hanken Grotesk'; c.textAlign = 'center'; c.fillText('🔒  Kiosk mode', SW / 2, SH - 66); c.globalAlpha = 1;
  } else if (m === 'camblock') {
    grid(() => 1, (i) => APPS[i].n === 'Camera' && p > 0.25, () => {
      if (p > 0.25) { const x = 72 + 2 * 92, y = 290; c.fillStyle = '#0e1726'; c.beginPath(); c.arc(x + 26, y - 26, 17, 0, 7); c.fill(); c.strokeStyle = '#2dd4bf'; c.lineWidth = 3; c.beginPath(); c.arc(x + 26, y - 30, 6, Math.PI, 0); c.stroke(); c.fillStyle = '#2dd4bf'; c.fillRect(x + 18, y - 30, 16, 11); }
      const k = ease((p - 0.35) * 4); if (k > 0) { c.globalAlpha = k; c.fillStyle = 'rgba(15,23,42,.95)'; rr(c, 30, 700, SW - 60, 100, 18); c.fill(); c.fillStyle = '#2dd4bf'; c.font = '700 21px Hanken Grotesk'; c.textAlign = 'left'; c.fillText('Camera turned off', 56, 742); c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '500 18px Hanken Grotesk'; c.fillText('by your IT administrator', 56, 772); c.globalAlpha = 1; }
    });
  } else if (m === 'file') {
    grid(() => 1, (i) => APPS[i].n === 'Camera', () => {
      const k = ease(p * 3); if (k > 0) { c.save(); c.translate(0, (1 - k) * -120); c.globalAlpha = k; c.fillStyle = 'rgba(248,250,252,.97)'; rr(c, 24, 70, SW - 48, 118, 20); c.fill();
        c.fillStyle = '#14b8a6'; rr(c, 44, 96, 64, 64, 14); c.fill(); glyph(c, 'Files', 76, 128, 44);
        c.fillStyle = '#0f172a'; c.font = '700 21px Hanken Grotesk'; c.textAlign = 'left'; c.fillText('Field-Handbook.pdf', 124, 120); c.fillStyle = '#64748b'; c.font = '500 18px Hanken Grotesk'; c.fillText('Saved to Download/ · 2.4 MB', 124, 150); c.restore(); }
    });
  } else if (m === 'remote') {         // a stuck form; the admin taps Submit for them
    c.fillStyle = '#f8fafc'; c.fillRect(0, 0, SW, SH); c.fillStyle = '#0f766e'; c.fillRect(0, 0, SW, 120); statusBar(c, time, true);
    c.fillStyle = '#fff'; c.font = '700 28px Hanken Grotesk'; c.textAlign = 'left'; c.fillText('Delivery #2041', 34, 100);
    const rows = ['Recipient', 'Signature', 'Photo proof', 'Notes'];
    rows.forEach((r, i) => { const y = 160 + i * 104; c.fillStyle = '#64748b'; c.font = '600 18px Hanken Grotesk'; c.fillText(r, 34, y + 20); c.fillStyle = '#fff'; rr(c, 24, y + 32, SW - 48, 54, 12); c.fill(); c.strokeStyle = '#e2e8f0'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#0f172a'; c.font = '500 19px Hanken Grotesk'; c.fillText(['A. Khan', '✓ signed', '✓ 1 photo', 'Left at gate 4'][i], 44, y + 66); });
    const done = p > 0.55; c.fillStyle = done ? '#16a34a' : '#14b8a6'; rr(c, 24, 640, SW - 48, 70, 16); c.fill(); c.fillStyle = '#fff'; c.font = '700 24px Hanken Grotesk'; c.textAlign = 'center'; c.fillText(done ? '✓ Submitted' : 'Submit', SW / 2, 684);
    if (p > 0.38 && p < 0.9) { const k = clamp((p - 0.38) / 0.3); c.strokeStyle = `rgba(20,184,166,${1 - k})`; c.lineWidth = 5; c.beginPath(); c.arc(SW / 2, 675, 20 + k * 70, 0, 7); c.stroke(); }
  } else if (m === 'dark') { c.fillStyle = '#05080e'; c.fillRect(0, 0, SW, SH); }
  else if (m === 'lost') {             // Lost Mode: locked, ringing, the admin's message
    c.fillStyle = '#070b13'; c.fillRect(0, 0, SW, SH);
    const k = ease(p * 4);
    c.globalAlpha = k; c.strokeStyle = '#2dd4bf'; c.lineWidth = 12; c.beginPath(); c.arc(SW / 2, 250, 40, Math.PI, 0); c.stroke();
    c.fillStyle = '#2dd4bf'; rr(c, SW / 2 - 64, 250, 128, 104, 16); c.fill(); c.fillStyle = '#070b13'; c.beginPath(); c.arc(SW / 2, 292, 13, 0, 7); c.fill(); c.fillRect(SW / 2 - 5, 296, 10, 30);
    c.fillStyle = '#fff'; c.font = '800 38px Hanken Grotesk'; c.textAlign = 'center'; c.fillText('Lost Mode', SW / 2, 430);
    c.fillStyle = 'rgba(255,255,255,.82)'; c.font = '500 23px Hanken Grotesk';
    lostLines.forEach((l, i) => c.fillText(l, SW / 2, 490 + i * 34));
    c.fillStyle = 'rgba(45,212,191,.16)'; rr(c, 60, 680, SW - 120, 64, 32); c.fill(); c.fillStyle = '#2dd4bf'; c.font = '700 22px Hanken Grotesk'; c.fillText('🔔  Ringing', SW / 2, 720); c.globalAlpha = 1;
  } else if (m === 'wipe') {
    c.fillStyle = '#070b13'; c.fillRect(0, 0, SW, SH); c.fillStyle = '#fff'; c.font = '700 30px Hanken Grotesk'; c.textAlign = 'center'; c.fillText('Erasing device', SW / 2, 380);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '500 20px Hanken Grotesk'; c.fillText('Apps, accounts and data', SW / 2, 418);
    c.fillStyle = '#1e293b'; rr(c, 70, 470, SW - 140, 12, 6); c.fill(); c.fillStyle = '#2dd4bf'; rr(c, 70, 470, (SW - 140) * ease(p), 12, 6); c.fill();
    c.fillStyle = '#2dd4bf'; c.font = '700 22px Hanken Grotesk'; c.fillText(`${Math.round(ease(p) * 100)}%`, SW / 2, 530);
  } else if (m === 'setup') {
    const g = c.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#0f2b30'); g.addColorStop(1, '#070b13'); c.fillStyle = g; c.fillRect(0, 0, SW, SH);
    c.fillStyle = '#fff'; c.font = '700 54px Hanken Grotesk'; c.textAlign = 'center'; c.fillText('Hello', SW / 2, 420); c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '500 22px Hanken Grotesk'; c.fillText('Factory settings restored', SW / 2, 466);
  }
  c.restore();
}
