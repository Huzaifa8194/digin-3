// /darkintel360-2: the mission briefing.
// Flow (after the reference flight): loader → hero → scroll the flight in → inside the probe, a console
// of seven windows → dive into a module's world → card → find three signals → briefing → back, or out.
// One clock (gsap.ticker). main.ts owns state and DOM; gl.ts only reads the numbers it is given.
import './style.css';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { createGL } from './gl';
import { PALS, landscape } from './palettes';

gsap.registerPlugin(SplitText);

type Name = 'loading' | 'hero' | 'story' | 'console' | 'world' | 'outro';
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const EASE = 'expo.out', INOUT = 'expo.inOut';

const gl = reduced ? null : createGL($<HTMLCanvasElement>('.dx-gl'));
if (!gl) html.classList.add('no-gl');
const glCanvas = $<HTMLCanvasElement>('.dx-gl');
/** Pause the GL scene and take its canvas out of compositing while a DOM scene covers it. */
const glPause = (v: boolean) => { if (!gl) return; gl.state.paused = v; glCanvas.style.visibility = v ? 'hidden' : ''; };

const sections = Object.fromEntries($$('[data-state]').map((s) => [s.dataset.state!, s])) as Record<Name, HTMLElement>;
const live = $('[data-live]');
let state: Name = 'loading';
let busy = false;

function show(name: Name) {
  state = name;
  html.dataset.state = name;
  (Object.keys(sections) as Name[]).forEach((k) => {
    const on = k === name;
    sections[k].classList.toggle('is-on', on);
    sections[k].toggleAttribute('inert', !on);
  });
}
function scene(s: 'space' | 'world') {
  html.dataset.scene = s;
  if (gl) gl.state.scene = s;
}
const say = (t: string) => { live.textContent = t; };

/** Cover a scene swap with a flash of light (the reference's cut through the glass). */
function flash(mid: () => void, hold = 0.12) {
  const f = $('.dx-flash');
  return new Promise<void>((res) => {
    if (reduced) { gsap.timeline({ onComplete: res }).to(f, { opacity: 1, duration: 0.18 }).add(mid).to(f, { opacity: 0, duration: 0.25 }); return; }
    gsap.timeline({ onComplete: res })
      .to(f, { opacity: 1, duration: 0.4, ease: 'power2.in' })
      .add(mid)
      .to(f, { opacity: 0, duration: 0.9, ease: 'power2.out', delay: hold });
  });
}

// ---------- decorative fills ----------
$$('[data-land]').forEach((el) => {
  const i = +el.dataset.land!;
  el.innerHTML = landscape(i);
  el.insertAdjacentHTML('afterend', `<div class="dx-win__hud" aria-hidden="true"><span>${String(i + 1).padStart(2, '0')} / 07</span><span class="dx-win__live"><i></i>Live</span></div>`);
});
// the right-hand screen: listings scrolling past, the same feed the flight in began with
{
  const W = ['combo_list', 'stealer_log', 'db_dump', 'corp_vpn', 'admin_panel', 'payroll', 'hr_export', 'mail_access', 'crm_backup'];
  const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  const lines = Array.from({ length: 9 }, (_, k) => (k % 3 === 0 ? `${W[k % W.length]}_${2019 + (k % 7)}.txt · ${(1 + k * 0.7).toFixed(1)}M rows · for sale`
    : k % 3 === 1 ? `HOST-${hex(4).toUpperCase()} · passwords ${12 + k * 7} · cookies ${80 + k * 31}` : `[${hex(6)}] access offered · ${W[(k + 3) % W.length]}`));
  $('[data-ticker]').innerHTML = [...lines, ...lines].map((l) => `<li>${l}</li>`).join('');
  // the cockpit walls: the dark web feed from the flight in, still running behind the glass
  const wall = Array.from({ length: 48 }, (_, k) => `${'    '.repeat(k % 3)}${lines[k % lines.length]}    ${hex(12)}    ${lines[(k + 4) % lines.length]}`).join(String.fromCharCode(10));
  $('.dx-cabin__feed').textContent = wall;
}
const ICONS = [
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="6"/><path d="M24 4v8M24 36v8M4 24h8M36 24h8"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="9" y="6" width="26" height="34" rx="3"/><path d="M15 15h14M15 22h14M15 29h8"/><circle cx="35" cy="34" r="7" fill="#f3edff"/><path d="m40 39 4 4" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M8 34 18 22l8 7 14-17"/><path d="M32 12h8v8" stroke-linecap="round"/><path d="M6 42h36" stroke-linecap="round"/></svg>',
];
$$('.dx-brief').forEach((b, i) => {
  b.setAttribute('tabindex', '-1');
  b.insertAdjacentHTML('afterbegin', `<div class="dx-brief__tile" aria-hidden="true"><i>${ICONS[i % 3]}</i></div>`);
});

// ---------- loader → hero ----------
const heroSplit = SplitText.create('.dx-hero__title', { type: 'lines', mask: 'lines' });
const setDark = (v: number) => html.style.setProperty('--dark', v.toFixed(3));
setDark(1);

/** Type the film's line, letter by letter. */
let typeTl: gsap.core.Tween | null = null;
function typeLine(delay: number) {
  const el = $('[data-typed]'), text = 'Time to turn on the light';
  typeTl?.kill();
  if (reduced) { el.textContent = text; return; }
  el.textContent = '';
  const o = { n: 0 };
  typeTl = gsap.to(o, { n: text.length, duration: text.length * 0.055, ease: 'none', delay, onUpdate: () => { el.textContent = text.slice(0, Math.round(o.n)); } });
}
/** The probe's lamp flickers on, the way an old light catches. */
function lampOn() {
  if (!gl || gl.state.lamp > 0.9) return;
  gsap.timeline()
    .to(gl.state, { lamp: 1, duration: 0.06 }).to(gl.state, { lamp: 0.1, duration: 0.07 })
    .to(gl.state, { lamp: 0.9, duration: 0.05 }).to(gl.state, { lamp: 0.3, duration: 0.1 })
    .to(gl.state, { lamp: 1, duration: 0.5, ease: 'power2.out' });
}
async function load() {
  const bar = $('[data-load]');
  gsap.set(bar, { scaleX: 0 });
  const decode = (src: string) => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); };
  const tasks: Promise<unknown>[] = [document.fonts.ready, decode('/media/darkintel360-2/lm.jpg'), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))];
  let done = 0;
  tasks.forEach((p) => p.then(() => gsap.to(bar, { scaleX: ++done / tasks.length, duration: 0.5, ease: 'power2.out' })));
  await Promise.race([Promise.all([...tasks, wait(reduced ? 0 : 900)]), wait(2300)]);
  gsap.to(bar, { scaleX: 1, duration: 0.25 });
  await wait(250);

  const hash = location.hash.slice(1), jump = $$('.dx-mod').findIndex((m) => m.id === hash);
  gsap.to('.dx-loader', { autoAlpha: 0, duration: 0.6, ease: 'power2.out' });
  gsap.to('.dx-loader__brand', { y: -24, filter: 'blur(8px)', duration: 0.6, ease: 'power2.in' });
  if (jump >= 0) { gl && (gl.state.intro = 1); enterWorld(jump, true); return; }
  heroIn(true);
}

function heroIn(first = false) {
  show('hero');
  scene('space');
  if (gl) {
    glPause(false);
    gl.state.outro = 0; gl.state.story = 0; story.cur = story.target = 0;
    gl.state.light = 0; gl.state.lamp = 0;
    gsap.fromTo(gl.state, { intro: first ? 0 : gl.state.intro }, { intro: 1, duration: 2.4, ease: EASE });
  }
  setDark(1);
  gsap.set('.dx-hero__title, .dx-hero .dx-cta, .dx-hero__kicker, .dx-typed', { autoAlpha: 1, y: 0 });
  typeLine(first ? 1.3 : 0.8);
  if (!reduced) {
    gsap.from('.dx-hero__kicker', { y: 16, autoAlpha: 0, duration: 1, ease: EASE, delay: first ? 0.2 : 0 });
    gsap.from(heroSplit.lines, { yPercent: 105, duration: 1.4, ease: EASE, stagger: 0.09, delay: first ? 0.3 : 0.1 });
    gsap.from('.dx-hero .dx-cta', { y: 24, autoAlpha: 0, duration: 1.1, ease: EASE, delay: first ? 0.9 : 0.5 });
  }
  if (!first) $('#hero-title').focus({ preventScroll: true });
}

// ---------- the flight in ----------
const story = { cur: 0, target: 0 };
const beats = $$('[data-beat]').map((el) => {
  const [a, b] = el.dataset.beat!.split(' ').map(Number);
  const words = $$('[data-words]', el).flatMap((p) => SplitText.create(p, { type: 'words', wordsClass: 'dx-w' }).words as HTMLElement[]);
  return { el, a, b, words, lit: -1 };
});
let hintGone = false;

function begin() {
  if (state !== 'hero' || busy) return;
  lampOn();
  show('story');
  gsap.to('.dx-hero__kicker, .dx-hero__title, .dx-typed, .dx-hero .dx-cta', { autoAlpha: 0, y: -40, duration: 0.7, ease: 'power2.in', stagger: 0.04 });
  if (reduced) {
    setDark(0);
    beats.forEach((b) => { gsap.set(b.el, { autoAlpha: 1 }); b.words.forEach((w) => w.classList.add('is-lit')); });
    $('[data-skip]').textContent = 'Continue';
    $('#story-title').focus({ preventScroll: true });
    return;
  }
  hintGone = false;
  gsap.fromTo('[data-hint]', { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 1, ease: EASE, delay: 0.3 });
  story.target = Math.max(story.target, 0.035);
  $('#story-title').focus({ preventScroll: true });
  say('The flight in. Scroll, swipe or use the arrow keys to fly. Skip is at the bottom of the screen.');
}
function nudge(dp: number) {
  if (state === 'hero') { if (dp > 0) begin(); return; }
  if (state !== 'story' || busy || reduced || skipping) return;
  if (dp < 0 && story.cur < 0.012) { backToHero(); return; }
  story.target = clamp(story.target + dp, 0, 1);
}
function backToHero() {
  story.cur = story.target = 0;
  gsap.to('[data-hint]', { autoAlpha: 0, duration: 0.3 });
  show('hero');
  if (gl) gl.state.light = 0;
  setDark(1);
  gsap.fromTo('.dx-hero__kicker, .dx-hero__title, .dx-typed, .dx-hero .dx-cta', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, stagger: 0.05 });
}
function skip() {
  if (state !== 'story' || busy) return;
  if (reduced) { enterConsole(); return; }
  hintGone = true; gsap.to('[data-hint]', { autoAlpha: 0, duration: 0.4, overwrite: true });
  skipping = true;
  gsap.to(story, { cur: 1, target: 1, duration: 3.4 * (1 - story.cur) + 0.6, ease: 'power2.inOut', onComplete: () => { skipping = false; } });
}
let skipping = false;
const ringArc = $<SVGCircleElement>('.dx-ring__arc');
function storyFrame(dt: number) {
  if (!skipping) {
    story.cur += (story.target - story.cur) * Math.min(1, dt * 3.4);
    if (Math.abs(story.target - story.cur) < 0.0004) story.cur = story.target;
  }
  const s = story.cur;
  if (gl) gl.state.story = s;
  // the light comes on as DarkIntel360 is named
  const L = (() => { const t = clamp((s - 0.56) / 0.22); return t * t * (3 - 2 * t); })();
  if (gl) gl.state.light = L;
  setDark(1 - L);
  if (!hintGone && s > 0.06) { hintGone = true; gsap.to('[data-hint]', { autoAlpha: 0, scale: 1.15, duration: 0.6, ease: 'power2.out', overwrite: true }); }
  ringArc.style.strokeDashoffset = String(100 - s * 100);
  for (const b of beats) {
    const l = (s - b.a) / (b.b - b.a);
    const alpha = clamp(l / 0.14) * clamp((1 - l) / 0.14);
    gsap.set(b.el, { autoAlpha: alpha, y: (1 - alpha) * (l < 0.5 ? 34 : -34) });
    const lit = Math.floor(clamp((l - 0.06) / 0.5) * b.words.length);
    if (lit !== b.lit) { b.words.forEach((w, i) => w.classList.toggle('is-lit', i < lit)); b.lit = lit; }
  }
  if (s > 0.996 && !busy) enterConsole();
}

// ---------- the console ----------
const cabin = $('[data-cabin]'), track = $('[data-track]');
const wins = $$('[data-win]'), dots = $$<HTMLButtonElement>('[data-dot]');
let cur = 0;
const visited = new Set<number>();
const pov = { x: 0, y: 0, tx: 0, ty: 0, last: -1e9 };
// The windows sit on the inside of a cylinder, like the cockpit glass: side windows wrap toward you.
const ring = { pos: 0 };
function ringGeo() {
  const W = wins[0].offsetWidth, phone = innerWidth < 761;
  return { W, gap: phone ? 0.98 : 0.86, turn: phone ? 50 : 58, depth: phone ? 0.12 : 0.2 };
}
// Cached setters: the ring is laid out every frame while the eye moves, so skip gsap.set's parsing.
const ringSet = wins.map((w) => ({
  x: gsap.quickSetter(w, 'x', 'px'), z: gsap.quickSetter(w, 'z', 'px'),
  ry: gsap.quickSetter(w, 'rotationY', 'deg'), rx: gsap.quickSetter(w, 'rotationX', 'deg'),
  shown: null as boolean | null, zi: -1,
}));
function layoutRing() {
  const { W, gap, turn, depth } = ringGeo();
  const head = pov.x * 0.05; // turning your head swings the curved wall a little
  wins.forEach((w, i) => {
    const d = i - ring.pos - head, far = Math.abs(d), k = Math.min(far, 1.6) * Math.sign(d), r = ringSet[i];
    const show = far < 1.7, zi = 10 - Math.round(far);
    if (show !== r.shown) { r.shown = show; w.style.visibility = show ? '' : 'hidden'; w.style.opacity = show ? '' : '0'; }
    if (zi !== r.zi) { r.zi = zi; w.style.zIndex = String(zi); }
    if (!show) return;
    r.x(d * W * gap); r.z(Math.min(far, 1.6) * W * depth); r.ry(-k * turn); r.rx(pov.y * -2.2);
  });
}
function goTo(i: number, instant = false) {
  cur = clamp(i, 0, wins.length - 1);
  gsap.to(ring, { pos: cur, duration: instant ? 0 : 1.15, ease: EASE, overwrite: true, onUpdate: layoutRing });
  if (instant) { ring.pos = cur; layoutRing(); }
  wins.forEach((w, k) => {
    w.classList.toggle('is-cur', k === cur);
    $<HTMLButtonElement>('[data-explore]', w).tabIndex = k === cur ? 0 : -1;
    w.setAttribute('aria-hidden', String(k !== cur));
  });
  dots.forEach((d, k) => (k === cur ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  $<HTMLButtonElement>('[data-step="-1"]').disabled = cur === 0;
  $<HTMLButtonElement>('[data-step="1"]').disabled = cur === wins.length - 1;
  if (state === 'console' && !instant) say(`${$('h3', wins[cur]).textContent}, module ${cur + 1} of 7.`);
}
goTo(0, true);
addEventListener('resize', () => goTo(cur, true));

async function enterConsole() {
  if (busy) return;
  busy = true;
  await flash(() => {
    show('console');
    if (gl) glPause(true);
    goTo(cur, true);
    consoleIn();
  }, 0.05);
  busy = false;
  $('#console-title').focus({ preventScroll: true });
  say(`Inside the console. ${$('h3', wins[cur]).textContent}, module ${cur + 1} of 7. Use the arrows to choose a module.`);
}
function consoleIn() {
  if (reduced) return;
  $$<HTMLElement>('[data-count]').forEach((b) => {
    const to = +b.dataset.count!, k = b.hasAttribute('data-k'), o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, ease: 'expo.out', delay: 0.5, onUpdate: () => { b.textContent = k ? `${o.v.toFixed(1)}K` : String(Math.round(o.v)); } });
  });
  gsap.fromTo(cabin, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: EASE, transformOrigin: '50% 40%', clearProps: 'transform' });
}

// drag / swipe the track
{
  let down = false, sx = 0, sy = 0, base = 0, dx = 0, moved = false, t0 = 0;
  track.addEventListener('pointerdown', (e) => {
    if (busy || state !== 'console') return;
    down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now();
    base = ring.pos;
    gsap.killTweensOf(ring);
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    dx = e.clientX - sx;
    if (!moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - sy)) { moved = true; track.classList.add('is-drag'); track.setPointerCapture?.(e.pointerId); }
    if (!moved) return;
    const edge = (cur === 0 && dx > 0) || (cur === wins.length - 1 && dx < 0) ? 0.3 : 1;
    ring.pos = base - (dx * edge) / (ringGeo().W * 0.8);
    layoutRing();
  });
  const up = (e: PointerEvent) => {
    if (!down) return;
    down = false; track.classList.remove('is-drag');
    if (!moved) {
      const w = (e.target as HTMLElement).closest<HTMLElement>('[data-win]');
      if (w && +w.dataset.win! !== cur) goTo(+w.dataset.win!);
      else if (w && !(e.target as HTMLElement).closest('button')) goTo(cur);
      return;
    }
    const v = dx / Math.max(1, performance.now() - t0);
    const step = Math.abs(dx) > innerWidth * 0.12 || Math.abs(v) > 0.5 ? -Math.sign(dx) : 0;
    goTo(cur + step);
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}
$$<HTMLButtonElement>('[data-step]').forEach((b) => b.addEventListener('click', () => goTo(cur + +b.dataset.step!)));
dots.forEach((d) => d.addEventListener('click', () => goTo(+d.dataset.dot!)));
$$<HTMLButtonElement>('[data-explore]').forEach((b) => b.addEventListener('click', () => { if (+b.dataset.explore! === cur) dive(cur); }));

/** Push the camera through the current window, then cut into its world. */
async function dive(i: number) {
  if (busy) return;
  busy = true;
  const r = wins[i].getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const s = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.25;
  if (!reduced) {
    gsap.set(cabin, { transformOrigin: `${cx}px ${cy}px` });
    gsap.to(cabin, { x: innerWidth / 2 - cx, y: innerHeight / 2 - cy, scale: s, duration: 1.35, ease: 'power3.in' });
    await wait(900);
  }
  enterWorld(i);
}

// ---------- worlds ----------
const mods = $$('[data-mod]');
const found = mods.map(() => [false, false, false]);
const backdrop = $('.dx-backdrop');
let world: 'card' | 'hunt' = 'card';
let briefOpen = -1;
const FALLBACK_POS = [[0.24, 0.6], [0.74, 0.64], [0.5, 0.5]];

async function enterWorld(i: number, fromLoad = false) {
  busy = true;
  cur = i; visited.add(i);
  await flash(() => {
    show('world');
    scene('world');
    gsap.set(cabin, { clearProps: 'transform' });
    goTo(i, true);
    const p = PALS[i];
    html.style.setProperty('--sky-top', p.skyTop);
    html.style.setProperty('--sky-bot', p.skyBot);
    mods.forEach((m, k) => m.classList.toggle('is-cur', k === i));
    if (gl) {
      gl.setModule(i);
      glPause(false); gl.state.world = 0; gl.state.beam = -1; gl.state.beamAmt = 0;
    } else backdrop.innerHTML = landscape(i);
    setWorld('card');
    syncFound(i);
    const card = $('.dx-card', mods[i]);
    gsap.set(card, { autoAlpha: 1 });
    if (!reduced) gsap.fromTo(card, { y: 60, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.3, ease: EASE, delay: fromLoad ? 0.1 : 0.35 });
  }, fromLoad ? 0 : 0.15);
  busy = false;
  $('.dx-card__title', mods[i]).focus({ preventScroll: true });
}
function setWorld(w: 'card' | 'hunt') {
  world = w;
  html.dataset.world = w;
  const all = found[cur].every(Boolean);
  html.dataset.done = all && w === 'hunt' ? '1' : '';
  gsap.set('.dx-done', { autoAlpha: all && w === 'hunt' ? 1 : 0 });
}
function syncFound(i: number) {
  $$('[data-sig]', mods[i]).forEach((b, k) => b.classList.toggle('is-found', found[i][k]));
  $$('[data-pg]').forEach((li, k) => li.classList.toggle('is-found', found[i][k]));
}

async function hunt() {
  if (busy || world !== 'card') return;
  busy = true;
  const m = mods[cur];
  gsap.to($('.dx-card', m), { y: 50, autoAlpha: 0, duration: 0.6, ease: 'power2.in' });
  setWorld('hunt');
  const labels = $$('[data-sig]', m);
  gsap.set(labels, { autoAlpha: 0 });
  if (gl) await new Promise<void>((r) => gsap.to(gl.state, { world: 1, duration: reduced ? 0 : 2.6, ease: INOUT, onComplete: r }));
  else { gsap.fromTo(backdrop, { scale: 1.08 }, { scale: 1, duration: reduced ? 0 : 1.2, ease: EASE }); }
  gsap.to(labels, { autoAlpha: 1, duration: 0.6, stagger: 0.12, ease: 'power2.out' });
  if (!found[cur].some(Boolean)) {
    gsap.timeline()
      .fromTo('[data-find]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE })
      .to('[data-find]', { autoAlpha: 0, y: -16, duration: 0.7, ease: 'power2.in' }, '+=2.6');
  }
  busy = false;
  labels.find((l, k) => !found[cur][k])?.focus({ preventScroll: true });
  say('Find the signals. Three signals are hidden in this landscape; each one opens a briefing.');
}

async function openBrief(k: number) {
  if (busy || briefOpen >= 0) return;
  busy = true; briefOpen = k;
  const m = mods[cur], brief = $$('.dx-brief', m)[k], close = $('[data-close-brief]');
  gsap.to('[data-find]', { autoAlpha: 0, duration: 0.3, overwrite: true });
  gsap.to($$('[data-sig]', m), { autoAlpha: 0, duration: 0.35 });
  if (gl) { gl.state.beam = k; gsap.to(gl.state, { beamAmt: 1, duration: 0.9, delay: 0.5, ease: 'power2.out' }); }
  await wait(reduced ? 0 : gl ? 1100 : 200);
  brief.classList.add('is-open');
  gsap.fromTo(brief, { autoAlpha: 0, y: 40, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: reduced ? 0 : 0.9, ease: EASE });
  gsap.fromTo(close, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.7, ease: EASE, delay: reduced ? 0 : 0.2 });
  requestAnimationFrame(() => gsap.set(close, { top: brief.getBoundingClientRect().bottom + 14 }));
  found[cur][k] = true;
  syncFound(cur);
  busy = false;
  brief.focus({ preventScroll: true });
}
function closeBrief() {
  if (briefOpen < 0) return;
  const k = briefOpen, m = mods[cur], brief = $$('.dx-brief', m)[k];
  briefOpen = -1;
  gsap.to(brief, { autoAlpha: 0, y: 30, duration: reduced ? 0 : 0.45, ease: 'power2.in', onComplete: () => brief.classList.remove('is-open') });
  gsap.to('[data-close-brief]', { autoAlpha: 0, duration: 0.3 });
  if (gl) gsap.to(gl.state, { beamAmt: 0, duration: 0.6, onComplete: () => { if (briefOpen < 0) gl.state.beam = -1; } });
  gsap.to($$('[data-sig]', m), { autoAlpha: 1, duration: 0.5, delay: 0.3 });
  const all = found[cur].every(Boolean);
  if (all) {
    html.dataset.done = '1';
    gsap.fromTo('.dx-done', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, delay: 0.4 });
    setTimeout(() => $('.dx-done .dx-pill').focus({ preventScroll: true }), 420);
    say('All three signals found. Explore other modules, or finish the mission.');
  } else {
    const next = $$<HTMLButtonElement>('[data-sig]', m).find((_, i) => !found[cur][i]) || $$<HTMLButtonElement>('[data-sig]', m)[k];
    next.focus({ preventScroll: true });
  }
}

async function toConsole() {
  if (busy || state !== 'world') return;
  closeBrief();
  busy = true;
  const next = found[cur].every(Boolean) ? (cur + 1) % wins.length : cur;
  await flash(() => {
    show('console');
    scene('space');
    if (gl) { glPause(true); gl.state.world = 0; }
    setWorld('card');
    goTo(next, true);
    if (!reduced) {
      const r = wins[next].getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const s = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.2;
      gsap.fromTo(cabin, { transformOrigin: `${cx}px ${cy}px`, x: innerWidth / 2 - cx, y: innerHeight / 2 - cy, scale: s }, { x: 0, y: 0, scale: 1, duration: 1.6, ease: EASE, clearProps: 'transform' });
    }
  }, 0.05);
  busy = false;
  $<HTMLButtonElement>('[data-explore]', wins[next]).focus({ preventScroll: true });
  say(`Back in the console. ${$('h3', wins[next]).textContent}, module ${next + 1} of 7.`);
}

// ---------- outro ----------
async function finish() {
  if (busy) return;
  closeBrief();
  busy = true;
  await flash(() => {
    show('outro');
    scene('space');
    setDark(0);
    setWorld('card');
    if (gl) {
      placeRing();
      glPause(false); gl.state.story = 0.9; gl.state.intro = 1; gl.state.light = 1; gl.state.lamp = 1;
      gsap.fromTo(gl.state, { outro: 0 }, { outro: 1, duration: 2.6, ease: INOUT });
    }
    if (!reduced) {
      gsap.fromTo('.dx-word', { autoAlpha: 0, scale: 0.92, filter: 'blur(16px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: EASE, delay: 0.9 });
      gsap.fromTo('.dx-outro > :not(.dx-word)', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.08, delay: 1.3 });
    }
  });
  busy = false;
  $('#outro-title').focus({ preventScroll: true });
}
/** Centre the GL orbit on the DOM wordmark. */
function placeRing() {
  if (!gl) return;
  const r = $('.dx-word').getBoundingClientRect();
  gl.state.ringX = r.left + r.width / 2; gl.state.ringY = r.top + r.height * 0.5; gl.state.ringW = r.width / 2;
}
addEventListener('resize', () => { if (state === 'outro') placeRing(); });
async function restart() {
  if (busy) return;
  busy = true;
  await flash(() => { if (gl) gl.state.intro = 0; heroIn(false); });
  busy = false;
}

// ---------- POV inside the cockpit ----------
// The pointer is the eye. At rest the view keeps a slow sway, so the cabin never freezes.
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  pov.tx = (e.clientX / innerWidth - 0.5) * 2; pov.ty = (e.clientY / innerHeight - 0.5) * 2; pov.last = performance.now();
});
const dash = $('.dx-dash'), roof = $('.dx-cabin__roof');
const povSet = {
  track: [gsap.quickSetter(track, 'x', 'px'), gsap.quickSetter(track, 'y', 'px')],
  dash: [gsap.quickSetter(dash, 'x', 'px'), gsap.quickSetter(dash, 'y', 'px')],
  roof: [gsap.quickSetter(roof, 'x', 'px'), gsap.quickSetter(roof, 'y', 'px')],
};
let povDrawn = { x: 9, y: 9 };
function povFrame(dt: number) {
  const now = performance.now(), idle = now - pov.last > 2500, t = now / 1000;
  const tx = idle ? Math.sin(t * 0.35) * 0.22 : pov.tx, ty = idle ? Math.sin(t * 0.27 + 1) * 0.12 : pov.ty;
  pov.x += (tx - pov.x) * Math.min(1, dt * 2.6);
  pov.y += (ty - pov.y) * Math.min(1, dt * 2.6);
  // only touch the DOM when the view has actually moved
  if (Math.abs(pov.x - povDrawn.x) < 0.0015 && Math.abs(pov.y - povDrawn.y) < 0.0015) return;
  povDrawn = { x: pov.x, y: pov.y };
  povSet.track[0](pov.x * -54); povSet.track[1](pov.y * -22);
  povSet.dash[0](pov.x * -100); povSet.dash[1](pov.y * -16);
  povSet.roof[0](pov.x * -36); povSet.roof[1](pov.y * -12);
  if (!gsap.isTweening(ring)) layoutRing();
}

// ---------- the clock ----------
gsap.ticker.add((_t, dms) => {
  const dt = Math.min(dms / 1000, 0.05);
  if (state === 'console' && !reduced) povFrame(dt);
  if (state === 'story' && !reduced) storyFrame(dt);
  if (state === 'world' && world === 'hunt') {
    const btns = $$<HTMLButtonElement>('[data-sig]', mods[cur]);
    if (gl) {
      gl.signalScreen().forEach((p, k) => {
        const b = btns[k];
        gsap.set(b, { x: p.x, y: p.y });
        if (b.hidden === p.vis) b.hidden = !p.vis;
      });
    } else {
      btns.forEach((b, k) => gsap.set(b, { x: FALLBACK_POS[k][0] * innerWidth, y: FALLBACK_POS[k][1] * innerHeight }));
    }
  }
});

// ---------- input ----------
addEventListener('wheel', (e) => {
  e.preventDefault();
  const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
  if (state === 'hero' || state === 'story') nudge(d * 0.00042);
  else if (state === 'console' && !busy) consoleWheel(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
}, { passive: false });
let wheelAcc = 0, wheelLock = 0;
function consoleWheel(d: number) {
  const now = performance.now();
  if (now < wheelLock) return;
  wheelAcc += d;
  if (Math.abs(wheelAcc) > 70) { goTo(cur + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 650; }
}

// touch / pen drag: fly the story, look around a world
{
  let y0 = 0, x0 = 0, pan0 = 0, active = false;
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    active = true; y0 = e.clientY; x0 = e.clientX; pan0 = gl?.state.panX ?? 0;
  });
  addEventListener('pointermove', (e) => {
    if (!active) return;
    if (state === 'hero' && y0 - e.clientY > 40) { active = false; begin(); return; }
    if (state === 'story') { nudge((y0 - e.clientY) * 0.0018); y0 = e.clientY; }
    if (state === 'world' && gl) gl.state.panX = clamp(pan0 - ((e.clientX - x0) / innerWidth) * 2.2, -1, 1);
  });
  addEventListener('pointerup', () => { active = false; });
  addEventListener('pointercancel', () => { active = false; });
}
// mouse look-around
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !gl) return;
  const nx = (e.clientX / innerWidth - 0.5) * 2, ny = (e.clientY / innerHeight - 0.5) * 2;
  const k = state === 'world' ? (world === 'hunt' ? 1 : 0.25) : 0.6;
  gl.state.panX = nx * k; gl.state.panY = ny * k;
});

addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'Escape') {
    if (briefOpen >= 0) closeBrief();
    else if (state === 'world') toConsole();
    return;
  }
  const inControl = (e.target as HTMLElement).closest?.('button, a, input');
  if (state === 'hero' && (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !inControl))) { e.preventDefault(); begin(); }
  else if (state === 'story') {
    const step = { ArrowDown: 0.07, PageDown: 0.12, ' ': 0.12, ArrowUp: -0.07, PageUp: -0.12, End: 1, Home: -1 }[k as 'ArrowDown'];
    if (step !== undefined && !(k === ' ' && inControl)) { e.preventDefault(); nudge(step); }
  } else if (state === 'console' && !busy) {
    if (k === 'ArrowRight') { e.preventDefault(); goTo(cur + 1); }
    if (k === 'ArrowLeft') { e.preventDefault(); goTo(cur - 1); }
  }
});

// ---------- buttons ----------
$('[data-begin]').addEventListener('click', begin);
$('[data-skip]').addEventListener('click', skip);
$$('[data-hunt]').forEach((b) => b.addEventListener('click', hunt));
$$('[data-sig]').forEach((b) => b.addEventListener('click', () => openBrief(+b.dataset.sig!)));
$('[data-close-brief]').addEventListener('click', closeBrief);
$$('[data-to-console]').forEach((b) => b.addEventListener('click', toConsole));
$$('[data-finish]').forEach((b) => b.addEventListener('click', finish));
$('[data-restart]').addEventListener('click', restart);
$$<HTMLAnchorElement>('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); if (!busy) enterWorld(+a.dataset.jump!); }));

show('loading');
// GSAP owns these transforms (centring included), so CSS never sets translate on them
gsap.set('.dx-card', { xPercent: -50, yPercent: -50 });
gsap.set('.dx-brief', { xPercent: -50, yPercent: -50 });
gsap.set('.dx-find, .dx-done, [data-close-brief]', { xPercent: -50 });
gsap.set('[data-hint]', { xPercent: -50, yPercent: -50 });
gsap.set('[data-sig]', { xPercent: -50, yPercent: -100 });
gsap.set('.dx-hero__title, .dx-hero .dx-cta, .dx-hero__kicker, .dx-typed', { autoAlpha: 0 });
gsap.set('[data-hint], [data-find], .dx-done, [data-close-brief]', { autoAlpha: 0 });
if (touch) html.classList.add('touch');
load();
