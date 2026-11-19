// Chapter 4: declare your scope. Stepped rings on the floor, a halo of light overhead, and a volume of
// particles that settles into the visitor's own estate (forest, cloud tenant or both), tier-0 in amber.
import * as THREE from 'three';
import { clamp, lerp, range, smooth, easeInOut, rng, blurTextTexture } from './util';
import type { Bakes } from './bake';
import type { Frame } from './bastion';

const BG = new THREE.Color('#0f1013');
const PN = 22000;

export function createFinale(o: { envMap: THREE.Texture; bakes: Bakes }) {
  const scene = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog = new THREE.FogExp2(BG.getHex(), 0.017);
  scene.environment = o.envMap;
  scene.environmentIntensity = 0.6;
  const r = rng(808);

  scene.add(new THREE.HemisphereLight('#9aa5bd', '#141210', 0.6));
  const key = new THREE.DirectionalLight('#cfd8ea', 1.1); key.position.set(-5, 12, 8); scene.add(key);
  const top = new THREE.PointLight('#ffb547', 22, 20, 1.5); top.position.set(0, 7, 0); scene.add(top);

  // ---------- stepped floor ----------
  const steps: [number, number][] = [[0, 0.42], [2.35, 0.42], [2.35, 0.2], [2.5, 0.2], [2.5, 0.16], [4.3, 0.16], [4.3, 0.02], [4.45, 0.02], [4.45, -0.02], [6.9, -0.02], [6.9, -0.12], [7.05, -0.12], [7.05, -0.16], [10.4, -0.16], [10.4, -0.22], [60, -0.22]];
  const lathe = new THREE.LatheGeometry(steps.map(([x, y]) => new THREE.Vector2(x, y)), 160);
  const pa = lathe.attributes.position as THREE.BufferAttribute;
  const luv = lathe.attributes.uv as THREE.BufferAttribute;
  for (let k = 0; k < pa.count; k++) luv.setXY(k, pa.getX(k) * 0.25, pa.getZ(k) * 0.25);
  const floorMat = new THREE.MeshStandardMaterial({ color: '#3b3f47', roughness: 0.55, metalness: 0.15, normalMap: o.bakes.stoneNormal, normalScale: new THREE.Vector2(0.5, 0.5), side: THREE.DoubleSide });
  const floor = new THREE.Mesh(lathe, floorMat);
  scene.add(floor);
  // light seams in the gaps between steps
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.7, 0.45), toneMapped: false, fog: true });
  [2.43, 4.38, 6.98, 10.4].forEach((rad, k) => {
    const seam = new THREE.Mesh(new THREE.RingGeometry(rad - 0.035, rad + 0.035, 160), seamMat);
    seam.rotation.x = -Math.PI / 2; seam.position.y = [0.21, 0.03, -0.11, -0.2][k];
    scene.add(seam);
  });

  // ---------- halo overhead ----------
  const halo = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.2, 16, 180), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 0.9), toneMapped: false, fog: false }));
  halo.rotation.x = Math.PI / 2; halo.position.y = 7.6;
  scene.add(halo);
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(6.1, 96), new THREE.MeshBasicMaterial({ color: '#1a1b1f', fog: true }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 7.7;
  scene.add(ceiling);
  // the light column between halo and pedestal
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(1.-abs(dot(vN, vV)), 1.6); float a = edge * smoothstep(0., .9, vUv.y) * .16; gl_FragColor = vec4(vec3(1.), a); }',
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 2.6, 9.4, 64, 1, true), coneMat);
  cone.position.y = 4.9;
  void cone;

  // ---------- blurred words on the wall ----------
  const wallTex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
    const g = c.getContext('2d')!;
    const rows = ['AUTHORIZED ENGAGEMENT   SCOPE 10.10.10.0/24', 'REVIEW MODE   NON-DESTRUCTIVE   RATE-LIMITED', 'declare  ·  test  ·  prove  ·  leave   52 AGENTS', 'NO PERSISTENCE   EVIDENCE ENCRYPTED AT REST'];
    g.filter = 'blur(9px)'; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '500 80px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
    rows.forEach((row, i) => g.fillText(row, 40 + (i % 2) * 220, 70 + i * 120));
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(-3, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 12, 96, 1, true), new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0.045, side: THREE.BackSide, depthWrite: false, fog: false }));
  wall.position.y = 4.2;
  scene.add(wall);
  void blurTextTexture;

  // ---------- the particle volume: the visitor's own estate ----------
  // Built from two primitives: nodes (spheres) and links (segments). Grey = assets in scope, amber =
  // tier-0 (domain controllers, the tenant's identity core, the hybrid sync link).
  const shapes = new Map<string, { pos: Float32Array; hot: Float32Array }>();
  const estate = (env: number, size: number) => {
    const key = `${env}:${size}`;
    if (shapes.has(key)) return shapes.get(key)!;
    type Node = { p: THREE.Vector3; r: number; hot: number };
    type Link = { a: THREE.Vector3; b: THREE.Vector3; r: number; hot: number };
    const nodes: Node[] = [], links: Link[] = [];
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const node = (p: THREE.Vector3, rad: number, hot = 0) => { nodes.push({ p, r: rad, hot }); return p; };
    const link = (a: THREE.Vector3, b: THREE.Vector3, rad = 0.018, hot = 0) => links.push({ a, b, r: rad, hot });
    // on premises: one forest, its domains, their OUs, the hosts inside
    const forest = (o: THREE.Vector3, k: number) => {
      const domains = [1, 2, 3][size], ous = [3, 3, 4][size], hosts = [3, 5, 6][size];
      const root = node(V(0, 1.45, 0).multiplyScalar(k).add(o), 0.3 * k, 1);
      for (let d = 0; d < domains; d++) {
        const ad = (d / domains) * Math.PI * 2 + 0.4, rd = domains === 1 ? 0 : [0, 1.0, 1.35][size];
        const dc = domains === 1 ? root : node(V(Math.cos(ad) * rd, 0.55, Math.sin(ad) * rd).multiplyScalar(k).add(o), 0.2 * k, 1);
        if (dc !== root) link(root, dc, 0.03 * k, 1);
        for (let u = 0; u < ous; u++) {
          const au = ad + ((u - (ous - 1) / 2) / ous) * (domains === 1 ? Math.PI * 2 : 2.1);
          const ru = domains === 1 ? 1.0 : 0.78;
          const ou = node(V(dc.x / k - o.x / k + Math.cos(au) * ru, -0.3, dc.z / k - o.z / k + Math.sin(au) * ru).multiplyScalar(k).add(o), 0.11 * k);
          link(dc, ou, 0.02 * k);
          for (let h = 0; h < hosts; h++) {
            const ah = au + ((h - (hosts - 1) / 2) / hosts) * 2.0, rh = 0.4 + (h % 2) * 0.16;
            const hp = node(V(ou.x / k - o.x / k + Math.cos(ah) * rh, -1.15 - (h % 2) * 0.18, ou.z / k - o.z / k + Math.sin(ah) * rh).multiplyScalar(k).add(o), 0.05 * k);
            link(ou, hp, 0.009 * k);
          }
        }
      }
      return root;
    };
    // cloud: the tenant's identity core, services on orbits around it
    const tenant = (o: THREE.Vector3, k: number) => {
      const core = node(o.clone(), 0.32 * k, 1);
      const orbits = [1, 2, 3][size], per = [6, 8, 10][size];
      for (let q = 0; q < orbits; q++) {
        const R = (1.05 + q * 0.42) * k, tilt = [0.5, -0.75, 1.05][q], spin = q * 1.3;
        const at = (a: number) => V(Math.cos(a) * R, Math.sin(a) * R * Math.sin(tilt) * 0.9, Math.sin(a) * R * Math.cos(tilt)).applyAxisAngle(V(0, 1, 0), spin).add(o);
        for (let s = 0; s < 72; s++) link(at((s / 72) * Math.PI * 2), at(((s + 1) / 72) * Math.PI * 2), 0.006 * k);
        for (let s = 0; s < per; s++) {
          const sp = node(at((s / per) * Math.PI * 2 + q), 0.085 * k);
          if (s % 3 === 0) link(core, sp, 0.006 * k);
        }
      }
      return core;
    };
    if (env === 0) forest(V(0, -0.2, 0), 1.25);
    else if (env === 1) tenant(V(0, 0.15, 0), 1.45);
    else {
      const root = forest(V(-1.45, -0.5, 0), 0.88);
      const core = tenant(V(1.6, 0.85, 0), 0.9);
      link(root, core, 0.045, 1);   // the sync link between directory and tenant: tier-0 too
    }
    // spend the particles by visible area: node surfaces and link lengths
    const wN = nodes.map((n) => n.r * n.r * 12.6), wL = links.map((l) => l.a.distanceTo(l.b) * Math.max(l.r, 0.006) * 9);
    const total = [...wN, ...wL].reduce((s, w) => s + w, 0);
    const pos = new Float32Array(PN * 3), hot = new Float32Array(PN);
    let i = 0;
    const put = (x: number, y: number, z: number, h: number) => { if (i >= PN) return; pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; hot[i] = h; i++; };
    const dir = new THREE.Vector3(), tmpP = new THREE.Vector3();
    nodes.forEach((n, k) => {
      const c = Math.round((wN[k] / total) * PN);
      for (let j = 0; j < c; j++) {
        dir.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
        const d = n.r * (1 - Math.pow(r(), 3) * 0.35);
        put(n.p.x + dir.x * d, n.p.y + dir.y * d, n.p.z + dir.z * d, n.hot);
      }
    });
    links.forEach((l, k) => {
      const c = Math.round((wL[k] / total) * PN);
      for (let j = 0; j < c; j++) {
        tmpP.copy(l.a).lerp(l.b, r());
        dir.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).multiplyScalar(l.r);
        put(tmpP.x + dir.x, tmpP.y + dir.y, tmpP.z + dir.z, l.hot * 0.85);
      }
    });
    // rounding leftovers: fold them into random nodes so nothing sits at the origin
    while (i < PN) { const n = nodes[Math.floor(r() * nodes.length)]; dir.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(n.r); put(n.p.x + dir.x, n.p.y + dir.y, n.p.z + dir.z, n.hot); }
    const out = { pos, hot };
    shapes.set(key, out);
    return out;
  };
  const first = estate(2, 1);
  const aA = new Float32Array(first.pos), aB = new Float32Array(first.pos), aR = new Float32Array(PN);
  const hA = new Float32Array(first.hot), hB = new Float32Array(first.hot);
  for (let i = 0; i < PN; i++) aR[i] = r();
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(aB, 3));
  pg.setAttribute('aA', new THREE.BufferAttribute(aA, 3));
  pg.setAttribute('aR', new THREE.BufferAttribute(aR, 1));
  pg.setAttribute('aHA', new THREE.BufferAttribute(hA, 1));
  pg.setAttribute('aHB', new THREE.BufferAttribute(hB, 1));
  const pMat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uM: { value: 1 }, uT: { value: 0 }, uPx: { value: 1 }, uIn: { value: 0 }, uPulse: { value: 0 } }]),
    vertexShader: `uniform float uM; uniform float uT; uniform float uPx; uniform float uIn; uniform float uPulse;
      attribute vec3 aA; attribute float aR; attribute float aHA; attribute float aHB; varying float vH; varying float vS;
      #include <fog_pars_vertex>
      void main(){ float m = smoothstep(aR*.45, aR*.45+.55, uM);
        vec3 p = mix(aA, position, m);
        float burst = sin(3.14159*m);
        vec3 dir = normalize(vec3(sin(aR*91.), cos(aR*57.), sin(aR*23.)+.001));
        p += dir * burst * (.45 + aR*.7);
        p += vec3(sin(uT*.8 + aR*30.), cos(uT*.6 + aR*17.), sin(uT*.7 + aR*11.)) * .018;
        p = mix(p + dir*(4.+aR*6.), p, uIn);
        vH = mix(aHA, aHB, m);
        vec4 mvPosition = modelViewMatrix * vec4(p,1.);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uPx * (1.7 + aR*1.4 + vH*.9) * (9.5 / -mvPosition.z);
        vS = .72 + aR*.28 + uPulse * vH * .6;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vH; varying float vS;
      #include <fog_pars_fragment>
      void main(){ vec2 c = gl_PointCoord - .5; if (dot(c,c) > .25) discard;
        vec3 col = mix(vec3(.52, .55, .62), vec3(1.25, .74, .22), vH) * vS;
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`,
  });
  const points = new THREE.Points(pg, pMat);
  points.frustumCulled = false;
  const holder = new THREE.Group();
  holder.position.y = 2.9;
  holder.add(points);
  scene.add(holder);

  let env = 2, size = 1, morph = 1, spinV = 0, drag = 0, pulse = 0;
  function setShape(e: number, s: number) {
    if (e === env && s === size) return;
    // freeze whatever is on screen as the new start
    const m = morph;
    for (let k = 0; k < PN; k++) {
      const mk = clamp((m - aR[k] * 0.45) / 0.55); const sm = mk * mk * (3 - 2 * mk);
      for (let c = 0; c < 3; c++) aA[k * 3 + c] = lerp(aA[k * 3 + c], aB[k * 3 + c], sm);
      hA[k] = lerp(hA[k], hB[k], sm);
    }
    const next = estate(e, s);
    aB.set(next.pos); hB.set(next.hot);
    for (const n of ['aA', 'position', 'aHA', 'aHB']) pg.attributes[n].needsUpdate = true;
    morph = 0; spinV += e !== env ? 2.2 : 0.8; env = e; size = s;
  }
  /** the CTA is in reach: tier-0 brightens, as if the run were about to start */
  const setPulse = (on: boolean) => { pulse = on ? 1 : 0; };

  const raycaster = new THREE.Raycaster();
  const hitSphere = new THREE.Sphere(new THREE.Vector3(0, 2.9, 0), 2.2);
  const anchor = new THREE.Vector3(0, 2.9, 0);

  function update(f: Frame) {
    const { t, dt, local: s, cam } = f;
    const portrait = f.aspect < 1 ? 1 + (1 / f.aspect - 1) * 0.8 : 1;
    morph = Math.min(1, morph + dt * 0.55);
    pMat.uniforms.uM.value = morph;
    pMat.uniforms.uT.value = t;
    pMat.uniforms.uPx.value = cam.userData.px ?? 1;
    pMat.uniforms.uIn.value = easeInOut(range(s, 0.08, 0.5));
    spinV *= Math.pow(0.12, dt);
    drag += (f.pointer.x * 0.5 - drag) * Math.min(1, dt * 2);
    holder.rotation.y += dt * (0.22 + spinV);
    points.rotation.y = drag;
    holder.position.y = 2.9 + Math.sin(t * 0.7) * 0.08;
    // on wide screens the estate stands right of centre, clear of the scope questions on the left
    holder.position.x += ((f.aspect > 1.2 ? 1.3 : 0) - holder.position.x) * Math.min(1, dt * 3);
    pMat.uniforms.uPulse.value += (pulse * (0.75 + Math.sin(t * 4) * 0.25) - pMat.uniforms.uPulse.value) * Math.min(1, dt * 5);
    wall.rotation.y = t * 0.012;
    halo.material.color.setRGB(2.3, 1.5, 0.64).multiplyScalar(1 + Math.sin(t * 0.9) * 0.07);

    // enter from overhead (out of the portal), tilt down to the pedestal
    const k = easeInOut(range(s, 0, 0.42));
    const topP = new THREE.Vector3(0.01, 15, 0.6), sideP = new THREE.Vector3(0, 3.05, 10.6 * portrait);
    cam.position.copy(topP).lerp(sideP, k);
    cam.position.x += f.pointer.x * 0.35 * k;
    cam.position.y += f.pointer.y * 0.2 * k;
    const look = new THREE.Vector3(0, lerp(0, 2.7, k), 0);
    cam.up.set(0, 1, 0);
    if (k < 0.999) cam.up.set(0, k, -(1 - k)).normalize();
    cam.lookAt(look);
    cam.fov = lerp(60, 44, k) * (f.aspect < 1 ? 1.12 : 1); cam.near = 0.05; cam.far = 220;
    cam.updateProjectionMatrix();
    void smooth;
  }
  function pick(ndc: THREE.Vector2, cam: THREE.Camera) {
    raycaster.setFromCamera(ndc, cam);
    hitSphere.center.set(holder.position.x, 2.9, 0);
    return raycaster.ray.intersectsSphere(hitSphere);
  }

  return { scene, update, setShape, setPulse, pick, anchor, get env() { return env; }, get size() { return size; } };
}
export type Finale = ReturnType<typeof createFinale>;
