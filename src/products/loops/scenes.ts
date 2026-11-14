// The five product loops. Every beat states something the product's own site says; names and
// values inside the frames are illustrative (the HUD says so). Beats are 0.6 to 1.2 s: fast cuts.
import { type Beat, C, H, W, back, clamp, out, rng, seg, snap } from './kit';

const pick = <T,>(arr: T[], t: number, per: number) => arr[Math.floor(t / per) % arr.length];

/* ---------------- ShadowAD ---------------- */
const adNodes = (() => {
  const r = rng(7);
  return Array.from({ length: 22 }, (_, i) => ({ x: 120 + r() * 760, y: i < 11 ? 210 + r() * 150 : 450 + r() * 170 }));
})();
const adPath = [{ x: 170, y: 560, l: 'Initial foothold' }, { x: 420, y: 470, l: 'Weak permission' }, { x: 610, y: 300, l: 'Entra ID pivot' }, { x: 840, y: 520, l: 'Domain Admin' }];
function adGraph(p: import('./kit').Pen, prog: number, cut = 0) {
  p.line(80, 405, 920, 405, C.dim, 2);
  p.label('Entra ID', 80, 190, C.mut); p.label('On-prem AD', 80, 690, C.mut);
  adNodes.forEach((n, i) => { const m = adNodes[(i * 7) % adNodes.length]; p.line(n.x, n.y, m.x, m.y, 'rgba(238,243,249,0.06)', 1); p.dot(n.x, n.y, 4, C.mut, 0.5); });
  for (let i = 0; i < adPath.length - 1; i++) {
    const a = adPath[i], b = adPath[i + 1];
    const lp = clamp(prog * (adPath.length - 1) - i);
    const broken = cut > 0 && i === 0;
    p.line(a.x, a.y, b.x, b.y, broken ? C.mut : p.acc, 5, lp);
  }
  adPath.forEach((n, i) => {
    const on = prog * (adPath.length - 1) >= i - 0.02;
    p.dot(n.x, n.y, on ? 13 : 7, on ? (i === adPath.length - 1 ? C.red : p.acc) : C.mut, 1, on ? 24 : 0);
    if (on) p.label(n.l, n.x, n.y - 26, i === adPath.length - 1 ? C.red : C.ink, 'center', 16);
  });
}
export const shadowad: Beat[] = [
  { d: 0.75, f: (p, t) => p.slam(['Find the path.'], t, { size: 118 }) },
  { d: 1.15, f: (p, t) => { adGraph(p, snap(seg(t, 0.05, 0.85))); p.label('01 / Exploit: a working path to privilege', 80, 750 - 40, p.acc); } },
  { d: 0.9, f: (p, t) => {
    const list = ['Kerberoasting', 'AS-REP roasting', 'Shadow Credentials', 'NTLM relay', 'AD CS abuse', 'Delegation / RBCD', 'GPO / SYSVOL secrets', 'Entra ID pivots', 'Password spraying', 'SCCM abuse'];
    const s = pick(list, t, 0.085);
    p.label('Attack techniques, tested in chains', W / 2, 300, C.mut, 'center');
    p.text(s, W / 2 + Math.sin(t * 90) * 3, 430, { size: 86, align: 'center' });
    p.line(200, 480, 800, 480, p.acc, 4, t);
  } },
  { d: 0.8, f: (p, t) => {
    const n = 1 + Math.round(out(t) * 16);
    p.ring(W / 2, 395, 190, C.dim, 10); p.ring(W / 2, 395, 190, p.acc, 10, 0, n / 17);
    p.text(`ESC${n}`, W / 2, 430, { size: 112, align: 'center' });
    p.label('AD CS escalation cases, ESC1 to ESC17', W / 2, 650, C.soft, 'center');
  } },
  { d: 0.9, f: (p, t) => {
    p.label('Operator controls: you decide what runs', 120, 210, C.mut);
    const rows: [string, string, string][] = [['Passive, read-only', 'Auto', p.acc], ['Needs sign-off', 'Approval', C.amber], ['Out of scope', 'Blocked', C.red]];
    rows.forEach(([a, b, col], i) => {
      const k = back(seg(t, i * 0.12, 0.45 + i * 0.12));
      const x = 120 + (1 - k) * 500, y = 260 + i * 130;
      p.box(x, y, 760, 100, { stroke: C.line, fill: '#0f1b2c', alpha: clamp(k * 1.4) });
      p.text(a, x + 36, y + 62, { size: 34, alpha: clamp(k * 1.4) });
      p.box(x + 560, y + 26, 170, 48, { r: 24, fill: col, alpha: clamp(k * 1.4) * 0.18 });
      p.text(b, x + 645, y + 60, { size: 24, w: 700, color: col, align: 'center', alpha: clamp(k * 1.4) });
    });
  } },
  { d: 1.1, f: (p, t) => {
    adGraph(p, 1, 1);
    const k = snap(seg(t, 0.05, 0.4));
    p.cross(295, 515, 26 * k, k);
    const s = back(seg(t, 0.3, 0.7));
    p.text('Prove it’s closed.', W / 2, 140, { size: 64, align: 'center', alpha: clamp(s * 1.5) });
    p.label('04 / Retest: route to Domain Admin closed', 80, 710, C.ok);
  } },
];

/* ---------------- SysBastion ---------------- */
const sbControls = ['UAC enforcement', 'SmartScreen', 'Data Execution Prevention', 'AutoRun and AutoPlay off', 'SMB1 and SMB2 off', 'NetBIOS off', 'Safe DLL search order', 'DCOM off', 'File extensions visible'];
function sbPanel(p: import('./kit').Pen, onAt: (i: number) => number, title: string, original = 0) {
  p.box(150, 120, 700, 560, { fill: '#0f1b2c', stroke: C.line });
  p.text(title, 190, 175, { size: 26 });
  sbControls.forEach((s, i) => {
    const y = 210 + i * 51;
    p.line(190, y, 810, y, C.dim, 1);
    p.text(s, 190, y + 34, { size: 22, w: 600, color: C.soft });
    if (original > 0) p.label(i % 2 ? 'Enabled' : 'Off', 600, y + 33, C.ok, 'right', 14);
    p.toggle(740, y + 11, onAt(i));
  });
}
export const sysbastion: Beat[] = [
  { d: 0.7, f: (p, t) => p.slam(['Deny by default.'], t, { size: 112 }) },
  { d: 1.0, f: (p, t) => {
    let n = 0;
    sbPanel(p, (i) => { const v = snap(seg(t, 0.08 + i * 0.07, 0.2 + i * 0.07)); if (v > 0.5) n++; return v; }, 'One-click hardening');
    p.label(`${n} of 9 controls · on`, 810, 175, p.acc, 'right');
  } },
  { d: 0.85, f: (p, t) => {
    const ext = ['.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta', '.scr', '.pif', '.reg', '.jar', '.bat', '.cmd', '.ps1'];
    p.text('14 risky file types.', W / 2, 200, { size: 56, align: 'center' });
    ext.forEach((e, i) => {
      const col = i % 7, row = Math.floor(i / 7);
      const x = 95 + col * 118, y = 300 + row * 140;
      const k = snap(seg(t, 0.12 + i * 0.035, 0.3 + i * 0.035));
      p.box(x, y, 100, 100, { fill: '#0f1b2c', stroke: k > 0.5 ? 'rgba(255,90,99,0.6)' : C.line });
      p.text(e, x + 50, y + 60, { size: 26, mono: true, align: 'center', color: k > 0.5 ? C.mut : C.ink, ls: 0 });
      p.line(x + 14, y + 72, x + 86, y + 28, C.red, 4, k);
    });
    p.label('Opened as text, never run', W / 2, 640, C.soft, 'center');
  } },
  { d: 0.9, f: (p, t) => {
    const n = Math.round(out(seg(t, 0, 0.6)) * 35);
    p.text(String(n), W / 2, 420, { size: 260, align: 'center' });
    p.label('Abused tools · no internet', W / 2, 500, p.acc, 'center', 18);
    const tools = ['PowerShell', 'certutil', 'mshta', 'rundll32', 'regsvr32', 'bitsadmin', 'Word', 'Excel'];
    p.text(pick(tools, t, 0.07), W / 2, 590, { size: 34, mono: true, align: 'center', color: C.soft, ls: 0 });
  } },
  { d: 0.95, f: (p, t) => {
    p.box(110, 330, 150, 110, { stroke: C.ink, fill: '#0f1b2c' }); p.label('Endpoint', 185, 480, C.mut, 'center');
    p.ring(860, 385, 60, C.ink, 3); p.label('Internet', 860, 480, C.mut, 'center');
    p.line(500, 190, 500, 590, C.red, 6, snap(seg(t, 0, 0.3))); p.label('Defender Firewall', 500, 630, C.red, 'center', 13);
    p.line(600, 190, 600, 590, p.acc, 6, snap(seg(t, 0.12, 0.42))); p.label('Filtering Platform', 600, 170, p.acc, 'center', 13);
    for (let i = 0; i < 7; i++) {
      const ph = (t * 2.4 + i / 7) % 1;
      const x = 270 + ph * 220, y = 260 + i * 45;
      p.dot(Math.min(x, 490), y, 6, ph > 0.92 ? C.red : C.amber, ph > 0.95 ? 0.4 : 1);
    }
    p.text('Enforced twice.', W / 2, 720 - 20, { size: 40, align: 'center', alpha: clamp(seg(t, 0.4, 0.6) * 2) });
  } },
  { d: 1.0, f: (p, t) => {
    sbPanel(p, (i) => 1 - snap(seg(t, 0.1 + (8 - i) * 0.06, 0.22 + (8 - i) * 0.06)), 'Restore all applied', 1);
    p.label('Exact original · not defaults', 810, 175, C.ok, 'right');
  } },
  { d: 0.75, f: (p, t) => p.slam(['Reversible', 'by design.'], t, { size: 100, accentLine: 1 }) },
];

/* ---------------- AEGIS-SHIELD ---------------- */
export const aegis: Beat[] = [
  { d: 1.0, f: (p, t) => {
    const cx = W / 2, cy = 400;
    [80, 160, 240].forEach((r) => p.ring(cx, cy, r, C.dim, 2));
    p.line(cx - 260, cy, cx + 260, cy, C.dim, 1); p.line(cx, cy - 260, cx, cy + 260, C.dim, 1);
    const a = t * Math.PI * 4 - Math.PI / 2;
    const c = p.ctx;
    const g = c.createConicGradient(a - 0.9, cx, cy);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.14, p.acc + '55'); g.addColorStop(0.15, 'transparent');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 240, 0, Math.PI * 2); c.fill();
    p.line(cx, cy, cx + Math.cos(a) * 240, cy + Math.sin(a) * 240, p.acc, 3);
    const r = rng(3);
    for (let i = 0; i < 9; i++) {
      const ba = r() * Math.PI * 2, br = 50 + r() * 180;
      const seen = ((a - ba) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) < 2.2 || t > 0.5;
      p.dot(cx + Math.cos(ba) * br, cy + Math.sin(ba) * br, i === 4 ? 9 : 6, i === 4 ? C.amber : p.acc, seen ? 1 : 0.15, i === 4 ? 20 : 0);
    }
    p.label('Endpoint telemetry · live', 120, 700, p.acc);
  } },
  { d: 1.0, f: (p, t) => {
    const words = ['Spot', 'Scope', 'Trace', 'Contain'];
    const active = Math.min(3, Math.floor(t * 4.4));
    words.forEach((w, i) => {
      const k = back(seg(t, i * 0.2, 0.2 + i * 0.2));
      const y = 210 + i * 125;
      p.label(`0${i + 1}`, 180, y + 10, i <= active ? p.acc : C.mut);
      p.text(w + '.', 250, y + 30 + (1 - k) * 40, { size: 92, color: i === active ? (i === 3 ? C.amber : C.ink) : C.mut, alpha: clamp(k * 1.5) });
    });
  } },
  { d: 0.95, f: (p, t) => {
    const procs: [string, number, number, string][] = [['explorer.exe', 150, 210, C.soft], ['cmd.exe', 290, 330, C.soft], ['powershell.exe', 430, 450, C.amber], ['rundll32.exe', 570, 570, C.red]];
    procs.forEach(([n, x, y, col], i) => {
      const k = snap(seg(t, i * 0.16, 0.18 + i * 0.16));
      if (i) { const [, px, py] = procs[i - 1]; p.line(px + 20, py + 34, px + 20, y + 20, C.line, 2, k); p.line(px + 20, y + 20, x - 4, y + 20, C.line, 2, k); }
      p.box(x, y - 8, 300, 56, { stroke: col, fill: '#0f1b2c', alpha: k });
      p.text(n, x + 20, y + 30, { size: 24, mono: true, color: col, alpha: k, ls: 0 });
    });
    if (t > 0.75) p.label('Flagged · process origin', 600, 680, C.red, 'center');
    p.label('Trace: process tree', 120, 160, C.mut);
  } },
  { d: 0.85, f: (p, t) => {
    p.label('Startup and autorun hunting · ranked', 120, 170, C.mut);
    const rows: [string, string, boolean][] = [['Run key', 'updater_svc.exe', false], ['Scheduled task', 'sync_helper', true], ['Service', 'PrintSpooler', false], ['Startup folder', 'tmp_launch.vbs', true], ['WMI consumer', 'evt_handler', true]];
    rows.forEach(([a, b, bad], i) => {
      const k = snap(seg(t, i * 0.08, 0.3 + i * 0.08));
      const y = 210 + i * 92;
      p.box(120 + (1 - k) * 300, y, 760, 74, { fill: bad ? 'rgba(255,181,71,0.08)' : '#0f1b2c', stroke: bad ? 'rgba(255,181,71,0.5)' : C.line, alpha: k });
      p.text(a, 150 + (1 - k) * 300, y + 46, { size: 22, w: 600, color: C.soft, alpha: k });
      p.text(b, 420 + (1 - k) * 300, y + 46, { size: 22, mono: true, color: C.ink, alpha: k, ls: 0 });
      p.label(bad ? 'Untrusted' : 'Trusted', 850 + (1 - k) * 300, y + 44, bad ? C.amber : C.ok, 'right', 14);
    });
  } },
  { d: 0.6, f: (p, t) => {
    p.label('Mapped to MITRE ATT&CK', W / 2, 300, C.mut, 'center');
    p.text(t < 0.5 ? 'Credential theft' : 'Defense tampering', W / 2, 430, { size: 84, align: 'center', color: t < 0.5 ? C.ink : C.amber });
  } },
  { d: 0.9, f: (p, t) => {
    const cx = W / 2, cy = 380;
    const r = rng(11);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, x = cx + Math.cos(a) * 300, y = cy + Math.sin(a) * 200; p.dot(x, y, 8, C.mut); p.line(cx, cy, x, y, t > 0.35 ? 'rgba(255,90,99,0.25)' : C.line, 2, 1 - (t > 0.35 ? snap(seg(t, 0.35, 0.6)) : 0) * r()); }
    p.box(cx - 90, cy - 60, 180, 120, { fill: '#0f1b2c', stroke: C.amber, lw: 3 });
    p.text('HOST-07', cx, cy + 10, { size: 24, mono: true, align: 'center', color: C.amber, ls: 0 });
    const k = back(seg(t, 0.15, 0.45));
    p.ring(cx, cy, 140 * k + 1, p.acc, 5, 0, snap(seg(t, 0.15, 0.5)));
    p.text('Host isolated.', cx, 660, { size: 54, align: 'center', alpha: clamp(seg(t, 0.45, 0.7) * 2) });
  } },
  { d: 0.8, f: (p, t) => p.slam(['Find what hides.', 'Contain what persists.'], t, { size: 82, accentLine: 1 }) },
];

/* ---------------- Mobile pentest ---------------- */
function phone(p: import('./kit').Pen, x: number, y: number, k = 1) {
  p.box(x, y, 230, 440, { r: 36, stroke: C.ink, lw: 4, alpha: k });
  p.box(x + 85, y + 16, 60, 10, { r: 5, fill: C.ink, alpha: k * 0.6 });
}
export const mobile: Beat[] = [
  { d: 0.8, f: (p, t) => p.slam(['Put your app', 'under glass.'], t, { size: 104, accentLine: 1 }) },
  { d: 0.8, f: (p, t) => {
    phone(p, 385, 170, snap(seg(t, 0, 0.3)));
    const a = t * Math.PI * 3;
    p.ring(500 + Math.cos(a) * 80, 390 + Math.sin(a) * 120, 90, p.acc, 5);
    p.text(Math.floor(t * 8) % 2 ? 'IPA' : 'APK', 500, 400, { size: 54, mono: true, align: 'center', color: p.acc, ls: 0 });
    p.label('Android + iOS · build intake', W / 2, 680, C.soft, 'center');
  } },
  { d: 0.9, f: (p, t) => {
    phone(p, 385, 170);
    const c = p.ctx;
    c.save(); c.beginPath(); c.roundRect(395, 200, 210, 400, 26); c.clip();
    const r = rng(5);
    const off = (t * 900) % 24;
    for (let i = 0; i < 26; i++) {
      const y = 200 + i * 24 - off; const w = 40 + r() * 140; const hot = i % 7 === 3;
      p.box(410 + (i % 3) * 14, y, w, 10, { r: 4, fill: hot ? p.acc : 'rgba(238,243,249,0.22)' });
    }
    c.restore();
    p.label('01 / Package · code + manifest', 120, 150, p.acc);
    p.text('exported="true"', 780, 330, { size: 24, mono: true, align: 'center', color: p.acc, ls: 0, alpha: clamp(seg(t, 0.3, 0.45) * 3) });
    p.text('debuggable', 780, 420, { size: 24, mono: true, align: 'center', color: C.amber, ls: 0, alpha: clamp(seg(t, 0.5, 0.65) * 3) });
    p.text('hardcoded key', 780, 510, { size: 24, mono: true, align: 'center', color: C.red, ls: 0, alpha: clamp(seg(t, 0.7, 0.85) * 3) });
  } },
  { d: 0.9, f: (p, t) => {
    phone(p, 140, 170);
    p.box(700, 300, 180, 180, { r: 14, stroke: C.ink, fill: '#0f1b2c' }); p.label('API', 790, 400, C.ink, 'center', 20);
    for (let i = 0; i < 6; i++) {
      const ph = (t * 3 + i / 6) % 1, y = 270 + i * 50;
      const right = i % 2 === 0;
      const x = right ? 380 + ph * 310 : 690 - ph * 310;
      p.line(380, y, 690, y, C.dim, 1);
      p.dot(x, y, 7, i === 3 ? C.red : p.acc);
    }
    p.label('02 / Runtime · traffic + APIs', 120, 150, p.acc);
    p.label('Token in plain text', 535, 650, C.red, 'center');
  } },
  { d: 0.75, f: (p, t) => {
    p.box(220, 220, 560, 330, { fill: '#0f1b2c', stroke: C.line });
    p.label('AI-assisted testing', 260, 275, C.mut);
    p.text('Run a risky action?', 260, 345, { size: 40 });
    const k = snap(seg(t, 0.45, 0.7));
    p.box(260, 420, 220, 72, { r: 10, fill: k > 0.5 ? p.acc : 'transparent', stroke: p.acc });
    p.text('Approve', 370, 466, { size: 26, w: 700, align: 'center', color: k > 0.5 ? C.surface : p.acc });
    p.box(510, 420, 220, 72, { r: 10, stroke: C.line });
    p.text('Deny', 620, 466, { size: 26, w: 700, align: 'center', color: C.mut });
    p.label('Human approval for risky actions', W / 2, 640, C.soft, 'center');
  } },
  { d: 0.9, f: (p, t) => {
    const st = ['Intake', 'Static', 'Dynamic', 'AI-assisted', 'Evidence'];
    const prog = out(t) * (st.length - 1);
    p.line(130, 390, 870, 390, C.dim, 4); p.line(130, 390, 870, 390, p.acc, 4, prog / (st.length - 1));
    st.forEach((s, i) => {
      const x = 130 + i * 185, on = prog >= i - 0.01;
      p.dot(x, 390, on ? 16 : 9, on ? p.acc : C.mut, 1, on ? 18 : 0);
      p.text(s, x, i % 2 ? 470 : 340, { size: 28, align: 'center', color: on ? C.ink : C.mut });
    });
    p.label('Assessment stages', 130, 200, C.mut);
  } },
  { d: 0.85, f: (p, t) => {
    p.label('Evidence report · prioritized', 140, 170, C.mut);
    const f: [string, string, number][] = [['Insecure data storage', 'High', 0.9], ['Weak transport security', 'High', 0.82], ['Exported component', 'Medium', 0.55], ['Verbose logging', 'Low', 0.3]];
    f.forEach(([n, sev, w], i) => {
      const k = snap(seg(t, i * 0.1, 0.4 + i * 0.1)), y = 220 + i * 110;
      const col = sev === 'High' ? C.red : sev === 'Medium' ? C.amber : C.ok;
      p.text(n, 140, y + 36, { size: 28, alpha: k });
      p.label(sev, 860, y + 34, col, 'right');
      p.box(140, y + 56, 720, 10, { r: 5, fill: C.dim });
      p.box(140, y + 56, 720 * w * k, 10, { r: 5, fill: col });
    });
  } },
];

/* ---------------- DarkIntel360 ---------------- */
const diNodes = (() => { const r = rng(21); return Array.from({ length: 26 }, () => ({ x: 360 + r() * 520, y: 160 + r() * 470 })); })();
// Each node links to its two nearest earlier nodes: a correlation web, not a star.
const diEdges = diNodes.map((a, i) => diNodes.slice(0, i).map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).sort((x, y) => x.d - y.d).slice(0, 2).map((e) => e.j));
export const darkintel: Beat[] = [
  { d: 0.85, f: (p, t) => p.slam(['From dark web', 'to actionable intel.'], t, { size: 86, accentLine: 1 }) },
  { d: 1.0, f: (p, t) => {
    const src = ['Underground forums', 'Telegram channels', 'Twitter / X', 'Botnet intelligence', 'Public sources'];
    const cx = 760, cy = 395;
    src.forEach((s, i) => {
      const y = 190 + i * 102, on = t > i * 0.12;
      p.text(s, 90, y + 10, { size: 28, color: on ? C.ink : C.mut });
      p.dot(400, y, 7, on ? p.acc : C.mut);
      if (on) for (let k = 0; k < 3; k++) { const ph = (t * 3 + k / 3 + i * 0.13) % 1; p.dot(400 + (cx - 400) * ph, y + (cy - y) * ph, 4, p.acc, 1 - ph * 0.6); }
    });
    p.ring(cx, cy, 70, p.acc, 4); p.dot(cx, cy, 16, p.acc, 1, 30);
    p.label('01 / Collect', 90, 120, p.acc);
  } },
  { d: 0.9, f: (p, t) => {
    const n = Math.floor(snap(t) * diNodes.length);
    for (let i = 1; i < n; i++) { const a = diNodes[i]; diEdges[i].forEach((j) => { const b = diNodes[j]; p.line(a.x, a.y, b.x, b.y, i % 6 === 0 ? p.acc : C.line, i % 6 === 0 ? 3 : 1.5); }); }
    diNodes.slice(0, n).forEach((d, i) => p.dot(d.x, d.y, i % 6 === 0 ? 10 : 5, i % 6 === 0 ? p.acc : C.soft));
    p.label('02 / Analyze · correlate signals', 90, 120, p.acc);
    p.text('Correlated.', 90, 700 - 20, { size: 48, alpha: clamp(seg(t, 0.55, 0.75) * 2) });
  } },
  { d: 0.95, f: (p, t) => {
    p.label('Compromised credentials', 120, 150, C.red);
    const c = p.ctx;
    c.save(); c.beginPath(); c.rect(100, 180, 800, 480); c.clip();
    const off = (t * 1400) % 60;
    const r = rng(9);
    for (let i = 0; i < 12; i++) {
      const y = 190 + i * 60 - off, hot = (i + Math.floor(t * 23)) % 5 === 0;
      const user = '•'.repeat(4 + Math.floor(r() * 5)) + '@' + '•'.repeat(5) + '.com';
      p.box(120, y, 760, 48, { r: 8, fill: hot ? 'rgba(255,90,99,0.12)' : '#0f1b2c', stroke: hot ? 'rgba(255,90,99,0.5)' : C.dim });
      p.text(user, 145, y + 32, { size: 20, mono: true, color: C.soft, ls: 0 });
      p.text('••••••••', 560, y + 32, { size: 20, mono: true, color: C.mut, ls: 0 });
      p.label(['Forum', 'Telegram', 'Paste site', 'Botnet'][i % 4], 860, y + 31, hot ? C.red : C.mut, 'right', 13);
    }
    c.restore();
  } },
  { d: 0.9, f: (p, t) => {
    const cx = W / 2, cy = 400, R = 220, rot = t * Math.PI * 1.6;
    p.ring(cx, cy, R, C.line, 2);
    for (let k = -2; k <= 2; k++) { const c = p.ctx; c.save(); c.beginPath(); c.ellipse(cx, cy + k * 80, Math.sqrt(R * R - (k * 80) ** 2), 18, 0, 0, Math.PI * 2); c.strokeStyle = C.dim; c.lineWidth = 1.5; c.stroke(); c.restore(); }
    for (let k = 0; k < 6; k++) { const a = rot + (k / 6) * Math.PI; const c = p.ctx; c.save(); c.beginPath(); c.ellipse(cx, cy, Math.abs(Math.cos(a)) * R, R, 0, 0, Math.PI * 2); c.strokeStyle = C.dim; c.lineWidth = 1.5; c.stroke(); c.restore(); }
    const r = rng(4);
    for (let i = 0; i < 14; i++) {
      const lon = r() * Math.PI * 2 + rot, lat = (r() - 0.5) * 2.4;
      const z = Math.cos(lon) * Math.cos(lat);
      if (z < 0) continue;
      const x = cx + Math.sin(lon) * Math.cos(lat) * R, y = cy + Math.sin(lat) * R * 0.9;
      const blink = (Math.floor(t * 12) + i) % 3 === 0;
      p.dot(x, y, blink ? 9 : 5, i % 4 === 0 ? C.red : p.acc, 1, blink ? 18 : 0);
    }
    p.label('03 / Visualize · global activity', 90, 120, p.acc);
  } },
  { d: 0.85, f: (p, t) => {
    const w = ['Collect', 'Analyze', 'Visualize', 'Act'];
    w.forEach((s, i) => {
      const k = back(seg(t, i * 0.14, 0.3 + i * 0.14));
      const y = 230 + i * 120;
      p.text(s + (i < 3 ? ' →' : '.'), 160, y + 40 + (1 - k) * 40, { size: 84, alpha: clamp(k * 1.5), color: i === 3 ? p.acc : C.ink });
    });
  } },
];
