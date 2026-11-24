// One renderer, three worlds, one compositor. The scroll position picks which worlds render
// and where the slanted wipe sits between them; the compositor adds the teal corner light,
// grain, the melt transition and the final tone map.
import * as THREE from 'three';
import { cardIndex, inOut, rng, smooth, T } from '../timeline';
import { HeroWorld } from './hero';
import { LabWorld } from './lab';
import { GLSL_NOISE, makeEnvironment } from './shared';
import { BAKED, bakedReady } from './baked';
import { WorkWorld } from './work';

const POST_FRAG = /* glsl */ `
uniform sampler2D tA, tB; uniform float uWipe, uMelt, uTime, uTeal, uPurple, uFlip, uLift; uniform vec2 uRes;
varying vec2 vUv;
${GLSL_NOISE}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
void main(){
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec3 col;
  if (uWipe < 0.) col = texture2D(tA, uv).rgb;
  else {
    float edge = mix(-.16, 1.2, uWipe) + (uv.x - .5) * .18;
    float n = (vnoise(vec2(uv.x * 22., uTime * .4)) - .5) * .022;
    float d = uv.y - edge - n;
    // the outgoing world lifts away as one plane, tipping slightly from its lower edge
    float k = max(d, 0.);
    vec2 ua = vec2(.5 + (uv.x - .5) * (1. - k * .1 * uWipe), uv.y + uWipe * .12 * (1. - k));
    vec3 a = texture2D(tA, clamp(ua, 0., 1.)).rgb * (1. - smoothstep(0., .35, k) * .25 * uWipe);
    vec3 b = texture2D(tB, uv).rgb;
    float m = smoothstep(-.0025, .0025, d);
    col = mix(b * (1. - smoothstep(.12, 0., -d) * .5 * step(d, 0.)), a, m);
    // one thin lit edge with a soft glow under it, nothing else
    float rim = exp(-pow(d / .0022, 2.)), glow = exp(-pow(d / .03, 2.));
    col += (rim * .32 + glow * .05) * mix(vec3(.62, .62, 1.), vec3(.5, .9, .85), uv.x);
  }
  // teal light pooling in the corners, purple from the lower left in the agents world
  vec2 p = uv; if (uFlip > .5) p = 1. - p;
  vec2 q = vec2(p.x * asp, p.y);
  float breathe = (.8 + .2 * sin(uTime * .35)) * mix(.35, 1., smoothstep(.6, 1.3, asp));
  float tl = exp(-pow(length(q - vec2(-.12, 1.1)) / .42, 2.));
  float br = exp(-pow(length(q - vec2(asp + .1, -.12)) / .5, 2.));
  float rr = exp(-pow((asp + .06 - q.x) / .16, 2.)) * smoothstep(.1, .7, p.y) * smoothstep(1.1, .6, p.y);
  float drift = .5 + .5 * sin(uTime * .21 + p.y * 2.);
  vec3 teal = vec3(.03, .17, .16), violet = vec3(.11, .04, .3), peri = vec3(.07, .09, .26);
  col += (violet * tl * .9 + teal * br * .85 + peri * rr * .3 * drift) * uTeal * breathe;
  float bl = exp(-pow(length(vec2(uv.x * asp, uv.y) - vec2(.05, -.08)) / .55, 2.));
  col += vec3(.07, .025, .13) * bl * uPurple;
  col += vec3(.002, .003, .0035) * (1. + uLift);
  // melt: the page dissolves through dark liquid glass and comes back
  if (uMelt > 0.) {
    float f = fbm(uv * vec2(asp, 1.) * 2.2 + uTime * .2) ;
    float m = smoothstep(f - .08, f + .08, uMelt * 1.3 - .15 + (1. - uv.y) * .15);
    float rim = smoothstep(.12, 0., abs(uMelt * 1.3 - .15 + (1. - uv.y) * .15 - f));
    col = mix(col, vec3(.01, .015, .02), m);
    col += rim * vec3(.62, .55, 1.) * .4 * (1. - m * .5);
  }
  col = aces(col * 1.12);
  col = toSRGB(col);
  col += (hash12(uv * uRes + fract(uTime * 13.) * 100.) - .5) * .055;
  float vig = smoothstep(1.25, .35, length((uv - .5) * vec2(asp * .6, 1.)));
  col *= .78 + .22 * vig;
  gl_FragColor = vec4(col, 1.);
}`;

export interface FrameState { u: number; time: number; melt: number }

export class Stage {
  renderer: THREE.WebGLRenderer;
  hero: HeroWorld; work: WorkWorld; lab: LabWorld;
  rtA: THREE.WebGLRenderTarget; rtB: THREE.WebGLRenderTarget;
  post: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  postScene = new THREE.Scene(); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private frameNo = 0;
  low: boolean;
  dpr = 1; W = 1; H = 1;
  ray = new THREE.Raycaster();
  visible = { hero: true, work: false, lab: false };
  constructor(canvas: HTMLCanvasElement, low: boolean) {
    this.low = low;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    r.setClearColor(0x070a0d, 1);
    r.toneMapping = THREE.NoToneMapping;
    const env = makeEnvironment(r);
    const reel = BAKED[0].a;
    this.hero = new HeroWorld(env, reel, low);
    this.work = new WorkWorld(env, low);
    this.lab = new LabWorld(env, low);
    // 8-bit sRGB targets with 4x MSAA: perceptually even precision (no banding in the dark
    // gradients) at half the bandwidth of half-float, and pixel-identical here after tone mapping
    // 8-bit sRGB targets with 4x MSAA: even perceptual precision (no banding in the dark gradients)
    // at half the bandwidth of half-float, and pixel-identical to it after tone mapping
    const opts = { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, samples: low ? 0 : 4, depthBuffer: true };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, opts);
    this.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tA: { value: null }, tB: { value: null }, uWipe: { value: -1 }, uMelt: { value: 0 }, uTime: { value: 0 },
        uTeal: { value: 1 }, uPurple: { value: 0 }, uFlip: { value: 0 }, uLift: { value: 0 }, uRes: { value: new THREE.Vector2() },
      },
    }));
    this.post.frustumCulled = false;
    this.postScene.add(this.post);
  }

  resize(w: number, h: number) {
    this.W = w; this.H = h;
    this.dpr = Math.min(devicePixelRatio || 1, this.low ? 1 : 1.5);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    const pw = Math.round(w * this.dpr), ph = Math.round(h * this.dpr);
    this.rtA.setSize(pw, ph); this.rtB.setSize(pw, ph);
    this.post.material.uniforms.uRes.value.set(pw, ph);
    this.hero.resize(w, h, this.dpr); this.work.resize(w, h, this.dpr); this.lab.resize(w, h, this.dpr);
  }

  /** Render every world and every state once behind the loader, so no shader compiles or
   *  texture uploads land in the middle of a scroll. */
  warm() {
    for (const u of [0, 2.6, 3.7, 4.4, 6.0, 10.8, 12.2, 12.9, 13.6, 14.2, 15.5, 0]) this.render({ u, time: 0, melt: u === 6 ? 0.5 : 0 });

  }

  /** Upload every baked shot behind the loader. */
  async warmScenes() {
    await bakedReady(2500);
    for (const b of BAKED) for (const t of [b.a, b.b, b.t]) this.renderer.initTexture(t);
  }

  setPointer(x: number, y: number) {
    for (const wld of [this.hero, this.work, this.lab]) wld.ptr.set(x, y);
  }

  private heroState(u: number, time: number, outro: boolean) {
    if (!outro) {
      const rot = Math.PI * Math.min(u / 2.94, 1) + Math.max(0, u - 2.94) * 0.25;
      this.hero.update(time, rot, smooth(rng(u, 1.55, 3.0)), false);
    } else {
      const uo = u - T.wipe3[0];
      this.hero.update(time, Math.PI + Math.PI * inOut(rng(uo, 1.0, 3.6)), 0.75 * (1 - smooth(rng(uo, 0.3, 1.6))), true);
    }
  }

  private workState(u: number, time: number) {
    const s = this.H / 900;
    const head = (u < 3.867 ? 390 + (3.867 - u) * 720 : 390 - (u - 3.867) * 380 - Math.max(0, u - 4.55) * 620) * s;
    const ringY = (u < 3.87 ? 512 + (3.87 - u) * 760 : 512 - (u - 3.87) * 230 - Math.max(0, u - 4.55) * 900) * s;
    const rot = (Math.PI / 2) * (1 - inOut(rng(u, 3.85, 4.35))) + Math.sin(time * 0.5) * 0.05;
    this.work.update(time, u, cardIndex(u), head, { y: ringY, rot, on: u > 3.25 && u < 5.4 }, u > T.chat[0] - 0.4 && u < T.chat[1]);
  }

  private labState(u: number, time: number, under: boolean) {
    const hue = rng(u, 11.0, 13.1);
    if (!under) this.lab.update(time, 'above', smooth(rng(u, 10.5, 13.15)), hue);
    else this.lab.update(time, 'under', rng(u, 12.55, 14.44), hue);
  }

  render(st: FrameState) {
    const { u, time } = st;
    const r = this.renderer;
    type W = 'hero' | 'outro' | 'work' | 'lab' | 'under';
    let a: W, b: W | null = null, wipe = -1;
    if (u < T.wipe1[0]) a = 'hero';
    else if (u < T.wipe1[1]) { a = 'hero'; b = 'work'; wipe = rng(u, T.wipe1[0], T.wipe1[1]); }
    else if (u < T.wipe2[0]) a = 'work';
    else if (u < T.wipe2[1]) { a = 'work'; b = 'lab'; wipe = rng(u, T.wipe2[0], T.wipe2[1]); }
    else if (u < T.wipeL[0]) a = 'lab';
    else if (u < T.wipeL[1]) { a = 'lab'; b = 'under'; wipe = rng(u, T.wipeL[0], T.wipeL[1]); }
    else if (u < T.wipe3[0]) a = 'under';
    else if (u < T.wipe3[1]) { a = 'under'; b = 'outro'; wipe = rng(u, T.wipe3[0], T.wipe3[1]); }
    else a = 'outro';
    // during a wipe each world only fills its side of the edge (plus the slant and a margin)
    const ew = smooth(Math.max(wipe, 0));
    const edgeY = -0.16 + 1.36 * ew;
    const clip = (rt: THREE.WebGLRenderTarget, from: number, to: number) => {
      const h = rt.height, y0 = Math.max(0, Math.floor((from) * h)), y1 = Math.min(h, Math.ceil(to * h));
      rt.scissor.set(0, y0, rt.width, Math.max(1, y1 - y0)); rt.scissorTest = true;
      rt.viewport.set(0, 0, rt.width, rt.height);
    };
    if (b) { clip(this.rtA, edgeY - 0.14, 1); clip(this.rtB, 0, edgeY + 0.14); }
    else { this.rtA.scissorTest = false; this.rtB.scissorTest = false; }
    // the film cloud's source repaints at 30 fps while the cloud is on screen
    this.frameNo++;
    // the film cloud crossfades through the eight final frames
    { const step = 4.6, k = Math.floor(time / step), f = THREE.MathUtils.smoothstep(time % step, step - 0.9, step);
      const U = this.hero.reelMat.uniforms;
      U.uFrameA.value = BAKED[k % BAKED.length].a; U.uFrameB.value = BAKED[(k + 1) % BAKED.length].a; U.uMix.value = f; }
    const draw = (w: W, rt: THREE.WebGLRenderTarget) => {
      if (w === 'hero' || w === 'outro') { this.heroState(u, time, w === 'outro'); r.setRenderTarget(rt); r.render(this.hero.scene, this.hero.camera); }
      else if (w === 'work') { this.workState(u, time); r.setRenderTarget(rt); r.render(this.work.scene, this.work.camera); }
      else { this.labState(u, time, w === 'under'); r.setRenderTarget(rt); r.render(this.lab.scene, this.lab.camera); }
    };
    draw(a, this.rtA);
    if (b) draw(b, this.rtB);
    this.visible.work = a === 'work' || b === 'work';

    const U = this.post.material.uniforms;
    U.tA.value = this.rtA.texture; U.tB.value = this.rtB.texture; U.uWipe.value = b ? ew : -1;
    U.uTime.value = time; U.uMelt.value = st.melt;
    const purple = smooth(rng(u, 4.4, 5.2)) * (1 - smooth(rng(u, 10.4, 11.0)));
    U.uPurple.value = purple;
    U.uTeal.value = u < 4.1 || u > 14.2 ? 1 : 0.55 + 0.25 * Math.sin(u * 1.7);
    U.uFlip.value = a === 'outro' ? 1 : 0;
    U.uLift.value = 0;
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  /** Card under the pointer (NDC), only while the agents world is on screen. */
  pickCard(x: number, y: number): number | null {
    if (!this.visible.work) return null;
    this.ray.setFromCamera(new THREE.Vector2(x, y), this.work.camera);
    return this.work.pick(this.ray);
  }
}
