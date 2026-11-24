// Hero world: the AppSiege mark in a chrome ring that hangs from a crossed ribbon, dust,
// and the film arriving as a cloud of bokeh points behind it. Also used upside down for the outro.
import * as THREE from 'three';
import { chrome, GLSL_NOISE, markGeometry, rand } from './shared';

const REEL_VERT = /* glsl */ `
uniform float uReveal, uTime, uDpr, uScale, uLow;
attribute vec4 aRand; attribute vec2 aUv;
varying vec2 vUv; varying float vA; varying float vR;
${GLSL_NOISE}
void main(){
  vUv = aUv; vR = aRand.w;
  vec3 target = position;
  float d = aRand.x * 0.55;
  float k = smoothstep(d, d + 0.45, uReveal);
  vec3 dir = normalize(vec3(aRand.y - .5, aRand.z - .5 + .35, aRand.w - .5) + 1e-3);
  vec3 start = target + dir * (5.0 + 6.0 * aRand.z) + vec3(0., -2.5, 2.0);
  vec3 p = mix(start, target, k);
  float t = uTime * .15;
  p.x += (vnoise(aUv * 6. + t) - .5) * .35;
  p.y += (vnoise(aUv * 6. + 17. + t) - .5) * .35 + sin(uTime * .4 + aRand.y * 6.28) * .04;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float s = mix(0.9, 7.5, pow(aRand.y, 6.0)) * (1. - uLow * .2);
  gl_PointSize = min(s * uDpr * uScale / max(-mv.z, .5), 48. * uDpr);
  vA = k;
}`;
const REEL_FRAG = /* glsl */ `
uniform sampler2D uFrameA, uFrameB; uniform float uReveal, uGain, uMix;
varying vec2 vUv; varying float vA; varying float vR;
void main(){
  vec2 c = gl_PointCoord - .5; float r = length(c);
  if (r > .5) discard;
  vec3 v = mix(texture2D(uFrameA, vUv).rgb, texture2D(uFrameB, vUv).rgb, uMix);
  float lum = dot(v, vec3(.299, .587, .114));
  float disc = smoothstep(.5, .36, r);
  float ring = smoothstep(.5, .44, r) - smoothstep(.44, .3, r);
  float a = disc * (.5 + .5 * ring) * vA * (.3 + .7 * smoothstep(.015, .3, lum + vR * .04)) * .8;
  // darker towards the edges of the frame, like a projected image
  float edge = smoothstep(.0, .25, vUv.x) * smoothstep(1., .75, vUv.x) * smoothstep(.0, .2, vUv.y) * smoothstep(1., .8, vUv.y);
  a *= .35 + .65 * edge;
  vec3 col = (pow(v, vec3(.8)) * 1.25 + vec3(.012, .018, .03)) * (.85 + vR * .6) * uGain;
  gl_FragColor = vec4(col * a, a);
}`;

const DUST_VERT = /* glsl */ `
uniform float uTime, uDpr, uScale, uAmt, uFloor;
attribute vec4 aRand;
varying float vA; varying vec3 vC;
void main(){
  vec3 p = position;
  p.y += mod(uTime * (.02 + aRand.x * .05) + aRand.y * 6., 6.) - 3.;
  p.x += sin(uTime * .3 + aRand.z * 6.28) * .08;
  float fl = uFloor * step(.35, aRand.x);
  p = mix(p, vec3(position.x * 1.6, -1.55 + (aRand.y - .5) * .45 + sin(position.x * 2. + uTime * .3) * .06, position.z * .8), fl);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((0.9 + pow(aRand.w, 4.) * 3.6) * uDpr * uScale / max(-mv.z, .5), 24. * uDpr);
  vA = (.12 + .55 * aRand.z) * uAmt * (1. + fl * 1.2);
  vC = mix(vec3(.55, .85, .25), vec3(.95, .85, .4), aRand.x);
}`;
const DUST_FRAG = /* glsl */ `
varying float vA; varying vec3 vC;
void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, .15, r) * vA; gl_FragColor = vec4(vC * a, a); }`;

export class HeroWorld {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  group = new THREE.Group();
  ringGroup = new THREE.Group();
  reel: THREE.Points;
  reelMat: THREE.ShaderMaterial;
  dustMat: THREE.ShaderMaterial;
  haze: THREE.Mesh;
  ptr = new THREE.Vector2();
  intro = 0;
  constructor(env: THREE.Texture, frame: THREE.Texture, low: boolean) {
    const s = this.scene;
    s.background = null;
    this.camera.position.set(0, 0, 7.5);
    const mat = chrome(env);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.085, 40, 160), mat);
    const mark = new THREE.Mesh(markGeometry(0.16), mat);
    mark.scale.setScalar(0.66);
    // ribbon: two strands leave the ring sides, cross under it and run off screen
    const strand = (sgn: number) => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.99 * sgn, -0.3, 0), new THREE.Vector3(1.03 * sgn, -1.15, 0.05 * sgn),
      new THREE.Vector3(0.72 * sgn, -2.35, 0.14 * sgn), new THREE.Vector3(0, -3.47, 0.12 * sgn),
      new THREE.Vector3(-0.78 * sgn, -4.5, -0.05 * sgn), new THREE.Vector3(-1.35 * sgn, -5.9, -0.2 * sgn),
    ]);
    for (const sg of [1, -1]) this.ringGroup.add(new THREE.Mesh(new THREE.TubeGeometry(strand(sg), 160, 0.034, 12, false), mat));
    this.ringGroup.add(ring, mark);
    this.ringGroup.scale.setScalar(0.53);
    this.group.add(this.ringGroup);
    s.add(this.group);

    // film as points
    const gx = low ? 150 : 270, gy = low ? 84 : 152, W = 11.4, H = W * 9 / 16;
    const n = gx * gy;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), rnd = new Float32Array(n * 4);
    for (let j = 0, i = 0; j < gy; j++) for (let k = 0; k < gx; k++, i++) {
      const u = (k + rand()) / gx, v = (j + rand()) / gy;
      uv[i * 2] = u; uv[i * 2 + 1] = v;
      pos[i * 3] = (u - 0.5) * W; pos[i * 3 + 1] = (v - 0.5) * H + 0.2; pos[i * 3 + 2] = -3 + (rand() - 0.5) * 0.7;
      rnd[i * 4] = rand(); rnd[i * 4 + 1] = rand(); rnd[i * 4 + 2] = rand(); rnd[i * 4 + 3] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
    this.reelMat = new THREE.ShaderMaterial({
      vertexShader: REEL_VERT, fragmentShader: REEL_FRAG, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uFrameA: { value: frame }, uFrameB: { value: frame }, uMix: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uScale: { value: 300 }, uGain: { value: 1 }, uLow: { value: low ? 1 : 0 } },
    });
    this.reel = new THREE.Points(g, this.reelMat);
    this.reel.frustumCulled = false;
    s.add(this.reel);

    // dust
    const dn = low ? 700 : 1800;
    const dp = new Float32Array(dn * 3), dr = new Float32Array(dn * 4);
    for (let i = 0; i < dn; i++) {
      dp[i * 3] = (rand() - 0.5) * (rand() < 0.65 ? 3.4 : 9); dp[i * 3 + 1] = -2.6 + Math.pow(rand(), 2.2) * 5; dp[i * 3 + 2] = (rand() - 0.5) * 4;
      for (let c = 0; c < 4; c++) dr[i * 4 + c] = rand();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aRand', new THREE.BufferAttribute(dr, 4));
    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uScale: { value: 300 }, uAmt: { value: 1 }, uFloor: { value: 0 } },
    });
    const dust = new THREE.Points(dg, this.dustMat); dust.frustumCulled = false;
    s.add(dust);

    // the pale haze the film lights up behind the ring
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * vec2(1.6, 2.2); float d = length(p); float a = smoothstep(.75, 0., d) * uA; gl_FragColor = vec4(vec3(.5,.52,.55) * a, 1.); }',
    }));
    this.haze.position.set(0, 0.1, -3.4);
    s.add(this.haze);
  }

  resize(w: number, h: number, dpr: number) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    // keep the ring the same on-screen size on tall phones
    this.camera.position.z = w / h < 0.8 ? 7.5 * Math.min(1.45, 0.85 / (w / h)) : 7.5;
    const sc = h * 0.5 / Math.tan(THREE.MathUtils.degToRad(17.5));
    for (const m of [this.reelMat, this.dustMat]) { m.uniforms.uDpr.value = dpr; m.uniforms.uScale.value = sc * 0.012; }
  }

  /** p: local state. rot: ring turn (radians). reveal: film cloud 0..1. inverted: outro. */
  update(time: number, rot: number, reveal: number, inverted: boolean) {
    const bob = Math.sin(time * 0.6) * 0.04;
    this.group.rotation.set(this.ptr.y * 0.08, rot + this.ptr.x * 0.18 + Math.sin(time * 0.25) * 0.06, 0);
    this.group.position.y = bob;
    const sIntro = 0.86 + 0.14 * this.intro;
    this.ringGroup.scale.setScalar(0.53 * sIntro);
    this.camera.up.set(0, inverted ? -1 : 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.reelMat.uniforms.uReveal.value = reveal;
    this.reelMat.uniforms.uTime.value = time;
    this.reel.visible = reveal > 0.001;
    this.dustMat.uniforms.uTime.value = time;
    this.dustMat.uniforms.uAmt.value = this.intro;
    (this.haze.material as THREE.ShaderMaterial).uniforms.uA.value = reveal * 0.2;
    this.dustMat.uniforms.uFloor.value = reveal;
  }
}
