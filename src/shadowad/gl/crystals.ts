// Chapter 2: the descent past the fleet. Each module is a clean, bevelled glass icon of what that part
// of shadowAD does (control panel, terminal, domain tree, reticle, shield, report), its key part lit amber.
// Dot grid and out-of-focus words drift behind.
import * as THREE from 'three';
import { clamp, lerp, range, smooth, easeInOut, rng, dotTexture, blurTextTexture } from './util';
import { buildIcon, ICON_KINDS } from './icons3d';
import type { Bakes } from './bake';
import type { Frame } from './bastion';

export const N_CRYSTALS = 6;

const GAP = 13;
const BG = new THREE.Color('#15171c');   // inside the engine: near-black, like the shadowAD console

export function createCrystals(env: { envMap: THREE.Texture; maxAniso: number; bakes: Bakes }) {
  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.FogExp2(BG.getHex(), 0.03);
  scene.environment = env.envMap;
  scene.environmentIntensity = 0.85;
  const r = rng(77);

  scene.add(new THREE.HemisphereLight('#c9d2e6', '#2a2620', 0.9));
  const key = new THREE.DirectionalLight('#eef2ff', 2.0); key.position.set(-4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffb547', 2.4); rim.position.set(6, -3, -6); scene.add(rim);   // amber rim from behind

  // ---------- materials: two for all six icons ----------
  // glazed ceramic, the clay-icon look: soft satin base under a sharp clear coat, smooth normals and no
  // surface map, so the bevels carry every highlight. No transmission: that saves a whole scene pass.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#b9bfca', metalness: 0, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.06,
    sheen: 0.3, sheenColor: new THREE.Color('#ffd7a0'), sheenRoughness: 0.5, envMapIntensity: 1.05,
  });
  // the part that does the work is solid shadowAD amber, lit from within just enough to bloom at the edges
  const amberMat = new THREE.MeshPhysicalMaterial({ color: '#f5a524', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color('#ff8a10'), emissiveIntensity: 0.55, envMapIntensity: 0.9 });
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.9, 1.25, 0.45), transparent: true, opacity: 0.55, fog: false, toneMapped: false, depthWrite: false });
  const dotMat = new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), transparent: true, depthWrite: false, color: new THREE.Color(2.6, 1.6, 0.5), toneMapped: false, fog: false });

  type C = { group: THREE.Group; model: THREE.Group; wires: THREE.LineSegments; seed: number; h: number; anchors: THREE.Vector3[] };
  const crystals: C[] = [];
  for (let i = 0; i < N_CRYSTALS; i++) {
    const group = new THREE.Group();
    group.position.set(0, -i * GAP, 0);
    const rr = rng(100 + i * 7);
    const model = buildIcon(ICON_KINDS[i], glassMat, amberMat);
    // hairline triangles around the crystal
    const wp: number[] = [], dp: number[] = [];
    const shell = () => { const a = rr() * Math.PI * 2, u = rr() * 1.6 - 0.8; const rad = 2.1 + rr() * 0.7; return new THREE.Vector3(Math.cos(a) * rad * Math.sqrt(1 - u * u), u * 2.3, -1.4 - rr() * 1.2); };
    for (let k = 0; k < 3; k++) {
      const a = shell(), b = shell(), c = a.clone().lerp(b, 0.5).multiplyScalar(1.25).add(new THREE.Vector3((rr() - 0.5) * 1.2, (rr() - 0.5) * 1.2, -0.3));
      wp.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y, b.z, c.x, c.y, c.z, c.x, c.y, c.z, a.x, a.y, a.z);
      dp.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    const wires = new THREE.LineSegments(wg, lineMat);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    const dots = new THREE.Points(dg, dotMat);
    const spin = new THREE.Group();
    spin.add(model);
    group.add(spin, wires, dots);
    scene.add(group);
    crystals.push({
      group, model, wires, seed: rr(), h: 0,
      anchors: [new THREE.Vector3(-0.55, 1.05, 0.5), new THREE.Vector3(1.05, 0.55, 0.3), new THREE.Vector3(0.5, -1.25, 0.5)].map((v) => v.add(group.position)),
    });
  }

  // ---------- dot grid ----------
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uFade: { value: 1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uFade; varying vec3 vW;
      void main(){ vec2 g = fract(vW.xy / 1.05) - .5; float d = length(g); float a = smoothstep(.055, .025, d) * .55 * uFade;
        gl_FragColor = vec4(vec3(1.), a * .26); }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(90, GAP * N_CRYSTALS + 80), gridMat);
  grid.position.set(0, -GAP * (N_CRYSTALS - 1) / 2, -9);
  scene.add(grid);

  // ---------- soft light pools behind each crystal ----------
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,170,60,.5)'); gr.addColorStop(0.5, 'rgba(255,150,40,.12)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  crystals.forEach((c, i) => {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, fog: false, opacity: 0.3 }));
    pool.position.set(i % 2 ? 2.5 : -2.5, c.group.position.y + 1.5, -7.5);
    scene.add(pool);
  });

  // ---------- out-of-focus words ----------
  const WORDS = [['52 AGENTS'], ['SCOPE 10.10.10.0/24'], ['REVIEW MODE', 'NON-DESTRUCTIVE'], ['AUTH-2026-014'], ['EXEC'], ['ADVISORY'], ['AUDITED'], ['IN SCOPE'], ['NO PERSISTENCE'], ['LOCALHOST'], ['evidence/'], ['RATE-LIMITED'], ['report.md'], ['18 DOMAINS']];
  const words: THREE.Mesh[] = [];
  for (let k = 0; k < 26; k++) {
    const lines = WORDS[k % WORDS.length];
    const tex = blurTextTexture(lines, 1024, lines.length > 1 ? 300 : 180, 4 + r() * 7, 0.8);
    const w = 7 + r() * 5;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * (lines.length > 1 ? 300 : 180) / 1024), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.05 + r() * 0.08 }));
    const side = k % 2 ? 1 : -1;
    mesh.position.set(side * (3.5 + r() * 7), 8 - r() * (GAP * N_CRYSTALS + 8), -3 - r() * 6);
    mesh.userData.drift = 0.15 + r() * 0.35;
    words.push(mesh); scene.add(mesh);
  }

  // ---------- motes ----------
  const MN = 900;
  const mp = new Float32Array(MN * 3);
  for (let i = 0; i < MN; i++) { mp[i * 3] = (r() - 0.5) * 30; mp[i * 3 + 1] = 10 - r() * (GAP * N_CRYSTALS + 20); mp[i * 3 + 2] = -8 + r() * 14; }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.55, color: '#ffd9a0' }));
  scene.add(motes);

  // ---------- state ----------
  let f = -1;           // camera position in crystal units
  let hover = -1, open = -1;
  const focus = new Float32Array(N_CRYSTALS);
  const openK = new Float32Array(N_CRYSTALS);
  const raycaster = new THREE.Raycaster();
  const dwell = (x: number) => { const k = Math.floor(x); const fr = x - k; return k + fr - Math.sin(fr * Math.PI * 2) / (Math.PI * 2) * 0.55; };
  const tmp = new THREE.Vector3();
  const edgeV = new THREE.Vector3(), edgeOff = new THREE.Vector3(1.45, 0, 0);

  function update(fr: Frame) {
    const { t, dt, local: s, cam } = fr;
    const portrait = fr.aspect < 1 ? 1 + (1 / fr.aspect - 1) * 0.7 : 1;
    f = dwell(lerp(-0.85, N_CRYSTALS - 0.15, s));
    const y = -f * GAP;
    cam.position.set(fr.pointer.x * 0.6 + Math.sin(t * 0.2) * 0.1, y + 0.25 + fr.pointer.y * 0.3, 7.8 * portrait);
    cam.lookAt(0, y, 0);
    cam.fov = 40 * (fr.aspect < 1 ? 1.1 : 1); cam.near = 0.1; cam.far = 200;
    cam.updateProjectionMatrix();

    crystals.forEach((c, i) => {
      const d = Math.abs(f - i);
      focus[i] = clamp(1 - d / 0.42);
      const target = open === i ? 1 : 0;
      openK[i] += (target - openK[i]) * Math.min(1, dt * 3);
      const spin = c.group.children[0] as THREE.Group;
      // sway rather than spin, so flat subjects (page, shield) never turn edge-on to the visitor
      spin.rotation.y = Math.sin(t * (0.22 + c.seed * 0.08) + c.seed * 6) * 0.5 + (f - i) * 0.7 + openK[i] * 0.5;
      spin.rotation.x = Math.sin(t * 0.3 + c.seed * 4) * 0.1 + (f - i) * 0.2;
      spin.rotation.z = Math.sin(t * 0.23 + c.seed * 9) * 0.08;
      spin.position.y = Math.sin(t * 0.6 + c.seed * 5) * 0.08;
      const hk = hover === i ? 1 : 0;
      c.h += (hk - c.h) * Math.min(1, dt * 6);
      spin.scale.setScalar(1 + c.h * 0.05 + openK[i] * 0.18);

      c.wires.rotation.z = Math.sin(t * 0.05 + c.seed * 3) * 0.2;
      c.group.visible = d < 1.2;
    });
    lineMat.opacity = 0.2;
    words.forEach((w, k) => { w.position.x += Math.sin(t * 0.1 + k) * 0.002; w.position.y += w.userData.drift * dt * 0.15; });
    motes.rotation.y = t * 0.01;
    tmp.set(0, 0, 0);
  }

  // a sphere per crystal is plenty for hover and click, and costs nothing next to a triangle raycast
  const hitSphere = new THREE.Sphere();
  function pick(ndc: THREE.Vector2, cam: THREE.Camera) {
    raycaster.setFromCamera(ndc, cam);
    for (let i = 0; i < N_CRYSTALS; i++) {
      if (focus[i] < 0.4) continue;
      hitSphere.set(crystals[i].group.position, 1.45);
      if (raycaster.ray.intersectsSphere(hitSphere)) return i;
    }
    return -1;
  }

  return {
    scene, update, pick, focus,
    centers: crystals.map((c) => c.group.position),
    /** a point on the crystal's silhouette, for sizing the on-screen frame */
    edge(i: number) { return edgeV.copy(crystals[i].group.position).add(edgeOff); },
    anchors: crystals.map((c) => c.anchors),
    get f() { return f; },
    setHover(i: number) { hover = i; },
    setOpen(i: number) { open = i; },
    /** scroll fraction (0..1 within the chapter) that centres crystal i */
    centerOf(i: number) {
      // invert dwell(lerp(-0.85, N - 0.15, s)) = i : dwell(k) = k, so lerp(...) = i
      return (i + 0.85) / (N_CRYSTALS - 0.15 + 0.85);
    },
  };
}
export type Crystals = ReturnType<typeof createCrystals>;
void smooth; void easeInOut; void range;
