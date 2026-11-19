// Load-time GPU baking: the procedural stand-in for the reference's Houdini/Blender bakes.
// igloo.inc ships baked colour maps (ground_color, mountain_color, igloo_color, ground_glow…) and
// renders them nearly unlit. That is why it looks detailed but smooth: lighting, occlusion and fine
// sculpt detail live in mipmapped textures, so nothing shimmers and nothing is lit per frame.
// We generate the same kind of maps once, on the GPU, in strips across frames:
//   terrain  height (half float) → lit colour with eroded micro detail, horizon AO, soft sun shadow,
//            snow/rock split, contact shade under the dome; alpha = interior glow mask
//   blocks   tileable normal + albedo/cavity (chiselled snow)
//   ice      tileable normal + roughness (frost, hairline cracks)
//   stone    tileable normal (ring segments, pedestal floor)
import * as THREE from 'three';
import { rng, frame } from './util';

export const H0 = 3.4;        // plateau height the bastion stands on
export const DOME_R = 2.55;   // keep in step with bastion.ts

const NOISE = /* glsl */ `
uniform sampler2D uLat;
// uOne is always 1; multiplying loop bounds by it stops the D3D compiler unrolling them,
// which cut first-visit shader compile from seconds to a fraction
uniform int uOne;
float latc(ivec2 i, ivec2 per, int c){ ivec2 w = ivec2(mod(vec2(i), vec2(per))); return texelFetch(uLat, w & 255, 0)[c]; }
// C2 value noise with analytic derivatives (IQ). x: value in 0..1, yz: d/dp
vec3 noised(vec2 p, ivec2 per, int c){
  vec2 i = floor(p); vec2 f = p - i;
  vec2 u = f*f*f*(f*(f*6.-15.)+10.);
  vec2 du = 30.*f*f*(f*(f-2.)+1.);
  ivec2 ii = ivec2(i);
  float a = latc(ii, per, c), b = latc(ii + ivec2(1,0), per, c), cc = latc(ii + ivec2(0,1), per, c), d = latc(ii + ivec2(1,1), per, c);
  float k1 = b - a, k2 = cc - a, k4 = a - b - cc + d;
  return vec3(a + k1*u.x + k2*u.y + k4*u.x*u.y, du * (vec2(k1, k2) + k4*u.yx));
}
const ivec2 P256 = ivec2(256);
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
// eroded fbm: octaves fade where the slope is already steep, which carves valleys and flow lines
float eroded(vec2 p, int oct, int c){
  float a = 0., b = 1.; vec2 d = vec2(0.);
  for (int i = 0; i < oct * uOne; i++) {
    vec3 n = noised(p, P256, c); n = vec3(n.x*2.-1., n.yz*2.);
    d += n.yz; a += b * n.x / (1. + dot(d, d)); b *= .5; p = M2 * p * 2.01; }
  return a;
}
float ridged(vec2 p, int oct){
  float a = 0., b = .5, w = 1.;
  for (int i = 0; i < oct * uOne; i++) {
    float n = 1. - abs(noised(p, P256, 1).x*2.-1.); n *= n; n *= w; w = clamp(n*1.7, 0., 1.);
    a += b*n; b *= .5; p = M2 * p * 2.03; }
  return a;
}
// tileable fbm over [0,1)^2 with integer base period
float tfbm(vec2 uv, int base, int oct, int c){
  float a = 0., b = .5; int per = base;
  for (int i = 0; i < oct * uOne; i++) {
    a += b * (noised(uv * float(per) + float(i) * 17.3, ivec2(per), c).x * 2. - 1.);
    b *= .5; per *= 2; }
  return a;
}
`;

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

const TERRAIN_H = /* glsl */ `
uniform float uH0; uniform float uR;
float terrainH(vec2 p){
  float d = length(p);
  float h = 4.6*exp(-d*d/95.) - 1.2*exp(-d*d/900.);
  h += eroded(p*0.034 + vec2(3.1, -7.3), 8, 0) * 6.0 * smoothstep(2.5, 24., d);
  h += ridged(p*0.0105 + vec2(11., -4.), 6) * 80. * smoothstep(38., 170., d);
  float plate = smoothstep(uR + 0.5, uR + 3.4, d);
  return mix(uH0 + eroded(p*0.8, 3, 2)*0.04, h, plate);
}`;

const HEIGHT_FS = NOISE + TERRAIN_H + /* glsl */ `
uniform float uExt; varying vec2 vUv;
void main(){ vec2 p = (vUv*2. - 1.) * uExt; gl_FragColor = vec4(terrainH(p), 0., 0., 1.); }`;

const TERRAIN_COLOR_FS = NOISE + /* glsl */ `
uniform sampler2D uHN; uniform sampler2D uHF; uniform float uN; uniform float uF; uniform float uExt; uniform float uTexelW;
uniform float uR; uniform float uNear; uniform float uFine; uniform vec3 uSun;
varying vec2 vUv;
float Hm(vec2 p){
  vec2 a = abs(p);
  float hn = textureLod(uHN, clamp(p/(2.*uN) + .5, 0., 1.), 0.).r;
  float hf = textureLod(uHF, clamp(p/(2.*uF) + .5, 0., 1.), 0.).r;
  return max(a.x, a.y) < uN * 0.985 ? hn : hf;
}
float micro(vec2 p, float snow){
  float m = eroded(p*0.5 + vec2(9., 2.), uNear > .5 ? 6 : 3, 3) * 0.55 + eroded(p*2.4 + vec2(1.7, 5.), 4, 2) * 0.12 * uNear + eroded(p*9.5 + vec2(4.2, 8.), 3, 1) * 0.028 * uFine;
  return m * mix(1., 0.75, snow);
}
void main(){
  vec2 p = (vUv*2. - 1.) * uExt;
  float e = uTexelW;
  float h0 = Hm(p);
  // macro normal decides where snow settles
  vec3 nM = normalize(vec3(Hm(p - vec2(e*2.,0.)) - Hm(p + vec2(e*2.,0.)), 4.*e, Hm(p - vec2(0.,e*2.)) - Hm(p + vec2(0.,e*2.))));
  float snow = smoothstep(.7, .92, nM.y + (noised(p*.35, P256, 1).x - .5) * .22);
  float hs = h0 + micro(p, snow);
  float hx0 = Hm(p - vec2(e,0.)) + micro(p - vec2(e,0.), snow), hx1 = Hm(p + vec2(e,0.)) + micro(p + vec2(e,0.), snow);
  float hz0 = Hm(p - vec2(0.,e)) + micro(p - vec2(0.,e), snow), hz1 = Hm(p + vec2(0.,e)) + micro(p + vec2(0.,e), snow);
  vec3 n = normalize(vec3(hx0 - hx1, 2.*e, hz0 - hz1));

  // horizon occlusion on the macro field: 8 directions, 6 steps each
  float ao = 0.;
  for (int k = 0; k < 8 * uOne; k++) {
    float a = float(k) * .7853 + .4; vec2 dir = vec2(cos(a), sin(a));
    float mx = 0., t = .35;
    for (int s = 0; s < 6 * uOne; s++) { mx = max(mx, (Hm(p + dir*t) - h0) / t); t *= 2.15; }
    ao += 1. - mx / sqrt(1. + mx*mx);
  }
  ao = pow(ao / 8., 1.35);
  // cavity from micro relief: hollows darker, edges catch light
  float cav = clamp(.55 + (hs - h0 - eroded(p*0.5 + vec2(9., 2.), 2, 3) * 0.55 * mix(1., .75, snow)) * 2.6, 0., 1.);

  // soft sun self-shadow marched over the height field
  vec3 L = normalize(uSun); vec2 ld = normalize(L.xz); float slope = L.y / length(L.xz);
  float sh = 1., t = .25;
  for (int s = 0; s < 30 * uOne; s++) { float dh = h0 + .05 + slope*t - Hm(p + ld*t); sh = min(sh, smoothstep(-.02, .14, dh / t)); t *= 1.21; if (t > 140.) break; }

  // materials
  float strata = noised(vec2(p.x*.15 + p.y*.07, hs*2.2), P256, 2).x;
  vec3 rock = vec3(.2, .215, .245) * (.75 + .5*strata);
  vec3 snowC = vec3(.66, .685, .74) * (.92 + .12*noised(p*1.7, P256, 0).x);
  float exposed = smoothstep(.55, .25, n.y);         // micro-steep faces shed their snow
  vec3 alb = mix(rock, snowC, snow * (1. - exposed*.8));

  vec3 sunC = vec3(.5, .57, .72), skyC = vec3(.24, .28, .37);
  float dif = max(dot(n, L), 0.) * sh;
  float sky = (.55 + .45*n.y) * ao;
  vec3 col = alb * (sunC*dif + skyC*sky) * mix(.55, 1.1, cav);

  // the dome: contact shade around its foot, a warm-white glow spilling from inside and the door
  float glow = 0.;
  if (uNear > .5) {
    float d = length(p);
    float foot = exp(-pow(max(d - uR*.93, 0.) / .85, 2.)) * step(uR*.82, d);
    col *= 1. - .42*foot;
    float inside = exp(-pow(max(d - uR*.45, 0.) / 1.5, 2.));
    float door = exp(-pow(p.x / 1.15, 2.)) * smoothstep(uR*.6, uR + .2, p.y) * exp(-max(p.y - uR - .4, 0.) / 2.2);
    glow = clamp(max(inside*.7, door), 0., 1.);
  }
  gl_FragColor = vec4(col / 1.6, glow);
}`;

// ---- tileable surface maps (uv period 1) ----
const BLOCK_H = /* glsl */ `
float blockH(vec2 uv){
  float h = tfbm(uv, 6, 6, 2) * .55;
  // chisel strokes: long, shallow, slightly wavy grooves
  float s = 1. - abs(noised(uv * vec2(5., 34.) + vec2(0., tfbm(uv, 3, 2, 1)*2.), ivec2(5, 34), 3).x * 2. - 1.);
  h -= pow(s, 6.) * .22;
  // packed-snow pits
  h -= smoothstep(.62, .9, noised(uv * 22., ivec2(22), 0).x) * .12;
  return h;
}`;
const BLOCK_N_FS = NOISE + BLOCK_H + /* glsl */ `
uniform float uTexel; uniform float uStrength; varying vec2 vUv;
void main(){ vec2 e = vec2(uTexel, 0.);
  float dx = blockH(vUv + e.xy) - blockH(vUv - e.xy), dy = blockH(vUv + e.yx) - blockH(vUv - e.yx);
  vec3 n = normalize(vec3(-dx * uStrength / (2.*uTexel), -dy * uStrength / (2.*uTexel), 1.));
  gl_FragColor = vec4(n*.5 + .5, 1.); }`;
const BLOCK_A_FS = NOISE + BLOCK_H + /* glsl */ `
varying vec2 vUv;
void main(){ float h = blockH(vUv); float lo = tfbm(vUv, 6, 2, 2) * .55;
  float cav = clamp(.55 + (h - lo) * .9, 0., 1.);
  vec3 c = mix(vec3(.74, .77, .83), vec3(.9, .91, .94), cav) * (.95 + .08*tfbm(vUv, 3, 3, 1));
  gl_FragColor = vec4(c, 1.); }`;

const ICE_H = /* glsl */ `
float iceH(vec2 uv){
  float h = tfbm(uv, 4, 7, 0) * .5;
  // hairline cracks: thin ridges of a warped noise
  float w = tfbm(uv, 3, 3, 1);
  float c1 = 1. - abs(noised(uv * 9. + w * 3., ivec2(9), 2).x * 2. - 1.);
  float c2 = 1. - abs(noised(uv * 17. - w * 2., ivec2(17), 3).x * 2. - 1.);
  h -= pow(c1, 18.) * .18 + pow(c2, 26.) * .1;
  return h;
}`;
const ICE_N_FS = NOISE + ICE_H + /* glsl */ `
uniform float uTexel; uniform float uStrength; varying vec2 vUv;
void main(){ vec2 e = vec2(uTexel, 0.);
  float dx = iceH(vUv + e.xy) - iceH(vUv - e.xy), dy = iceH(vUv + e.yx) - iceH(vUv - e.yx);
  vec3 n = normalize(vec3(-dx * uStrength / (2.*uTexel), -dy * uStrength / (2.*uTexel), 1.));
  // roughness rides in alpha: frosted patches rough, clear ice smooth
  float frost = smoothstep(-.15, .35, tfbm(vUv, 5, 4, 3));
  gl_FragColor = vec4(n*.5 + .5, mix(.12, .62, frost)); }`;

const STONE_N_FS = NOISE + /* glsl */ `
uniform float uTexel; uniform float uStrength; varying vec2 vUv;
float stoneH(vec2 uv){ return tfbm(uv, 5, 7, 2) * .6 - smoothstep(.66, .92, noised(uv * 30., ivec2(30), 1).x) * .1; }
void main(){ vec2 e = vec2(uTexel, 0.);
  float dx = stoneH(vUv + e.xy) - stoneH(vUv - e.xy), dy = stoneH(vUv + e.yx) - stoneH(vUv - e.yx);
  vec3 n = normalize(vec3(-dx * uStrength / (2.*uTexel), -dy * uStrength / (2.*uTexel), 1.));
  gl_FragColor = vec4(n*.5 + .5, 1.); }`;

export type Bakes = ReturnType<typeof prepareBakes>['bakes'];

/**
 * Three steps so the expensive part (first-visit shader compilation) overlaps everything else:
 *   prepareBakes()  allocates targets and materials; the textures exist (empty) at once, so scene
 *                   materials can be created against them
 *   compile()       compiles every bake program in parallel (KHR_parallel_shader_compile)
 *   run()           renders the passes in strips, yielding between them
 */
export function prepareBakes(renderer: THREE.WebGLRenderer, o: { mobile: boolean; onProgress: (k: number) => void }) {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const r = rng(2024);
  const lat = new Uint8Array(256 * 256 * 4).map(() => (r() * 256) | 0);
  const latTex = new THREE.DataTexture(lat, 256, 256, THREE.RGBAFormat);
  latTex.needsUpdate = true;

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeo);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const mats: THREE.ShaderMaterial[] = [];
  const mat = (fs: string, uniforms: Record<string, THREE.IUniform> = {}) => {
    const m = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms: { uLat: { value: latTex }, uOne: { value: 1 }, ...uniforms }, depthTest: false, depthWrite: false });
    mats.push(m); return m;
  };
  const target = (size: number, type: THREE.TextureDataType, mips: boolean, repeat: boolean) => {
    const t = new THREE.WebGLRenderTarget(size, size, {
      type, depthBuffer: false, stencilBuffer: false, generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter,
      wrapS: repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping, wrapT: repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
    });
    t.texture.anisotropy = mips ? maxAniso : 1;
    return t;
  };
  const pass = async (m: THREE.ShaderMaterial, rt: THREE.WebGLRenderTarget, strips: number) => {
    quad.material = m;
    const w = rt.width, h = rt.height, sh = Math.ceil(h / strips);
    rt.scissorTest = true;
    for (let k = 0; k < strips; k++) {
      rt.scissor.set(0, k * sh, w, Math.min(sh, h - k * sh));
      rt.viewport.set(0, 0, w, h);
      renderer.setRenderTarget(rt);
      renderer.render(scene, quadCam);
      renderer.setRenderTarget(null);
      await frame();
    }
    rt.scissorTest = false;
  };

  const N = 46, F = 250, I = 14;
  const sizeH = o.mobile ? 512 : 1024;
  const sizeCI = o.mobile ? 1024 : 2048, sizeCN = o.mobile ? 1024 : 2048, sizeCF = o.mobile ? 512 : 1024;
  const S = o.mobile ? 512 : 1024;
  const hN = target(sizeH, THREE.HalfFloatType, false, false), hF = target(sizeH, THREE.HalfFloatType, false, false);
  const cI = target(sizeCI, THREE.UnsignedByteType, true, false), cN = target(sizeCN, THREE.UnsignedByteType, true, false), cF = target(sizeCF, THREE.UnsignedByteType, true, false);
  const blockN = target(S, THREE.UnsignedByteType, true, true), blockA = target(S, THREE.UnsignedByteType, true, true);
  const iceN = target(S, THREE.UnsignedByteType, true, true), stoneN = target(S, THREE.UnsignedByteType, true, true);

  const heightMat = mat(HEIGHT_FS, { uExt: { value: N }, uH0: { value: H0 }, uR: { value: DOME_R } });
  const colorMat = mat(TERRAIN_COLOR_FS, {
    uHN: { value: hN.texture }, uHF: { value: hF.texture }, uN: { value: N }, uF: { value: F },
    uExt: { value: I }, uTexelW: { value: (2 * I) / sizeCI }, uR: { value: DOME_R }, uNear: { value: 1 },
    uSun: { value: new THREE.Vector3(-0.78, 0.38, -0.5) }, uFine: { value: 1 },
  });
  const blockNMat = mat(BLOCK_N_FS, { uTexel: { value: 1 / S }, uStrength: { value: 0.022 } });
  const blockAMat = mat(BLOCK_A_FS);
  const iceMat = mat(ICE_N_FS, { uTexel: { value: 1 / S }, uStrength: { value: 0.018 } });
  const stoneMat = mat(STONE_N_FS, { uTexel: { value: 1 / S }, uStrength: { value: 0.02 } });

  return {
    bakes: {
      terrain: { heightNear: hN.texture, heightFar: hF.texture, colorInner: cI.texture, colorNear: cN.texture, colorFar: cF.texture, I, N, F },
      blockNormal: blockN.texture, blockAlbedo: blockA.texture, iceNormal: iceN.texture, stoneNormal: stoneN.texture,
    },
    /** compile all bake programs at once */
    compile() {
      const sc = new THREE.Scene();
      for (const m of mats) { const q = new THREE.Mesh(quadGeo, m); q.frustumCulled = false; sc.add(q); }
      return renderer.compileAsync(sc, quadCam).catch(() => renderer.compile(sc, quadCam));
    },
    async run() {
      const prog = o.onProgress;
      await pass(heightMat, hN, 2);
      heightMat.uniforms.uExt.value = F;
      await pass(heightMat, hF, 2); prog(0.2);
      // inner ring around the bastion: 3.4x sharper, with one more octave of grit
      await pass(colorMat, cI, o.mobile ? 6 : 12); prog(0.42);
      Object.assign(colorMat.uniforms, { uExt: { value: N }, uTexelW: { value: (2 * N) / sizeCN }, uFine: { value: 0 } });
      await pass(colorMat, cN, o.mobile ? 6 : 12); prog(0.62);
      Object.assign(colorMat.uniforms, { uExt: { value: F }, uTexelW: { value: (2 * F) / sizeCF }, uNear: { value: 0 } });
      await pass(colorMat, cF, 4); prog(0.74);
      await pass(blockNMat, blockN, 2);
      await pass(blockAMat, blockA, 1); prog(0.84);
      await pass(iceMat, iceN, 2); prog(0.92);
      await pass(stoneMat, stoneN, 2); prog(1);
      latTex.dispose(); quadGeo.dispose(); mats.forEach((m) => m.dispose());
    },
  };
}

/** Unlit terrain that reads its shape and its light from the bakes. Fog stays live. */
export function terrainMaterial(b: Bakes['terrain']) {
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uI: { value: b.I }, uN: { value: b.N }, uF: { value: b.F }, uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(2.7, 1.38, 0.34) } }]),
    vertexShader: /* glsl */ `
      uniform sampler2D uHN; uniform sampler2D uHF; uniform float uN; uniform float uF;
      varying vec2 vP;
      #include <fog_pars_vertex>
      void main(){
        vec3 pos = position; vec2 p = pos.xz;
        float w = smoothstep(uN*.9, uN*.975, max(abs(p.x), abs(p.y)));
        float hn = textureLod(uHN, clamp(p/(2.*uN) + .5, 0., 1.), 0.).r;
        float hf = textureLod(uHF, clamp(p/(2.*uF) + .5, 0., 1.), 0.).r;
        pos.y = mix(hn, hf, w);
        vP = p;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uCI; uniform sampler2D uCN; uniform sampler2D uCF; uniform float uI; uniform float uN; uniform float uF; uniform float uGlow; uniform vec3 uGlowCol;
      varying vec2 vP;
      #include <fog_pars_fragment>
      void main(){
        float m = max(abs(vP.x), abs(vP.y));
        float w = smoothstep(uN*.8, uN*.96, m), wi = 1. - smoothstep(uI*.72, uI*.95, m);
        vec4 cn = texture2D(uCN, clamp(vP/(2.*uN) + .5, 0., 1.));
        vec4 cf = texture2D(uCF, clamp(vP/(2.*uF) + .5, 0., 1.));
        vec4 c = mix(cn, cf, w);
        if (wi > 0.) c = mix(c, texture2D(uCI, clamp(vP/(2.*uI) + .5, 0., 1.)), wi);
        vec3 col = c.rgb * 1.6 + uGlowCol * c.a * uGlow * (1. - w);
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`,
  });
  // texture uniforms are attached after merge so they are not cloned
  m.uniforms.uHN = { value: b.heightNear }; m.uniforms.uHF = { value: b.heightFar };
  m.uniforms.uCI = { value: b.colorInner }; m.uniforms.uCN = { value: b.colorNear }; m.uniforms.uCF = { value: b.colorFar };
  return m;
}
