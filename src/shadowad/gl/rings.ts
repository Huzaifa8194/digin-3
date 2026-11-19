// Chapter 3: the shattered mark. Stones fly in and lock into three broken rings, the disc behind
// them lights up with a web and a particle core, then the rings turn and open into a portal.
import * as THREE from 'three';
import { clamp, lerp, range, smooth, easeInOut, easeOut, rng, dotTexture } from './util';
import { ringPieces } from './objects';
import type { Bakes } from './bake';
import type { Frame } from './bastion';

const BG = new THREE.Color('#121318');

export function createRings(env: { envMap: THREE.Texture; bakes: Bakes }) {
  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.FogExp2(BG.getHex(), 0.018);
  scene.environment = env.envMap;
  scene.environmentIntensity = 0.42;
  const r = rng(5);

  scene.add(new THREE.HemisphereLight('#b3bdd2', '#1b1915', 0.8));
  const key = new THREE.DirectionalLight('#dfe6f5', 1.5); key.position.set(-6, 9, 10); scene.add(key);
  const back = new THREE.PointLight('#ffb547', 0, 14, 1.4); back.position.set(0, 0, -1.2); scene.add(back);

  const stone = new THREE.MeshStandardMaterial({ color: '#727986', roughness: 0.6, metalness: 0.1, normalMap: env.bakes.stoneNormal, normalScale: new THREE.Vector2(1.2, 1.2) });
  const cubeMat = new THREE.MeshStandardMaterial({ color: '#3a2a14', roughness: 0.45, metalness: 0, emissive: new THREE.Color('#ff9a1f'), emissiveIntensity: 1.9 });
  const mark = new THREE.Group();
  scene.add(mark);
  const ringGroups = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); mark.add(g); return g; });
  const Z = [0, 0.32, 0.6, 0.82];
  type P = { mesh: THREE.Mesh; ring: number; from: THREE.Vector3; fromQ: THREE.Quaternion; delay: number };
  const pieces: P[] = ringPieces().map(({ geo, ring }) => {
    // planar UVs for the bump map
    const pa = geo.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pa.count * 2);
    for (let k = 0; k < pa.count; k++) { uv[k * 2] = pa.getX(k) * 0.35 + pa.getZ(k) * 0.2; uv[k * 2 + 1] = pa.getY(k) * 0.35; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // the shadowAD cube at the core burns amber; the controls around it are stone
    const mesh = new THREE.Mesh(geo, ring === 3 ? cubeMat : stone);
    ringGroups[ring].add(mesh);
    const a = r() * Math.PI * 2, d = 9 + r() * 12;
    const from = new THREE.Vector3(Math.cos(a) * d, Math.sin(a) * d * 0.8, -10 + r() * 16);
    const fromQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    return { mesh, ring, from, fromQ, delay: ring * 0.06 + r() * 0.12 };
  });
  ringGroups.forEach((g, k) => (g.position.z = Z[k]));

  // the lit disc behind the mark
  const discMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, fog: false,
    uniforms: { uK: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv*2.-1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uK; uniform float uT; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float r = length(vUv);
        float rim = smoothstep(.78, .955, r) * smoothstep(1.0, .955, r);
        float milk = smoothstep(1.0, .15, r) * .3;
        float cl = n(vUv*5. + uT*.08) * n(vUv*11. - uT*.05);
        float a = (rim * 2.6 + milk * (.6 + cl * .9)) * uK;
        vec3 c = mix(vec3(1.0, .55, .16), vec3(1.0, .82, .55), rim) * (1. + rim * 2.);
        gl_FragColor = vec4(c, clamp(a, 0., 1.) * smoothstep(1.0, .97, r)); }`,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.45, 96), discMat);
  disc.position.z = -0.45;
  mark.add(disc);

  // web of hairlines inside the disc
  const webPts: THREE.Vector2[] = [];
  for (let k = 0; k < 120; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.9; webPts.push(new THREE.Vector2(Math.cos(a) * d, Math.sin(a) * d)); }
  const wp: number[] = [];
  webPts.forEach((p, i) => {
    const near = webPts.map((q, j) => ({ j, d: p.distanceTo(q) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3);
    near.forEach(({ j }) => { if (j > i) wp.push(p.x, p.y, -0.2, webPts[j].x, webPts[j].y, -0.2); });
  });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  const webMat = new THREE.LineBasicMaterial({ color: new THREE.Color(2.7, 1.5, 0.42), transparent: true, opacity: 0, toneMapped: false, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const web = new THREE.LineSegments(wg, webMat);
  mark.add(web);

  // particle core
  const CN = 2400;
  const cp = new Float32Array(CN * 3), cr = new Float32Array(CN);
  for (let i = 0; i < CN; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 0.95;
    cp[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * d; cp[i * 3 + 1] = u * d; cp[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * d * 0.6; cr[i] = r();
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('aR', new THREE.BufferAttribute(cr, 1));
  const coreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    uniforms: { uT: { value: 0 }, uK: { value: 0 }, uMap: { value: dotTexture(32, 0.3) }, uPx: { value: 1 } },
    vertexShader: `uniform float uT; uniform float uK; uniform float uPx; attribute float aR; varying float vA;
      void main(){ vec3 p = position; float t = uT*(.4+aR*.6);
        p += vec3(sin(t+aR*20.), cos(t*1.3+aR*13.), sin(t*.7+aR*7.)) * .09;
        p *= .6 + uK*.55;
        vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*(1.+aR*2.2)*(10./-mv.z); vA = uK*(.4+aR*.6); }`,
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(2.9,1.85,.7)*a*vA, a*vA); }',
  });
  const core = new THREE.Points(cg, coreMat);
  core.position.z = 0.4;
  mark.add(core);

  // light streaks in the haze
  const streakTex = (() => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const streaks: THREE.Mesh[] = [];
  for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3 + r() * 1.2, 30), new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: 0.025 + r() * 0.04, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.position.set((r() - 0.5) * 30, (r() - 0.5) * 10, -12 - r() * 8);
    m.rotation.z = (r() - 0.5) * 1.4;
    streaks.push(m); scene.add(m);
  }

  const tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), idQ = new THREE.Quaternion();
  const CONTROL_ANGLES = [150, 90, 30, 210, 270, 330].map((d) => (d * Math.PI) / 180);
  const controlAnchors = CONTROL_ANGLES.map(() => new THREE.Vector3());

  function update(f: Frame) {
    const { t, local: s, cam } = f;
    const portrait = f.aspect < 1 ? 1 + (1 / f.aspect - 1) * 0.85 : 1;
    pieces.forEach((p) => {
      const k = easeInOut(range(s, 0.02 + p.delay, 0.3 + p.delay));
      tmpP.copy(p.from).multiplyScalar(1 - k);
      tmpQ.copy(p.fromQ).slerp(idQ, k);
      p.mesh.position.copy(tmpP);
      p.mesh.quaternion.copy(tmpQ);
    });
    const glowK = smooth(range(s, 0.36, 0.6));
    const portal = range(s, 0.64, 1);
    const pe = easeInOut(portal);
    discMat.uniforms.uK.value = glowK * (1 - smooth(range(portal, 0.55, 0.9)) * 0.4);
    discMat.uniforms.uT.value = t;
    webMat.opacity = glowK * 0.55 * (1 - smooth(range(portal, 0.3, 0.7)));
    coreMat.uniforms.uK.value = smooth(range(s, 0.45, 0.68));
    coreMat.uniforms.uT.value = t;
    coreMat.uniforms.uPx.value = cam.userData.px ?? 1;
    back.intensity = glowK * 14;
    // idle turn of the assembled mark, and the opposite spins of the portal
    ringGroups[0].rotation.z = Math.sin(t * 0.15) * 0.03 + pe * 0.6;
    ringGroups[1].rotation.z = -pe * 2.2 + Math.sin(t * 0.2) * 0.04;
    ringGroups[2].rotation.z = pe * 3.1;
    ringGroups[3].rotation.z = -pe * 1.4;
    ringGroups[0].scale.setScalar(1 + pe * 1.6);
    ringGroups[1].scale.setScalar(1 + pe * 0.9);
    ringGroups[2].scale.setScalar(1 + pe * 0.5);
    ringGroups[0].position.z = Z[0] - pe * 3;
    mark.rotation.y = Math.sin(t * 0.18) * 0.05 + f.pointer.x * 0.06;
    mark.rotation.x = Math.sin(t * 0.14) * 0.04 - f.pointer.y * 0.05;

    // camera: from low-left, square up, then fly through the centre
    const a = easeOut(range(s, 0, 0.5));
    cam.position.set(lerp(-5, 0, a) + f.pointer.x * 0.4, lerp(-3.2, 0, a) + f.pointer.y * 0.25, lerp(21, 17.5, a) * portrait - pe * 17.2 * portrait);
    cam.lookAt(0, 0, -4 * pe);
    cam.fov = lerp(42, 64, pe) * (f.aspect < 1 ? 1.1 : 1); cam.near = 0.05; cam.far = 200;
    cam.updateProjectionMatrix();
    streaks.forEach((m, k) => { m.rotation.z += Math.sin(t * 0.05 + k) * 0.0004; });
    // the six controls sit on the outer wall; their screen anchors follow the mark
    mark.updateMatrixWorld();
    CONTROL_ANGLES.forEach((a, k) => controlAnchors[k].set(Math.cos(a) * 5.1, Math.sin(a) * 5.1, 0.5).applyMatrix4(ringGroups[0].matrixWorld));
    void clamp;
  }

  return { scene, update, controlAnchors };
}
export type Rings = ReturnType<typeof createRings>;
