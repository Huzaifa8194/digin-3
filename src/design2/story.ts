// Sanctuary: one field of GPU particles tells the brand story in five acts.
// Every particle carries five target positions (storm, streams, sphere, shield, finale); the vertex
// shader morphs between them by uAct with a per-particle stagger and a swirl mid-transition.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const VERT = /* glsl */ `
attribute vec3 a0; attribute vec3 a1; attribute vec3 a2; attribute vec3 a3; attribute vec3 a4;
attribute vec4 aInfo; // x random, y threat (0/1), z emphasis (edge / check / ring / word), w size
uniform float uAct, uTime, uSize, uPix;
varying vec3 vCol; varying float vA;

float expo(float i){ return i < 0.5 ? 0.9 : i < 1.5 ? 0.42 : i < 2.5 ? 0.16 : i < 3.5 ? 0.13 : 0.2; }
vec3 pick(float i){ return i < 0.5 ? a0 : i < 1.5 ? a1 : i < 2.5 ? a2 : i < 3.5 ? a3 : a4; }
vec3 storm(vec3 p, float r){
  float t = uTime * (0.25 + r * 0.35);
  return p + vec3(sin(t + p.y * 0.7), cos(t * 0.9 + p.z * 0.6), sin(t * 1.1 + p.x * 0.5)) * 0.55;
}
vec3 stream(vec3 p, float r){
  vec3 d = normalize(p); float L = length(p);
  float dist = mod(L - uTime * (0.9 + r * 1.2), 3.4) + 0.35;
  return d * dist;
}
vec3 sphere(vec3 p){ float a = uTime * 0.18; float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 live(float i, vec3 p, float r){
  if (i < 0.5) return storm(p, r);
  if (i < 1.5) return stream(p, r);
  if (i < 2.5) return sphere(p);
  return p + vec3(0.0, sin(uTime * 1.2 + r * 6.28) * 0.012, 0.0);
}
vec3 colorFor(float i, vec4 info){
  vec3 white = vec3(0.86, 0.9, 1.0), red = vec3(1.0, 0.13, 0.18), dim = vec3(0.35, 0.42, 0.55);
  if (i < 0.5) return info.y > 0.5 ? red : mix(dim, white, info.x * 0.6);
  if (i < 1.5) return info.y > 0.5 ? red : mix(dim, vec3(1.0, 0.45, 0.45), 0.35);
  if (i < 2.5) return info.y > 0.5 ? red * 1.3 : mix(dim, white, 0.55);
  float e3 = mod(info.z, 10.0), e4 = floor(info.z / 10.0);
  if (i < 3.5) return e3 > 0.5 ? white * 1.15 : vec3(2.2, 0.16, 0.24);
  return e4 > 1.5 ? white * 1.1 : e4 > 0.5 ? white : (e3 > 0.5 ? white * 0.9 : vec3(2.2, 0.16, 0.24));
}
void main(){
  float act = clamp(uAct, 0.0, 4.0);
  float i = floor(min(act, 3.999));
  float f = act - i;
  float r = aInfo.x;
  float k = smoothstep(0.0, 1.0, clamp((f - r * 0.35) / 0.65, 0.0, 1.0));
  vec3 A = live(i, pick(i), r), B = live(i + 1.0, pick(i + 1.0), r);
  vec3 p = mix(A, B, k);
  // swirl while travelling between formations
  float sw = sin(k * 3.14159);
  p += vec3(sin(r * 40.0 + uTime), cos(r * 31.0 + uTime * 0.8), sin(r * 23.0 - uTime)) * sw * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float emph = aInfo.y * 0.8 + min(1.0, mod(aInfo.z, 10.0) + floor(aInfo.z / 10.0)) * 0.35;
  gl_PointSize = uSize * aInfo.w * (1.0 + emph) * uPix / -mv.z;
  vCol = mix(colorFor(i, aInfo), colorFor(i + 1.0, aInfo), k);
  vA = (0.75 + 0.25 * sin(uTime * 2.0 + r * 30.0)) * mix(expo(i), expo(i + 1.0), k) * (1.0 + min(1.0, mod(aInfo.z, 10.0)) * 0.6 + aInfo.y * 1.2);
}`;
const FRAG = /* glsl */ `
varying vec3 vCol; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vCol * a, a * vA);
}`;

type V3 = [number, number, number];
const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** Shield outline (like the logo's): flat-ish top, curved sides to a point. */
function shieldOutline(): [number, number][] {
  const q = (a: [number, number], c: [number, number], b: [number, number], n: number) => Array.from({ length: n }, (_, i) => {
    const t = i / n; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]] as [number, number];
  });
  return [
    ...q([-1, 1.05], [0, 1.32], [1, 1.05], 40),
    ...q([1, 1.05], [1.02, 0.4], [1, 0.1], 20),
    ...q([1, 0.1], [0.95, -0.85], [0, -1.4], 40),
    ...q([0, -1.4], [-0.95, -0.85], [-1, 0.1], 40),
    ...q([-1, 0.1], [-1.02, 0.4], [-1, 1.05], 20),
  ];
}
function inside(poly: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function alongPolyline(pts: [number, number][], t: number): [number, number] {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = t * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) { const f = d / lens[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= lens[i]; }
  return pts[pts.length - 1];
}
function wordPoints(text: string, count: number): V3[] {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 220;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 190px Manrope, Arial, sans-serif';
  if ('letterSpacing' in x) (x as unknown as { letterSpacing: string }).letterSpacing = '-6px';
  x.fillText(text, 700, 115);
  const data = x.getImageData(0, 0, c.width, c.height).data;
  const hits: [number, number][] = [];
  for (let y = 0; y < c.height; y += 2) for (let xx = 0; xx < c.width; xx += 2) if (data[(y * c.width + xx) * 4] > 128) hits.push([xx, y]);
  return Array.from({ length: count }, () => {
    const [px, py] = hits[Math.floor(rnd() * hits.length)] || [700, 110];
    return [((px - 700) / 700) * 2.7, -((py - 110) / 700) * 2.7 - 0.55, (rnd() - 0.5) * 0.06];
  });
}

export type Story = { setAct: (a: number) => void; destroy: () => void };

export function createStory(canvas: HTMLCanvasElement, opts: { reduced: boolean }): Story {
  const mobile = innerWidth < 760;
  const N = mobile ? 22000 : 60000;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x030407, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030407, 0.035);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // ---- formations ----
  const outline = shieldOutline();
  const check: [number, number][] = [[-0.48, 0.02], [-0.1, -0.4], [0.55, 0.42]];
  const word = wordPoints('DIGIINN360', Math.floor(N * 0.26));
  const pos = Array.from({ length: 5 }, () => new Float32Array(N * 3));
  const info = new Float32Array(N * 4);
  let w = 0;
  for (let n = 0; n < N; n++) {
    const r = rnd(), threat = rnd() < 0.07 ? 1 : 0;
    // 0 storm: a wide turbulent slab
    const s0: V3 = [gauss() * 6.5, gauss() * 3.2, gauss() * 4.5 - 1];
    // 1 streams: 28 directions converging on the centre
    const k = Math.floor(rnd() * 28), th = (k / 28) * Math.PI * 2 + gauss() * 0.05, ph = Math.acos(((k * 7) % 28) / 14 - 1) + gauss() * 0.05;
    const dist = 0.35 + rnd() * 3.4;
    const s1: V3 = [Math.sin(ph) * Math.cos(th) * dist, Math.cos(ph) * dist, Math.sin(ph) * Math.sin(th) * dist];
    // 2 sphere (fibonacci), weak points cluster as threats
    const y = 1 - (n / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), phi = n * 2.39996;
    const R = 1.75 + (threat ? 0.06 : gauss() * 0.015);
    const s2: V3 = [Math.cos(phi) * rad * R, y * R, Math.sin(phi) * rad * R];
    // 3 shield: body fill, bright rim and check
    let s3: V3, emph = 0;
    const roll = rnd();
    if (roll < 0.2) { const [x2, y2] = alongPolyline([...outline, outline[0]], rnd()); s3 = [x2 * 1.25, y2 * 1.25, (rnd() - 0.5) * 0.18]; emph = 1; }
    else if (roll < 0.3) { const [x2, y2] = alongPolyline(check, rnd()); s3 = [x2 * 1.25 + gauss() * 0.025, y2 * 1.25 + gauss() * 0.025, 0.2]; emph = 1; }
    else { let x2 = 0, y2 = 0; do { x2 = rnd() * 2.1 - 1.05; y2 = rnd() * 2.8 - 1.42; } while (!inside(outline, x2, y2)); s3 = [x2 * 1.25, y2 * 1.25, gauss() * 0.06]; }
    // 4 finale: shield (smaller, raised) + wordmark + orbit ring
    let s4: V3; let emph4 = 0;
    if (n < word.length) { s4 = word[n]; emph4 = 2; }
    else if (rnd() < 0.3) { const a = rnd() * Math.PI * 2; const rr = 2.4 + gauss() * 0.025; s4 = [Math.cos(a) * rr, 1.05 + Math.sin(a) * rr * 0.22, Math.sin(a) * rr * 0.6]; emph4 = 1; }
    else s4 = [s3[0] * 0.5, s3[1] * 0.5 + 1.05, s3[2] * 0.5];
    [s0, s1, s2, s3, s4].forEach((s, f) => pos[f].set(s, n * 3));
    info.set([r, threat, emph + emph4 * 10, 0.6 + rnd() * 0.9], n * 4);
    w++;
  }
  void w;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos[3], 3)); // for bounds only
  ['a0', 'a1', 'a2', 'a3', 'a4'].forEach((name, f) => geo.setAttribute(name, new THREE.BufferAttribute(pos[f], 3)));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  const U = { uAct: { value: 0 }, uTime: { value: 0 }, uSize: { value: mobile ? 0.05 : 0.042 }, uPix: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // scan ring for act 3
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2b3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.008, 6, 200), ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // ---- post: bloom ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), mobile ? 0.6 : 0.75, 0.5, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(dpr);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / (mobile ? 2 : 1), innerHeight / (mobile ? 2 : 1));
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    U.uPix.value = innerHeight * dpr * 0.5;
  };
  resize();
  addEventListener('resize', resize);

  // ---- camera choreography per act ----
  const keys = [
    { r: 13, h: 1.2, az: -0.25, look: [0, 0, 0] },
    { r: 8.5, h: 0.6, az: 0.35, look: [0, 0, 0] },
    { r: 7.2, h: 1.4, az: 0.35, look: [0, 0, 0] },  // during act 3 the azimuth turns a full circle
    { r: 6.6, h: 0.1, az: 0, look: [0, 0.05, 0] },
    { r: 9.2, h: 0.5, az: 0, look: [0, -0.75, 0] },
  ];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const ss = (t: number) => t * t * (3 - 2 * t);
  let act = 0, target = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  let time = 0;
  // one clock: the gsap ticker (it pauses with the tab)
  const frame = (_t: number, dms: number) => {
    const dt = Math.min(0.05, dms / 1000);
    if (!opts.reduced) time += dt;
    act += (target - act) * (opts.reduced ? 1 : 1 - Math.pow(0.0009, dt));
    pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
    U.uAct.value = act; U.uTime.value = time;
    const i = Math.min(3, Math.floor(act)), f = ss(act - i);
    const A = keys[i], B = keys[i + 1];
    let az = lerp(A.az, B.az, f);
    if (act > 2 && act < 3) az += ss(act - 2) * Math.PI * 2;                 // act 3: the full 360° orbit
    else if (act >= 3) az += Math.PI * 2;
    az += pointer.x * 0.35 + (opts.reduced ? 0 : Math.sin(time * 0.15) * 0.06);
    const r = lerp(A.r, B.r, f), h = lerp(A.h, B.h, f) + pointer.y * -0.6;
    camera.position.set(Math.sin(az) * r, h, Math.cos(az) * r);
    camera.lookAt(lerp(A.look[0], B.look[0], f), lerp(A.look[1], B.look[1], f), lerp(A.look[2], B.look[2], f));
    const scanW = Math.max(0, 1 - Math.abs(act - 2) * 1.6);
    ringMat.opacity = scanW * 0.9;
    ring.position.y = Math.sin(time * 1.6) * 1.6;
    composer.render();
  };
  gsap.ticker.add(frame);

  return {
    setAct: (a) => { target = Math.max(0, Math.min(4, a)); },
    destroy: () => { gsap.ticker.remove(frame); removeEventListener('resize', resize); renderer.dispose(); },
  };
}
