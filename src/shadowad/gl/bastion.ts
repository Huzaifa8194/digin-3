// Chapter 1: the bastion on the ridge (the reference's igloo on the mountain).
// Intro (time): wire outline + cage on grey, terrain condenses out of the fog, camera swings from
// top-down to eye level, the blocks drift apart, numbered. Scroll: blocks lock back, then the dive.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, range, smooth, easeOut, easeInOut, expoInOut, rng, dotTexture, boxEdges } from './util';
import { H0, DOME_R, terrainMaterial, type Bakes } from './bake';

export type Frame = { t: number; dt: number; local: number; intro: number; pointer: THREE.Vector2; cam: THREE.PerspectiveCamera; aspect: number };

const R = DOME_R;        // dome radius at the block centre line
const TH = 0.5;          // block thickness
const BH = 0.5;          // block height along the dome
const FOG = new THREE.Color('#262a33');   // shadowAD dusk: slate fog, the only warm light is the dome's

export function createBastion(env: { maxAniso: number; bakes: Bakes }) {
  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  const fog = new THREE.FogExp2(FOG.getHex(), 0.011);
  scene.fog = fog;
  const r = rng(42);

  // ---------- sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#0f1117') }, mid: { value: new THREE.Color('#2f333e') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; varying vec3 vP; void main(){ float h = clamp(vP.y*2.2, 0., 1.); gl_FragColor = vec4(mix(mid, top, pow(h, .7)), 1.); }',
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight('#8f9bb5', '#15171c', 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#bccae8', 1.5);   // the moon
  sun.position.set(-9, 24, -4);
  sun.target.position.set(0, H0, 0);
  // no shadow maps: the ground light and the dome's contact shade are baked (see bake.ts)
  scene.add(sun, sun.target);
  // (a front fill light used to live here; folded into the hemisphere to save a light on every fragment)

  // ---------- terrain: a graded grid (dense at the summit) displaced and lit entirely from the bakes ----------
  const SEG = 200, HALF = 230;
  const tg = new THREE.PlaneGeometry(2, 2, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position as THREE.BufferAttribute;
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.85) * HALF;
  for (let i = 0; i < tp.count; i++) tp.setXYZ(i, warp(tp.getX(i)), 0, warp(tp.getZ(i)));
  tg.deleteAttribute('normal'); tg.deleteAttribute('uv');
  const terrainMat = terrainMaterial(env.bakes.terrain);
  const terrain = new THREE.Mesh(tg, terrainMat);
  terrain.frustumCulled = false;
  scene.add(terrain);

  // ---------- the bastion: dome of blocks + door tunnel ----------
  type Block = { pos: THREE.Vector3; q: THREE.Quaternion; size: THREE.Vector3; n: THREE.Vector3; ePos: THREE.Vector3; eQ: THREE.Quaternion; delay: number; seed: number; row: number; theta: number };
  const blocks: Block[] = [];
  const up = new THREE.Vector3(), tan = new THREE.Vector3(), xa = new THREE.Vector3(), m = new THREE.Matrix4();
  const DOOR = Math.PI / 2, DOOR_HALF = 0.42;
  const rows = 7;
  for (let row = 0; row < rows; row++) {
    const phi = (row + 0.5) * (BH / R) * 1.04;
    const ring = 2 * Math.PI * R * Math.cos(phi);
    const n = Math.max(5, Math.round(ring / 0.84));
    const off = (row % 2) * (Math.PI / n);
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2 + off;
      let dth = Math.atan2(Math.sin(th - DOOR), Math.cos(th - DOOR));
      if ((row < 2 && Math.abs(dth) < DOOR_HALF) || (row === 2 && Math.abs(dth) < DOOR_HALF * 0.5)) continue;
      const nv = new THREE.Vector3(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th));
      tan.set(-Math.sin(th), 0, Math.cos(th));
      up.crossVectors(tan, nv).normalize();
      xa.crossVectors(up, nv).normalize();
      m.makeBasis(xa, up, nv);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const pos = nv.clone().multiplyScalar(R).add(new THREE.Vector3(0, H0 - 0.12, 0));
      blocks.push({ pos, q, n: nv, size: new THREE.Vector3((ring / n) * 0.93, BH * 0.9, TH), ePos: new THREE.Vector3(), eQ: new THREE.Quaternion(), delay: 0, seed: r(), row, theta: th });
    }
  }
  // cap
  {
    const nv = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3(0, H0 - 0.12 + R * 0.985, 0);
    blocks.push({ pos, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), n: nv, size: new THREE.Vector3(1.0, 1.0, TH * 0.9), ePos: new THREE.Vector3(), eQ: new THREE.Quaternion(), delay: 0, seed: r(), row: 7, theta: 0 });
  }
  // door tunnel: arches of five blocks
  const TR = 1.05;
  for (let s = 0; s < 3; s++) {
    const z = R * Math.cos(0.36) - 0.12 + s * 0.52;
    const cnt = 7;
    for (let k = 0; k < cnt; k++) {
      const a = ((k + 0.5) / cnt) * Math.PI;
      const nv = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const yAxis = new THREE.Vector3(0, 0, 1);
      xa.crossVectors(yAxis, nv).normalize();
      m.makeBasis(xa, yAxis, nv);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const pos = new THREE.Vector3(Math.cos(a) * TR, H0 - 0.1 + Math.sin(a) * TR, z);
      blocks.push({ pos, q, n: nv, size: new THREE.Vector3((Math.PI * TR / cnt) * 0.9, 0.48, 0.42), ePos: new THREE.Vector3(), eQ: new THREE.Quaternion(), delay: 0, seed: r(), row: -1, theta: a });
    }
  }
  // exploded pose + assembly order (lower rows lock first, the cap last)
  const eul = new THREE.Euler();
  blocks.forEach((b) => {
    const push = 0.2 + b.seed * 0.5 + (b.row === 7 ? 0.45 : 0);
    b.ePos.copy(b.pos).addScaledVector(b.n, push).add(new THREE.Vector3((r() - 0.5) * 0.2, (r() - 0.3) * 0.26, (r() - 0.5) * 0.2));
    eul.set((r() - 0.5) * 0.55, (r() - 0.5) * 0.5, (r() - 0.5) * 0.45);
    b.eQ.copy(b.q).multiply(new THREE.Quaternion().setFromEuler(eul));
    const rowK = b.row < 0 ? 0.15 : b.row / 7;
    b.delay = clamp(rowK * 0.55 + b.seed * 0.28);
  });

  const blockGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.11);
  // baked chiselled-snow albedo + tangent-space normals: smooth, mipmapped detail instead of runtime bump
  const blockMat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: env.bakes.blockAlbedo, normalMap: env.bakes.blockNormal, normalScale: new THREE.Vector2(1.1, 1.1) });
  // light from inside catches every side face and rim of a block, so the seams glow
  const seamU = { value: 1.0 };
  blockMat.onBeforeCompile = (sh) => {
    sh.uniforms.uSeam = seamU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;')
      // each block samples its own quarter of the 2x2 bake, shifted per instance, so neighbours never repeat
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvec2 cell = vec2(float(gl_InstanceID % 2), float((gl_InstanceID / 2) % 2)) * .5 + float(gl_InstanceID % 7) * .071;\nvMapUv = vMapUv * .5 + cell;\nvNormalMapUv = vNormalMapUv * .5 + cell;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uSeam;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 a = abs(vLocal);
        float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z));
        float mid = a.x + a.y + a.z - mx - mn;   // near 0.5 only along an edge
        float e = smoothstep(0.445, 0.5, mid);
        float inward = smoothstep(0.0, -0.5, vLocal.z) * 0.9;
        totalEmissiveRadiance += vec3(1.85, 0.98, 0.26) * uSeam * max(e, inward * step(0.46, a.z)); }`);
  };
  const mesh = new THREE.InstancedMesh(blockGeo, blockMat, blocks.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // inner light, seen through every seam
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.4), toneMapped: false, fog: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R - 0.3, 48, 20, Math.PI / 2 + 0.5, Math.PI * 2 - 1.0, 0, Math.PI / 2), glowMat);
  glow.position.y = H0 - 0.12;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(TR - 0.24, TR - 0.24, 1.6, 24, 1, true, -Math.PI / 2, Math.PI), glowMat);
  tube.rotation.x = Math.PI / 2; tube.position.set(0, H0 - 0.1, R * Math.cos(0.36) + 0.62);
  scene.add(glow); void tube;

  // ---------- wire outline of the assembled bastion ----------
  const mats = blocks.map((b) => new THREE.Matrix4().compose(b.pos, b.q, new THREE.Vector3(1, 1, 1)));
  const wireMat = new THREE.LineBasicMaterial({ color: new THREE.Color(3.1, 1.75, 0.5), transparent: true, opacity: 1, fog: false, toneMapped: false, depthWrite: false });
  const wire = new THREE.LineSegments(boxEdges(mats, blocks.map((b) => b.size)), wireMat);
  scene.add(wire);

  // ---------- the cage: floating wire cubes ----------
  const cageMats: THREE.Matrix4[] = [], cageSizes: THREE.Vector3[] = [], cagePts: number[] = [];
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, d = 3.5 + r() * 15;
    const p = new THREE.Vector3(Math.cos(a) * d, H0 - 1 + r() * 9, Math.sin(a) * d);
    const s = 1 + r() * 2.6;
    const mm = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(1, 1, 1));
    cageMats.push(mm); cageSizes.push(new THREE.Vector3(s, s, s));
    for (let k = 0; k < 8; k++) {
      const v = new THREE.Vector3((k & 1 ? 0.5 : -0.5) * s, (k & 2 ? 0.5 : -0.5) * s, (k & 4 ? 0.5 : -0.5) * s).applyMatrix4(mm);
      cagePts.push(v.x, v.y, v.z);
    }
  }
  const cageMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.15, 0.95, 0.68), transparent: true, opacity: 0.3, fog: false, toneMapped: false, depthWrite: false });
  const cage = new THREE.LineSegments(boxEdges(cageMats, cageSizes), cageMat);
  const cpg = new THREE.BufferGeometry(); cpg.setAttribute('position', new THREE.Float32BufferAttribute(cagePts, 3));
  const cagePtsMat = new THREE.PointsMaterial({ size: 0.12, map: dotTexture(), transparent: true, depthWrite: false, color: new THREE.Color(2.4, 1.5, 0.5), toneMapped: false, fog: false, opacity: 0.6 });
  const cageDots = new THREE.Points(cpg, cagePtsMat);
  scene.add(cage, cageDots);

  // ---------- drifting snow ----------
  const SN = 2200;
  const sp = new Float32Array(SN * 3), sr = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { sp[i * 3] = (r() - 0.5) * 40; sp[i * 3 + 1] = r() * 16; sp[i * 3 + 2] = (r() - 0.5) * 40; sr[i] = r(); }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aR', new THREE.BufferAttribute(sr, 1));
  const snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uT: { value: 0 }, uMap: { value: dotTexture(32, 0.2) }, uO: { value: 0.7 }, uH0: { value: H0 }, uPx: { value: 1 } },
    vertexShader: `uniform float uT; uniform float uH0; uniform float uPx; attribute float aR; varying float vA;
      void main(){ vec3 p = position; float t = uT*(0.35+aR*0.5);
        p.x = mod(p.x + t*2.2 + 20., 40.) - 20.; p.y = uH0 - 2. + mod(p.y - t*0.6, 16.); p.z = mod(p.z + sin(t*.7+aR*9.)*.6 + 20., 40.) - 20.;
        vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (1.2 + aR*2.6) * (14.0 / -mv.z); vA = smoothstep(40., 4., -mv.z) * (0.35 + aR*0.65); }`,
    fragmentShader: 'uniform sampler2D uMap; uniform float uO; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.), c.a*vA*uO); }',
  });
  const snowPts = new THREE.Points(sg, snowMat);
  snowPts.frustumCulled = false;
  scene.add(snowPts);

  // ---------- numbered blocks (label anchors) ----------
  // the hairline is the engagement's audit trail, from authorization to report
  const labelNums = ['AUTH-2026-014', 'Scope declared', 'Review mode', 'Evidence', 'Findings', 'Report'];
  const cand = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.row >= 1 && b.row <= 5 && b.theta > 1.25 && b.theta < 2.75);
  const picks: number[] = [];
  const rr = rng(9);
  while (picks.length < labelNums.length && cand.length) picks.push(cand.splice((rr() * cand.length) | 0, 1)[0].i);
  // authorization at the foot of the dome, the report at its crown
  picks.sort((a, b) => blocks[a].row - blocks[b].row || blocks[a].theta - blocks[b].theta);
  const anchors = picks.map(() => new THREE.Vector3());

  // ---------- camera rig ----------
  const target = new THREE.Vector3(0, H0 + 1.2, 0);
  const sphTop = new THREE.Spherical(17, 0.1, 0.3);
  const sphHero = new THREE.Spherical(13.4, 1.36, -0.5);
  const sphFront = new THREE.Spherical(10.6, 1.44, -0.04);
  const sph = new THREE.Spherical();
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const door = new THREE.Vector3(0, H0 + 0.7, R + 3.4), inside = new THREE.Vector3(0, H0 + 0.62, R + 1.5);
  const lerpSph = (a: THREE.Spherical, b: THREE.Spherical, k: number) => sph.set(lerp(a.radius, b.radius, k), lerp(a.phi, b.phi, k), lerp(a.theta, b.theta, k));
  let meanE = 0;
  let shadowDirty = true, lastS = -1, lastI = -1, frameN = 0;

  function update(f: Frame) {
    const { t, intro: i, local: s, cam } = f;
    // shadows only re-render when the blocks moved: scroll/intro changed, or every 4th frame while they bob
    frameN++;
    shadowDirty = Math.abs(s - lastS) > 1e-4 || Math.abs(i - lastI) > 1e-4 || (meanE > 0.02 && frameN % 4 === 0);
    lastS = s; lastI = i;
    const portrait = f.aspect < 1 ? 1 + (1 / f.aspect - 1) * 0.55 : 1;

    // camera
    const kIntro = expoInOut(range(i, 0.26, 1));
    const kOrbit = easeInOut(range(s, 0, 0.62));
    lerpSph(sphTop, sphHero, kIntro);
    if (kOrbit > 0) lerpSph(new THREE.Spherical(sph.radius, sph.phi, sph.theta), sphFront, kOrbit);
    sph.radius *= portrait;
    tmpP.setFromSpherical(sph).add(target);
    tmpL.copy(target);
    const kDive = range(s, 0.64, 1);
    if (kDive > 0) {
      const a = easeInOut(range(kDive, 0, 0.62)), b = easeInOut(range(kDive, 0.5, 1));
      tmpP.lerp(door, a).lerp(inside, b);
      tmpL.lerp(new THREE.Vector3(0, H0 + 0.7, -2), a);
    }
    // breathing + pointer parallax
    tmpP.x += Math.sin(t * 0.21) * 0.12 + f.pointer.x * 0.45 * (1 - kDive);
    tmpP.y += Math.sin(t * 0.17) * 0.08 + f.pointer.y * 0.22 * (1 - kDive);
    cam.position.copy(tmpP);
    cam.lookAt(tmpL);
    cam.fov = lerp(40, 70, easeInOut(kDive)) * (f.aspect < 1 ? 1.12 : 1);
    cam.near = 0.05; cam.far = 900;
    cam.updateProjectionMatrix();

    // fog condenses into terrain during the intro
    fog.density = lerp(0.2, 0.0115, easeOut(range(i, 0.18, 0.78)));
    terrain.visible = i > 0.12;

    // blocks
    let sumE = 0;
    const appearBase = range(i, 0.42, 0.7);
    blocks.forEach((b, k) => {
      const ap = smooth(clamp(appearBase * 1.6 - b.delay * 0.6));
      const out = easeOut(range(i, 0.6 + b.seed * 0.1, 1));
      const lock = easeInOut(range(s, b.delay * 0.42, b.delay * 0.42 + 0.2));
      const e = out * (1 - lock);
      sumE += e;
      tmpP.copy(b.pos).lerp(b.ePos, e);
      tmpP.y += Math.sin(t * 0.8 + b.seed * 20) * 0.06 * e;
      tmpQ.copy(b.q).slerp(b.eQ, e);
      const sc = Math.max(0.0001, ap);
      m.compose(tmpP, tmpQ, one.set(b.size.x * sc, b.size.y * sc, b.size.z * sc));
      mesh.setMatrixAt(k, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    meanE = sumE / blocks.length;

    picks.forEach((bi, k) => {
      const b = blocks[bi];
      const out = easeOut(range(i, 0.6 + b.seed * 0.1, 1));
      const lock = easeInOut(range(s, b.delay * 0.42, b.delay * 0.42 + 0.2));
      const e = out * (1 - lock);
      anchors[k].copy(b.pos).lerp(b.ePos, e).addScaledVector(b.n, b.size.z * 0.55);
      anchors[k].y += Math.sin(t * 0.8 + b.seed * 20) * 0.06 * e;
    });

    const wireK = 1 - smooth(range(i, 0.55, 0.92));
    wireMat.opacity = wireK * (0.55 + 0.45 * Math.sin(t * 7) * 0.2 + 0.45);
    wire.visible = wireK > 0.002;
    const glowOn = smooth(range(i, 0.4, 0.75));
    const g = lerp(1.05, 0.56, meanE) * glowOn + kDive * 1.8;
    glowMat.color.setRGB(2.7 * g, 1.42 * g, 0.36 * g);   // shadowAD amber, burning inside the domain
    // the baked glow mask on the ground brightens as the blocks part and the light gets out
    terrainMat.uniforms.uGlow.value = (0.04 + meanE * 0.15) * glowOn + kDive * 0.3;
    seamU.value = (lerp(1.25, 0.9, meanE) + kDive * 2) * glowOn;
    cageMat.opacity = lerp(0.85, 0.13, smooth(range(i, 0.3, 0.85))) * (1 - smooth(range(s, 0.08, 0.5)));
    cagePtsMat.opacity = cageMat.opacity * 1.4;
    snowMat.uniforms.uT.value = t;
    snowMat.uniforms.uO.value = smooth(range(i, 0.5, 1)) * 0.85;
    snowMat.uniforms.uPx.value = f.cam.userData.px ?? 1;
  }

  return {
    scene, update, anchors, labelNums,
    /** 0 = sealed, 1 = fully apart; drives the ambient glow and the label visibility. */
    get explode() { return meanE; },
    get shadowDirty() { return shadowDirty; },
  };
}
export type Bastion = ReturnType<typeof createBastion>;
