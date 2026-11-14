// The 360 core: a geodesic shield in Three.js, floating at the radar's centre. It turns with the
// page's bearing (see it from every angle) and changes state per chapter:
//   000 See: panels missing, red risks in the gaps (drag to look around)
//   072 Test: a red scan plane slices through it     144 Protect: gaps fly in and lock, turns blue
//   216 Watch: orbit rings and sensors               288 Build: exploded view
//   360 Talk: whole, calm, blue
// Per the skill: Three is lazy-imported after the hero paints, has its own canvas, renders on the
// gsap clock only while visible, never blocks the loader, and is off under reduced motion.
import { gsap } from 'gsap';
import type { Group, Mesh } from 'three';
import { home } from './state';
import { isTouch, prefersReducedMotion } from '../engine';

// Chapter parameters by bearing: [deg, close, scan, watch, explode, cool]
const TABLE: number[][] = [
  [0, 0, 0, 0, 0, 0],
  [72, 0, 1, 0, 0, 0.15],
  [144, 1, 0, 0, 0, 0.85],
  [216, 1, 0, 1, 0, 0.95],
  [288, 1, 0, 0.2, 1, 1],
  [360, 1, 0, 0.35, 0, 1],
];
function params(deg: number) {
  const d = Math.max(0, Math.min(360, deg));
  for (let i = 0; i < TABLE.length - 1; i++) {
    const a = TABLE[i], b = TABLE[i + 1];
    if (d <= b[0]) { const f = (d - a[0]) / (b[0] - a[0]); const k = f * f * (3 - 2 * f); return a.map((v, j) => v + (b[j] - v) * k); }
  }
  return TABLE[TABLE.length - 1];
}

const SHELL_VERT = /* glsl */ `
attribute vec3 aCenter; attribute float aRand; attribute float aGap; attribute vec3 aBary;
uniform float uTime, uExplode, uClose, uAssemble;
varying vec3 vBary; varying float vGap; varying vec3 vN; varying vec3 vView; varying float vRand; varying vec3 vWorld;
void main(){
  vec3 n = normalize(aCenter);
  float open = aGap * (1.0 - uClose);
  float inset = 0.9 - open * 0.8;
  vec3 p = aCenter + (position - aCenter) * inset;
  float push = uExplode * (0.25 + aRand * 0.65) + open * 0.75 + (1.0 - uAssemble) * (2.2 + aRand * 3.5);
  p += n * push;
  p += n * sin(uTime * 1.3 + aRand * 6.2831) * 0.012;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * world;
  vWorld = world.xyz; vView = -mv.xyz; vN = normalize(mat3(modelMatrix) * n); vBary = aBary; vGap = open; vRand = aRand;
  gl_Position = projectionMatrix * mv;
}`;
const SHELL_FRAG = /* glsl */ `
uniform float uCool, uScanY, uScanOn, uTime, uScale, uAssemble;
varying vec3 vBary; varying float vGap; varying vec3 vN; varying vec3 vView; varying float vRand; varying vec3 vWorld;
void main(){
  float edge = min(min(vBary.x, vBary.y), vBary.z);
  float line = 1.0 - smoothstep(0.0, 0.04, edge);
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.2);
  vec3 risk = vec3(1.0, 0.22, 0.28), safe = vec3(0.45, 0.74, 1.0);
  vec3 tint = mix(risk, safe, uCool);
  vec3 col = vec3(0.025, 0.06, 0.12) + safe * fres * 0.45;
  col += mix(safe, tint, 0.55) * line * (0.5 + fres * 0.9);
  float band = (1.0 - smoothstep(0.0, 0.07 * uScale, abs(vWorld.y - uScanY))) * uScanOn;
  col += risk * band * (0.9 + step(0.6, vRand) * 1.4);
  col += risk * vGap * (0.7 + 0.5 * sin(uTime * 6.0 + vRand * 12.0));
  float a = clamp(0.32 + line * 0.6 + fres * 0.35 + band * 0.6 + vGap * 0.4, 0.0, 1.0) * uAssemble;
  gl_FragColor = vec4(col, a);
}`;
const CORE_FRAG = /* glsl */ `
uniform float uCool, uTime, uAssemble;
varying vec3 vN; varying vec3 vView;
void main(){
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 1.6);
  vec3 c = mix(vec3(1.0, 0.25, 0.3), vec3(0.4, 0.7, 1.0), uCool);
  float pulse = 0.65 + 0.35 * sin(uTime * 2.4);
  gl_FragColor = vec4(c * (0.35 + fres * 1.4) * pulse, (0.5 + fres * 0.5) * uAssemble);
}`;
const CORE_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vView = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const DOT_VERT = /* glsl */ `
uniform float uSize, uOpen, uTime; attribute float aRand; varying float vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = uOpen * (0.6 + 0.4 * sin(uTime * 5.0 + aRand * 9.0)); gl_PointSize = uSize * (0.7 + aRand * 0.6); gl_Position = projectionMatrix * mv; }`;
const DOT_FRAG = /* glsl */ `
varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float g = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.25, 0.3) * (0.6 + g), g * vA); }`;

export function startCore() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-core]');
  if (!canvas || prefersReducedMotion()) return;
  // Fetch Three in parallel with the loader (never blocks it); build and render only after the handoff.
  const mod = import('three');
  const go = () => { load(canvas, mod).catch(() => canvas.remove()); };
  if (home.ready) go();
  else { const id = setInterval(() => { if (home.ready) { clearInterval(id); go(); } }, 120); }
}

async function load(canvas: HTMLCanvasElement, mod: Promise<typeof import('three')>) {
  const THREE = await mod;
  const mobile = () => innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile(), powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);

  // ---- geodesic shell: one non-indexed geometry, per-face attributes ----
  const ico = new THREE.IcosahedronGeometry(1, mobile() ? 2 : 3).toNonIndexed();
  const pos = ico.getAttribute('position');
  const n = pos.count;
  const aCenter = new Float32Array(n * 3), aRand = new Float32Array(n), aGap = new Float32Array(n), aBary = new Float32Array(n * 3);
  const gapCenters: number[] = [], gapRand: number[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let f = 0; f < n; f += 3) {
    const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
    const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
    const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
    const r = rnd(), gap = r < 0.14 ? 1 : 0;
    if (gap) { const l = Math.hypot(cx, cy, cz); gapCenters.push((cx / l) * 0.93, (cy / l) * 0.93, (cz / l) * 0.93); gapRand.push(rnd()); }
    for (let k = 0; k < 3; k++) {
      aCenter.set([cx, cy, cz], (f + k) * 3);
      aRand[f + k] = rnd();
      aGap[f + k] = gap;
      aBary.set(k === 0 ? [1, 0, 0] : k === 1 ? [0, 1, 0] : [0, 0, 1], (f + k) * 3);
    }
  }
  ico.setAttribute('aCenter', new THREE.BufferAttribute(aCenter, 3));
  ico.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  ico.setAttribute('aGap', new THREE.BufferAttribute(aGap, 1));
  ico.setAttribute('aBary', new THREE.BufferAttribute(aBary, 3));
  const U = {
    uTime: { value: 0 }, uExplode: { value: 0 }, uClose: { value: 0 }, uAssemble: { value: 0 }, uCool: { value: 0 },
    uScanY: { value: 0 }, uScanOn: { value: 0 }, uScale: { value: 1 },
  };
  const shell = new THREE.Mesh(ico, new THREE.ShaderMaterial({ vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide }));

  const coreU = { uCool: U.uCool, uTime: U.uTime, uAssemble: U.uAssemble };
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.ShaderMaterial({ vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, uniforms: coreU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gapCenters), 3));
  dotGeo.setAttribute('aRand', new THREE.BufferAttribute(new Float32Array(gapRand), 1));
  const dotU = { uSize: { value: 16 }, uOpen: { value: 0 }, uTime: U.uTime };
  const dots = new THREE.Points(dotGeo, new THREE.ShaderMaterial({ vertexShader: DOT_VERT, fragmentShader: DOT_FRAG, uniforms: dotU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  // ---- watch: orbit rings with sensors ----
  const orbits = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x8cc0ff, transparent: true, opacity: 0, depthWrite: false });
  const satMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false });
  const sats: { m: Mesh; ring: Group; speed: number; phase: number }[] = [];
  [[1.45, 0.4, 0.1], [1.62, -0.6, 0.9], [1.8, 1.1, -0.4]].forEach(([rad, rx, rz], i) => {
    const g = new THREE.Group(); g.rotation.set(rx, 0, rz);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(rad, 0.0035, 6, 180), ringMat));
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), satMat);
      g.add(m); sats.push({ m, ring: g, speed: 0.6 + i * 0.25, phase: k * Math.PI + i });
      (m.userData as { rad: number }).rad = rad;
    }
    orbits.add(g);
  });

  const obj = new THREE.Group();
  obj.add(core, shell, dots, orbits);
  scene.add(obj);

  // ---- sizing: world units = CSS px at z = 0 ----
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, (h / 2) / Math.tan((camera.fov * Math.PI) / 360));
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // ---- drag to look from any angle (fine pointers and touch, on empty space) ----
  const look = { yaw: 0, pitch: 0, vy: 0, vp: 0, drag: false, x: 0, y: 0 };
  addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('a, button, input, select, textarea, summary, label, header, [data-card]')) return;
    look.drag = true; look.x = e.clientX; look.y = e.clientY;
  });
  addEventListener('pointermove', (e) => {
    if (!look.drag) return;
    look.vy = (e.clientX - look.x) * 0.008; look.vp = (e.clientY - look.y) * 0.006;
    look.x = e.clientX; look.y = e.clientY;
  }, { passive: true });
  addEventListener('pointerup', () => { look.drag = false; });
  const tilt = { x: 0, y: 0 };
  if (!isTouch()) addEventListener('pointermove', (e) => { tilt.x = e.clientX / innerWidth - 0.5; tilt.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  // ---- intro: panels fly in and assemble ----
  gsap.to(U.uAssemble, { value: 1, duration: 1.8, ease: 'expo.out' });
  canvas.classList.add('is-on');

  const cur = params(0);
  gsap.ticker.add((t) => {
    if (home.footer) return;
    const p = params(home.scrollDeg);
    for (let i = 1; i < p.length; i++) cur[i] += (p[i] - cur[i]) * 0.08;
    const [, close, scan, watch, explode, cool] = cur;
    const R = home.r * (mobile() ? 0.5 : 0.56);
    obj.position.set(home.cx - innerWidth / 2, innerHeight / 2 - home.cy, 0);
    obj.scale.setScalar(R);
    look.yaw += look.vy; look.pitch = Math.max(-0.9, Math.min(0.9, look.pitch + look.vp));
    look.vy *= 0.93; look.vp *= 0.85;
    obj.rotation.y = (home.scrollDeg * Math.PI) / 180 + look.yaw + t * 0.12 + tilt.x * 0.35;
    obj.rotation.x = 0.28 + look.pitch + tilt.y * 0.25;
    U.uTime.value = t;
    U.uClose.value = close; U.uExplode.value = explode; U.uCool.value = cool;
    U.uScanOn.value = scan; U.uScanY.value = obj.position.y + Math.sin(t * 2.2) * R * 1.05; U.uScale.value = R;
    dotU.uOpen.value = (1 - close) * U.uAssemble.value;
    dotU.uSize.value = (mobile() ? 10 : 16) * renderer.getPixelRatio();
    ringMat.opacity = watch * 0.6; satMat.opacity = watch;
    orbits.scale.setScalar(1 + (1 - watch) * 0.25);
    sats.forEach((s) => { const a = t * s.speed + s.phase, rad = (s.m.userData as { rad: number }).rad; s.m.position.set(Math.cos(a) * rad, Math.sin(a) * rad, 0); });
    renderer.render(scene, camera);
  });
}
