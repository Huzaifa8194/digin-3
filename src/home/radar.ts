// The signature: a WebGL radar behind the whole homepage. One driver value, the bearing, comes from
// scroll (each chapter sits at its own angle: 000 → 360). Where the beam passes, hidden risks flare
// red then cool to blue; a ghost beam keeps sweeping at rest; the pointer is a lens that shows every
// risk at once. The loader counts 000° → 360°, opens into the radar with a boot sweep, and its
// counter becomes the bearing readout. All on gsap.ticker. Reduced motion / no WebGL: static radar.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isTouch, onPage, onScroll, prefersReducedMotion, scrollState } from '../engine';
import { createTargets } from './targets';
import { home } from './state';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes, uCenter, uMouse;
uniform float uRadius, uAngle, uGhost, uTime, uLens, uIntro, uCool, uDim, uDpr, uVel;
uniform vec4 uT[10];
uniform vec3 uP[3];
#define TAU 6.28318530718
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bearing(vec2 p){ return mod(1.5707963 - atan(p.y, p.x) + TAU, TAU); }
float behind(float b, float beam){ return mod(beam - b + TAU, TAU); }
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag - uCenter;
  float R = uRadius;
  float r = length(p) / R;
  float b = bearing(p);
  vec3 bg = vec3(0.012, 0.027, 0.058);
  vec3 col = vec3(0.0);
  float inside = 1.0 - smoothstep(1.0, 1.0 + 2.0 / R, r);
  float rev = smoothstep(0.0, 0.02, uIntro * TAU - b + 0.01);           // boot sweep reveal
  // disc body
  col += vec3(0.025, 0.06, 0.12) * inside * (1.0 - r * 0.7);
  // rings and cross hairs
  float rr = r * 5.0;
  float ring = 1.0 - smoothstep(0.0, 1.2 * uDpr, abs(rr - floor(rr + 0.5)) * R / 5.0);
  col += vec3(0.3, 0.42, 0.6) * ring * (0.32 + uVel * 0.9) * inside;
  col += vec3(0.75, 0.85, 1.0) * (1.0 - smoothstep(0.0, 1.5 * uDpr, abs(r - 1.0) * R)) * 0.65;
  float cross = min(abs(p.x), abs(p.y));
  col += vec3(0.3, 0.42, 0.6) * (1.0 - smoothstep(0.0, uDpr, cross)) * 0.18 * inside;
  // bearing ticks outside the rim: every 2°, longer every 10°, longest every 90°
  float deg = b / TAU * 360.0;
  float d2 = abs(fract(deg / 2.0 + 0.5) - 0.5) * 2.0 * (TAU / 360.0) * length(p);
  float d10 = abs(fract(deg / 10.0 + 0.5) - 0.5) * 10.0 * (TAU / 360.0) * length(p);
  float d90 = abs(fract(deg / 90.0 + 0.5) - 0.5) * 90.0 * (TAU / 360.0) * length(p);
  float band = (r - 1.0) * R / uDpr; // css px beyond the rim
  float tick = (1.0 - smoothstep(0.0, 0.9 * uDpr, d2)) * step(3.0, band) * step(band, 9.0)
             + (1.0 - smoothstep(0.0, 1.1 * uDpr, d10)) * step(3.0, band) * step(band, 17.0)
             + (1.0 - smoothstep(0.0, 1.4 * uDpr, d90)) * step(3.0, band) * step(band, 28.0);
  col += vec3(0.6, 0.7, 0.85) * min(tick, 1.0) * 0.55;
  // beam wedge + line
  float sp = behind(b, uAngle);
  col += vec3(0.3, 0.55, 1.0) * exp(-sp * (3.2 - uVel * 1.6)) * inside * (0.28 + uVel * 0.35);
  col += vec3(0.85, 0.94, 1.0) * (1.0 - smoothstep(0.0, 2.0 * uDpr, sp * length(p))) * inside;
  // ghost beam (idle)
  float gp = behind(b, uGhost);
  col += vec3(0.35, 0.55, 0.9) * exp(-gp * 7.0) * inside * 0.08;
  // assets and risks: one point per cell
  float cs = R * 0.052;
  vec2 cell = floor(frag / cs);
  float present = step(hash(cell), 0.34);
  vec2 pc = (cell + vec2(hash(cell + 1.7), hash(cell + 3.1)) * 0.6 + 0.2) * cs;
  vec2 q = pc - uCenter;
  float pr = length(q) / R;
  present *= step(pr, 0.96) * step(0.07, pr);
  float risk = step(hash(cell + 9.2), 0.15);
  float pb = bearing(q);
  float since = behind(pb, uAngle);
  float boost = 0.0;
  for (int i = 0; i < 3; i++) { float age = uTime - uP[i].z; if (age < 0.0 || age > 2.2) continue; float rad2 = age * 600.0 * uDpr; boost += (1.0 - smoothstep(0.0, 34.0 * uDpr, abs(length(pc - uP[i].xy) - rad2))) * (1.0 - age / 2.2); }
  float flare = max(exp(-since * 1.5), min(boost, 1.0));
  float ghost = exp(-behind(pb, uGhost) * 5.0) * 0.45;
  float dist = length(frag - pc);
  float rad = mix(1.5, 2.6, risk) * uDpr;
  float dotA = (1.0 - smoothstep(rad - uDpr, rad + uDpr, dist)) * present;
  float cool = clamp(smoothstep(0.35, 2.4, since) + uCool, 0.0, 1.0);
  vec3 asset = vec3(0.55, 0.72, 0.95) * (0.16 + 1.0 * max(flare, ghost));
  vec3 rk = mix(vec3(1.0, 0.2, 0.26), vec3(0.36, 0.64, 1.0), cool) * (0.3 + 1.6 * flare);
  col += mix(asset, rk, risk) * dotA;
  float halo = (1.0 - smoothstep(0.0, 1.3 * uDpr, abs(dist - rad - (5.0 + since * 14.0) * uDpr))) * risk * present * flare * (1.0 - cool);
  col += vec3(1.0, 0.28, 0.32) * halo * 0.9;
  col *= rev;
  for (int i = 0; i < 10; i++) {
    vec4 T = uT[i];
    if (T.z < 0.01) continue;
    vec2 dv = frag - T.xy; float dd = length(dv);
    vec3 tc = mix(vec3(1.0, 0.24, 0.3), vec3(0.42, 0.72, 1.0), T.w);
    col += tc * (1.0 - smoothstep(2.5 * uDpr, 4.0 * uDpr, dd)) * T.z * 1.4;
    float rr = (11.0 + 10.0 * (1.0 - T.z)) * uDpr;
    col += tc * (1.0 - smoothstep(0.0, 1.3 * uDpr, abs(dd - rr))) * T.z;
    vec2 a = abs(dv); float sq = 20.0 * uDpr;
    float br = (1.0 - smoothstep(0.0, 1.3 * uDpr, abs(max(a.x, a.y) - sq))) * step(sq * 0.55, min(a.x, a.y));
    col += tc * br * T.z * 0.9;
  }
  for (int i = 0; i < 3; i++) {
    float age = uTime - uP[i].z; if (age < 0.0 || age > 2.2) continue;
    float rad2 = age * 600.0 * uDpr;
    float band = 1.0 - smoothstep(0.0, 2.0 * uDpr, abs(length(frag - uP[i].xy) - rad2));
    col += vec3(0.6, 0.82, 1.0) * band * (1.0 - age / 2.2) * 0.75;
  }
  // the lens: every risk, fully lit
  float ld = length(frag - uMouse);
  float lens = (1.0 - smoothstep(uLens - 1.5 * uDpr, uLens, ld)) * uIntro;
  col += vec3(1.0, 0.22, 0.28) * dotA * risk * lens * 1.6;
  col += vec3(0.55, 0.72, 0.95) * dotA * (1.0 - risk) * lens * 0.55;
  col += vec3(0.05, 0.08, 0.14) * lens;
  col += vec3(0.9, 0.95, 1.0) * (1.0 - smoothstep(0.0, 1.5 * uDpr, abs(ld - uLens))) * 0.55 * uIntro;
  // compose
  vec2 uv = frag / uRes;
  vec3 outc = bg + col * uDim;
  outc *= 1.0 - 0.45 * pow(length(uv - 0.5) * 1.2, 2.0);
  outc += (hash(frag + fract(uTime * 7.0) * 91.0) - 0.5) * 0.022;
  gl_FragColor = vec4(outc, 1.0);
}`;

type Layout = { cx: number; cy: number; r: number; cool: number; dim: number };

function layoutFor(kind: string, w: number, h: number): Layout {
  if (w < 760) {
    return kind === 'hero' ? { cx: 0.5 * w, cy: 0.94 * h, r: 0.52 * w, cool: 0, dim: 0.8 }
      : kind === 'center' ? { cx: 0.5 * w, cy: 0.5 * h, r: 0.42 * w, cool: 1, dim: 0.45 }
      : { cx: 0.62 * w, cy: 0.3 * h, r: 0.5 * w, cool: 0, dim: 0.42 };
  }
  if (kind === 'hero') return { cx: 0.71 * w, cy: 0.5 * h, r: Math.min(0.4 * h, 0.27 * w), cool: 0, dim: 1 };
  if (kind === 'center') return { cx: 0.8 * w, cy: 0.5 * h, r: Math.min(0.36 * h, 0.2 * w), cool: 1, dim: 0.75 };
  return { cx: 0.8 * w, cy: 0.5 * h, r: Math.min(0.36 * h, 0.2 * w), cool: 0, dim: 0.9 };
}

function compile(gl: WebGLRenderingContext) {
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  return { uRes: u('uRes'), uCenter: u('uCenter'), uMouse: u('uMouse'), uRadius: u('uRadius'), uAngle: u('uAngle'), uGhost: u('uGhost'), uTime: u('uTime'), uLens: u('uLens'), uIntro: u('uIntro'), uCool: u('uCool'), uDim: u('uDim'), uDpr: u('uDpr'), uVel: u('uVel'), uT: u('uT'), uP: u('uP') };
}

const pad = (n: number) => String(Math.round(n)).padStart(3, '0');
const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

export function startRadar() {
  onPage(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-radar]');
    const hudDeg = document.querySelector<HTMLElement>('[data-hud-deg]');
    const hudName = document.querySelector<HTMLElement>('[data-hud-name]');
    const sections = [...document.querySelectorAll<HTMLElement>('[data-bearing]')];
    const root = document.documentElement;
    if (!canvas || !sections.length) return;
    const reduced = prefersReducedMotion();

    let gl: WebGLRenderingContext | null = null;
    let U: ReturnType<typeof compile> | null = null;
    if (!reduced) {
      try {
        gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
        if (gl) U = compile(gl);
      } catch { gl = null; U = null; }
    }
    root.classList.toggle('radar-on', !!U);

    const mobile = () => innerWidth < 760;
    const dpr = () => Math.min(devicePixelRatio || 1, mobile() ? 1 : 1.5);
    const s = { idle: 0, angle: 0, target: 0, ghost: 0, mx: innerWidth * 0.7, my: innerHeight * 0.4, tmx: innerWidth * 0.7, tmy: innerHeight * 0.4, intro: 0, L: layoutFor('hero', innerWidth, innerHeight), shown: -1 };

    // Bearings: piecewise between section anchors, so each chapter's centre sits on its angle.
    let anchors: { y: number; deg: number; kind: string; name: string }[] = [];
    const measure = () => {
      anchors = sections.map((el) => ({
        y: Math.max(0, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2),
        deg: +el.dataset.bearing!, kind: el.dataset.layout || 'right', name: el.dataset.name || '',
      }));
      if (anchors[0]) anchors[0].y = 0;
    };
    const at = (y: number) => {
      if (y <= anchors[0].y) return { i: 0, f: 0 };
      for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1].y) return { i, f: (y - anchors[i].y) / (anchors[i + 1].y - anchors[i].y) };
      return { i: anchors.length - 1, f: 0 };
    };
    const lerpL = (a: Layout, b: Layout, f: number): Layout => ({ cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f, r: a.r + (b.r - a.r) * f, cool: a.cool + (b.cool - a.cool) * f, dim: a.dim + (b.dim - a.dim) * f });
    const targetFor = (y: number) => {
      const { i, f } = at(y);
      const a = anchors[i], b = anchors[Math.min(i + 1, anchors.length - 1)];
      // hold on each chapter for its middle half, then turn: the angle "locks" while you read
      const e = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2) / 0.6;
      const k = e * e * (3 - 2 * e);
      return { deg: a.deg + (b.deg - a.deg) * k, L: lerpL(layoutFor(a.kind, innerWidth, innerHeight), layoutFor(b.kind, innerWidth, innerHeight), k), name: (k < 0.5 ? a : b).name };
    };

    const resize = () => {
      const d = dpr();
      canvas.width = Math.round(innerWidth * d);
      canvas.height = Math.round(innerHeight * d);
      gl?.viewport(0, 0, canvas.width, canvas.height);
      measure();
    };
    resize();
    addEventListener('resize', resize);
    const foot = document.querySelector('.site-footer');
    if (foot) ScrollTrigger.create({ trigger: foot, start: 'top bottom', onToggle: (st) => { root.classList.toggle('hud-away', st.isActive); home.footer = st.isActive; } });
    ScrollTrigger.addEventListener('refresh', measure);

    const setHud = (deg: number, name: string) => {
      if (hudDeg) hudDeg.textContent = `${pad(deg)}°`;
      if (hudName && hudName.textContent !== name) hudName.textContent = name;
    };

    let arrays: { T: Float32Array; P: Float32Array } | null = null;
    let vel = 0;
    let lensK = 0; // the lens only exists over the radar disc, so it never crosses the copy
    const draw = (time: number) => {
      if (!gl || !U) return;
      const d = dpr();
      const L = s.L;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uCenter, L.cx * d, (innerHeight - L.cy) * d);
      gl.uniform1f(U.uRadius, L.r * d);
      gl.uniform1f(U.uAngle, (s.angle / 360) * Math.PI * 2);
      gl.uniform1f(U.uGhost, s.ghost);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, s.mx * d, (innerHeight - s.my) * d);
      gl.uniform1f(U.uLens, lensK < 0.02 ? -100 : (mobile() ? 64 : 96) * d * lensK);
      gl.uniform1f(U.uIntro, s.intro);
      gl.uniform1f(U.uCool, L.cool);
      gl.uniform1f(U.uDim, L.dim);
      gl.uniform1f(U.uDpr, d);
      gl.uniform1f(U.uVel, vel);
      if (arrays) { gl.uniform4fv(U.uT, arrays.T); gl.uniform3fv(U.uP, arrays.P); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (!isTouch()) addEventListener('pointermove', (e) => { s.tmx = e.clientX; s.tmy = e.clientY; }, { passive: true });

    const update = () => {
      const t = targetFor(scrollState().y || scrollY);
      s.target = t.deg;
      return t;
    };
    if (reduced || !U) {
      // static: readout follows the chapter, no animation
      const ld = document.getElementById('loader'); if (ld) ld.hidden = true;
      root.classList.add('is-loaded');
      const sync = () => { const t = update(); setHud(t.deg, t.name); };
      onScroll(sync); sync();
      return;
    }

    let last = 0;
    const tagHost = document.querySelector<HTMLElement>('[data-tags]');
    const tip = document.querySelector<HTMLElement>('[data-tip]');
    const targets = tagHost ? createTargets(tagHost, mobile) : null;
    // Click or tap anywhere that is not a control: a sonar ping from that point.
    addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('a, button, input, select, textarea, summary, label, header, [data-card]')) return;
      targets?.ping(e.clientX, e.clientY, gsap.ticker.time);
    });
    const soundBtn = document.querySelector<HTMLButtonElement>('[data-sound]');
    soundBtn?.addEventListener('click', () => {
      const on = targets?.sonar.toggle() ?? false;
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.textContent = on ? 'Sound on' : 'Sound off';
    });
    gsap.ticker.add((tSec) => {
      const prevAngle = s.angle;
      const t = update();
      const r = gsap.ticker.deltaRatio();
      const k = 1 - Math.pow(0.88, r);
      // In the hero the beam sweeps on its own (one turn in ~8 s); scrolling hands it to the bearing.
      const first = anchors[1]?.y || innerHeight;
      const hk = Math.min(1, Math.max(0, (scrollState().y || scrollY) / (first * 0.6)));
      const he = hk * hk * (3 - 2 * hk);
      s.idle += 0.75 * r * (1 - he);
      const diff = ((((t.deg - s.idle) % 360) + 540) % 360) - 180;
      const eff = s.idle + diff * he;
      s.angle += (eff - s.angle) * k;
      s.L = lerpL(s.L, t.L, 1 - Math.pow(0.9, r));
      s.ghost = (s.ghost + 0.012 * r) % (Math.PI * 2);
      if (isTouch()) { s.tmx = s.L.cx + Math.cos(tSec * 0.7) * s.L.r * 0.55; s.tmy = s.L.cy + Math.sin(tSec * 0.9) * s.L.r * 0.45; }
      lensK += ((Math.hypot(s.tmx - s.L.cx, s.tmy - s.L.cy) < s.L.r * 1.04 ? 1 : 0) - lensK) * (1 - Math.pow(0.86, r));
      s.mx += (s.tmx - s.mx) * 0.12;
      s.my += (s.tmy - s.my) * 0.12;
      const shown = t.deg >= 359.5 && he >= 1 ? 360 : ((Math.round(s.angle) % 360) + 360) % 360;
      if (shown !== last && s.intro >= 1) { last = shown; setHud(shown, t.name); }
      vel += (Math.min(1, Math.abs(scrollState().velocity || 0) / 40) - vel) * 0.08;
      home.scrollDeg += (t.deg - home.scrollDeg) * k; home.cx = s.L.cx; home.cy = s.L.cy; home.r = s.L.r;
      const atHero = home.scrollDeg < 24; if (atHero !== root.classList.contains('at-hero')) root.classList.toggle('at-hero', atHero);
      if (targets) arrays = targets.update(prevAngle, s.angle, s.L, tSec, dpr(), innerHeight, s.intro >= 1);
      if (tip) {
        const a = (s.angle / 180) * Math.PI, rr = s.L.r + 40;
        tip.style.transform = `translate(${(s.L.cx + Math.sin(a) * rr).toFixed(1)}px, ${(s.L.cy - Math.cos(a) * rr).toFixed(1)}px)`;
        const tx = `${pad(((Math.round(s.angle) % 360) + 360) % 360)}°`;
        if (tip.textContent !== tx) tip.textContent = tx;
      }
      draw(tSec);
    });

    // ---------- loader: 000° → 360°, then the ring opens into the radar ----------
    runLoader(s, () => s.L, setHud).then(() => { home.ready = true; setHud(s.angle, targetFor(scrollY).name); });
  });
}

async function runLoader(s: { intro: number; angle: number }, L: () => Layout, setHud: (d: number, n: string) => void) {
  const root = document.documentElement;
  const el = document.getElementById('loader');
  const count = el?.querySelector<HTMLElement>('[data-loader-count]');
  const arc = el?.querySelector<SVGCircleElement>('[data-loader-arc]');
  const ring = el?.querySelector<HTMLElement>('[data-loader-ring]');
  if (!el || !count || !arc || !ring) { s.intro = 1; root.classList.add('is-loaded'); return; }
  // Phones skip the cover (CSS hides it) so the headline is the first paint; the radar fades in behind it.
  if (getComputedStyle(el).display === 'none') { root.classList.add('is-loaded'); await gsap.to(s, { intro: 1, duration: 0.9, ease: 'power2.inOut' }); el.hidden = true; return; }
  let seen = false;
  try { seen = sessionStorage.getItem('dg-seen') === '1'; sessionStorage.setItem('dg-seen', '1'); } catch { /* storage blocked */ }
  const MIN = seen ? 0.35 : 1.0, MAX = 1.5;
  // Count from navigation, not from script start: time already spent downloading is not waited for twice.
  const start = performance.now() - Math.min(performance.now(), MIN * 800);
  const ready = Promise.race([document.fonts.ready, wait(MAX)]);
  let done = false; ready.then(() => { done = true; });
  const len = 2 * Math.PI * 48;
  await new Promise<void>((resolve) => {
    const shown = { v: 0 };
    const tick = () => {
      const el2 = (performance.now() - start) / 1000;
      const goal = Math.min(done ? 360 : 300, (el2 / MIN) * 360);
      shown.v += (goal - shown.v) * 0.2;
      if (goal >= 360 && shown.v > 358.5) shown.v = 360;
      count.textContent = `${pad(shown.v)}°`;
      arc.style.strokeDashoffset = String(len * (1 - shown.v / 360));
      if (shown.v >= 360) { gsap.ticker.remove(tick); resolve(); }
    };
    gsap.ticker.add(tick);
  });
  // handoff: ring grows to the radar's rim at its position, counter flies to the readout
  const l = L();
  const rr = ring.getBoundingClientRect();
  const hud = document.querySelector<HTMLElement>('[data-hud-deg]')?.getBoundingClientRect();
  const cr = count.getBoundingClientRect();
  const tl = gsap.timeline();
  tl.to(ring, { x: l.cx - (rr.left + rr.width / 2), y: l.cy - (rr.top + rr.height / 2), scale: (l.r * 2) / rr.width, duration: 0.75, ease: 'expo.inOut' }, 0)
    .to(el, { backgroundColor: 'rgba(3,7,15,0)', duration: 0.45, ease: 'power2.inOut' }, 0.25)
    .to(el.querySelector('.hm-loader__brand'), { autoAlpha: 0, duration: 0.3 }, 0.1)
    .add(() => root.classList.add('is-loaded'), 0.35)
    .add(() => { el.style.pointerEvents = 'none'; }, 0.5)
    .to(s, { intro: 1, duration: 1.0, ease: 'power2.inOut' }, 0.4)
    .to(ring, { autoAlpha: 0, duration: 0.3 }, 0.8);
  if (hud) tl.to(count, { x: hud.left + hud.width / 2 - (cr.left + cr.width / 2), y: hud.top + hud.height / 2 - (cr.top + cr.height / 2), scale: hud.height / cr.height, duration: 0.75, ease: 'expo.inOut' }, 0);
  tl.to(count, { autoAlpha: 0, duration: 0.15 }, 0.75);
  await tl;
  setHud(s.angle, '');
  el.hidden = true;
}
