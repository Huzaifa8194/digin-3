// Intro + agents world: the display headline with a thick glass ring turning in front of it,
// then eight glass cards riding a helix around a crystal spine.
import * as THREE from 'three';
import { cards, headline, MEDIA } from '../content';
import { canvasTexture, FONT, glass, GLSL_NOISE, markGeometry, rand, roundedRectShape } from './shared';
import { BAKED } from './baked';

const TAN = Math.tan(THREE.MathUtils.degToRad(17.5));
export const RH = 4.4;          // helix radius
const A = 0.98;                 // angle between cards
const DY = 1.75;                // drop between cards
const CAM_Z = RH + 10;
const CW = 5.4, CH = 3.6, CR = 0.3;

const FACE_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }';
const FACE_FRAG = /* glsl */ `
uniform sampler2D uA, uB, uT, uText; uniform float uPhase, uFocus, uDim;
varying vec2 vUv;
void main(){
  // the baked shot plays here: a pixel shows its first-frame colour until the clock passes the
  // moment the time map gives it, then its final colour, with a short glow as it arrives
  vec3 a = texture2D(uA, vUv).rgb, b = texture2D(uB, vUv).rgb;
  float tm = texture2D(uT, vUv).r;
  float on = step(tm, uPhase);
  vec3 v = mix(b, a, on);
  v += a * on * step(.006, tm) * (1. - smoothstep(0., .04, uPhase - tm)) * .35;
  // a shade rises from the bottom edge so the title reads; the shot itself stays clean
  v *= 1. - smoothstep(.34, .0, vUv.y) * .78;
  v *= mix(.52, 1., uFocus) * uDim;
  float t = texture2D(uText, vUv).a;
  gl_FragColor = vec4(mix(v, vec3(1.), t * mix(.8, 1., uFocus)), 1.);
}`;

interface CardMesh { group: THREE.Group; face: THREE.Mesh; mat: THREE.ShaderMaterial; start: number; near: boolean }

export class WorkWorld {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  helix = new THREE.Group();
  cards: CardMesh[] = [];
  head!: THREE.Mesh;
  headMat = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, alphaToCoverage: true, side: THREE.FrontSide });
  ring = new THREE.Group();
  sparkMat: THREE.ShaderMaterial;
  ptr = new THREE.Vector2();
  W = 1; H = 1;
  private low: boolean;
  constructor(env: THREE.Texture, low: boolean) {
    this.low = low;
    const s = this.scene;
    s.environment = env;
    s.add(new THREE.AmbientLight(0xffffff, 0.2));
    const l1 = new THREE.PointLight(0x9a7bff, 30, 30); l1.position.set(-6, 2, 6); s.add(l1);
    const l2 = new THREE.PointLight(0x4fe0d0, 26, 30); l2.position.set(6, -3, 6); s.add(l2);
    this.camera.add(l1, l2); s.add(this.camera);

    // headline plane (texture drawn in resize)
    this.head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.headMat);
    this.head.renderOrder = 0;
    s.add(this.head);

    // glass ring + mark
    const gm = glass(env, 1.2);
    this.ring.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 48, 180), gm));
    const mk = new THREE.Mesh(markGeometry(0.22), gm); mk.scale.setScalar(0.64); this.ring.add(mk);
    s.add(this.ring);

    // crystal spine
    const base = new THREE.IcosahedronGeometry(1, low ? 2 : 3);
    const p = base.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 1 + 0.28 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7 - v.y * 1.3) + 0.12 * Math.sin(v.y * 9 + v.x * 5);
      v.multiplyScalar(d); p.setXYZ(i, v.x, v.y, v.z);
    }
    base.computeVertexNormals();
    const crystal = new THREE.MeshPhysicalMaterial({
      color: 0xb9c4ff, metalness: 0.55, roughness: 0.14, envMap: env, envMapIntensity: 1.8,
      iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [150, 1100], clearcoat: 1, clearcoatRoughness: 0.1,
    });
    const N = low ? 90 : 170;
    // the same crystals as before, split into short runs along the spine: each run has its own
    // bounding sphere, so the runs above and below the screen are culled instead of shaded
    const RUN = 10;
    const runs: THREE.InstancedMesh[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    const top = 1.6, bottom = -(cards.length - 1) * DY - 9;
    for (let i = 0; i < N; i++) {
      if (i % RUN === 0) runs.push(new THREE.InstancedMesh(base, crystal, Math.min(RUN, N - i)));
      const spine = runs[runs.length - 1];
      const t = i / N, y = top + (bottom - top) * t + (rand() - 0.5) * 0.3;
      const a = y * 1.7 + rand() * 0.8, r = 0.15 + rand() * 0.55;
      ps.set(Math.cos(a) * r, y, Math.sin(a) * r);
      e.set((rand() - 0.5) * 0.9, rand() * Math.PI * 2, (rand() - 0.5) * 0.9); q.setFromEuler(e);
      const k = 0.45 + rand() * 0.55;
      sc.set(1.25 * k, 0.32 * k + 0.08, 0.9 * k);
      m.compose(ps, q, sc); spine.setMatrixAt(i % RUN, m);
    }
    for (const run of runs) { run.computeBoundingSphere(); this.helix.add(run); }

    // colour sparks around the spine
    const sn = low ? 2500 : 6500;
    const sp = new Float32Array(sn * 3), sr = new Float32Array(sn * 4);
    for (let i = 0; i < sn; i++) {
      const y = top - 1 + (bottom - top + 1) * rand(), a = rand() * Math.PI * 2, r = 1.1 + Math.pow(rand(), 0.7) * 2.6;
      const clump = Math.sin(y * 0.9) * 0.5 + 0.5;
      sp[i * 3] = Math.cos(a) * r * (0.6 + clump * 0.6); sp[i * 3 + 1] = y; sp[i * 3 + 2] = Math.sin(a) * r;
      for (let c = 0; c < 4; c++) sr[i * 4 + c] = rand();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aRand', new THREE.BufferAttribute(sr, 4));
    this.sparkMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uScale: { value: 17 } },
      vertexShader: /* glsl */ `uniform float uTime, uDpr, uScale; attribute vec4 aRand; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position; p.y += sin(uTime * .3 + aRand.x * 6.28) * .12; p.x += cos(uTime * .2 + aRand.y * 6.28) * .1;
          vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = min((1. + pow(aRand.z, 4.) * 6.) * uDpr * uScale / max(-mv.z, .5), 32. * uDpr);
          vec3 c1 = vec3(.95,.45,.8), c2 = vec3(.45,.8,1.), c3 = vec3(.6,.45,1.), c4 = vec3(.95,.8,.4);
          vC = aRand.w < .3 ? c1 : aRand.w < .6 ? c2 : aRand.w < .85 ? c3 : c4; vA = (.25 + .6 * aRand.y) * .8; }`,
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord-.5); if(r>.5) discard; float a = smoothstep(.5,.3,r)*vA; gl_FragColor = vec4(vC*a, a); }',
    });
    const sparks = new THREE.Points(sg, this.sparkMat); sparks.frustumCulled = false;
    this.helix.add(sparks);

    // cards
    const faceGeo = new THREE.ShapeGeometry(roundedRectShape(CW, CH, CR), 12);
    const uv = faceGeo.attributes.uv as THREE.BufferAttribute;
    const fp = faceGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, fp.getX(i) / CW + 0.5, fp.getY(i) / CH + 0.5);
    const frameShape = roundedRectShape(CW + 0.16, CH + 0.16, CR + 0.08);
    frameShape.holes.push(roundedRectShape(CW - 0.02, CH - 0.02, CR - 0.01) as unknown as THREE.Path);
    const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3, curveSegments: 12 });
    frameGeo.translate(0, 0, -0.07);
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fb6c8, metalness: 0.35, roughness: 0.18, envMap: env, envMapIntensity: 1.6, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1,
    });
    const sheen = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.045, envMap: env, envMapIntensity: 2.2, clearcoat: 1, depthWrite: false,
    });
    cards.forEach((c, k) => {
      const group = new THREE.Group();
      const mat = new THREE.ShaderMaterial({
        vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
        uniforms: {
          uA: { value: BAKED[k].a }, uB: { value: BAKED[k].b }, uT: { value: BAKED[k].t }, uPhase: { value: 1 },
          uText: { value: this.titleTexture(c.title, c.tag, k) }, uFocus: { value: 0 }, uDim: { value: 1 },
        },
      });
      const face = new THREE.Mesh(faceGeo, mat);
      face.userData.card = k;
      const glassPane = new THREE.Mesh(faceGeo, sheen); glassPane.position.z = 0.03;
      group.add(face, new THREE.Mesh(frameGeo, frameMat), glassPane);
      const a = k * A;
      group.position.set(Math.sin(a) * RH, -k * DY, Math.cos(a) * RH);
      group.rotation.set((rand() - 0.5) * 0.12, a, (rand() - 0.5) * 0.06);
      this.helix.add(group);
      this.cards.push({ group, face, mat, start: 0, near: false });
    });
    s.add(this.helix);
  }

  titleTexture(lines: string[], tag: string, k = 0) {
    return canvasTexture(1024, 683, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      g.font = `400 19px ${FONT}`; g.textAlign = 'left';
      g.globalAlpha = 0.78;
      g.fillText(`${String(k + 1).padStart(2, '0')} / 08   [ ${tag} ]`, 44, h - 92);
      g.globalAlpha = 1;
      g.font = `400 46px ${FONT}`;
      g.fillText(lines.join(' '), 42, h - 42);
      g.font = `400 19px ${FONT}`; g.textAlign = 'right';
      g.fillText('OPEN ->', w - 44, h - 48);
      g.globalAlpha = 0.5; g.fillRect(w - 44 - g.measureText('OPEN ->').width, h - 40, g.measureText('OPEN ->').width, 1.5);
    }, 1);
  }

  /** Redraw the headline for the current viewport. */
  drawHeadline(W: number, H: number) {
    const s = Math.min(W * 0.074, H * 0.118);
    const top = s * 0.25, colX = W * 0.617, colTop = top + s * 2.0;
    const small = Math.max(11, Math.min(15.5, W * 0.0108));
    const ch = Math.max(s * 3.6, colTop + small * 1.85 * 9 + 24);
    const tex = canvasTexture(W, ch, (g) => {
      g.fillStyle = '#f2f4f7'; g.textBaseline = 'top';
      g.font = `300 ${s}px ${FONT}`;
      headline.lines.forEach((l, i) => g.fillText(l, W * 0.115, top + i * s * 0.98));
      g.font = `400 ${small}px ${FONT}`;
      if (W > 760) {
        let y = colTop;
        for (const para of headline.column) { for (const line of para.split('\n')) { g.fillText(line, colX, y); y += small * 1.85; } y += small * 1.85; }
      }
    }, Math.min(2, devicePixelRatio || 1));
    this.headMat.map?.dispose();
    this.headMat.map = tex; this.headMat.needsUpdate = true;
    this.head.userData.size = [W, ch];
  }

  resize(w: number, h: number, dpr: number) {
    this.W = w; this.H = h;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.sparkMat.uniforms.uDpr.value = dpr;
    this.sparkMat.uniforms.uScale.value = (h * 0.5 / TAN) * 0.012;
    this.drawHeadline(w, h);
  }

  /** world units per screen px at depth z, with the camera at CAM_Z */
  ppu(z: number) { return this.H / (2 * (this.camZ() - z) * TAN); }
  camZ() { const a = this.camera.aspect; return a < 1 ? CAM_Z + 10 * (1 / Math.max(a, 0.4) - 1) * 0.75 : CAM_Z; }

  update(time: number, u: number, c: number, headTop: number, ringState: { y: number; rot: number; on: boolean }, chatOn: boolean) {
    const cam = this.camera;
    const camZ = this.camZ();
    const cc = Math.max(c, 0);
    const camY = c < 0 ? -c * DY * 1.7 : -cc * DY;
    // on wide screens the stack sits right of centre, clear of the feature picker on the left
    const off = this.W > 760 ? -0.75 : 0;
    cam.position.set(this.ptr.x * 0.25 + off, camY + 0.35 + this.ptr.y * 0.15, camZ);
    cam.lookAt(off, camY + 0.35, 0);
    this.helix.rotation.y = -cc * A;

    // headline + ring live in screen space above the helix
    const zH = RH - 0.6;
    const k = 1 / this.ppu(zH);
    const [hw, hh] = this.head.userData.size as [number, number];
    this.head.scale.set(hw * k, hh * k, 1);
    this.head.position.set(cam.position.x, cam.position.y + (this.H / 2 - (headTop + hh / 2)) * k, zH);
    this.head.visible = headTop < this.H && headTop > -hh;
    this.head.lookAt(this.head.position.x, this.head.position.y, 100);

    const zR = RH + 0.6, kr = 1 / this.ppu(zR);
    this.ring.visible = ringState.on;
    const rr = Math.min(this.W, this.H * 1.25) * 0.245 * kr;
    this.ring.scale.setScalar(rr);
    this.ring.position.set(cam.position.x - this.W * 0.035 * kr, cam.position.y + (this.H / 2 - ringState.y) * kr, zR);
    this.ring.rotation.set(0.12 + Math.sin(time * 0.4) * 0.04, ringState.rot, Math.sin(time * 0.3) * 0.03);

    this.sparkMat.uniforms.uTime.value = time;
    this.frameNo++;
    // cards: focus, video play/pause
    this.cards.forEach((cm, k2) => {
      const d = Math.abs(k2 - c);
      cm.mat.uniforms.uFocus.value = 1 - THREE.MathUtils.smoothstep(d, 0.12, 0.55);
      cm.mat.uniforms.uDim.value = 1 - THREE.MathUtils.smoothstep(d, 1.2, 3.2) * 0.6;
      // repaint the shot: every frame for the centred card, every other frame for its neighbours
      // the shot starts from its first frame as the card swings in, then loops with a short hold
      // on the final frame; cards further away rest on the final frame, which tells the story
      const near = chatOn && d < 1.4;
      if (near && !cm.near) cm.start = time;
      cm.near = near;
      const P = BAKED[k2].period * 1.25;
      cm.mat.uniforms.uPhase.value = near ? Math.min(1, (((time - cm.start) % P) / P) * 1.25) : 1;
      cm.group.visible = d < 4.2 && u > 4.2;
    });
    void u;
  }

  frameNo = 0;

  pick(ray: THREE.Raycaster): number | null {
    const hit = ray.intersectObjects(this.cards.map((c) => c.face), false)[0];
    return hit ? (hit.object.userData.card as number) : null;
  }
}
