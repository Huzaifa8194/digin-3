// The 3D half of the page: an illustrated space (toon shading + ink outlines) for the flight in and the
// outro, and one landscape per module for the hunt. Everything runs on gsap.ticker; main.ts only tweens
// the numbers in `state`.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { PALS, INK } from './palettes';
import { buildWorld } from './props';

export type GLState = {
  scene: 'space' | 'world';
  intro: number;   // 0 → 1: the probe flies into the hero frame
  story: number;   // 0 → 1: the flight in, ending inside the probe's window
  outro: number;   // 0 → 1: pull back to the probe on its orbit
  world: number;   // 0 looking up at the sky, 1 looking down at the landscape
  panX: number; panY: number; // pointer look-around, -1..1
  beam: number;    // index of the beamed signal, -1 for none
  beamAmt: number;
  paused: boolean; // a DOM scene covers the canvas
  ringX: number; ringY: number; ringW: number; // outro: where the wordmark sits, in px
  light: number;   // 0 the dark web, 1 the light is on (space scene)
  lamp: number;    // the probe's own light: windows and searchlight
};

const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- materials ----------
let gradient: THREE.DataTexture;
function toonRamp() {
  const d = new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const toon = (color: string) => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

/** Mesh with an inverted-hull ink outline, the illustrated look. */
function inked(geo: THREE.BufferGeometry, mat: THREE.Material, w = 0.045) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat);
  const o = new THREE.Mesh(geo, inkMat);
  geo.computeBoundingSphere();
  const r = geo.boundingSphere?.radius || 1;
  o.scale.setScalar(1 + w / r);
  g.add(o, m);
  return g;
}

// ---------- the probe ----------
function cap(r: number, phi0: number, phiL: number, th0: number, thL: number, color: string | THREE.Material) {
  const geo = new THREE.SphereGeometry(r, 24, 12, phi0, phiL, th0, thL);
  return new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
}
function makeProbe() {
  const g = new THREE.Group();
  g.add(inked(new THREE.SphereGeometry(1, 48, 32), toon('#c7a2f5'), 0.04));
  const glass = new THREE.MeshBasicMaterial({ color: '#4a2a92' });
  const glare = new THREE.MeshBasicMaterial({ color: '#8f78ee' });
  g.userData.glass = glass; g.userData.glare = glare;
  const ink = new THREE.MeshBasicMaterial({ color: INK });
  for (const side of [-1, 1]) {
    const pc = Math.PI / 2 + side * 0.4, pl = 0.62, tc = 1.12, tl = 0.62;
    g.add(cap(1.004, pc - pl / 2 - 0.09, pl + 0.18, tc - tl / 2 - 0.09, tl + 0.18, ink));
    g.add(cap(1.008, pc - pl / 2 - 0.07, pl + 0.14, tc - tl / 2 - 0.07, tl + 0.14, '#efe1ff'));
    g.add(cap(1.012, pc - pl / 2 - 0.012, pl + 0.024, tc - tl / 2 - 0.012, tl + 0.024, ink));
    g.add(cap(1.014, pc - pl / 2, pl, tc - tl / 2, tl, glass));
    g.add(cap(1.017, pc - pl / 2 + 0.1, 0.07, tc - tl / 2 + 0.06, tl - 0.12, glare));
    g.add(cap(1.017, pc - pl / 2 + 0.22, 0.035, tc - tl / 2 + 0.06, tl - 0.12, glare));
  }
  const rib = toon('#8b5bd8');
  for (const th of [1.78, 1.98, 2.18]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(Math.sin(th) * 1.004, 0.016, 6, 72), rib);
    t.rotation.x = Math.PI / 2; t.position.y = Math.cos(th);
    g.add(t);
  }
  const th = 2.56;
  const thr = inked(new THREE.TorusGeometry(Math.sin(th), 0.07, 10, 64), toon('#5157e3'), 0.03);
  thr.rotation.x = Math.PI / 2; thr.position.y = Math.cos(th);
  g.add(thr);
  const core = new THREE.Mesh(new THREE.CircleGeometry(Math.sin(th) * 0.9, 40), new THREE.MeshBasicMaterial({ color: '#9fa4ff' }));
  core.rotation.x = Math.PI / 2; core.position.y = Math.cos(th) - 0.02;
  g.add(core);
  return g;
}

// ---------- debris: what leaks ----------
// Illustrated objects from a breach: documents, folders, databases, broken padlocks, cards, envelopes.
// A share of them carry a crimson tag that glows while the page is still in the dark.
let leakMat: THREE.MeshToonMaterial;
const part = (geo: THREE.BufferGeometry, color: string | THREE.Material, x = 0, y = 0, z = 0, w = 0.035) => {
  const o = inked(geo, typeof color === 'string' ? toon(color) : color, w); o.position.set(x, y, z); return o;
};
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const ARTIFACTS: { make: () => THREE.Group; s: [number, number]; tag?: [number, number, number] }[] = [
  { // document
    make: () => { const g = new THREE.Group(); g.add(part(box(0.8, 1.05, 0.05), '#f1e6ff')); for (let i = 0; i < 4; i++) g.add(part(box(i === 3 ? 0.3 : 0.52, 0.055, 0.02), '#7a59b0', i === 3 ? -0.11 : 0, 0.3 - i * 0.16, 0.04, 0.01)); return g; },
    s: [0.42, 0.7], tag: [0.3, 0.42, 0.05],
  },
  { // folder
    make: () => { const g = new THREE.Group(); g.add(part(box(1.05, 0.74, 0.1), '#e68ff3')); g.add(part(box(0.4, 0.14, 0.1), '#e68ff3', -0.32, 0.43, 0)); g.add(part(box(0.9, 0.5, 0.02), '#f6c4fb', 0, -0.06, 0.06, 0.01)); return g; },
    s: [0.42, 0.66], tag: [0.42, 0.26, 0.08],
  },
  { // database
    make: () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { g.add(part(new THREE.CylinderGeometry(0.46, 0.46, 0.24, 24), '#5a3aa8', 0, (i - 1) * 0.3, 0)); g.add(part(new THREE.TorusGeometry(0.46, 0.025, 6, 32).rotateX(Math.PI / 2), '#c6f36d', 0, (i - 1) * 0.3 + 0.13, 0, 0.005)); } return g; },
    s: [0.38, 0.6], tag: [0.46, 0.42, 0],
  },
  { // broken padlock
    make: () => { const g = new THREE.Group(); g.add(part(box(0.72, 0.6, 0.3), '#c6f36d')); const sh = part(new THREE.TorusGeometry(0.24, 0.065, 8, 20, Math.PI), '#d9c6f2', -0.24, 0.42, 0); sh.rotation.z = 0.5; g.add(sh); g.add(part(box(0.1, 0.2, 0.05), '#2a1145', 0, -0.02, 0.16, 0.005)); return g; },
    s: [0.34, 0.5],
  },
  { // card
    make: () => { const g = new THREE.Group(); g.add(part(box(1.15, 0.72, 0.05), '#b9a0ff')); g.add(part(box(1.15, 0.13, 0.06), '#3b2170', 0, 0.16, 0, 0.005)); g.add(part(box(0.2, 0.15, 0.07), '#c6f36d', -0.34, -0.12, 0, 0.01)); return g; },
    s: [0.38, 0.58], tag: [0.45, -0.25, 0.05],
  },
  { // envelope
    make: () => { const g = new THREE.Group(); g.add(part(box(1.05, 0.68, 0.06), '#f6efe6')); const tri = new THREE.Shape(); tri.moveTo(-0.52, 0.34); tri.lineTo(0.52, 0.34); tri.lineTo(0, -0.06); tri.closePath(); g.add(part(new THREE.ExtrudeGeometry(tri, { depth: 0.02, bevelEnabled: false }), '#e7dcff', 0, 0, 0.03, 0.01)); return g; },
    s: [0.4, 0.62], tag: [0.42, 0.24, 0.06],
  },
  { // dark rock, the rest of the dark web
    make: () => { const g = new THREE.Group(); g.add(part(new THREE.IcosahedronGeometry(1, 0), '#4a2a78', 0, 0, 0, 0.07)); return g; },
    s: [0.3, 0.85],
  },
];

function feedTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d')!;
  x.font = '500 17px "Geist Mono", ui-monospace, Menlo, monospace';
  const W = ['combo_list', 'stealer_log', 'db_dump', 'corp_vpn', 'admin_panel', 'payroll', 'hr_export', 'session_cookies', 'crm_backup', 'mail_access'];
  const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
  const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  for (let row = 0; row < 40; row++) {
    const r = Math.random();
    const line = r < 0.35 ? `${pick(W)}_${2019 + ((Math.random() * 8) | 0)}.txt   ${(Math.random() * 9 + 0.3).toFixed(1)}M rows   for sale   ${hex(10)}`
      : r < 0.65 ? `HOST-${hex(4).toUpperCase()}   passwords ${(Math.random() * 90 + 4) | 0}   cookies ${(Math.random() * 600 + 20) | 0}   ${pick(W)}`
        : `[${hex(6)}]  access offered  ${pick(W)}  escrow ok  ${hex(16)}`;
    x.fillStyle = Math.random() < 0.18 ? 'rgba(255, 70, 120, .95)' : 'rgba(255, 110, 150, .45)';
    x.fillText(line, 20 + (Math.random() * 60), 26 + row * 25.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function glowTexture(inner: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!, gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, inner); gr.addColorStop(0.5, inner + '55'); gr.addColorStop(1, inner + '00');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

type Pose = { s: number; x: number; y: number; z: number; ry: number; rx: number; sc: number };
// Window A's centre in probe space, so the last key lands the camera inside it.
const WIN = { x: -Math.cos(Math.PI / 2 - 0.4) * Math.sin(1.12), y: Math.cos(1.12), z: Math.sin(Math.PI / 2 - 0.4) * Math.sin(1.12) };
const KEYS: Pose[] = [
  { s: 0, x: 2.45, y: 1.9, z: 0, ry: -0.5, rx: 0.12, sc: 1.15 },
  { s: 0.2, x: 2.3, y: 0.45, z: 0.6, ry: -0.35, rx: 0.05, sc: 1.4 },
  { s: 0.47, x: -2.3, y: 0.3, z: 1.4, ry: 0.55, rx: 0.08, sc: 1.4 },
  { s: 0.74, x: -2.0, y: 0.1, z: 2.8, ry: 0.4, rx: 0.02, sc: 1.5 },
  { s: 0.88, x: 0, y: 0, z: 4.2, ry: 0.0, rx: 0, sc: 1.6 },
  { s: 1, x: 0, y: 0, z: 0, ry: 0, rx: 0, sc: 1.6 }, // filled in by the dive below
];

export function createGL(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  gradient = toonRamp();
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const state: GLState = { scene: 'space', intro: 0, story: 0, outro: 0, world: 0, panX: 0, panY: 0, beam: -1, beamAmt: 0, paused: false, ringX: 0, ringY: 0, ringW: 0, light: 0, lamp: 0 };
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  const look = { x: 0, y: 0 }; // smoothed pan

  const light = (s: THREE.Scene) => {
    const d = new THREE.DirectionalLight('#ffffff', 2.6); d.position.set(-4, 7, 6);
    const a = new THREE.AmbientLight('#c9a8ff', 1.25);
    s.add(d, a);
    return { d, a };
  };

  // ===== SPACE =====
  const space = new THREE.Scene(); const spaceLight = light(space);
  leakMat = new THREE.MeshToonMaterial({ color: '#ff4f86', gradientMap: gradient, emissive: new THREE.Color('#ff2a62'), emissiveIntensity: 0.8 });
  const leakGlow = new THREE.SpriteMaterial({ map: glowTexture('#ff3d74'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const probe = makeProbe(); space.add(probe);
  // the DarkIntel360 mark, worn by the probe: an orbit ring and its point of light
  const halo = new THREE.Group(); probe.add(halo);
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.012, 6, 160), new THREE.MeshBasicMaterial({ color: '#f1e2ff', transparent: true }));
  halo.add(haloRing);
  const haloDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#c6f36d'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  haloDot.scale.setScalar(0.55); halo.add(haloDot);
  halo.rotation.set(1.22, 0, 0.38);
  // searchlight: the light DarkIntel360 shines on the dark web
  const coneGeo = new THREE.ConeGeometry(1, 1, 40, 1, true); coneGeo.translate(0, -0.5, 0);
  const fade = document.createElement('canvas'); fade.width = 4; fade.height = 128;
  { const x = fade.getContext('2d')!, gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#5a4a6a'); gr.addColorStop(1, '#000000'); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); }
  const search = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: '#f3e6ff', map: new THREE.CanvasTexture(fade), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  search.position.set(0, -0.85, 0); search.scale.set(2.6, 7, 2.6); search.rotation.x = 0.55;
  probe.add(search);
  // the feed behind it all: listings scrolling past, readable only in the dark
  const feedTex = feedTexture();
  const feed = new THREE.Mesh(new THREE.PlaneGeometry(64, 40), new THREE.MeshBasicMaterial({ map: feedTex, transparent: true, opacity: 0.5, depthWrite: false }));
  feed.position.set(0, 0, -26); feedTex.repeat.set(2, 1.4); space.add(feed);
  const phone = () => innerWidth < 700;
  const debris: { o: THREE.Group; base: THREE.Vector3; spin: THREE.Vector3; ph: number; glow?: THREE.Sprite }[] = [];
  const nDebris = phone() ? 24 : 42;
  for (let i = 0; i < nDebris; i++) {
    const k = ARTIFACTS[i % ARTIFACTS.length];
    const o = k.make();
    o.scale.setScalar(lerp(k.s[0], k.s[1], Math.random()) * (i % 9 === 0 ? 1.6 : 1));
    let glow: THREE.Sprite | undefined;
    if (k.tag && i % 3 !== 2) {
      const [tx, ty, tz] = k.tag;
      o.add(part(box(0.18, 0.18, 0.08), leakMat, tx, ty, tz, 0.012));
      glow = new THREE.Sprite(leakGlow); glow.position.set(tx, ty, tz + 0.05); glow.scale.setScalar(1.1); o.add(glow);
    }
    const base = new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 11, -22 + Math.random() * 30);
    if (Math.abs(base.x) < 3.6 && Math.abs(base.y) < 2.4) base.x += 4.5 * Math.sign(base.x || 1); // keep the headline clear
    o.rotation.set((Math.random() - 0.5) * 1.6, Math.random() * TAU, (Math.random() - 0.5) * 1.2);
    space.add(o);
    debris.push({ o, base, glow, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.45), ph: Math.random() * TAU });
  }
  // planet crust at the bottom of the frame, like standing on an asteroid field
  const crust = new THREE.Group(); space.add(crust);
  const crustBits: [number, number, number, number, number, number, string][] = [
    [-7, -5.2, -1, 5.2, 2.0, 3.6, '#8a49c4'], [7.4, -5.6, -3, 6.2, 2.3, 4, '#7a3db6'], [0.5, -7.4, -7, 9, 2.6, 4, '#6a33a6'],
    [-4.0, -3.7, 0.8, 0.8, 0.65, 0.75, '#2f1650'], [5.2, -3.9, -0.5, 0.7, 0.55, 0.6, '#3a1d5f'],
  ];
  for (const [x, y, z, sx, sy, sz, c] of crustBits) {
    const g = new THREE.IcosahedronGeometry(1, 1); g.scale(sx, sy, sz);
    const o = inked(g, toon(c), 0.06); o.position.set(x, y, z); o.rotation.y = x * 0.3;
    crust.add(o);
  }
  const lime = inked(new THREE.DodecahedronGeometry(0.62, 0), toon('#c6f36d'), 0.05);
  lime.position.set(-5.9, -3.1, 1.2); crust.add(lime);

  // outro orbit: a ring and a point of light riding it
  const orbit = new THREE.Group(); space.add(orbit);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 200), new THREE.MeshBasicMaterial({ color: '#f1e2ff', transparent: true }));
  orbit.add(ring);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#c6f36d'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  spark.scale.setScalar(0.5); orbit.add(spark);
  orbit.rotation.set(1.42, 0.0, -0.06);

  // ===== WORLD =====
  const world = new THREE.Scene(); light(world);
  const wProbe = makeProbe(); wProbe.scale.setScalar(1.6); world.add(wProbe);
  const mats = { near: toon('#000'), mid: toon('#000'), far: toon('#000'), lake: new THREE.MeshBasicMaterial({ color: '#000' }), cloud: new THREE.MeshBasicMaterial({ color: '#fff' }) };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mats.near); ground.rotation.x = -Math.PI / 2; world.add(ground);
  const lakeInk = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: INK }));
  lakeInk.rotation.x = -Math.PI / 2; lakeInk.scale.set(30.6, 13.6, 1); lakeInk.position.set(0, 0.02, -9); world.add(lakeInk);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mats.lake);
  lake.rotation.x = -Math.PI / 2; lake.scale.set(30, 13, 1); lake.position.set(0, 0.04, -9); world.add(lake);
  const ripples = new THREE.Group(); world.add(ripples);
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + Math.random() * 2.4, 0.09), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4 }));
    r.rotation.x = -Math.PI / 2; r.position.set((Math.random() - 0.5) * 34, 0.06, -14 + Math.random() * 10); ripples.add(r);
  }
  const hills: [number, number, number, number, number, number, 'mid' | 'far'][] = [
    [-24, 0, -18, 12, 4.5, 7, 'mid'], [24, 0, -20, 13, 5.5, 8, 'mid'], [-10, 0, -34, 14, 6, 6, 'mid'], [12, 0, -36, 12, 4, 6, 'mid'],
    [-40, 0, -70, 24, 18, 10, 'far'], [0, 0, -80, 30, 14, 10, 'far'], [42, 0, -72, 26, 20, 10, 'far'], [-70, 0, -60, 20, 12, 10, 'far'], [72, 0, -60, 22, 14, 10, 'far'],
    [-17, 0, 2, 7, 2.4, 6, 'mid'], [18, 0, 3, 8, 2.2, 6, 'mid'],
  ];
  for (const [x, y, z, sx, sy, sz, k] of hills) {
    const g = k === 'far' ? new THREE.ConeGeometry(1, 1, 6, 1) : new THREE.IcosahedronGeometry(1, 1);
    if (k === 'far') g.translate(0, 0.5, 0);
    g.scale(sx, sy, sz);
    const o = inked(g, mats[k], k === 'far' ? 1.1 : 0.45); o.position.set(x, y, z); o.rotation.y = x * 0.07; world.add(o);
  }
  const clouds = new THREE.Group(); world.add(clouds);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mats.cloud);
      m.scale.set(3.4 - j * 0.8, 0.9 - j * 0.12, 1.4); m.position.set(j * 2.2 - 2, j === 1 ? 0.5 : 0, 0);
      c.add(m);
    }
    c.position.set((i - 2.5) * 16 + Math.random() * 6, 20 + Math.random() * 10, -50 - Math.random() * 20);
    c.scale.setScalar(1.6 + Math.random());
    clouds.add(c);
  }
  // three signals on three platforms; what the signals are, and the props around them, depend on the module
  const sigs: { isle: THREE.Group; p: THREE.Vector3 }[] = [];
  for (let i = 0; i < 3; i++) {
    const isle = inked(new THREE.CylinderGeometry(2.4, 2.8, 0.5, 9), mats.mid, 0.12);
    world.add(isle);
    sigs.push({ isle, p: new THREE.Vector3() });
  }
  const worldLeak = new THREE.MeshToonMaterial({ color: '#ff4f86', gradientMap: gradient, emissive: new THREE.Color('#ff2a62'), emissiveIntensity: 0.55 });
  const worlds = PALS.map((_, i) => {
    const wv = buildWorld(i, { toon, inked, leak: worldLeak });
    wv.props.visible = false; world.add(wv.props);
    wv.signals.forEach((o) => { o.visible = false; world.add(o); });
    return wv;
  });
  const LAYOUTS = [
    [[-8, -3], [7.5, -1], [7, -17]], [[-7, -17], [8, -5], [-7.5, 1.5]], [[7.5, -16], [-8, -5], [1.5, 3]],
  ];
  const beamGeo = new THREE.ConeGeometry(1, 1, 40, 1, true); beamGeo.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  world.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; world.add(pool);

  let mod = 0;
  function placeSignals() {
    const lay = LAYOUTS[mod % 3], flip = mod % 2 ? -1 : 1, spread = w / h < 0.9 ? 0.42 : 1;
    sigs.forEach((s, k) => {
      const [x, z] = lay[k];
      s.p.set(x * flip * spread, 0, z);
      s.isle.position.set(s.p.x, 0.25, s.p.z);
    });
  }
  function setModule(i: number) {
    const p = PALS[i];
    mod = i;
    mats.near.color.set(p.near); mats.mid.color.set(p.mid); mats.far.color.set(p.far);
    mats.lake.color.set(p.lake); mats.cloud.color.set(p.cloud);
    worlds.forEach((wv, k) => { wv.props.visible = k === i; wv.signals.forEach((o) => { o.visible = k === i; }); });
    placeSignals();
  }

  // ===== frame =====
  let w = 1, h = 1;
  function resize() {
    w = innerWidth; h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone() ? 1.5 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    placeSignals();
  }
  resize();
  setModule(0);
  addEventListener('resize', resize);

  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, -1, 0), q = new THREE.Quaternion();
  const probeHome = new THREE.Vector3(0, 4.4, -3), probeAt = probeHome.clone();
  let time = 0;

  function poseAt(s: number): Pose {
    const aspect = w / h, portrait = aspect < 0.9;
    // last key: sit the window right in front of the camera
    const sc = portrait ? 1.6 : 1.6;
    KEYS[5] = { s: 1, x: -WIN.x * sc, y: -WIN.y * sc, z: 12 - 1.25 - WIN.z * sc, ry: 0, rx: 0, sc };
    let i = 0;
    while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = smooth(clamp((s - a.s) / (b.s - a.s)));
    const p: Pose = { s, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), ry: lerp(a.ry, b.ry, t), rx: lerp(a.rx, b.rx, t), sc: lerp(a.sc, b.sc, t) };
    if (!portrait && s < 0.88) p.x *= clamp(aspect / 1.5, 0.85, 1.35);
    if (portrait && s < 0.88) { // phone: probe above the text, smaller, closer to centre
      const k = clamp((s - 0.74) / 0.14);
      p.x *= lerp(0.32, 1, k); p.y = lerp(p.y * 0.4 + 1.5, p.y, k); p.sc *= lerp(0.72, 1, k);
    }
    return p;
  }

  function tick(_t: number, dt: number) {
    if (document.hidden || state.paused) return;
    const d = Math.min(dt / 1000, 0.05);
    time += d;
    look.x += (state.panX - look.x) * Math.min(1, d * 3);
    look.y += (state.panY - look.y) * Math.min(1, d * 3);
    // arrive exactly, so the camera (and the labels pinned to the landscape) come fully to rest
    if (Math.abs(state.panX - look.x) < 0.0005) look.x = state.panX;
    if (Math.abs(state.panY - look.y) < 0.0005) look.y = state.panY;

    if (state.scene === 'space') {
      const s = state.story, pose = poseAt(s);
      const o = smooth(clamp(state.outro));
      const portrait = w / h < 0.9;
      const vh = Math.tan((camera.fov * Math.PI) / 360) * 12, vw = vh * (w / h); // half extents at z = 0
      const out = portrait ? { x: 0, y: vh + 3, z: -3, sc: 0.6 } : { x: vw * 0.8, y: -vh * 0.5, z: -4, sc: 0.62 };
      const enter = (1 - smooth(clamp(state.intro))) * 7;
      probe.position.set(lerp(pose.x + enter, out.x, o), lerp(pose.y + enter * 0.25, out.y, o) + Math.sin(time * 1.1) * 0.06 * (1 - smooth(clamp((s - 0.85) / 0.15))), lerp(pose.z, out.z, o));
      probe.scale.setScalar(lerp(pose.sc, out.sc, o));
      probe.rotation.set(lerp(pose.rx, 0.12, o) + Math.sin(time * 0.7) * 0.03, lerp(pose.ry, Math.sin(time * 0.3) * 0.3, o), Math.sin(time * 0.5) * 0.04);
      // debris streams past as we fly
      const travel = s * 26 + time * 0.25;
      for (const b of debris) {
        const z = ((b.base.z + travel + 22) % 32 + 32) % 32 - 22;
        b.o.position.set(b.base.x, b.base.y + Math.sin(time * 0.6 + b.ph) * 0.15, z);
        b.o.rotation.x += b.spin.x * d; b.o.rotation.y += b.spin.y * d;
      }
      crust.position.y = -smooth(clamp(s / 0.5)) * 7 - o * 7;
      // dark web → light
      const L = clamp(state.light), lamp = clamp(state.lamp), dark = 1 - L;
      spaceLight.d.intensity = lerp(0.55, 2.6, L) + lamp * 0.35 * dark;
      spaceLight.a.intensity = lerp(0.45, 1.25, L);
      spaceLight.a.color.setRGB(lerp(0.62, 0.79, L), lerp(0.36, 0.66, L), lerp(0.62, 1, L));
      leakMat.emissiveIntensity = 0.15 + dark * 0.9;
      leakGlow.opacity = dark * (0.55 + Math.sin(time * 2.2) * 0.15);
      (feed.material as THREE.MeshBasicMaterial).opacity = dark * 0.2;
      feed.visible = dark > 0.01;
      feedTex.offset.y = (time * 0.012 + s * 0.4) % 1;
      const glass = probe.userData.glass as THREE.MeshBasicMaterial, glare = probe.userData.glare as THREE.MeshBasicMaterial;
      glass.color.setRGB(lerp(0.13, 0.62, lamp), lerp(0.08, 0.52, lamp), lerp(0.24, 0.98, lamp));
      glare.color.setRGB(lerp(0.3, 0.92, lamp), lerp(0.25, 0.88, lamp), lerp(0.5, 1, lamp));
      if (s > 0.9) glass.color.setRGB(0.29, 0.16, 0.57); // the dive: back to deep glass so the cut reads
      const dive = 1 - smooth(clamp((s - 0.8) / 0.1));
      (search.material as THREE.MeshBasicMaterial).opacity = lamp * (0.22 + dark * 0.2) * dive * (1 - o) * (0.85 + Math.sin(time * 3.1) * 0.08);
      search.rotation.z = Math.sin(time * 0.6) * 0.35;
      search.visible = (search.material as THREE.MeshBasicMaterial).opacity > 0.005;
      (haloRing.material as THREE.MeshBasicMaterial).opacity = dive * (1 - o) * lerp(0.55, 0.9, lamp);
      haloDot.material.opacity = dive * (1 - o);
      halo.visible = dive * (1 - o) > 0.01;
      const ha = time * 0.7;
      haloDot.position.set(Math.cos(ha) * 1.7, Math.sin(ha) * 1.7, 0);
      lime.rotation.y += d * 0.4;
      // outro ring
      const ok = o, portraitK = portrait ? 0.48 : 1;
      orbit.visible = ok > 0.01;
      const rx = state.ringW ? ((state.ringX / w) * 2 - 1) * vw : 0, ry = state.ringW ? -((state.ringY / h) * 2 - 1) * vh : 0;
      const rr = state.ringW ? (state.ringW / w) * 2 * vw * 1.16 : 4.4 * portraitK;
      orbit.position.set(rx, ry, 0);
      orbit.scale.setScalar(lerp(1, rr, smooth(ok)));
      (ring.material as THREE.MeshBasicMaterial).opacity = ok;
      const a = time * 0.45;
      spark.position.set(Math.cos(a), Math.sin(a), 0);
      (spark.material as THREE.SpriteMaterial).opacity = ok;
      camera.position.set(look.x * 0.5 * (1 - s), look.y * 0.3 * (1 - s), 12);
      camera.lookAt(look.x * 0.2 * (1 - s), 0, 0);
      renderer.render(space, camera);
    } else {
      const wt = smooth(clamp(state.world));
      // the probe hovers over the beamed signal
      const tgt = state.beam >= 0 ? tmp.copy(sigs[state.beam].p).setY(5.4) : probeHome;
      probeAt.lerp(tgt, Math.min(1, d * 2.2));
      wProbe.position.set(probeAt.x, probeAt.y + Math.sin(time * 1.3) * 0.18, probeAt.z);
      wProbe.rotation.set(0.1, Math.sin(time * 0.4) * 0.25, Math.sin(time * 0.9) * 0.03);
      sigs.forEach((s, k) => {
        const o = worlds[mod].signals[k];
        o.position.set(s.p.x, 1.7 + Math.sin(time * 1.4 + k * 2) * 0.22, s.p.z);
        o.rotation.y += d * (0.45 + k * 0.12); o.rotation.z = Math.sin(time * 0.8 + k) * 0.12;
      });
      clouds.children.forEach((c, k) => { c.position.x += d * (0.4 + k * 0.05); if (c.position.x > 70) c.position.x = -70; });
      ripples.children.forEach((r, k) => { (r as THREE.Mesh).position.x += Math.sin(time * 0.5 + k) * d * 0.4; });
      // beam
      const ba = state.beam >= 0 ? state.beamAmt : 0;
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.26 * ba;
      (pool.material as THREE.MeshBasicMaterial).opacity = 0.32 * ba;
      beam.visible = pool.visible = ba > 0.01;
      if (beam.visible) {
        const from = tmp.copy(wProbe.position).add(new THREE.Vector3(0, -1.4, 0));
        const to = sigs[state.beam].p.clone().setY(0.55);
        const dir = to.clone().sub(from), len = dir.length();
        beam.position.copy(from);
        q.setFromUnitVectors(up, dir.normalize()); beam.quaternion.copy(q);
        beam.scale.set(2.3, len, 2.3);
        pool.position.set(to.x, 0.56, to.z); pool.scale.setScalar(2.3);
      }
      const portrait = w / h < 0.9;
      camera.fov = portrait ? 50 : 36; camera.updateProjectionMatrix();
      const camZ = portrait ? 26 : 23;
      camera.position.set(look.x * 4, lerp(8, 10, wt) + look.y * 0.8, camZ);
      camera.lookAt(look.x * (portrait ? 8 : 11), lerp(30, 0.5, wt) - look.y * 1.5, lerp(-60, -8, wt));
      renderer.render(world, camera);
    }
  }
  gsap.ticker.add(tick);

  /** Screen position of each signal's label anchor (px), and whether it is in view. */
  function signalScreen() {
    return sigs.map((s) => {
      tmp.copy(s.p).setY(2.7).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, vis: tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 };
    });
  }
  function objectScreen() {
    return sigs.map((s) => {
      tmp.copy(s.p).setY(1.6).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
    });
  }

  return { state, setModule, signalScreen, objectScreen, resize };
}
export type GL = NonNullable<ReturnType<typeof createGL>>;
