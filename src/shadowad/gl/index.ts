// The GL engine: one renderer, one camera, four scenes, and a lean post chain.
// Pipeline per frame: scene → half-float target (adaptive resolution) → bright pass at 1/4 →
// dual-Kawase blur (1/8, 1/16 and back) → one final pass that tone-maps, adds bloom, chroma,
// whiteout and grain straight to the canvas. Six passes in all, five of them tiny.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBastion, type Frame } from './bastion';
import { createCrystals } from './crystals';
import { createRings } from './rings';
import { createFinale } from './finale';
import { prepareBakes } from './bake';
import { clamp, range, smooth, frame } from './util';

export type ChapterName = 'bastion' | 'crystals' | 'rings' | 'finale';
export const CHAPTERS: ChapterName[] = ['bastion', 'crystals', 'rings', 'finale'];
export type Ranges = Record<ChapterName, [number, number]>;
export type Tick = { t: number; dt: number; p: number; intro: number; pointer: THREE.Vector2; ranges: Ranges; dark: number; glitch: number };

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

const BRIGHT_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb
           + texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb;
    c *= .25;
    float l = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c * smoothstep(uThr, uThr + .7, l), 1.);
  }`;
// dual-Kawase: cheap, wide, smooth
const DOWN_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
  void main(){ vec2 o = uTexel * .5;
    vec3 c = texture2D(tSrc, vUv).rgb * 4.;
    c += texture2D(tSrc, vUv - o).rgb + texture2D(tSrc, vUv + o).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb + texture2D(tSrc, vUv - vec2(o.x, -o.y)).rgb;
    gl_FragColor = vec4(c / 8., 1.); }`;
const UP_FS = `uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
  void main(){ vec2 o = uTexel * .5;
    vec3 c = texture2D(tSrc, vUv + vec2(-o.x * 2., 0.)).rgb + texture2D(tSrc, vUv + vec2(o.x * 2., 0.)).rgb
           + texture2D(tSrc, vUv + vec2(0., -o.y * 2.)).rgb + texture2D(tSrc, vUv + vec2(0., o.y * 2.)).rgb;
    c += (texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + o).rgb + texture2D(tSrc, vUv - o).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb) * 2.;
    gl_FragColor = vec4(c / 12., 1.); }`;
const FINAL_FS = `uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure;
  uniform float uChroma; uniform float uWhite; uniform float uDark; uniform float uGlitch; uniform float uTime; uniform float uGrain; uniform float uVig; uniform vec2 uRes; uniform vec3 uFlash;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .432951) + .238081; return a / b; }
  vec3 aces(vec3 c){
    const mat3 I = mat3(vec3(.59719, .076, .0284), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777));
    const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
    c *= uExposure / .6; c = I * c; c = RRTAndODTFit(c); c = O * c; return clamp(c, 0., 1.); }
  vec3 srgb(vec3 c){ return mix(pow(c, vec3(.41666)) * 1.055 - .055, c * 12.92, vec3(lessThanEqual(c, vec3(.0031308)))); }
  vec3 scene(vec2 uv){ return texture2D(tScene, uv).rgb + texture2D(tBloom, uv).rgb * uBloom; }
  void main(){
    vec2 uv = vUv; vec2 d = uv - .5; float r2 = dot(d, d);
    float row = floor(uv.y * 46.); float tick = floor(uTime * 18.);
    float band = step(.72, hash(vec2(row, tick))) * uGlitch;
    uv.x += (hash(vec2(row * 1.7, tick + 3.)) - .5) * .06 * band;
    vec2 off = d * (uChroma * (.012 + r2 * .07) + band * .012);
    vec3 c;
    if (dot(off, off) > 1e-8) { c = vec3(scene(uv + off).r, scene(uv).g, scene(uv - off).b); } else { c = scene(uv); }
    c = srgb(aces(c));
    vec2 q = abs(d) * 2.;
    float corner = smoothstep(.55, 1.15, max(q.x, q.y) * .55 + min(q.x, q.y) * .45);
    c *= 1. - uVig * corner;
    c = mix(c, uFlash, clamp(uWhite, 0., 1.));
    c = mix(c, vec3(.075, .1, .145), uDark * .55);
    c += (hash(uv * uRes + fract(uTime * 7.1) * 91.) - .5) * uGrain;
    gl_FragColor = vec4(c, 1.);
  }`;

export async function createGL(canvas: HTMLCanvasElement, onProgress: (k: number) => void, fontsReady: Promise<unknown> = Promise.resolve()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: false, alpha: false });
  renderer.toneMapping = THREE.NoToneMapping;     // done in the final pass
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.shadowMap.enabled = false;            // all ground light and contact shade is baked
  renderer.transmissionResolutionScale = 0.5;
  renderer.autoClear = true;
  const mobile = matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  // ?hq pins the render to full resolution with no adaptive drop (recording, presenting)
  const hq = new URLSearchParams(location.search).has('hq');
  // render scale relative to CSS pixels: start sharp (native pixels, up to 2x on retina) and only
  // drop under sustained load, never below 0.8 on desktop
  const dprCap = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
  const minScale = mobile ? 0.65 : 0.8;
  let scale = hq ? dprCap : Math.min(dprCap, mobile ? 1.1 : Math.max(1, dprCap));
  renderer.setPixelRatio(scale);
  renderer.setSize(innerWidth, innerHeight, false);
  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  onProgress(0.08); await frame();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  onProgress(0.14); await frame();

  // bake terrain light and surface detail on the GPU once (the reference ships these as baked textures)
  performance.mark('sb:bake');
  const prep = prepareBakes(renderer, { mobile, hq, onProgress: (k) => onProgress(0.5 + k * 0.4) });
  const bakes = prep.bakes;
  await fontsReady;   // only the blurred-word textures need the web font
  performance.mark('sb:scenes');
  const bastion = createBastion({ maxAniso, bakes }); onProgress(0.22); await frame();
  const crystals = createCrystals({ envMap, maxAniso, bakes }); onProgress(0.28); await frame();
  const rings = createRings({ envMap, bakes }); onProgress(0.32); await frame();
  const finale = createFinale({ envMap, bakes }); onProgress(0.36); await frame();

  const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 900);
  const chapters = { bastion, crystals, rings, finale };

  // ---------- post chain ----------
  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } as const;
  // 4x MSAA on the scene target: clean edges on blocks, icons and wires
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
  const rt4 = new THREE.WebGLRenderTarget(1, 1, rtOpts), rt8 = new THREE.WebGLRenderTarget(1, 1, rtOpts), rt16 = new THREE.WebGLRenderTarget(1, 1, rtOpts), rt8b = new THREE.WebGLRenderTarget(1, 1, rtOpts), rt4b = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const mat = (fs: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const bright = mat(BRIGHT_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 1.25 } });
  const down = mat(DOWN_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const up = mat(UP_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const final = mat(FINAL_FS, {
    tScene: { value: rtScene.texture }, tBloom: { value: rt4b.texture }, uBloom: { value: 0.5 }, uExposure: { value: 0.8 },
    uChroma: { value: 0 }, uWhite: { value: 0 }, uDark: { value: 0 }, uGlitch: { value: 0 }, uTime: { value: 0 }, uGrain: { value: 0.026 }, uVig: { value: 0.22 }, uRes: { value: new THREE.Vector2(1, 1) }, uFlash: { value: new THREE.Vector3(1, 0.78, 0.45) },
  });
  const pass = (m: THREE.ShaderMaterial, src: THREE.Texture | null, dst: THREE.WebGLRenderTarget | null) => {
    quad.material = m;
    if (m.uniforms.tSrc) {
      m.uniforms.tSrc.value = src;
      const img = (src as THREE.Texture & { image: { width: number; height: number } }).image;
      m.uniforms.uTexel.value.set(1 / img.width, 1 / img.height);
    }
    renderer.setRenderTarget(dst);
    renderer.render(quadScene, quadCam);
  };
  function sizeTargets() {
    const w = Math.max(2, Math.round(innerWidth * scale)), h = Math.max(2, Math.round(innerHeight * scale));
    rtScene.setSize(w, h);
    const q = (d: number) => [Math.max(1, Math.round(w / d)), Math.max(1, Math.round(h / d))] as const;
    rt4.setSize(...q(4)); rt4b.setSize(...q(4)); rt8.setSize(...q(8)); rt8b.setSize(...q(8)); rt16.setSize(...q(16));
    final.uniforms.uRes.value.set(w, h);
  }
  function post(strength: number) {
    pass(bright, rtScene.texture, rt4);
    pass(down, rt4.texture, rt8);
    pass(down, rt8.texture, rt16);
    pass(up, rt16.texture, rt8b);
    pass(up, rt8b.texture, rt4b);
    final.uniforms.uBloom.value = strength;
    quad.material = final;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  function resize() {
    renderer.setPixelRatio(scale);
    renderer.setSize(innerWidth, innerHeight, false);
    sizeTargets();
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    cam.userData.px = scale * (innerHeight / 900);
  }
  resize();

  // Compile every program the page will ever use — bake passes, all four scenes, the post chain —
  // in one parallel batch, so first-visit compile time is the slowest program, not the sum of them.
  const pointer0 = new THREE.Vector2();
  const pose = (name: ChapterName) => chapters[name].update({ t: 0, dt: 0.016, local: 0.5, intro: 1, pointer: pointer0, cam, aspect: innerWidth / innerHeight });
  const compileScene = (name: ChapterName) => { pose(name); return renderer.compileAsync(chapters[name].scene, cam).catch(() => renderer.compile(chapters[name].scene, cam)); };
  const postScene = new THREE.Scene();
  for (const m of [bright, down, up, final]) { const q = new THREE.Mesh(quad.geometry, m); q.frustumCulled = false; postScene.add(q); }
  performance.mark('sb:compile');
  await Promise.all([prep.compile(), ...CHAPTERS.map(compileScene), renderer.compileAsync(postScene, quadCam).catch(() => {})]);
  onProgress(0.5);
  await prep.run();
  // one real frame per scene uploads its buffers and textures before the visitor can scroll there
  performance.mark('sb:warm');
  for (const name of CHAPTERS) {
    pose(name);
    renderer.setRenderTarget(rtScene); renderer.render(chapters[name].scene, cam);
    post(0.5);
    await frame();
  }
  onProgress(1);
  performance.mark('sb:ready');

  // ---------- adaptive resolution ----------
  let acc = 0, n = 0, good = 0, cooldown = 0, pinned = hq;
  function adapt(dt: number) {
    if (pinned || dt > 0.1) return;             // pinned by QA, or a tab switch/stall
    acc += dt; n++;
    if (n < 40) return;
    const avg = acc / n; acc = 0; n = 0;
    if (cooldown > 0) { cooldown--; return; }
    if (avg > 0.0205 && scale > minScale) {
      scale = Math.max(minScale, scale * 0.86); resize(); cooldown = 1; good = 0;
    } else if (avg < 0.0172) {
      if (++good >= 4 && scale < dprCap) { scale = Math.min(dprCap, scale * 1.08); resize(); good = 0; cooldown = 2; }
    } else good = 0;
  }

  const proj = new THREE.Vector3();
  function project(v: THREE.Vector3) {
    proj.copy(v).project(cam);
    return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * innerHeight, ok: proj.z < 1 && proj.z > -1 };
  }

  let current: ChapterName = 'bastion';
  let local = 0;
  function render(k: Tick) {
    let name: ChapterName = 'bastion';
    for (const c of CHAPTERS) if (k.p >= k.ranges[c][0]) name = c;
    const [a, b] = k.ranges[name];
    local = clamp((k.p - a) / Math.max(1e-6, b - a));
    current = name;
    cam.up.set(0, 1, 0);
    const fr: Frame = { t: k.t, dt: k.dt, local, intro: k.intro, pointer: k.pointer, cam, aspect: innerWidth / innerHeight };
    chapters[name].update(fr);

    // whiteouts at every seam between chapters
    // seams between chapters: amber where we pass through light (into the lit domain, through the
    // portal), near-black where we pass into shadow (from the fleet to the controls)
    let white = 0, amber = true;
    if (name === 'bastion') white = smooth(range(local, 0.76, 0.98));
    if (name === 'crystals') { const a = 1 - smooth(range(local, 0, 0.06)), b = smooth(range(local, 0.955, 1)); white = Math.max(a, b); amber = a >= b; }
    if (name === 'rings') { const a = 1 - smooth(range(local, 0, 0.05)), b = smooth(range(local, 0.9, 1)); white = Math.max(a, b); amber = b > a; }
    if (name === 'finale') white = 1 - smooth(range(local, 0, 0.1));
    final.uniforms.uFlash.value.set(...(amber ? [1, 0.78, 0.45] : [0.045, 0.05, 0.06]) as [number, number, number]);
    const u = final.uniforms;
    u.uWhite.value = white * 0.96;
    u.uChroma.value = white * 1.6 + k.glitch * 2.2 + 0.025;   // a whisper of lens fringe at rest, not a soft edge
    u.uGlitch.value = k.glitch + Math.max(0, white - 0.5) * 0.8;
    u.uDark.value = k.dark;
    u.uTime.value = k.t;

    renderer.setRenderTarget(rtScene);
    renderer.render(chapters[name].scene, cam);
    const strength = name === 'bastion' ? 0.5 + bastion.explode * 0.15 : name === 'rings' ? 0.75 : name === 'finale' ? 0.42 : 0.6;
    post(strength);
    adapt(k.dt);
  }

  return {
    render, resize, project, cam, bastion, crystals, rings, finale,
    get chapter() { return current; }, get local() { return local; }, get scale() { return scale; },
    pick(ndc: THREE.Vector2) { return current === 'crystals' ? crystals.pick(ndc, cam) : -1; },
    pickFinale(ndc: THREE.Vector2) { return current === 'finale' && finale.pick(ndc, cam); },
    /** dev: pin the render scale (null = adaptive) */
    setScale(s: number | null) { pinned = s != null; if (s != null) { scale = s; resize(); } },
  };
}
export type GL = Awaited<ReturnType<typeof createGL>>;
