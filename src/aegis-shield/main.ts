// /aegis-shield: one scroll-driven timeline moves a single state object S. Every visual
// (camera, lid, parts, shield, cables, monitor, screen, DOM copy) reads from S on one clock.
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { MODULES, PARTS } from './data';
import { buildAppliance, buildMonitor, buildCable, buildDesk, buildSonar, CYAN, ALARM } from './scene';
import { createScreen } from './screen';

gsap.registerPlugin(ScrollTrigger);

const MEDIA = '/aegis-shield/media/';
const motion = document.documentElement.classList.contains('motion');
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

// ---------------------------------------------------------------- module markup
const list = $('.a2-mod-list');
const tabs = $('.a2-tabs');
MODULES.forEach((m, i) => {
  const a = document.createElement('article');
  a.className = 'a2-ch a2-mod';
  a.id = `m-${m.id}`;
  a.dataset.mod = String(i);
  a.setAttribute('aria-labelledby', `m-${m.id}-t`);
  const parts = m.title.split('­');
  const title = parts.map((w, wi) => `<span class="w">${w.split('').map((ch) => `<span class="ch">${ch.replace('&', '&amp;')}</span>`).join('')}${wi < parts.length - 1 ? '<span class="ch">-</span>' : ''}</span>`).join('<br>');
  a.innerHTML = `
    <p class="a2-mod__count mono">Module <b>${String(i + 1).padStart(2, '0')}</b> / ${String(MODULES.length).padStart(2, '0')}</p>
    <h3 class="a2-mod__title" id="m-${m.id}-t" aria-label="${m.tab}">${title}</h3>
    <p class="a2-mod__lede">${m.lede}</p>
    <p class="a2-mod__body">${m.body}</p>
    <ul class="a2-ev" aria-label="Evidence on screen">${m.evidence.map((e) => `<li data-tone="${e.tone ?? ''}"><b>${e.k}</b><span>${e.v}</span></li>`).join('')}</ul>
    <figure class="a2-mod__fig"><img src="${MEDIA}${m.img}" width="${m.w}" height="${m.h}" alt="${m.alt}" loading="lazy"></figure>`;
  list.appendChild(a);
  const b = document.createElement('button');
  b.className = 'a2-tab'; b.type = 'button'; b.textContent = m.tab; b.dataset.i = String(i);
  tabs.appendChild(b);
});

// ---------------------------------------------------------------- three
const canvas = $<HTMLCanvasElement>('.a2-gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050608, 70, 190);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);

scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x050608, 0.35));
const key = new THREE.DirectionalLight(0xe6eef5, 1.6); key.position.set(-22, 40, 26); scene.add(key);
const rim = new THREE.SpotLight(CYAN, 900, 140, 0.6, 0.6, 1.6); rim.position.set(26, 22, -30); rim.target.position.set(0, 2, 0); scene.add(rim, rim.target);
const red = new THREE.SpotLight(ALARM, 380, 140, 0.6, 0.7, 1.6); red.position.set(-30, 14, -16); red.target.position.set(0, 2, 0); scene.add(red, red.target);

const desk = buildDesk(); scene.add(desk);
const sonar = buildSonar(); scene.add(sonar.group);
const box = buildAppliance(); scene.add(box.root);
const screen = createScreen(MEDIA);
const mon = buildMonitor(screen.tex);
const MON_POS = new THREE.Vector3(-4, 0, -26);
mon.root.position.copy(MON_POS); scene.add(mon.root);
const monShadow = desk.children[1].clone(); monShadow.scale.set(1.6, 1, 0.9); monShadow.position.set(MON_POS.x, 0.03, MON_POS.z - 1.5); scene.add(monShadow);
const monLight = new THREE.PointLight(0x9fdcf0, 0, 60, 1.5); monLight.position.set(MON_POS.x, 26, MON_POS.z + 10); scene.add(monLight);

const mport = MON_POS.clone().add(mon.port);
const hdmi = buildCable([
  box.hdmiPort, new THREE.Vector3(-3, 1.3, 8), new THREE.Vector3(-6.5, 0.35, 10.5), new THREE.Vector3(-13, 0.35, 5),
  new THREE.Vector3(-15, 0.35, -10), new THREE.Vector3(-11, 0.35, -25), new THREE.Vector3(-5, 0.35, -31),
  new THREE.Vector3(mport.x, 6, mport.z - 1.6), mport,
], '#15181c', 0.3);
const eth = buildCable([
  new THREE.Vector3(30, 0.35, 52), new THREE.Vector3(12, 0.35, 24), new THREE.Vector3(2, 0.35, 12),
  new THREE.Vector3(-1.35, 1.4, 8), box.rj45Port,
], '#2a7fa0', 0.26);
scene.add(hdmi.mesh, hdmi.plug, eth.mesh, eth.plug);

// ---------------------------------------------------------------- state
const S = {
  cx: 0, cy: 44, cz: 9, tx: 0, ty: 0, tz: 0, fov: 32,
  ring: 1, lid: 0, explode: 0, labels: 0, shield: 0, mon: 0, cable: 0, eth: 0,
  power: 0, boot: 0, menu: 0, mod: 0, glow: 0.35, words: 0,
};
type Cam = Pick<typeof S, 'cx' | 'cy' | 'cz' | 'tx' | 'ty' | 'tz'>;
const CAM: Record<string, Cam> = {
  intro:   { cx: 0, cy: 44, cz: 9, tx: 0, ty: 0, tz: 0 },
  hero:    { cx: 21, cy: 13, cz: 33, tx: 0, ty: 2.6, tz: 0 },
  open:    { cx: 15, cy: 30, cz: 21, tx: -3.4, ty: 1.2, tz: 3.2 },
  shield:  { cx: 11, cy: 15, cz: 30, tx: 8.5, ty: 6.2, tz: 0 },
  connect: { cx: 26, cy: 26, cz: 56, tx: -4, ty: 12, tz: -9 },
  boot:    { cx: -4, cy: 26.3, cz: 50, tx: -4, ty: 25.6, tz: -26 },
  mods:    { cx: 56, cy: 31, cz: 50, tx: 14, ty: 24.5, tz: -26 },
};
Object.assign(S, CAM.intro);

// Part labels pinned to 3D anchors.
const labelsEl = $('.a2-labels');
const LIFT: Record<string, number> = { fan: 2.2, cpu: 0.6, ram: 1.4, nvme: 1.0, net: 0.8, fins: 1.6 };
const labels = PARTS.map((p) => {
  const el = document.createElement('div');
  el.className = 'a2-label';
  el.innerHTML = `<i class="a2-label__dot"></i><i class="a2-label__line"></i><span class="a2-label__txt"><b>${p.k}</b><span>${p.v}</span></span>`;
  labelsEl.appendChild(el);
  return { el, id: p.id, pos: box.anchors[p.id].clone() };
});
const PART_BASE: Record<string, number> = {};
Object.entries(box.parts).forEach(([k, o]) => { PART_BASE[k] = o.position.y; });

// ---------------------------------------------------------------- render
let W = 0, H = 0, aspectK = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  aspectK = camera.aspect < 0.8 ? 1.85 : camera.aspect < 1.3 ? 1.35 : 1;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { ptr.x = e.clientX / W - 0.5; ptr.y = e.clientY / H - 0.5; }, { passive: true });

const tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
const ease = (x: number) => x * x * (3 - 2 * x);
let active = true;
const settle = { dy: 0 };
let time = 0;

function frame(dt: number) {
  time += dt;
  ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 3);
  ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 3);

  // camera
  tgt.set(S.tx, S.ty, S.tz);
  tmp.set(S.cx, S.cy, S.cz).sub(tgt).multiplyScalar(aspectK).add(tgt);
  const sway = 1 - S.ring * 0.7;
  tmp.x += ptr.sx * 2.2 * sway + Math.sin(time * 0.25) * 0.35;
  tmp.y += -ptr.sy * 1.4 * sway + Math.cos(time * 0.21) * 0.2 + settle.dy;
  camera.position.copy(tmp);
  camera.lookAt(tgt);

  // appliance
  const lid = ease(Math.min(1, S.lid));
  box.lid.position.set(-lid * 2, 3.6 + lid * 10, -lid * 9);
  box.lid.rotation.set(-lid * 1.05, lid * 0.18, 0);
  Object.entries(box.parts).forEach(([k, o]) => { o.position.y = PART_BASE[k] + S.explode * (LIFT[k] ?? 0.6); });
  box.fan.rotation.y -= dt * (2 + S.lid * 14);
  box.led.color.copy(CYAN).multiplyScalar(0.55 + 0.45 * Math.sin(time * 2.4) ** 2);

  const sh = ease(S.shield);
  box.shield.scale.setScalar(0.001 + sh * 2.5);
  box.shield.position.y = 1 + sh * 6.6;
  box.shield.rotation.y = time * 0.7;
  box.beam.scale.set(1, Math.max(0.001, sh * 6.6), 1);
  box.beam.position.y = 0.8 + sh * 3.3;
  (box.beam.material as THREE.MeshBasicMaterial).opacity = sh * 0.16;
  box.shieldLight.intensity = sh * 70;
  box.shieldLight.position.y = 1 + sh * 6.6;

  sonar.update(time, S.ring);

  // monitor and cables
  mon.root.position.y = MON_POS.y - 44 * (1 - ease(S.mon));
  mon.root.visible = S.mon > 0.001;
  monShadow.visible = S.mon > 0.6;
  hdmi.set(S.cable);
  eth.set(S.eth);
  const lit = Math.min(1, S.power);
  (mon.glow.material as THREE.MeshBasicMaterial).opacity = lit * 0.55;
  monLight.intensity = lit * 120;
  screen.render({ power: S.power, boot: S.boot, menu: S.menu, mod: S.mod, time });

  rim.intensity = 900 * (1 - lit * 0.5);
  renderer.render(scene, camera);

  // labels
  if (S.labels > 0.01) {
    labels.forEach((l) => {
      tmp.copy(l.pos); tmp.y += S.explode * (LIFT[l.id] ?? 0.6);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      l.el.style.transform = `translate(${x}px, ${y}px)`;
      l.el.style.opacity = String(S.labels);
    });
  } else labels.forEach((l) => { l.el.style.opacity = '0'; });

  document.documentElement.style.setProperty('--glow', S.glow.toFixed(3));
  wordsEl.style.opacity = S.words.toFixed(3);
  if (S.words > 0.01) wordsEl.style.transform = `translateY(${(1 - S.words) * 40}px) scale(${0.92 + S.words * 0.08})`;

  // module tabs
  const mi = S.mod > 0 ? Math.min(MODULES.length - 1, Math.floor(S.mod)) : -1;
  if (mi !== curTab) {
    curTab = mi;
    tabBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === mi)));
  }
}

const wordsEl = $('.a2-words');
const tabBtns = $$<HTMLButtonElement>('.a2-tab');
let curTab = -2;

// ---------------------------------------------------------------- reduced motion: one still frame
if (!motion) {
  Object.assign(S, CAM.hero, { ring: 0.6, glow: 0.8, words: 0 });
  screen.ready.then(() => frame(0.016));
  frame(0.016);
  addEventListener('resize', () => frame(0));
} else {
  initMotion();
}

function initMotion() {
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const story = $('.a2-story');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const cam = (to: Cam, at: number, d: number, e = 'power2.inOut') => tl.to(S, { ...to, duration: d, ease: e }, at);
  const show = (el: Element | Element[], at: number, d = 0.35) => tl.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: d, ease: 'power3.out', immediateRender: false }, at);
  const hide = (el: Element | Element[], at: number, d = 0.3) => tl.to(el, { autoAlpha: 0, y: -24, duration: d, ease: 'power2.in' }, at);
  const ch = (n: string) => $(`[data-ch="${n}"]`);

  // Chapter clock (units of scroll). The labels drive the header and the tab jumps.
  const T: Record<string, number> = {};
  const mark = (name: string, at: number) => { T[name] = at; tl.addLabel(name, at); };

  // intro → hero
  gsap.set(ch('intro'), { autoAlpha: 1, y: 0 });
  mark('intro', 0);
  hide(ch('intro'), 0.15, 0.3);
  cam(CAM.hero, 0, 1.3);
  tl.to(S, { ring: 0.55, glow: 1, duration: 1.2 }, 0);
  tl.to(S, { words: 1, duration: 0.6, ease: 'power3.out' }, 0.8);
  mark('hero', 1.3);
  show(ch('hero'), 0.85, 0.45);
  tl.from($$('.a2-h1 .ln > span'), { yPercent: 110, duration: 0.45, stagger: 0.06, ease: 'power3.out', immediateRender: false }, 0.85);

  // open the box
  hide(ch('hero'), 2.1, 0.35);
  tl.to(S, { words: 0, duration: 0.4, ease: 'power2.in' }, 2.1);
  cam(CAM.open, 2.2, 1.3);
  tl.to(S, { lid: 1, duration: 1.1 }, 2.3);
  tl.to(S, { explode: 1, ring: 0, glow: 0.55, duration: 1.0 }, 2.7);
  tl.to(S, { labels: 1, duration: 0.3, ease: 'none' }, 3.25);
  mark('open', 3.3);
  show(ch('open'), 3.2);

  // the shield rises
  hide(ch('open'), 4.3);
  tl.to(S, { labels: 0, duration: 0.25, ease: 'none' }, 4.25);
  tl.to(S, { explode: 0.35, duration: 0.8 }, 4.3);
  tl.to(S, { shield: 1, duration: 1.0, ease: 'power3.out' }, 4.4);
  cam(CAM.shield, 4.3, 1.2);
  mark('shield', 5.3);
  show(ch('shield'), 5.05);

  // close, connect, monitor rises
  hide(ch('shield'), 6.2);
  tl.to(S, { shield: 0, duration: 0.6, ease: 'power2.in' }, 6.3);
  tl.to(S, { lid: 0, explode: 0, duration: 0.9 }, 6.6);
  cam(CAM.connect, 6.5, 1.5);
  tl.to(S, { mon: 1, duration: 1.0, ease: 'power3.out' }, 7.0);
  tl.to(S, { cable: 1, duration: 1.2, ease: 'power1.inOut' }, 7.8);
  tl.to(S, { eth: 1, duration: 1.0, ease: 'power1.inOut' }, 7.9);
  mark('connect', 8.2);
  show(ch('connect'), 7.9);
  tl.to(S, { power: 1, duration: 0.5, ease: 'power2.out' }, 8.9);

  // boot
  hide(ch('connect'), 9.6);
  cam(CAM.boot, 9.6, 1.3);
  tl.to(S, { glow: 0.3, duration: 1 }, 9.6);
  tl.to(S, { boot: 1, duration: 1.6, ease: 'none' }, 10.1);
  mark('boot', 10.9);
  show(ch('boot'), 10.7);
  tl.to(S, { menu: 1, duration: 0.9, ease: 'power1.out' }, 11.8);
  hide(ch('boot'), 12.4);

  // modules
  const M0 = 13.2, MD = 1.7;
  cam(CAM.mods, 12.6, 1.2);
  tl.to(S, { glow: 0.7, duration: 1 }, 12.6);
  const tabsEl = $('.a2-tabs');
  tl.fromTo(tabsEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, M0 - 0.3);
  mark('modules', M0 + 0.5);
  tl.fromTo(S, { mod: 0 }, { mod: MODULES.length, duration: MODULES.length * MD, ease: 'none', immediateRender: false }, M0);
  $$('.a2-mod').forEach((el, i) => {
    const at = M0 + i * MD;
    show(el, at + 0.08, 0.4);
    tl.from($$('.ch', el), { yPercent: 100, opacity: 0, duration: 0.4, stagger: 0.025, ease: 'power3.out', immediateRender: false }, at + 0.08);
    // a slow camera drift per module so the view never freezes
    tl.to(S, { cx: CAM.mods.cx + (i % 2 ? -3 : 3), cy: CAM.mods.cy + (i % 2 ? 1.5 : -1), duration: MD, ease: 'sine.inOut' }, at);
    if (i < MODULES.length - 1) hide(el, at + MD - 0.22, 0.2);
    T[`m${i}`] = at + MD * 0.55;
  });
  const END = M0 + MODULES.length * MD + 0.6;
  tl.to({}, { duration: 0.01 }, END);

  tl.progress(1).progress(0); // record every start value from the intro state
  const UNIT = 0.8; // viewport heights per timeline unit
  const setHeight = () => { story.style.height = `${(END * UNIT + 1) * innerHeight}px`; };
  setHeight();

  const st = ScrollTrigger.create({
    trigger: story, start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl,
    invalidateOnRefresh: true,
    onLeave: () => { active = false; canvas.style.visibility = 'hidden'; labelsEl.style.visibility = 'hidden'; },
    onEnterBack: () => { active = true; canvas.style.visibility = ''; labelsEl.style.visibility = ''; },
  });
  ScrollTrigger.addEventListener('refreshInit', setHeight);
  // When the last module reaches the end the canvas fades under the outro.
  gsap.to([canvas, '.a2-glow', '.a2-labels', '.a2-mods'], {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.a2-after', start: 'top 85%', end: 'top 25%', scrub: true },
  });

  const scrollFor = (t: number) => st.start + (t / tl.duration()) * (st.end - st.start);
  tabBtns.forEach((b) => b.addEventListener('click', () => lenis.scrollTo(scrollFor(T[`m${b.dataset.i}`]), { duration: 1.6 })));
  $$('[data-jump]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const to = (a as HTMLElement).dataset.jump === 'modules' ? scrollFor(T.modules) : 0;
    lenis.scrollTo(to, { duration: (a as HTMLElement).dataset.jump === 'top' ? 2.4 : 2.8 });
  }));
  $('.a2-brand').addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0, { duration: 2.4 }); });

  // header chapter
  const chapters: [number, string][] = [[0, 'The box'], [1.0, 'A SIEM in one hand'], [2.5, 'Inside'], [4.6, 'The shield'], [6.6, 'Connect'], [9.8, 'Boot'], [M0 - 0.2, 'Console']];
  const nEl = $('.a2-chapter__n'), tEl = $('.a2-chapter__t');
  let lastCh = '';
  function updateChapter(t: number) {
    let label = chapters[0][1], idx = 0;
    chapters.forEach(([at, l], i) => { if (t >= at) { label = l; idx = i; } });
    if (t >= M0) { const mi = Math.min(MODULES.length - 1, Math.floor((t - M0) / MD)); label = MODULES[mi].tab; idx = 7 + mi; }
    if (label === lastCh) return;
    lastCh = label;
    nEl.textContent = String(idx).padStart(2, '0');
    tEl.textContent = label;
  }

  // loader: real loading (fonts + dashboards), never longer than 2.6 s
  const loader = $('#loader'), count = $('[data-count]', loader);
  const prog = { v: 0 };
  const tick = gsap.to(prog, { v: 90, duration: 1.6, ease: 'power2.out', onUpdate: () => { count.textContent = String(Math.round(prog.v)).padStart(2, '0'); } });
  Promise.race([Promise.all([screen.ready, document.fonts.ready]), new Promise((r) => setTimeout(r, 2600))]).then(() => {
    screen.invalidate();
    tick.kill();
    gsap.to(prog, { v: 100, duration: 0.3, onUpdate: () => { count.textContent = String(Math.round(prog.v)).padStart(2, '0'); } });
    gsap.to(loader, { autoAlpha: 0, duration: 0.7, delay: 0.35, ease: 'power2.inOut' });
    // the first frame breathes in: the camera settles from slightly higher
    gsap.from(settle, { dy: 26, duration: 1.8, delay: 0.3, ease: 'expo.out' });
  });

  gsap.ticker.add((_t, dms) => { if (active) { frame(Math.min(0.05, dms / 1000)); updateChapter(tl.time()); } });
  ScrollTrigger.refresh();
}
