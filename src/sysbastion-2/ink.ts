// The ink that floods the screen when the rule is applied (p 1.9..2.6) and retreats into a dot
// before the forge (collapse). Domain-warped fbm edge, ported from the reference's warp fill.
import { addTick, now } from './clock';
import { dpr, onViewport, smooth } from './device';
import { fullscreen, hex, mix3 } from './gl';
import { S } from './state';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform vec2 uOrigin; uniform float uProgress; uniform float uNoiseAmp; uniform float uNoiseScale;
uniform float uEdge; uniform float uTime; uniform vec3 uBright; uniform vec3 uBase; uniform vec3 uDeep;
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float valueNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, amp = 0.5; for (int i = 0; i < 5; i++){ v += valueNoise(p)*amp; p = p*2.02 + 11.3; amp *= 0.5; } return v / 0.969; }
void main(){
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  float aspect = uRes.x / uRes.y;
  vec2 delta = uv - uOrigin; delta.x *= aspect;
  float dist = length(delta);
  float md = 0.0;
  vec2 d0 = vec2(0.0,0.0)-uOrigin; d0.x *= aspect; md = max(md, length(d0));
  vec2 d1 = vec2(1.0,0.0)-uOrigin; d1.x *= aspect; md = max(md, length(d1));
  vec2 d2 = vec2(0.0,1.0)-uOrigin; d2.x *= aspect; md = max(md, length(d2));
  vec2 d3 = vec2(1.0,1.0)-uOrigin; d3.x *= aspect; md = max(md, length(d3));
  float d = dist / max(md, 0.001);
  vec2 wq = uv * 2.2;
  vec2 warp = vec2(fbm(wq + uTime*0.24), fbm(wq + 31.7 - uTime*0.2)) - 0.5;
  vec2 suv = uv + warp * 0.4;
  float scl = uNoiseScale * 0.5;
  float nz = fbm(suv*scl + uTime*0.14);
  nz = nz*0.6 + fbm(suv*scl*2.3 - uTime*0.09)*0.4;
  float ridged = 1.0 - abs(nz*2.0 - 1.0);
  float lobe = fbm(suv*(scl*0.3) + 7.0 + uTime*0.06);
  float fieldNoise = (nz-0.5)*1.4 + (ridged-0.5)*0.6 + (lobe-0.5)*1.9;
  float reach = uProgress*1.35 - 0.05;
  float settle = 1.0 - smoothstep(0.4, 1.0, uProgress);
  float edge = clamp(d*1.8, 0.0, 1.0);
  float coverage = (reach - d) + fieldNoise*uNoiseAmp*max(reach,0.0)*settle*edge;
  float aa = max(uEdge, 0.004);
  float alpha = smoothstep(-aa, aa, coverage);
  float inside = step(0.0, coverage);
  float mottle = fbm(uv*7.0 + 3.0)*0.08*inside;
  float pixelDist = length((uv - uOrigin)*uRes);
  float gradT = clamp(pixelDist / (max(uRes.x,uRes.y)*0.6), 0.0, 1.0);
  vec3 col = gradT < 0.5 ? mix(uBright, uBase, gradT*2.0) : mix(uBase, uDeep, (gradT-0.5)*2.0);
  col *= (1.0 - mottle);
  gl_FragColor = vec4(col*alpha, alpha);
}`;

export const INK = { base: '#c9daf8', bright: '#e3edff', deep: '#5a78c8' };
const SP0 = 1.9, SP1 = 2.6;

export function mountInk(canvas: HTMLCanvasElement, isActive: () => boolean) {
  let q: ReturnType<typeof fullscreen>;
  try { q = fullscreen(canvas, FRAG, { alpha: true }); } catch { return () => {}; }
  const base = hex(INK.base), bright = hex(INK.bright), deep = hex(INK.deep);
  let time = 0, last = -1, keep = 0, cleared = false;
  const draw = (pr: number) => {
    const s = smooth(0.5, 0.96, pr);
    q.gl.uniform2f(q.u('uRes'), canvas.width, canvas.height);
    q.gl.uniform2f(q.u('uOrigin'), 0.5, 0.5);
    q.gl.uniform1f(q.u('uProgress'), pr);
    q.gl.uniform1f(q.u('uNoiseAmp'), 0.82);
    q.gl.uniform1f(q.u('uNoiseScale'), 8.5);
    q.gl.uniform1f(q.u('uEdge'), 0.01);
    q.gl.uniform1f(q.u('uTime'), time);
    q.gl.uniform3fv(q.u('uBright'), mix3(bright, base, s));
    q.gl.uniform3fv(q.u('uBase'), base);
    q.gl.uniform3fv(q.u('uDeep'), mix3(deep, base, s));
    q.draw();
  };
  const resize = () => {
    const r = dpr(1.75, 1.25);
    canvas.width = Math.floor(canvas.clientWidth * r); canvas.height = Math.floor(canvas.clientHeight * r);
    draw(Math.max(0, last));
  };
  resize();
  const offView = onViewport(resize);
  const off = addTick((_, dt) => {
    if (!isActive()) { if (!cleared) { draw(0); last = 0; cleared = true; } return; }
    cleared = false;
    const t = now();
    const pr = smooth(SP0, SP1, S.p) * (1 - S.collapse);
    const spreading = pr > 0.001 && pr < 0.997;
    if (spreading || Math.abs(pr - last) > 1e-4) keep = t + 0.4;
    last = pr;
    if (t <= keep) { if (spreading) time += dt * 1.7; draw(pr); }
  });
  return () => { off(); offView(); q.dispose(); };
}
