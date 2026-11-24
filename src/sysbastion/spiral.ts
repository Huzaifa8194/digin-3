// Hero card spiral: bent WebGL planes on a helix, ported from the reference with its constants.
// One scroll value drives it: spiral (p 0) -> deck (0.18..0.72) -> one card (1.18..1.7)
// -> a row-staggered 360 flip (1.95..2.55) -> docks into its own slot in the app window (2.15..2.65).
// The tiles are real panels of the V1.4 window; the last one is always System hardening.
import * as THREE from 'three';
import { addRead, addTick, now } from './clock';
import { tiles } from './content';
import { dpr, isMobile, onViewport, smooth, mix } from './device';
import { patternCanvas } from './patterns';
import { S } from './state';

const W = 345, H = 490;
const CFG = {
  angleStep: 0.65, radius: 3, squish: 0.7, gapX: -0.05, gapY: 0.4, edgeTwist: -0.06, cardScale: 0.5,
  bend: 0.06, smear: 1, autoSpeed: 0.15, mouseTilt: 0.12, magnet: 0.1,
};
const DECK0 = 0.18, DECK1 = 0.72, ONE0 = 1.18, ONE1 = 1.7, FLIP0 = 1.95, FLIP1 = 2.55, LAND0 = 2.15, LAND1 = 2.65;
const CAM_BACK = 6.5;
const MESHES = 18, MID = 9;
const PLANE_W = 2.4, PLANE_H = (H / W) * 2.4;

const VERT = /* glsl */ `
uniform float uBend;
uniform float uFlip;
uniform float uCardH;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z -= uBend * position.x * position.x;
  p.z -= uBend * 0.35 * position.y * position.y;
  if (uFlip > 0.0001) {
    float yN = position.y / uCardH + 0.5;
    float delay = 0.2;
    float rp = clamp((uFlip - (1.0 - yN) * delay) / (1.0 - delay), 0.0, 1.0);
    float a = rp * 6.2831853;
    float s = sin(a), c = cos(a);
    float nx = p.x * c - p.z * s;
    p.z = p.x * s + p.z * c;
    p.x = nx;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uBack;
uniform float uSmear;
uniform vec2 uDir;
uniform float uDim;
varying vec2 vUv;
void main() {
  if (!gl_FrontFacing) {
    vec4 b = texture2D(uBack, vUv);
    gl_FragColor = vec4(b.rgb * max(uDim, 0.7), b.a);
    return;
  }
  if (uSmear < 0.0008) {
    vec4 c0 = texture2D(uTex, vUv);
    c0.rgb *= uDim;
    gl_FragColor = c0;
    return;
  }
  vec4 acc = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 7; i++) {
    float t = float(i) / 6.0 - 0.5;
    float w = 1.0 - abs(t) * 1.3;
    if (w <= 0.0) continue;
    acc += texture2D(uTex, vUv + uDir * t * uSmear) * w;
    total += w;
  }
  vec4 c = acc / total;
  c.rgb *= uDim;
  gl_FragColor = c;
}`;

/** Back of a card: the group's pattern, full bleed. */
function paintBack(cv: HTMLCanvasElement, k: number, scale: number) {
  const r = tiles[k % tiles.length];
  cv.width = W * scale; cv.height = H * scale;
  const c = cv.getContext('2d')!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, W, H);
  c.save(); c.beginPath(); c.roundRect(0, 0, W, H, 12); c.clip();
  const pat = patternCanvas(r.group, 512);
  c.drawImage(pat, (W - H) / 2, 0, H, H);
  c.restore();
}

export function mountSpiral(canvas: HTMLCanvasElement) {
  const scale = isMobile() ? 1.5 : 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile(), alpha: true });
  renderer.setPixelRatio(dpr(2, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 9;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    keepAlive = now() + 0.45;
  };

  const n = tiles.length;
  const tex = (cv: HTMLCanvasElement, linear: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(isMobile() ? 2 : 16, renderer.capabilities.getMaxAnisotropy());
    if (linear) t.minFilter = THREE.LinearFilter;
    return t;
  };
  // fronts: captured panels of the app window; a dark placeholder until each image decodes
  const fronts = tiles.map(() => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d')!; c.fillStyle = '#181b22'; c.beginPath(); c.roundRect(0, 0, W, H, 12); c.fill(); return cv; });
  const backs = tiles.map(() => { const cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale; return cv; });
  const fTex: THREE.Texture[] = fronts.map((cv) => tex(cv, true));
  const bTex = backs.map((cv) => tex(cv, false));
  backs.forEach((cv, k) => { paintBack(cv, k, scale); bTex[k].needsUpdate = true; });
  tiles.forEach((t, k) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `/sysbastion/ui/tile-${t.id}.webp`;
    img.decode().then(() => {
      const tx = new THREE.Texture(img);
      tx.colorSpace = THREE.NoColorSpace; tx.minFilter = THREE.LinearFilter; tx.generateMipmaps = false;
      tx.anisotropy = Math.min(isMobile() ? 2 : 16, renderer.capabilities.getMaxAnisotropy());
      tx.needsUpdate = true;
      fTex[k].dispose(); fTex[k] = tx;
      keepAlive = now() + 0.45;
    }).catch(() => {});
  });

  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 24, 16);
  const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  for (let i = 0; i < MESHES; i++) {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: fTex[0] }, uBack: { value: bTex[0] }, uBend: { value: CFG.bend }, uSmear: { value: 0 },
        uDir: { value: new THREE.Vector2(0, 1) }, uDim: { value: 1 }, uFlip: { value: 0 }, uCardH: { value: PLANE_H },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    }));
    group.add(m); meshes.push(m);
  }

  const mod = (v: number) => ((v % n) + n) % n;
  const pointer = { x: 0, y: 0 };
  let target = 0, pos = 0, lastPos = 0, vel = 0, tiltX = 0, tiltZ = 0;
  let frozen: number | null = null;
  let keepAlive = now() + 1, lastChange = now(), lastFrame = 0;
  let lp = -1, lx = 0, ly = 0;
  let active = true;
  const io = new IntersectionObserver(([e]) => (active = e.isIntersecting), { threshold: 0 });
  io.observe(canvas);

  resize();
  const offView = onViewport(resize);

  const tick = (_: number, dt: number) => {
    if (!active || S.loading && S.reveal <= 0) return;
    const t = now();
    const p = Math.min(S.p, S.spMax);
    const moved = Math.abs(p - lp) > 1e-5 || Math.abs(pointer.x - lx) > 1e-4 || Math.abs(pointer.y - ly) > 1e-4 || S.reveal < 1;
    if (moved) lastChange = t;
    // idle for 2s: drop to 30fps
    if (t - lastChange > 2 && t - lastFrame < 1 / 30) return;
    lastFrame = t;

    const deck = smooth(DECK0, DECK1, p);
    const one = smooth(ONE0, ONE1, p);
    const flip = smooth(FLIP0, FLIP1, p);
    const land = smooth(LAND0, LAND1, p);
    const still = Math.max(deck, one);
    const m = 1 - (1 - Math.min(1, Math.max(0, S.reveal))) ** 3;
    const radius = 12 + (CFG.radius - 12) * m;
    const speed = 1 + (CFG.autoSpeed - 1) * m;
    const cardS = 0.4 + (CFG.cardScale - 0.4) * m;

    target += speed * dt * (1 - deck);
    pos += (target - pos) * Math.min(1, dt * 8);
    if (Math.abs(target - pos) < 3e-4) pos = target;
    const v = (pos - lastPos) / Math.max(dt, 1e-3);
    lastPos = pos; vel += (v - vel) * 0.25;
    const smear = Math.min(0.055, Math.abs(vel) * 0.012 * CFG.smear);

    const sq = radius * CFG.squish;
    camera.position.z = sq + CAM_BACK;
    tiltX += (-pointer.y * CFG.mouseTilt - tiltX) * Math.min(1, dt * 4);
    tiltZ += (pointer.x * CFG.mouseTilt - tiltZ) * Math.min(1, dt * 4);
    group.rotation.x = tiltX * (1 - still);
    group.rotation.z = -tiltZ * (1 - still);
    const halfH = Math.tan((38 * Math.PI) / 360) * camera.position.z;
    const px = pointer.x * halfH * camera.aspect, py = pointer.y * halfH;

    if (deck > 0.001 && frozen === null) { const r0 = Math.round(pos); frozen = r0 - mod(r0); if (r0 - frozen > n / 2) frozen += n; }
    if (deck < 0.001) frozen = null;
    const base = (frozen ?? Math.round(pos)) - MID;
    // dock target: the slot's rect in the window, turned into world units at z = 0
    let dX = 0, dY = 0, dS = CFG.cardScale * 1.35;
    lastLand = land;
    if (land > 0 && S.dock) {
      const r = dockRect, cr = canvasRect;
      if (r && cr && r.width > 0 && cr.height > 0) {
        const ppw = cr.height / (2 * Math.tan((38 * Math.PI) / 360) * camera.position.z);
        dX = (r.left + r.width / 2 - cr.left - cr.width / 2) / ppw;
        dY = -(r.top + r.height / 2 - cr.top - cr.height / 2) / ppw;
        dS = r.width / ppw / PLANE_W;
      }
    }
    for (let i = 0; i < MESHES; i++) {
      const k = base + i, off = k - pos, ang = off * CFG.angleStep;
      const cs = Math.cos(ang), sn = Math.sin(ang), c = i - MID;
      let x = radius * sn + off * CFG.gapX, y = off * CFG.gapY;
      const dx = px - x, dy = py - y;
      const w = CFG.magnet * Math.exp(-(dx * dx + dy * dy) / 9) * (1 - deck);
      x += dx * w; y += dy * w;
      const z = sq * cs, twist = -sn * CFG.edgeTwist;
      const dim = Math.max(0.32, 0.5 + 0.5 * cs);
      const deckS = CFG.cardScale * 1.15, oneS = i === MID ? CFG.cardScale * 1.35 : 0;
      let X = mix(x, c * 0.004, deck), Y = mix(y, c * 0.0035, deck), Z = mix(z, -Math.abs(c) * 0.012, deck);
      let RY = mix(ang, 0, deck), RZ = mix(twist, 0, deck), SC = mix(cardS, deckS, deck), D = mix(dim, 1, deck);
      X = mix(X, 0, one); Y = mix(Y, 0, one); Z = mix(Z, 0, one); RY = mix(RY, 0, one); RZ = mix(RZ, 0, one);
      SC = mix(SC, oneS, one); D = mix(D, 1, one);
      if (i === MID) { X = mix(X, dX, land); Y = mix(Y, dY, land); SC = mix(SC, dS, land); }
      const mesh = meshes[i];
      mesh.position.set(X, Y, Z); mesh.rotation.set(0, RY, RZ); mesh.scale.setScalar(SC);
      mesh.renderOrder = Math.round(mix(z * 100, (50 - Math.abs(c)) * 2, still));
      const u = mesh.material.uniforms;
      u.uTex.value = fTex[mod(k)]; u.uBack.value = bTex[mod(k)];
      u.uBend.value = CFG.bend * (1 - one); u.uSmear.value = smear; u.uDim.value = D; u.uFlip.value = flip;
    }
    const spinning = !reducedMotion && deck < 0.999;
    if (moved || spinning || Math.abs(target - pos) > 3e-4) keepAlive = t + 0.45;
    lp = p; lx = pointer.x; ly = pointer.y;
    if (t <= keepAlive) renderer.render(scene, camera);
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the dock target is measured in the clock's read phase, before this frame's style writes
  let lastLand = 0, dockRect: DOMRect | null = null, canvasRect: DOMRect | null = null;
  const offRead = addRead(() => { if (lastLand > 0 && S.dock) { dockRect = S.dock(); canvasRect = canvas.getBoundingClientRect(); } });
  const off = addTick(tick);

  // pointer: tilt + magnet, drag to turn the spiral
  let drag: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') canvas.setPointerCapture?.(e.pointerId); drag = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    if (!drag) return;
    target += e.pointerType === 'touch' ? (e.clientX - drag.x) * 0.008 : -(e.clientY - drag.y) * 0.006;
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const up = () => (drag = null);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', up);

  return () => { off(); offRead(); offView(); io.disconnect(); geo.dispose(); meshes.forEach((m) => m.material.dispose()); fTex.forEach((t) => t.dispose()); bTex.forEach((t) => t.dispose()); renderer.dispose(); };
}

