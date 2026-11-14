// The cipher: eight Three.js drums (a cryptex). Each drum is a 12-face prism whose faces carry only
// the letters its words need plus filler glyphs, so the curvature stays visible. setWord() spins every
// drum forward to its letter with a stagger and a mechanical overshoot; each lock flashes red.
import { gsap } from 'gsap';
import * as THREE from 'three';

export const WORDS = ['SEE RISK', '  TEST  ', 'PROTECT ', ' WATCH  ', 'PRODUCTS', ' TRAIN  ', '  TALK  '];
const COUNT = 8;
const FACES = 12;
const FILL = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/&%';
const ATLAS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/&%';
const COLS = 8, ROWS = 6, CELL = 256;

function atlasTexture() {
  const c = document.createElement('canvas');
  c.width = COLS * CELL; c.height = ROWS * CELL;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${CELL * 0.78}px Manrope, Arial, sans-serif`;
  [...ATLAS].forEach((ch, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    x.fillText(ch, col * CELL + CELL / 2, row * CELL + CELL / 2 + CELL * 0.04);
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One drum: a 12-face prism around the X axis; face i shows ring[i]. Face 0 faces the camera at angle 0. */
function drumGeometry(ring: string[], w: number, R: number) {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = [];
  const half = Math.PI / FACES;
  ring.forEach((ch, i) => {
    const a = (i * 2 * Math.PI) / FACES;
    // Three's rotation.x = θ maps angle φ to φ − θ, so face i sits at +a and rotation a brings it front.
    const top = a + half, bot = a - half;
    const yz = (t: number) => [R * Math.sin(t), R * Math.cos(t)];
    const [yt, zt] = yz(top), [yb, zb] = yz(bot);
    const k = ATLAS.indexOf(ch), col = k % COLS, row = Math.floor(k / COLS);
    const u0 = col / COLS, u1 = (col + 1) / COLS, v0 = 1 - (row + 1) / ROWS, v1 = 1 - row / ROWS;
    const base = pos.length / 3;
    pos.push(-w / 2, yb, zb, w / 2, yb, zb, w / 2, yt, zt, -w / 2, yt, zt);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    const ny = Math.sin(a), nz = Math.cos(a);
    for (let q = 0; q < 4; q++) nor.push(0, ny, nz);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

const FACE_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN;
void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uHot, uHover; uniform vec3 uRed;
varying vec2 vUv; varying vec3 vN;
void main(){
  float f = clamp(vN.z, 0.0, 1.0);
  float g = texture2D(uMap, vUv).r;
  vec3 steel = vec3(0.075, 0.082, 0.095) * (0.18 + f * 0.95) + vec3(0.6) * pow(f, 40.0) * 0.08;
  float front = smoothstep(0.955, 0.995, f);
  vec3 ink = mix(vec3(0.42, 0.44, 0.48) * f, vec3(0.97), front);
  ink = mix(ink, uRed, front * max(uHot, uHover * 0.6));
  vec3 col = mix(steel, ink, g * (0.25 + f * 0.75));
  col *= 0.35 + 0.65 * smoothstep(0.0, 0.5, f);
  gl_FragColor = vec4(col, 1.0);
}`;
const CAP_FRAG = /* glsl */ `
varying vec2 vUv; varying vec3 vN;
void main(){ float f = clamp(vN.z, 0.0, 1.0); float l = 0.12 + 0.55 * pow(abs(vN.y) * 0.5 + f * 0.6, 2.0); gl_FragColor = vec4(vec3(l * 0.9, l * 0.92, l), 1.0); }`;

export type Cipher = { setWord: (i: number, instant?: boolean) => void; scramble: () => void; destroy: () => void };

export function createCipher(canvas: HTMLCanvasElement, opts: { reduced: boolean; layout: () => { cx: number; cy: number; width: number } }): Cipher {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 30000);
  const tex = atlasTexture();
  const red = new THREE.Color('#ff2b3a');

  // Rings: each drum gets the letters its words need, in order, plus filler up to 12 faces.
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rings = Array.from({ length: COUNT }, (_, j) => {
    const need: string[] = [];
    WORDS.forEach((w) => { const ch = w[j] ?? ' '; if (!need.includes(ch)) need.push(ch); });
    const ring = [...need];
    while (ring.length < FACES) ring.push(FILL[Math.floor(rnd() * FILL.length)]);
    // spread the needed letters around the ring so every change is a visible spin
    const out: string[] = new Array(FACES);
    need.forEach((ch, i) => { out[(i * 5) % FACES] = ch; });
    let f = need.length;
    for (let i = 0; i < FACES; i++) if (!out[i]) out[i] = ring[f++];
    return out;
  });

  const rig = new THREE.Group();
  scene.add(rig);
  const drums = rings.map((ring) => {
    const group = new THREE.Group();
    const mat = new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { uMap: { value: tex }, uHot: { value: 0 }, uHover: { value: 0 }, uRed: { value: red } } });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    group.add(mesh);
    const caps = [0, 1].map(() => new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1), new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: CAP_FRAG })));
    caps.forEach((c) => { c.rotation.z = Math.PI / 2; group.add(c); });
    rig.add(group);
    return { ring, group, mesh, mat, caps, angle: 0, nudge: 0, nv: 0, state: 0 };
  });

  // The lock window: two red rails and end brackets in front of the front faces.
  const railMat = new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.9 });
  const rails = [new THREE.Mesh(new THREE.PlaneGeometry(1, 1), railMat), new THREE.Mesh(new THREE.PlaneGeometry(1, 1), railMat)];
  rails.forEach((r) => rig.add(r));

  let dims = { w: 100, R: 200, gap: 8, H: 100 };
  const layout = () => {
    const vw = innerWidth, vh = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, vw < 760 ? 1.5 : 1.75));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.position.set(0, 0, (vh / 2) / Math.tan((camera.fov * Math.PI) / 360));
    camera.updateProjectionMatrix();
    const L = opts.layout();
    const w = L.width / (COUNT + (COUNT - 1) * 0.1);
    const H = w * 1.32;                                  // face height
    const R = H / (2 * Math.sin(Math.PI / FACES));
    dims = { w, R, gap: w * 0.1, H };
    drums.forEach((d, j) => {
      d.mesh.geometry.dispose();
      d.mesh.geometry = drumGeometry(d.ring, w, R);
      d.group.position.x = -L.width / 2 + w / 2 + j * (w + dims.gap);
      d.caps.forEach((c, k) => { c.scale.set(R * 1.04, w * 0.05, R * 1.04); c.position.x = (k ? 1 : -1) * (w / 2 + w * 0.025); });
    });
    rails.forEach((r, k) => { r.scale.set(L.width + w * 0.5, Math.max(2, w * 0.018), 1); r.position.set(0, (k ? 1 : -1) * (H / 2 + w * 0.06), R + 2); });
    rig.position.set(L.cx - vw / 2, vh / 2 - L.cy, -R); // front faces sit on z = 0: px-accurate
  };
  layout();
  addEventListener('resize', layout);
  document.fonts?.ready.then(() => { tex.image = atlasTexture().image; tex.needsUpdate = true; }); // redraw glyphs in Manrope

  const step = (2 * Math.PI) / FACES;
  const lockFlash = (d: (typeof drums)[number]) => { gsap.fromTo(d.mat.uniforms.uHot, { value: 1 }, { value: 0, duration: 0.9, ease: 'power2.out' }); };

  const setWord = (wi: number, instant = false) => {
    drums.forEach((d, j) => {
      const ch = WORDS[wi][j] ?? ' ';
      const target = d.ring.indexOf(ch);
      const cur = Math.round(d.angle / step);
      let delta = ((target - cur) % FACES + FACES) % FACES;
      if (delta === 0 && d.state !== wi) delta = FACES;   // still turn a full revolution: it reads as a lock
      d.state = wi;
      const to = (cur + delta + (instant ? 0 : FACES)) * step;
      gsap.killTweensOf(d);
      if (instant || opts.reduced) { d.angle = to; return; }
      gsap.to(d, { angle: to, duration: 1.05 + j * 0.06, delay: j * 0.055, ease: 'back.out(1.15)', onComplete: () => lockFlash(d) });
    });
  };
  const scramble = () => {
    drums.forEach((d, j) => {
      d.angle = Math.floor(rnd() * FACES) * step;
      const target = d.ring.indexOf(WORDS[0][j] ?? ' ');
      const to = (Math.round(d.angle / step) + FACES * (2 + Math.floor(j / 3)) + ((target - Math.round(d.angle / step)) % FACES + FACES) % FACES) * step;
      gsap.to(d, { angle: to, duration: 1.6 + j * 0.16, delay: 0.15, ease: 'expo.out', onComplete: () => lockFlash(d) });
    });
  };

  // Pointer: the rig tilts toward it; a drum under the pointer nudges and warms.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    tilt.tx = e.clientX / innerWidth - 0.5; tilt.ty = e.clientY / innerHeight - 0.5;
  };
  addEventListener('pointermove', onMove, { passive: true });
  let hovered: (typeof drums)[number] | null = null;

  const tick = (t: number) => {
    tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
    rig.rotation.y = opts.reduced ? 0 : tilt.x * 0.22 + Math.sin(t * 0.4) * 0.03;
    rig.rotation.x = opts.reduced ? 0 : tilt.y * 0.16;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(drums.map((d) => d.mesh), false)[0];
    const h = hit ? drums.find((d) => d.mesh === hit.object) ?? null : null;
    if (h !== hovered) { if (h && !opts.reduced) h.nv += 0.05; hovered = h; }
    drums.forEach((d) => {
      d.nv += -d.nudge * 0.12; d.nv *= 0.82; d.nudge += d.nv;
      d.mat.uniforms.uHover.value += ((d === hovered ? 1 : 0) - d.mat.uniforms.uHover.value) * 0.15;
      d.group.rotation.x = d.angle + d.nudge;
    });
    renderer.render(scene, camera);
  };
  gsap.ticker.add(tick);

  return {
    setWord, scramble,
    destroy: () => { gsap.ticker.remove(tick); removeEventListener('pointermove', onMove); removeEventListener('resize', layout); renderer.dispose(); },
  };
}

