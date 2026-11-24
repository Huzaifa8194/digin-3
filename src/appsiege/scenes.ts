// The film's eight shots, rebuilt as code-drawn product UI (AppSiege's dark console palette).
// Every scene draws into a 1200 x 800 design space and loops on its own clock; the same
// functions feed the 3D cards, the film cloud in the hero and the full-size card detail.
// HotBite is the fictional demo app from the film; the numbers are the film's demo values.

type G = CanvasRenderingContext2D;
export type Scene = (g: G, t: number) => void;   // t: seconds

export const SW = 1200, SH = 800;
const C = {
  bg: '#0a1122', bg2: '#070c18', panel: '#111a2e', line: 'rgba(140,160,220,0.18)', input: '#16203a',
  ink: '#e8edf7', ink2: '#aab4c8', ink3: '#6f7a92', peri: '#8ea6ff', periD: '#5f72c8',
  gold: '#f3d68a', goldBg: '#8a6a1c', red: '#e5384f', redD: '#b3001f', rail: '#e0b43a', teal: '#7fe3d2',
  purple: '#6d28d9', lav: '#b4a6ff', green: '#4ade80', white: '#f7f8fb',
};
const SANS = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const loop = (t: number, p: number) => (t % p) / p;

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function box(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
}
function txt(g: G, s: string, x: number, y: number, size: number, color: string, opt: { w?: number; font?: string; align?: CanvasTextAlign } = {}) {
  g.font = `${opt.w ?? 400} ${size}px ${opt.font ?? SANS}`; g.fillStyle = color; g.textAlign = opt.align ?? 'left'; g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}
const typed = (s: string, p: number) => s.slice(0, Math.round(s.length * clamp(p)));
function bgFill(g: G, tint = C.bg) {
  const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, tint); gr.addColorStop(1, C.bg2);
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
  const r = g.createRadialGradient(SW * 0.5, SH * 0.35, 0, SW * 0.5, SH * 0.35, SW * 0.6);
  r.addColorStop(0, 'rgba(120,140,255,0.10)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, SW, SH);
}
function term(g: G, s: string, x: number, y: number, p: number, t: number) {
  g.fillStyle = C.rail; g.fillRect(x - 16, y - 20, 3, 28);
  const shown = typed(s, p);
  txt(g, shown, x, y, 19, C.ink2, { font: MONO });
  g.font = `400 19px ${MONO}`;
  const w = g.measureText(shown).width;
  if (Math.floor(t * 2.2) % 2 === 0 || p < 1) { g.fillStyle = C.peri; g.fillRect(x + w + 4, y - 18, 10, 22); }
}
function check(g: G, x: number, y: number, s: number, col: string) {
  g.strokeStyle = col; g.lineWidth = s * 0.18; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.38, y + s * 0.36); g.lineTo(x + s, y - s * 0.42); g.stroke();
}
function phone(g: G, x: number, y: number, w: number, h: number, lit: number) {
  box(g, x, y, w, h, w * 0.16, '#0d1426', `rgba(160,180,255,${0.25 + lit * 0.5})`);
  box(g, x + w * 0.3, y + h * 0.04, w * 0.4, h * 0.03, 4, '#05080f');
  if (lit > 0.01) {
    g.save(); g.globalAlpha = lit;
    box(g, x + w * 0.07, y + h * 0.09, w * 0.86, h * 0.84, w * 0.1, C.white);
    box(g, x + w * 0.13, y + h * 0.2, w * 0.74, h * 0.2, 10, '#d9202f');
    txt(g, 'HOT & TASTY', x + w * 0.18, y + h * 0.29, w * 0.085, '#fff', { w: 800 });
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(x + w * 0.7, y + h * 0.31, w * 0.11, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) box(g, x + w * 0.13, y + h * (0.47 + i * 0.14), w * 0.74, h * 0.11, 8, '#f1f2f6');
    g.restore();
  } else {
    for (let i = 0; i < 4; i++) box(g, x + w * 0.2, y + h * (0.25 + i * 0.13), w * (0.6 - (i % 2) * 0.2), h * 0.035, 4, 'rgba(160,180,255,0.18)');
  }
}

// 1: upload --------------------------------------------------------------------------------
const s1: Scene = (g, t) => {
  const p = loop(t, 7);
  bgFill(g);
  term(g, '$ appsiege run com.hotbite.customer --agents static,dynamic,ai', 70, 78, seg(p, 0, 0.3), t);
  const n = 5, pw = 150, ph = 300, gap = 40, x0 = (SW - (n * pw + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const lit = i === 2 ? eo(seg(p, 0.3, 0.45)) : 0;
    const lift = i === 2 ? -20 * lit : 0;
    phone(g, x0 + i * (pw + gap), 190 + lift, pw, ph, lit);
  }
  // upload bar
  const up = seg(p, 0.45, 0.8);
  box(g, 300, 560, 600, 64, 14, C.panel, C.line);
  txt(g, 'hotbite.apk', 330, 600, 20, C.teal, { font: MONO });
  box(g, 520, 586, 360, 10, 5, C.input);
  if (up > 0) box(g, 520, 586, Math.max(10, 360 * eo(up)), 10, 5, C.peri);
  // agents start
  ['STATIC', 'DYNAMIC', 'AI-ASSISTED'].forEach((a, i) => {
    const on = seg(p, 0.8 + i * 0.04, 0.84 + i * 0.04);
    box(g, 360 + i * 170, 660, 150, 40, 20, on > 0 ? 'rgba(142,166,255,0.18)' : 'rgba(255,255,255,0.03)', on > 0 ? C.peri : C.line);
    txt(g, a + (on >= 1 ? '  ✓' : ''), 435 + i * 170, 686, 14, on > 0 ? C.ink : C.ink3, { align: 'center', font: MONO });
  });
  txt(g, 'Android APK  /  iOS IPA  /  up to 200 MB', SW / 2, 760, 16, C.ink3, { align: 'center', font: MONO });
};

// 2: static analysis -------------------------------------------------------------------------
const CHECKS = ['Hardcoded Secrets & API Keys', 'Network Security & Cleartext Traffic', 'Weak Cryptography Detection', 'Manifest & Entitlement Flags', 'Dangerous Permissions & Exported Components', 'Binary & Native String Extraction', 'Tracker & Anti-VM Detection', 'Certificate Analysis'];
const ICON = ['#f2c14e', '#5aa8ff', '#f2c14e', '#c7cde0', '#f2c14e', '#d9a066', '#b4a6ff', '#e9c27a'];
const s2: Scene = (g, t) => {
  const p = loop(t, 8);
  bgFill(g);
  box(g, 50, 50, 1100, 700, 22, C.panel, C.line);
  txt(g, 'Static Analysis', 86, 112, 30, C.ink, { w: 700 });
  txt(g, 'Upload an APK or IPA file to scan for critical vulnerabilities (Max: 200 MB).', 86, 148, 17, C.ink2);
  g.fillStyle = C.line; g.fillRect(86, 170, 1028, 1.5);
  const scan = p * 9.2;
  CHECKS.forEach((c, i) => {
    const y = 192 + i * 64, done = scan > i + 1, act = scan > i && scan <= i + 1;
    box(g, 86, y, 560, 52, 8, act ? 'rgba(142,166,255,0.16)' : '#182239');
    g.fillStyle = act ? C.peri : C.periD; g.fillRect(86, y, 4, 52);
    box(g, 106, y + 15, 22, 22, 5, ICON[i]);
    txt(g, c, 146, y + 33, 17, act || done ? C.ink : C.ink2);
    if (done) check(g, 604, y + 28, 18, C.green);
    if (act) { g.fillStyle = 'rgba(142,166,255,0.55)'; g.fillRect(86, y + 48, 560 * (scan - i), 3); }
  });
  box(g, 690, 192, 424, 60, 14, '#8ea6ff'); txt(g, 'Upload APK or IPA', 902, 230, 19, '#0b1124', { w: 700, align: 'center' });
  txt(g, 'hotbite.apk', 902, 282, 17, C.teal, { align: 'center', font: MONO });
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  box(g, 690, 306, 424, 56, 14, `rgba(95,114,200,${0.75 + pulse * 0.25})`); txt(g, scan < 8.4 ? 'Running deep static analysis...' : 'Run Deep Static Analysis', 902, 341, 18, '#0b1124', { w: 600, align: 'center' });
  const n = Math.min(8, Math.floor(scan));
  txt(g, 'eight checks', 690, 412, 18, C.ink2, { font: MONO });
  box(g, 690, 428, 424, 8, 4, C.input);
  for (let i = 0; i < n; i++) box(g, 690 + i * 53, 428, 50, 8, 4, C.peri);
  box(g, 690, 470, 424, 58, 12, '#7a5d18'); txt(g, 'Start Dynamic Testing (Live)', 902, 506, 18, C.gold, { w: 600, align: 'center' });
  box(g, 690, 542, 424, 58, 12, C.redD); txt(g, 'Cancel Dynamic Test', 902, 578, 18, '#fff', { w: 700, align: 'center' });
};

// 3: protections -------------------------------------------------------------------------------
const PROT = ['Root checks', 'Jailbreak checks', 'Emulator checks', 'SSL pinning', 'Flutter obfuscation'];
const s3: Scene = (g, t) => {
  // each defence is found, then gets past, one after another (every state only moves forward,
  // so the baked time map can play it)
  const p = loop(t, 7.5);
  bgFill(g);
  term(g, '> dynamic: 5 app protections detected', 70, 78, 1, t);
  txt(g, 'Gets past ', 600, 190, 46, C.ink, { w: 700, align: 'right' });
  txt(g, 'every defence.', 600, 190, 46, C.peri, { w: 700 });
  let done = 0;
  PROT.forEach((name, i) => {
    const y = 250 + i * 84, found = seg(p, 0.04 + i * 0.03, 0.08 + i * 0.03), past = seg(p, 0.25 + i * 0.13, 0.31 + i * 0.13);
    if (past >= 1) done++;
    box(g, 250, y, 700, 66, 33, past > 0.5 ? 'rgba(142,166,255,0.16)' : 'rgba(255,255,255,0.035)', past > 0.5 ? C.peri : C.line);
    box(g, 274, y + 17, 32, 32, 8, past > 0.5 ? C.peri : '#1b2440');
    if (past > 0.5) check(g, 281, y + 34, 18, '#0b1124');
    txt(g, name, 330, y + 43, 26, found > 0 ? C.ink : C.ink3, { w: 600 });
    const tag = past > 0.5 ? 'bypassed' : found > 0.5 ? 'detected' : '';
    if (tag) { const col = past > 0.5 ? C.green : C.gold; box(g, 790, y + 17, 136, 32, 16, past > 0.5 ? 'rgba(74,222,128,0.12)' : 'rgba(243,214,138,0.12)', col); txt(g, tag, 858, y + 39, 16, col, { align: 'center', font: MONO }); }
  });
  for (let i = 0; i < 5; i++) box(g, 470 + i * 56, 694, 44, 6, 3, i < done ? C.peri : 'rgba(142,166,255,0.2)');
  txt(g, 'protections bypassed', 600, 744, 19, C.ink2, { align: 'center', font: MONO });
};

// 4: dynamic agent: form + live findings log ------------------------------------------------------
const FIELDS = [['Name', 'Test User 07', 'full_name'], ['Email', 'qa.07@hotbite.test', 'email'], ['Phone No', '0300 0000 007', 'phone'], ['Password', '••••••••••', 'password']];
const s4: Scene = (g, t) => {
  const p = loop(t, 9);
  bgFill(g);
  txt(g, 'It uses your app ', 70, 92, 34, C.ink, { w: 700 });
  g.font = `700 34px ${SANS}`; const w0 = g.measureText('It uses your app ').width;
  txt(g, 'like a person would.', 70 + w0, 92, 34, C.peri, { w: 700 });
  // form
  box(g, 70, 140, 560, 620, 20, C.white);
  box(g, 102, 172, 20, 20, 10, '#d9202f'); txt(g, 'HotBite', 134, 189, 17, '#111', { w: 700 });
  txt(g, 'com.hotbite.customer', 600, 189, 13, '#9aa0ad', { align: 'right', font: MONO });
  txt(g, 'Create your account', 102, 244, 30, '#111', { w: 700 });
  const log: [string, string][] = [];
  FIELDS.forEach(([lab, val, key], i) => {
    const a = 0.08 + i * 0.18, fill = seg(p, a + 0.03, a + 0.13), y = 276 + i * 100;
    txt(g, lab, 102, y, 14, '#6b7280', { w: 600 });
    const active = p > a && p < a + 0.16;
    box(g, 102, y + 10, 496, 52, 10, '#f5f6f9', active ? '#8ea6ff' : '#e3e6ee');
    txt(g, typed(val, fill), 120, y + 44, 19, '#111');
    if (fill >= 1) { box(g, 494, y + 22, 92, 28, 14, '#e8f8ee'); txt(g, '✓ verified', 540, y + 41, 13, '#18a058', { align: 'center', w: 600 }); }
    if (active) { box(g, 440, y + 66, 150, 26, 6, C.peri); txt(g, '● APPSIEGE AGENT', 515, y + 84, 12, '#0b1124', { align: 'center', w: 700, font: MONO }); }
    if (p > a) log.push([`Field: '${lab}' (${key})`, C.ink2]);
    if (fill >= 1) log.push([`Filled '${key}' (verified)`, C.ink]);
    if (i === 2 && p > a + 0.15) log.push(['Requirement check: still empty', C.red], ["  REQUIRED password 'Password'", C.red]);
  });
  const sub = p > 0.84;
  box(g, 102, 690, 496, 50, 12, sub ? '#d9202f' : '#f0b3b8'); txt(g, 'Create account', 350, 722, 18, '#fff', { w: 700, align: 'center' });
  if (sub) log.push(['POST /auth/register -> 201', C.green]);
  // log
  box(g, 668, 140, 462, 620, 18, '#0d1528', C.line);
  txt(g, 'Findings · live', 696, 186, 20, C.ink, { w: 700 });
  [['STATIC ✓', C.teal], ['DYNAMIC ●', C.gold], ['AI-ASSISTED', C.lav]].forEach(([s, c], i) => { box(g, 696 + i * 130, 204, 120, 28, 6, 'rgba(255,255,255,0.05)', c as string); txt(g, s as string, 756 + i * 130, 223, 12, c as string, { align: 'center', font: MONO }); });
  g.fillStyle = C.rail; g.fillRect(696, 252, 3, 486);
  log.slice(-14).forEach(([s, c], i) => { box(g, 712, 262 + i * 34, 10, 10, 2, c === C.red ? C.red : C.peri); txt(g, s, 732, 273 + i * 34, 15, c, { font: MONO }); });
};

// 5: approval ----------------------------------------------------------------------------------------
const s5: Scene = (g, t) => {
  const p = loop(t, 6.5), sw = eo(seg(p, 0.5, 0.62));
  bgFill(g);
  txt(g, 'Risky step? ', 600 - 170, 230, 42, C.ink, { w: 700, align: 'right' });
  txt(g, 'It asks you first.', 430, 230, 42, C.peri, { w: 700 });
  box(g, 200, 300, 800, 74, 14, C.panel, C.line);
  box(g, 226, 322, 130, 30, 6, C.goldBg); txt(g, 'ACTIVE TEST', 291, 343, 14, C.gold, { align: 'center', font: MONO, w: 500 });
  txt(g, 'Replay', 376, 345, 19, C.ink); txt(g, 'GET /orders/{id}', 446, 345, 19, C.peri, { font: MONO }); txt(g, 'as another user?', 640, 345, 19, C.ink);
  if (p > 0.64) txt(g, '✓ Approved', 976, 345, 17, C.green, { align: 'right', w: 600 });
  // segmented control
  box(g, 350, 450, 500, 110, 55, 'rgba(255,255,255,0.04)', C.line);
  const tx = 360 + sw * 240;
  box(g, tx, 460, 240, 90, 45, C.white);
  txt(g, 'Hold', 480, 519, 30, sw < 0.5 ? '#0b1124' : 'rgba(232,237,247,0.45)', { w: 700, align: 'center' });
  txt(g, 'Approve', 720, 519, 30, sw >= 0.5 ? '#0b1124' : 'rgba(232,237,247,0.45)', { w: 700, align: 'center' });
  // pointer
  const cx = 520 + eo(seg(p, 0.25, 0.48)) * 210, cy = 560 + Math.sin(seg(p, 0.25, 0.48) * Math.PI) * -30;
  const press = p > 0.48 && p < 0.55 ? 0.85 : 1;
  g.save(); g.translate(cx, cy); g.scale(press * 1.4, press * 1.4);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36); g.lineTo(19, 34); g.lineTo(13, 21); g.lineTo(23, 21); g.closePath();
  g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#0b1124'; g.lineWidth = 2; g.stroke(); g.restore();
  txt(g, 'Nothing that changes real data runs until you approve it.', 600, 660, 18, C.ink3, { align: 'center' });
};

// 6 + 7: endpoint matrix, then a critical lock ------------------------------------------------------
const EPS = ['POST /auth/login', 'POST /auth/register', 'GET /orders/{id}', 'GET /orders', 'PUT /cart', 'GET /profile', 'POST /payments', 'GET /addresses', 'POST /coupons'];
function matrix(g: G, wave: number, dim: number, hitRow = -1, hitCol = -1) {
  const x0 = 380, y0 = 230, dx = 42, dy = 52;
  txt(g, 'TEST CASES ->', x0 - 6, y0 - 30, 12, C.ink3, { font: MONO });
  EPS.forEach((e, r) => {
    txt(g, e, x0 - 30, y0 + r * dy + 6, 17, r === hitRow ? C.red : `rgba(200,208,230,${1 - dim * 0.6})`, { align: 'right', font: MONO });
    for (let c = 0; c < 17; c++) {
      const ph = wave - (c + r * 0.6) * 0.9;
      const on = clamp(ph), flash = Math.exp(-Math.pow(ph - 0.5, 2) * 3) * (ph > 0 ? 1 : 0);
      const x = x0 + c * dx, y = y0 + r * dy;
      const hit = r === hitRow && c === hitCol;
      g.beginPath(); g.arc(x, y, hit ? 9 : 6 + flash * 2, 0, Math.PI * 2);
      g.fillStyle = hit ? C.red : on > 0 ? `rgba(${142 + flash * 100},${166 + flash * 80},255,${(0.35 + on * 0.55 + flash * 0.3) * (1 - dim * 0.7)})` : 'rgba(142,166,255,0.12)';
      g.fill();
    }
  });
}
const s6: Scene = (g, t) => {
  const p = loop(t, 7);
  bgFill(g);
  txt(g, 'Every endpoint. ', 70, 100, 38, C.ink, { w: 700 });
  g.font = `700 38px ${SANS}`; const w0 = g.measureText('Every endpoint. ').width;
  txt(g, 'Every test case.', 70 + w0, 100, 38, C.peri, { w: 700 });
  txt(g, '2,304', 1130, 100, 40, C.ink, { align: 'right', font: MONO });
  txt(g, 'REQUESTS SENT', 1130, 126, 12, C.ink3, { align: 'right', font: MONO });
  matrix(g, p * 34, 0);
};
const s7: Scene = (g, t) => {
  const p = loop(t, 6.5), lock = eo(seg(p, 0.15, 0.5));
  bgFill(g);
  txt(g, '2,304', 1130, 100, 40, C.ink, { align: 'right', font: MONO }); txt(g, 'REQUESTS SENT', 1130, 126, 12, C.ink3, { align: 'right', font: MONO });
  matrix(g, 40, 0.65, 2, 12);
  const hx = 380 + 12 * 42, hy = 230 + 2 * 52, s = 26 + (1 - lock) * 160;
  g.strokeStyle = C.red; g.lineWidth = 3;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.beginPath(); g.moveTo(hx + sx * s, hy + sy * (s - 12)); g.lineTo(hx + sx * s, hy + sy * s); g.lineTo(hx + sx * (s - 12), hy + sy * s); g.stroke();
  }
  if (lock > 0.98) {
    g.beginPath(); g.arc(hx, hy, 22 + Math.sin(t * 6) * 3, 0, Math.PI * 2); g.fillStyle = 'rgba(229,56,79,0.25)'; g.fill();
    const a = seg(p, 0.52, 0.6);
    g.save(); g.globalAlpha = a;
    box(g, hx - 280, hy - 130, 380, 82, 12, '#151b2e', 'rgba(229,56,79,0.6)');
    box(g, hx - 262, hy - 114, 92, 24, 5, C.redD); txt(g, 'CRITICAL', hx - 216, hy - 97, 13, '#fff', { align: 'center', font: MONO, w: 600 });
    txt(g, 'AS-01', hx - 158, hy - 97, 13, C.ink2, { font: MONO });
    txt(g, 'Broken object-level authorization', hx - 262, hy - 64, 19, C.ink, { w: 600 });
    g.restore();
  }
};

// 8: report ----------------------------------------------------------------------------------------
const s8: Scene = (g, t) => {
  const p = loop(t, 9);
  bgFill(g);
  box(g, 90, 60, 1020, 700, 18, C.white);
  box(g, 90, 60, 1020, 52, 18, '#f1f2f7'); g.fillStyle = '#f1f2f7'; g.fillRect(90, 92, 1020, 20);
  box(g, 114, 74, 24, 24, 6, C.purple); txt(g, 'AppSiege', 148, 92, 16, '#111', { w: 700 }); txt(g, '/  Reports  /  HotBite', 228, 92, 15, '#8a8fa0');
  box(g, 980, 72, 108, 30, 8, '#111827'); txt(g, 'Export PDF', 1034, 92, 14, '#fff', { align: 'center', w: 600 });
  const r = (a: number) => seg(p, a, a + 0.08);
  txt(g, 'Security assessment: HotBite Food Delivery', 140, 170, 30, '#111', { w: 700 });
  txt(g, 'com.hotbite.customer  ·  Android & iOS', 140, 198, 15, '#6b7280', { font: MONO });
  g.save(); g.globalAlpha = r(0.05);
  txt(g, '38', 140, 268, 52, '#111', { w: 800 }); txt(g, '/100', 206, 268, 18, '#8a8fa0');
  box(g, 270, 238, 84, 30, 15, '#fde8ea'); txt(g, 'Grade D', 312, 259, 14, '#c81e3a', { align: 'center', w: 700 });
  [['2 Critical', '#c81e3a'], ['3 High', '#e07a1f'], ['4 Medium', '#c9a227'], ['2 Low', '#3b82f6'], ['1 Info', '#6b7280']].forEach(([s, c], i) => { g.beginPath(); g.arc(388 + i * 118, 252, 6, 0, Math.PI * 2); g.fillStyle = c; g.fill(); txt(g, s, 400 + i * 118, 258, 15, '#374151', { w: 600 }); });
  g.restore();
  g.save(); g.globalAlpha = r(0.15);
  box(g, 140, 300, 660, 40, 8, '#eef0ff');
  box(g, 152, 309, 86, 22, 5, '#c81e3a'); txt(g, 'CRITICAL', 195, 325, 12, '#fff', { align: 'center', font: MONO, w: 600 });
  txt(g, 'AS-01 · Broken object-level authorization', 252, 327, 19, '#111', { w: 700 });
  g.restore();
  const ev = r(0.25);
  box(g, 140, 360, 920, 86, 10, '#0f1424');
  txt(g, typed('GET /orders/1043     as: test user B', ev), 162, 394, 16, '#c9d1ff', { font: MONO });
  txt(g, typed("200 OK   body holds test user A's order, address and phone", seg(p, 0.3, 0.4)), 162, 426, 16, '#8ef0c0', { font: MONO });
  const lines: [string, string, number][] = [
    ['IMPACT', 'Anyone signed in can read other customers’ orders by changing the id.', 0.42],
    ['FIX', 'Check order ownership on the server; return 404 for foreign ids.', 0.52],
    ['RETEST', 'Replay as test user B: foreign ids must return 404.', 0.62],
  ];
  lines.forEach(([k, v, a], i) => {
    const y = 486 + i * 62;
    txt(g, k, 140, y, 12, '#8a8fa0', { font: MONO, w: 600 });
    txt(g, typed(v, seg(p, a, a + 0.08)), 140, y + 26, 19, '#111');
  });
  g.save(); g.globalAlpha = r(0.74);
  box(g, 140, 680, 70, 22, 5, '#e07a1f'); txt(g, 'HIGH', 175, 696, 12, '#fff', { align: 'center', font: MONO, w: 600 });
  txt(g, 'AS-02 · Session token readable from device storage', 224, 698, 18, '#111', { w: 700 });
  g.restore();
};

export const SCENES: Scene[] = [s1, s2, s3, s4, s5, s6, s7, s8];
/** Loop length of each scene, in seconds. */
export const PERIODS = [7, 8, 7.5, 9, 6.5, 7, 6.5, 9];

/** A canvas that one scene draws into; `draw(t)` repaints it. */
/** The film cloud's source: the eight shots in turn. */
export const reelScene: Scene = (g, t) => { const k = Math.floor(t / 4.6) % SCENES.length; SCENES[k](g, (t % 4.6) + 1.2); };
export const sceneById = (id: number): Scene => (id < 0 ? reelScene : SCENES[id]);

/** Paint a scene into any 2D context of size w x h. `flip` draws it upside down, which is what
 *  WebGL wants from an ImageBitmap (bitmaps cannot be flipped on upload). */
export function paint(g: G, w: number, h: number, scene: Scene, t: number, flip = false) {
  const sx = w / SW, sy = h / SH;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = C.bg2; g.fillRect(0, 0, w, h);
  const s = Math.min(sx, sy), ox = (w - SW * s) / 2, oy = (h - SH * s) / 2;
  if (flip) g.setTransform(s, 0, 0, -s, ox, h - oy); else g.setTransform(s, 0, 0, s, ox, oy);
  scene(g, t);
}

/** A main-thread canvas for one scene (the card detail, and the fallback when workers are missing). */
export class SceneCanvas {
  canvas = document.createElement('canvas');
  g: G;
  constructor(public scene: Scene, w = SW, h = SH, public flip = false) {
    this.canvas.width = w; this.canvas.height = h;
    this.g = this.canvas.getContext('2d')!;
  }
  draw(t: number) { paint(this.g, this.canvas.width, this.canvas.height, this.scene, t, this.flip); }
}
