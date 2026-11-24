// The forge: a slow domain-warped haze over near black with a warm torch that follows the
// cursor. Backdrop for Chapters 05 and 06 (the reference's totem backdrop).
import { addTick } from './clock';
import { dpr, onQuality, onViewport, qualityTier, tierScale } from './device';
import { fullscreen } from './gl';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x+p3.y)*p3.z); }
float valueNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, amp = 0.5; for (int i = 0; i < 4; i++){ v += valueNoise(p)*amp; p = p*2.03 + 7.1; amp *= 0.5; } return v; }
void main(){
  float aspect = uRes.x / uRes.y;
  vec2 uv = vec2(gl_FragCoord.x/uRes.x, 1.0 - gl_FragCoord.y/uRes.y);
  vec2 p = vec2(uv.x*aspect, uv.y);
  float t = uTime*0.05;
  vec2 q = vec2(fbm(p*1.7 + vec2(0.0,t)), fbm(p*1.7 + vec2(4.6,-t)));
  vec2 r = vec2(fbm(p*1.7 + 2.2*q + vec2(1.7,9.2)), fbm(p*1.7 + 2.2*q + vec2(8.3,2.8)));
  float n = fbm(p*1.7 + 2.6*r);
  n = smoothstep(0.35, 1.0, n);
  vec2 m = vec2(uMouse.x*aspect, uMouse.y);
  float glow = exp(-dot(p-m, p-m)*2.4);
  float vig = 1.0 - 0.45*length(uv - 0.5);
  float field = n*vig;
  vec3 col = vec3(0.006, 0.006, 0.008);
  col += vec3(0.085, 0.062, 0.028)*field;
  col += vec3(0.015, 0.020, 0.040)*field*(1.0-glow);
  col += vec3(0.20, 0.135, 0.06)*glow*(0.35 + 0.7*field);
  gl_FragColor = vec4(col, 1.0);
}`;

export function mountForge(canvas: HTMLCanvasElement, isActive: () => boolean) {
  let q: ReturnType<typeof fullscreen>;
  try { q = fullscreen(canvas, FRAG, { alpha: false }); } catch { return () => {}; }
  const target = { x: 0.5, y: 0.5 }, m = { x: 0.5, y: 0.5 };
  const move = (e: MouseEvent) => { target.x = e.clientX / innerWidth; target.y = e.clientY / innerHeight; };
  addEventListener('mousemove', move, { passive: true });
  // a soft glow: on slower machines it renders at a lower internal resolution, the browser scales it up
  const resize = () => { const r = dpr(1.5, 1) * tierScale([1, 0.66, 0.5]); canvas.width = Math.floor(canvas.clientWidth * r); canvas.height = Math.floor(canvas.clientHeight * r); };
  resize();
  const offView = onViewport(resize);
  const offQ = onQuality(resize);
  let time = 0, odd = false;
  const off = addTick((_, dt) => {
    if (!isActive()) return;
    time += dt;
    m.x += (target.x - m.x) * Math.min(1, dt * 3); m.y += (target.y - m.y) * Math.min(1, dt * 3);
    // lowest tier: the slow embers redraw every other frame
    odd = !odd;
    if (odd && qualityTier() >= 2) return;
    q.gl.uniform2f(q.u('uRes'), canvas.width, canvas.height);
    q.gl.uniform1f(q.u('uTime'), time);
    q.gl.uniform2f(q.u('uMouse'), m.x, m.y);
    q.draw();
  });
  return () => { off(); offView(); offQ(); removeEventListener('mousemove', move); q.dispose(); };
}
