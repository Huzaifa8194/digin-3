// Footer light: the tile is a lamp, the shield mark on it an occluder. Each pixel marches toward
// the light and counts how much lit tile it crosses, so the mark throws a real shadow shaft. The
// light sits up-left on the tile and leans toward the cursor on a damped spring.
import { addRead, addTick } from './clock';
import { coarse, dpr, isMobile, onQuality, softwareGL, tierScale } from './device';
import { fullscreen } from './gl';
import { markCanvas } from './patterns';

const STEPS = 44, HOME = { x: 0.454, y: 0.32 }, LEAN = 0.28, CLAMP = 0.46, K = 70, DAMP = 8.5;
const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform vec2 uLight; uniform vec2 uTileC; uniform vec2 uTileH; uniform float uTileR;
uniform vec2 uMarkH; uniform sampler2D uMark; uniform float uSpread; uniform float uIntensity; uniform vec3 uTint;
float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float emit(vec2 q){
  float d = sdRoundBox(q - uTileC, uTileH, uTileR);
  float inside = 1.0 - smoothstep(-1.0, 1.0, d);
  vec2 uv = (q - uTileC) / (2.0*uMarkH) + 0.5;
  float inBox = step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
  float m = texture2D(uMark, uv).a * inBox;
  return inside * (1.0 - m);
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 stepv = (uLight - p) / float(${STEPS});
  vec2 q = p + stepv*hash(p);
  float sum = 0.0;
  for (int i = 0; i < ${STEPS}; i++){ sum += emit(q); q += stepv; }
  float ray = sum / float(${STEPS});
  float dEdge = max(0.0, sdRoundBox(p - uTileC, uTileH, uTileR));
  float I = ray * exp(-dEdge / uSpread) * uIntensity;
  vec3 col = min(uTint*I, vec3(1.0));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

export function mountRays(canvas: HTMLCanvasElement, tile: HTMLElement, live: () => boolean) {
  if (isMobile() || softwareGL()) return () => {};
  let q: ReturnType<typeof fullscreen>;
  try { q = fullscreen(canvas, FRAG, { alpha: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'low-power' }); } catch { return () => {}; }
  const { gl, u } = q;
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1i(u('uMark'), 0);
  gl.uniform3f(u('uTint'), 0.84, 0.91, 1);
  // mark texture, blurred a touch so the shaft edge is soft; padding = PAD px each side
  const MW = 256, PAD = 20, ratio = 26 / 24, MH = Math.round(MW * ratio);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const pad = document.createElement('canvas');
  pad.width = MW + PAD * 2; pad.height = MH + PAD * 2;
  const pc = pad.getContext('2d')!; pc.filter = 'blur(2.5px)'; pc.drawImage(markCanvas(MW), PAD, PAD, MW, MH);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pad);

  const touch = coarse();
  let scale = 1, dirty = true, inView = false;
  const mouse = { x: NaN, y: NaN };
  const L = { x: 0, y: 0, vx: 0, vy: 0, init: false };
  let lastTile = { cx: 0, cy: 0, w: 0 };
  const resize = () => { scale = Math.min(1, dpr(1, 0.75) * 0.6) * tierScale([1, 0.8, 0.66]); canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale)); canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale)); dirty = true; };
  resize();
  addEventListener('resize', resize);
  onQuality(resize);
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) dirty = true; }, { threshold: 0 });
  io.observe(canvas);
  const mv = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
  if (!touch) addEventListener('pointermove', mv, { passive: true });

  let cr: DOMRect | null = null, tr: DOMRect | null = null;
  addRead(() => { if (inView && live()) { cr = canvas.getBoundingClientRect(); tr = tile.getBoundingClientRect(); } });
  const off = addTick((_, dt) => {
    if (!inView || !live() || !cr || !tr) return;
    if (!tr.width) return;
    const cx = tr.left - cr.left + tr.width / 2, cy = tr.top - cr.top + tr.height / 2, hw = tr.width / 2, hh = tr.height / 2;
    if (cx !== lastTile.cx || cy !== lastTile.cy || tr.width !== lastTile.w) { dirty = true; lastTile = { cx, cy, w: tr.width }; }
    let tx = cx + (HOME.x - 0.5) * tr.width, ty = cy + (HOME.y - 0.5) * tr.height;
    if (!touch && !Number.isNaN(mouse.x)) { tx += (mouse.x - cr.left - cx) * LEAN; ty += (mouse.y - cr.top - cy) * LEAN; }
    tx = Math.max(cx - hw * CLAMP, Math.min(cx + hw * CLAMP, tx)); ty = Math.max(cy - hh * CLAMP, Math.min(cy + hh * CLAMP, ty));
    if (!L.init) { L.x = tx; L.y = ty; L.init = true; dirty = true; }
    else {
      L.vx += (tx - L.x) * K * dt; L.vy += (ty - L.y) * K * dt;
      const d = Math.exp(-DAMP * dt); L.vx *= d; L.vy *= d;
      const nx = L.x + L.vx * dt, ny = L.y + L.vy * dt;
      if (Math.abs(nx - L.x) > 0.02 || Math.abs(ny - L.y) > 0.02) dirty = true;
      L.x = nx; L.y = ny;
    }
    if (!dirty) return;
    dirty = false;
    tile.style.setProperty('--lx', `${(((L.x - (cx - hw)) / tr.width) * 100).toFixed(1)}%`);
    tile.style.setProperty('--ly', `${(((L.y - (cy - hh)) / tr.height) * 100).toFixed(1)}%`);
    const mw = tr.width * 0.62, mh = mw * ratio;
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform2f(u('uLight'), L.x * scale, L.y * scale);
    gl.uniform2f(u('uTileC'), cx * scale, cy * scale);
    gl.uniform2f(u('uTileH'), hw * scale, hh * scale);
    gl.uniform1f(u('uTileR'), Math.min(32, hw * 0.5) * scale);
    gl.uniform2f(u('uMarkH'), ((mw * ((MW + PAD * 2) / MW)) / 2) * scale, ((mh * ((MH + PAD * 2) / MH)) / 2) * scale);
    gl.uniform1f(u('uSpread'), tr.width * 3.2 * scale);
    gl.uniform1f(u('uIntensity'), 0.25);
    gl.clear(gl.COLOR_BUFFER_BIT);
    q.draw();
  });
  return () => { off(); io.disconnect(); removeEventListener('resize', resize); removeEventListener('pointermove', mv); q.dispose(); };
}
