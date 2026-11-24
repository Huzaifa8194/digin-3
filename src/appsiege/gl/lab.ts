// Lab world: a test rig (cage, cables, rubble) holding the AppSiege mark as points, standing in water.
// The camera sinks through the surface to a curved hex-mesh panel: THE REPORT.
import * as THREE from 'three';
import { lab, MEDIA } from '../content';
import { canvasTexture, chrome, FONT, GLSL_NOISE, rand } from './shared';

const PALETTE: [number, THREE.Color][] = [
  [0.0, new THREE.Color('#4fe3cf')], [0.18, new THREE.Color('#5dff7a')], [0.32, new THREE.Color('#e8f0ff')],
  [0.45, new THREE.Color('#5aa8ff')], [0.56, new THREE.Color('#dfe6ff')], [0.66, new THREE.Color('#ff4a2a')],
  [0.78, new THREE.Color('#d9c9ff')], [1.0, new THREE.Color('#b9a6ff')],
];
const tmpC = new THREE.Color();
function paletteAt(t: number) {
  for (let i = 1; i < PALETTE.length; i++) if (t <= PALETTE[i][0]) {
    const [a, ca] = PALETTE[i - 1], [b, cb] = PALETTE[i];
    return tmpC.copy(ca).lerp(cb, (t - a) / (b - a));
  }
  return tmpC.copy(PALETTE[PALETTE.length - 1][1]);
}

export class LabWorld {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  markMat: THREE.ShaderMaterial;
  water: THREE.ShaderMaterial;
  hexMat: THREE.ShaderMaterial;
  bubbleMat: THREE.ShaderMaterial;
  core = new THREE.PointLight(0x4fe3cf, 7, 9);
  fog = new THREE.Fog(0x061417, 3, 16);
  deep = new THREE.Color(0x04090b);
  panel = new THREE.Group();
  rocks!: THREE.InstancedMesh;
  base!: THREE.Mesh;
  mirror: THREE.Points | null = null;
  markPts: THREE.Points | null = null;
  ptr = new THREE.Vector2();
  textPlane: THREE.Mesh;
  constructor(env: THREE.Texture, low: boolean) {
    const s = this.scene;
    s.environment = env;
    s.fog = this.fog;
    s.add(new THREE.AmbientLight(0x9fb6c0, 0.25));
    const key = new THREE.DirectionalLight(0xcfe6ff, 0.6); key.position.set(-3, 8, 5); s.add(key);
    this.core.position.set(0, 2.2, 0.4); s.add(this.core);

    const metal = new THREE.MeshStandardMaterial({ color: 0x6c757c, metalness: 1, roughness: 0.36, envMap: env, envMapIntensity: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a2024, metalness: 0.6, roughness: 0.55, envMap: env, envMapIntensity: 0.35 });
    // rig
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 0.3, 64), dark); base.position.y = 0.1; s.add(base); this.base = base;
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.06, 12, 96), metal); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.3; s.add(baseRing);
    for (const [y, r, t] of [[4.0, 2.3, 0.07], [4.25, 2.4, 0.09], [4.7, 2.0, 0.05]] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 120), metal); ring.rotation.x = Math.PI / 2; ring.position.y = y; s.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.45, 0.35, 64, 1, true), dark); cap.position.y = 4.45; s.add(cap);
    const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.75, 8);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2; const b = new THREE.Mesh(barGeo, metal);
      b.position.set(Math.cos(a) * 2.1, 2.15, Math.sin(a) * 2.1); s.add(b);
    }
    // cables
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x7c858c, metalness: 0.9, roughness: 0.4, envMap: env, envMapIntensity: 0.45 });
    for (let i = 0; i < (low ? 16 : 30); i++) {
      const a = rand() * Math.PI * 2, r0 = 2.3, inside = rand() < 0.35;
      const pts = inside
        ? [new THREE.Vector3(Math.cos(a) * r0, 4.05, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * 1.6, 3.0 - rand(), Math.sin(a) * 1.6), new THREE.Vector3(Math.cos(a + 0.6) * 2.0, 4.0, Math.sin(a + 0.6) * 2.0)]
        : [new THREE.Vector3(Math.cos(a) * r0, 4.1, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * 3.4, 3.2 - rand() * 0.6, Math.sin(a) * 3.4),
          new THREE.Vector3(Math.cos(a) * (4.6 + rand()), 1.4 + rand() * 0.8, Math.sin(a) * (4.6 + rand())), new THREE.Vector3(Math.cos(a) * (6.5 + rand() * 2), -0.2, Math.sin(a) * (6.5 + rand() * 2))];
      s.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.022 + rand() * 0.02, 6), cableMat));
    }
    // rubble + walls
    const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), dark, low ? 60 : 140);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    for (let i = 0; i < rock.count; i++) {
      let a = rand() * Math.PI * 2; const r = 2.7 + Math.pow(rand(), 0.8) * 5;
      if (Math.sin(a) > 0.2) a = -a; // keep the camera's path clear
      ps.set(Math.cos(a) * r, -0.05 + rand() * 0.1, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
      const k = 0.06 + Math.pow(rand(), 2.5) * 0.45; sc.set(k * (1 + rand()), k * 0.5, k);
      m.compose(ps, q, sc); rock.setMatrixAt(i, m);
    }
    s.add(rock); this.rocks = rock;
    for (const [x, z, ry, w] of [[-7, -6, 0.5, 6], [7.5, -6, -0.6, 6], [0, -10, 0, 14]] as const) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 9, 0.4), dark); wall.position.set(x, 3.5, z); wall.rotation.y = ry; s.add(wall);
    }

    // the mark as points (filled once the icon image loads)
    this.markMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uScale: { value: 17 }, uColor: { value: new THREE.Color('#4fe3cf') } },
      vertexShader: /* glsl */ `uniform float uTime, uDpr, uScale; attribute vec4 aRand; varying float vA; varying float vW;
        void main(){ vec3 p = position; p += vec3(sin(uTime*.7+aRand.x*6.28), cos(uTime*.6+aRand.y*6.28), sin(uTime*.5+aRand.z*6.28)) * .025;
          vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = min((1.2 + pow(aRand.w, 3.) * 6.) * uDpr * uScale / max(-mv.z, .5), 32. * uDpr); vA = .3 + .55 * aRand.z; vW = step(.9, aRand.y); }`,
      fragmentShader: 'uniform vec3 uColor; varying float vA; varying float vW; void main(){ float r = length(gl_PointCoord-.5); if(r>.5) discard; float a = smoothstep(.5,.2,r) * vA; vec3 c = mix(uColor * (.55 + .45 * vA), vec3(1.), min(vW, 1.) * .7) * 1.6; gl_FragColor = vec4(c*a, a); }',
    });
    this.buildMark(low);

    // water surface, read from both sides
    this.water = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vW; ${GLSL_NOISE}
        float caust(vec2 p){ float n = fbm(p + vec2(uTime*.12, uTime*.08)); float m = fbm(p*1.7 - n*1.6 + uTime*.05); return pow(1. - abs(m*2.-1.), 7.); }
        void main(){
          vec2 p = vW.xz * .55;
          float fade = smoothstep(26., 4., length(vW.xz));
          if (gl_FrontFacing) {
            float c = caust(p*1.3) * .5;
            vec3 col = vec3(.004,.007,.009) + vec3(.2,.3,.34) * c * .12;
            gl_FragColor = vec4(col, .9 * fade);
          } else {
            float c = caust(p);
            vec3 col = vec3(.03,.07,.09) + vec3(.55,.75,.8) * c * .9 + vec3(.2,.35,.4) * fbm(p*3.) * .25;
            gl_FragColor = vec4(col, .88 * fade);
          }
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 1, 1), this.water);
    water.rotation.x = -Math.PI / 2; water.position.y = -0.02; water.renderOrder = 2;
    s.add(water);

    // hex-mesh panel under the water
    const cols = low ? 46 : 68, rows = low ? 22 : 32, r = 0.082;
    const hex = new THREE.CylinderGeometry(r, r, 0.06, 6); hex.rotateX(Math.PI / 2); hex.rotateZ(Math.PI / 6);
    const count = cols * rows;
    const aUv = new Float32Array(count * 2);
    const inst = new THREE.InstancedMesh(hex, undefined as unknown as THREE.Material, count);
    const R = 8, w = cols * r * 1.74;
    let i = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
      const px = (x + (y % 2) * 0.5) * r * 1.74 - w / 2, py = y * r * 1.5 - rows * r * 0.75;
      const th = px / R;
      ps.set(Math.sin(th) * R, py, Math.cos(th) * R - R);
      q.setFromEuler(new THREE.Euler(0, th, 0)); sc.set(1, 1, 1);
      m.compose(ps, q, sc); inst.setMatrixAt(i, m);
      aUv[i * 2] = (px + w / 2) / w; aUv[i * 2 + 1] = y / (rows - 1);
    }
    hex.setAttribute('aUv', new THREE.InstancedBufferAttribute(aUv, 2));
    const report = new THREE.TextureLoader().load(MEDIA + 'c7-caught.webp'); report.colorSpace = THREE.SRGBColorSpace;
    this.hexMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: report }, uTime: { value: 0 }, uIn: { value: 0 } },
      vertexShader: /* glsl */ `uniform sampler2D uMap; uniform float uTime, uIn; attribute vec2 aUv; varying vec3 vC; varying float vF; varying vec3 vN;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 cuv = vec2(.08 + aUv.x * .84, .1 + aUv.y * .8);
          vC = texture2D(uMap, cuv).rgb;
          float d = length((aUv - vec2(.42, .5)) * vec2(1.8, 1.));
          float wave = sin(d * 22. - uTime * 1.6) * .5 + .5;
          vec3 p = position;
          float tilt = (wave - .5) * .5;
          p.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p.yz;
          vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.);
          w.z += wave * .06 + (1. - uIn) * (hash(aUv) * 3.);
          vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0., sin(tilt), cos(tilt)));
          vF = wave;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `varying vec3 vC; varying float vF; varying vec3 vN;
        void main(){ float l = clamp(dot(vN, normalize(vec3(-.3,.5,1.))), 0., 1.);
          vec3 c = vC * (.55 + .5 * l) + vec3(.55,.65,.75) * pow(max(dot(vN, normalize(vec3(-.55,.75,.35))), 0.), 24.) * .6 + vec3(.03,.05,.07) * vF * .2;
          gl_FragColor = vec4(c, 1.); }`,
    });
    inst.material = this.hexMat;
    inst.frustumCulled = false;
    this.panel.add(inst);
    // emblem: a four-point star in a broken ring, left of the panel
    const star = new THREE.Shape();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.2 : 1; const fn = k ? 'lineTo' : 'moveTo'; star[fn](Math.cos(a) * rr, Math.sin(a) * rr); }
    const em = new THREE.Group();
    const cm = chrome(env); cm.color.set(0xe6eef4); cm.envMapIntensity = 2.6;
    em.add(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 }), cm));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 10, 80, Math.PI * 1.45), cm); arc.rotation.z = Math.PI * 0.78; em.add(arc);
    em.position.set(-w / 2 + 0.6, 0, 0.4); em.scale.setScalar(1.05);
    this.panel.add(em);
    // text
    const tex = canvasTexture(1400, 360, (g, W, H) => {
      g.fillStyle = '#eef2f5'; g.textBaseline = 'top';
      g.font = `300 96px ${FONT}`;
      lab.title.forEach((l, k) => g.fillText(l, 40, 60 + k * 100));
      g.strokeStyle = '#eef2f5'; g.lineWidth = 3; g.beginPath(); g.arc(700, 160, 82, 0, Math.PI * 2); g.stroke();
      g.save(); g.translate(700, 160); g.beginPath();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 12 : 58; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = '#eef2f5'; g.fill(); g.restore();
      g.font = `400 26px ${FONT}`;
      lab.copy.split('\n').forEach((l, k) => g.fillText(l, 840, 110 + k * 44));
      void W; void H;
    }, 1);
    this.textPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    this.textPlane.scale.set(6.2, 6.2 * 360 / 1400, 1);
    this.textPlane.position.set(-0.4, -0.55, 0.35);
    this.panel.add(this.textPlane);
    this.panel.position.set(0, -3.7, -0.5); this.panel.scale.setScalar(0.72);
    s.add(this.panel);

    // bubbles
    const bn = low ? 150 : 400;
    const bp = new Float32Array(bn * 3), br = new Float32Array(bn * 4);
    for (let k = 0; k < bn; k++) { bp[k * 3] = (rand() - 0.5) * 16; bp[k * 3 + 1] = -8 + rand() * 8; bp[k * 3 + 2] = (rand() - 0.5) * 8 + 1; for (let c = 0; c < 4; c++) br[k * 4 + c] = rand(); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('aRand', new THREE.BufferAttribute(br, 4));
    this.bubbleMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uScale: { value: 17 } },
      vertexShader: 'uniform float uTime, uDpr, uScale; attribute vec4 aRand; void main(){ vec3 p = position; p.y = -8. + mod(p.y + 8. + uTime*(.2+aRand.x*.4), 8.); p.x += sin(uTime+aRand.y*6.28)*.05; vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = min((1.5+aRand.z*5.)*uDpr*uScale/max(-mv.z,.5), 24.*uDpr); }',
      fragmentShader: 'void main(){ float r = length(gl_PointCoord-.5); if(r>.5) discard; float a = smoothstep(.5,.4,r) - smoothstep(.4,.2,r)*.7; gl_FragColor = vec4(vec3(.6,.8,.85)*a*.5, 1.); }',
    });
    const bubbles = new THREE.Points(bg, this.bubbleMat); bubbles.frustumCulled = false; s.add(bubbles);
  }

  private buildMark(low: boolean) {
    const img = new Image();
    img.onload = () => {
      const N = 150, c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      const pts: number[] = [], rnd: number[] = [];
      const per = low ? 2 : 3;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const o = (y * N + x) * 4; const lum = (d[o] + d[o + 1] + d[o + 2]) / 3;
        if (lum < 200) continue;
        for (let k = 0; k < per; k++) {
          pts.push((x / N - 0.5) * 2.7 + (rand() - 0.5) * 0.03, (0.5 - y / N) * 2.7 + (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.7 * (0.5 + rand()));
          rnd.push(rand(), rand(), rand(), rand());
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 4));
      const p = new THREE.Points(geo, this.markMat); p.frustumCulled = false; p.userData.mark = true; this.markPts = p;
      this.scene.add(p);
      // its reflection in the water
      const mm = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: this.markMat.uniforms, vertexShader: this.markMat.vertexShader,
        fragmentShader: this.markMat.fragmentShader.replace('gl_FragColor = vec4(c*a, a);', 'gl_FragColor = vec4(c*a*.28, a*.28);'),
      });
      const r = new THREE.Points(geo, mm);
      p.position.y = 2.2; r.scale.y = -1; r.position.y = -2.36; r.frustumCulled = false; this.mirror = r; this.scene.add(r);
    };
    img.src = MEDIA + 'appsiege-icon.png';
  }

  resize(w: number, h: number, dpr: number) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const sc = (h * 0.5 / Math.tan(THREE.MathUtils.degToRad(17.5))) * 0.012;
    for (const m of [this.markMat, this.bubbleMat]) { m.uniforms.uDpr.value = dpr; m.uniforms.uScale.value = sc; }
  }

  /** above: a = descent toward the rig (0..1). under: a = how far the panel has risen (0..1). */
  update(time: number, mode: 'above' | 'under', a: number, hue: number) {
    const cam = this.camera;
    const far = Math.max(1, 1.05 / cam.aspect);
    const under = mode === 'under';
    if (!under) {
      const z = (12.5 - a * 2.6) * far, orbit = a * 0.28 + Math.sin(time * 0.1) * 0.04;
      cam.position.set(Math.sin(orbit) * z + this.ptr.x * 0.3, 3.0 - a * 1.9 + this.ptr.y * 0.15, Math.cos(orbit) * z);
      cam.lookAt(0, 2.45 - a * 0.35, 0);
    } else {
      const y = -1.7 - a * 4.0;
      cam.position.set(this.ptr.x * 0.3, y + this.ptr.y * 0.12, 8.6 * far);
      cam.lookAt(0, y - 0.25, 0);
    }
    const col = paletteAt(hue);
    this.markMat.uniforms.uColor.value.copy(col);
    this.core.color.copy(col);
    this.markMat.uniforms.uTime.value = time;
    this.markPts?.rotation.set(0, Math.sin(time * 0.35) * 0.35, 0);
    if (this.mirror && this.markPts) this.mirror.rotation.copy(this.markPts.rotation);
    this.water.uniforms.uTime.value = time;
    this.hexMat.uniforms.uTime.value = time;
    this.hexMat.uniforms.uIn.value = under ? THREE.MathUtils.smoothstep(a, 0.0, 0.28) : 0;
    this.bubbleMat.uniforms.uTime.value = time;
    this.fog.near = under ? 3 : 900; this.fog.far = under ? 16 : 1000;
    this.scene.background = under ? this.deep : null;
    this.panel.visible = under;
    this.rocks.visible = !under; this.base.visible = !under;
    if (this.mirror) this.mirror.visible = !under;
  }
}
