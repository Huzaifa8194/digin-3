// /appsiege/ driver. Lenis scroll → u (viewport heights) → the GL stage and the fixed UI.
// One clock: gsap.ticker runs Lenis and the render.
import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { cards, chat, contact, headline, lab, MEDIA } from './content';
import { cardIndex, cardU, MAXU, T, TOTAL } from './timeline';
import { paint, SCENES } from './scenes';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s)!;
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const root = document.documentElement;
const NO_GL = root.classList.contains('no-gl');
const COARSE = matchMedia('(pointer: coarse)').matches;
const LOW = COARSE || Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

// ---------- real content (always in the DOM) ----------
$('[data-docheadline]').textContent = headline.lines.map((l) => l[0] + l.slice(1).toLowerCase()).join(' ');
$('[data-doccolumn]').innerHTML = headline.column.map((p) => `<p>${p.replace(/\n/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()).replace(/\bios\b/g, 'iOS').replace(/\bapk\b/g, 'APK').replace(/\bipa\b/g, 'IPA').replace(/\bai\b/g, 'AI')}</p>`).join('');
$('[data-doccards]').innerHTML = cards.map((c, k) => `<li class="doc__card" id="card-${c.id}">
  <a class="doc__link" href="#card-${c.id}" data-cardlink="${k}"><span class="doc__tag">${c.tag}</span> ${c.title.join(' ')}</a>
  <p>${c.body}</p>
  <img class="doc__img" src="${MEDIA + c.poster}" alt="" width="768" height="${c.clip ? 432 : 334}" loading="lazy">
</li>`).join('');
$('[data-doclab]').textContent = lab.title.join(' ').replace(/\/\/|->/g, '').trim().replace(/^./, (c) => c) ;
$('[data-doclabcopy]').textContent = lab.copy.replace(/\n/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) + '.';

// ---------- contact ----------
const ct = $('[data-contact]');
$('[data-route]').innerHTML = contact.route.map((w, i) => (i ? '<svg class="ct__arrow" viewBox="0 0 90 60" aria-hidden="true"><path d="M0 30 H86 M58 2 L88 30 L58 58"/></svg>' : '') + `<span>${w}</span>`).join('');
$('[data-ctlinks]').innerHTML = contact.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
const phone = $<HTMLAnchorElement>('[data-phone]'); phone.href = contact.phone.href; phone.textContent = contact.phone.label;
const mob = $<HTMLAnchorElement>('[data-mobile]'); mob.href = contact.mobile.href; mob.textContent = 'Mobile ' + contact.mobile.label;
{
  // a wireframe globe behind the route
  const g = $('[data-globe]');
  let s = '';
  for (let i = -4; i <= 4; i++) { const ry = 280 * Math.cos((i / 9) * Math.PI); s += `<ellipse cx="0" cy="${(i * 62).toFixed(1)}" rx="${(420 * Math.cos((i / 9) * Math.PI)).toFixed(1)}" ry="${(ry * 0.06).toFixed(1)}"/>`; }
  for (let i = 0; i < 9; i++) s += `<ellipse cx="0" cy="0" rx="${(420 * Math.abs(Math.cos((i / 9) * Math.PI))).toFixed(1)}" ry="280"/>`;
  g.innerHTML = s;
}
let lastFocus: HTMLElement | null = null;
const contactLabel = $('[data-contactlabel]');
function openContact() {
  if (!ct.hidden) return closeContact();
  lastFocus = document.activeElement as HTMLElement;
  ct.hidden = false; root.classList.add('is-contact');
  contactLabel.textContent = 'Close-X';
  requestAnimationFrame(() => ct.classList.add('is-in'));
  lenis?.stop();
  $<HTMLAnchorElement>('[data-phone]').focus({ preventScroll: true });
}
function closeContact() {
  ct.classList.remove('is-in'); root.classList.remove('is-contact');
  contactLabel.textContent = 'Contact';
  setTimeout(() => { ct.hidden = true; }, 380);
  lenis?.start();
  lastFocus?.focus({ preventScroll: true });
}

// ---------- case overlay ----------
const cs = $('[data-case]');
const csCanvas = $<HTMLCanvasElement>('[data-cscanvas]');
let csScene: { draw: (t: number) => void } | null = null;
const csTick = (t: number) => { csScene?.draw(t); };
let csIndex = 0;
function openCase(k: number) {
  opened = true; root.classList.add('was-opened');
  csIndex = (k + cards.length) % cards.length;
  const c = cards[csIndex];
  if (cs.hidden) lastFocus = document.activeElement as HTMLElement;
  $('[data-cstag]').textContent = `[ ${c.tag} ]  ${String(csIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  $('[data-csh]').textContent = c.title.join(' ');
  $('[data-csp]').textContent = c.body;
  $('[data-cslist]').innerHTML = c.points.map((p) => `<li>-&gt; ${p}</li>`).join('');
  // the shot, drawn in code at the panel's real pixel size
  const dpr = Math.min(2, devicePixelRatio || 1), bw = Math.round(csCanvas.clientWidth * dpr) || 1200;
  csCanvas.width = bw; csCanvas.height = Math.round(bw / 1.5);
  const g2 = csCanvas.getContext('2d')!, scene = SCENES[csIndex];
  csScene = { draw: (t: number) => paint(g2, csCanvas.width, csCanvas.height, scene, t) };
  csCanvas.setAttribute('aria-label', c.shot);
  gsap.ticker.remove(csTick); gsap.ticker.add(csTick);
  cs.hidden = false; root.classList.add('is-case');
  requestAnimationFrame(() => cs.classList.add('is-in'));
  lenis?.stop();
  $<HTMLButtonElement>('[data-csclose]').focus({ preventScroll: true });
}
function closeCase() {
  cs.classList.remove('is-in'); root.classList.remove('is-case');
  gsap.ticker.remove(csTick); csScene = null;
  setTimeout(() => { cs.hidden = true; }, 380);
  lenis?.start();
  lastFocus?.focus({ preventScroll: true });
}
$('[data-csclose]').addEventListener('click', closeCase);
$('[data-csprev]').addEventListener('click', () => openCase(csIndex - 1));
$('[data-csnext]').addEventListener('click', () => openCase(csIndex + 1));
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!cs.hidden) closeCase(); else if (!ct.hidden) closeContact();
});

// ---------- chat ----------
const log = $('[data-chatlog]');
const chatEl = $('[data-chat]');
const optsEl = $('[data-chatopts]');
optsEl.innerHTML = chat.options.map((o, i) => `<li><button type="button" class="chat__o" data-opt="${i}" aria-pressed="false" style="--i:${i}">
  <span class="chat__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
  <span class="chat__l">${o.label}<small>${o.sub}</small></span>
  <span class="chat__arr" aria-hidden="true">-&gt;</span></button></li>`).join('');
const optBtns = $$<HTMLButtonElement>('[data-opt]', optsEl);
let typing: gsap.core.Tween | null = null;
function say(q: string, a: string, card?: number) {
  chatEl.classList.add('is-touched');
  const item = document.createElement('div');
  item.className = 'chat__msg';
  item.innerHTML = `<p class="chat__me"></p><p class="chat__ai"></p>`;
  item.firstElementChild!.textContent = q;
  if (card !== undefined) {
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'chat__open';
    open.innerHTML = `Open ${String(card + 1).padStart(2, '0')} ${cards[card].title.join(' ').toLowerCase()} <b>-&gt;</b>`;
    open.addEventListener('click', () => openCase(card));
    item.append(open);
  }
  log.replaceChildren(item);
  const ai = item.querySelector('.chat__ai') as HTMLElement;
  let i = 0;
  const step = () => { i += 3; ai.textContent = a.slice(0, i); if (i < a.length) typing = gsap.delayedCall(0.014, step); };
  typing?.kill(); step();
  if (card !== undefined && lenis) goTo(cardU(card));
}
optBtns.forEach((b) => b.addEventListener('click', () => {
  const k = +b.dataset.opt!, o = chat.options[k];
  optBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  say(o.label, o.answer, o.card);
}));
$('[data-chatform]').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $<HTMLInputElement>('[data-chatin]'); const q = inp.value.trim(); if (!q) return;
  const low = q.toLowerCase();
  const hit = chat.keywords.find((k) => k.k.some((w) => low.includes(w)));
  if (hit?.ref !== undefined) { const o = chat.options[hit.ref]; say(q, o.answer, o.card); }
  else say(q, hit?.a ?? chat.fallback);
  inp.value = '';
});
// phones: the picker folds into one line until opened
const chatToggle = $('[data-chattoggle]');
chatToggle.addEventListener('click', () => {
  const open = chatToggle.getAttribute('aria-expanded') !== 'true';
  chatToggle.setAttribute('aria-expanded', String(open)); chatEl.classList.toggle('is-open', open);
});
$('[data-chathint]').textContent = COARSE ? 'Tap one. AppSiege shows you how it tests it.' : 'Pick one. AppSiege shows you how it tests it.';

// feature rail: where you are in the eight, and a way to jump
const rail = $('[data-rail]');
rail.innerHTML = cards.map((c, k) => `<button type="button" class="rail__i" data-rail-i="${k}"><span class="rail__n">${String(k + 1).padStart(2, '0')}</span><span class="rail__t">${c.title.join(' ').toLowerCase()}</span></button>`).join('');
const railBtns = $$<HTMLButtonElement>('[data-rail-i]', rail);
railBtns.forEach((b) => b.addEventListener('click', () => goTo(cardU(+b.dataset.railI!))));
const tip = $('[data-tip]');
tip.textContent = COARSE ? 'Tap the card to open it' : 'Click the card to open it';
let opened = false;

// branding + end
$('[data-top]').addEventListener('click', (e) => { if (NO_GL) return; e.preventDefault(); lenis?.scrollTo(0, { duration: 2.2 }); });
$('[data-endtop]').addEventListener('click', () => lenis?.scrollTo(0, { duration: 2.6 }));
$('[data-endcontact]').addEventListener('click', () => openContact());

// ---------- sound ----------
const audio = new Audio(); audio.loop = true; audio.preload = 'none'; audio.volume = 0.55;
const soundBtn = $('[data-sound]');
const setTune = (t: string) => { $('[data-tunelabel]').textContent = t; $('[data-tunelabel2]').textContent = t; };
soundBtn.addEventListener('click', () => {
  if (audio.paused) { if (!audio.src) audio.src = MEDIA + 'bgm.mp3'; audio.play().then(() => { soundBtn.setAttribute('aria-pressed', 'true'); setTune('Tech house / Mixkit'); root.classList.add('is-sound'); }).catch(() => {}); }
  else { audio.pause(); soundBtn.setAttribute('aria-pressed', 'false'); setTune('Sound off'); root.classList.remove('is-sound'); }
});
$$('[data-seek]').forEach((b) => b.addEventListener('click', () => { if (!audio.src || audio.paused) return soundBtn.click(); audio.currentTime = Math.max(0, audio.currentTime + 20 * +b.dataset.seek!); }));

// ---------- nav ----------
$('[data-nav="contact"]').addEventListener('click', (e) => { e.preventDefault(); openContact(); });
$('[data-nav="agents"]').addEventListener('click', (e) => {
  e.preventDefault();
  if (!ct.hidden) closeContact();
  if (NO_GL || !lenis) { document.getElementById('agents')?.scrollIntoView(); return; }
  melt(() => lenis!.scrollTo(cardU(0) * innerHeight, { immediate: true, force: true }));
});
$$('[data-cardlink]').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); openCase(+a.dataset.cardlink!); });
  if (!NO_GL) a.addEventListener('focus', () => goTo(cardU(+a.dataset.cardlink!)));
});

// ---------- WebGL path ----------
let lenis: Lenis | null = null;
const state = { u: 0, melt: 0, time: 0 };
function goTo(u: number) { lenis?.scrollTo(u * innerHeight, { duration: 1.6, force: true }); }
function melt(mid: () => void) {
  gsap.timeline()
    .to(state, { melt: 1, duration: 0.55, ease: 'power2.in', onComplete: mid })
    .to(state, { melt: 0, duration: 0.8, ease: 'power2.out' }, '+=0.12');
}

const loader = $('[data-loader]');
const ldFill = $('[data-ldfill]'), ldNum = $('[data-ldnum]');
let shown = 0;
const setProgress = (p: number) => {
  gsap.to({ v: shown }, { v: p, duration: 0.35, ease: 'power1.out', onUpdate() { const v = (this.targets()[0] as { v: number }).v; shown = v; ldFill.setAttribute('y', String(120 - v * 120)); ldNum.textContent = '/' + String(Math.min(99, Math.round(v * 100))).padStart(2, '0'); } });
};

async function boot() {
  if (NO_GL) { loader.remove(); root.classList.add('is-ready'); return; }
  const track = $('[data-track]');
  const sizeTrack = () => { track.style.height = `${TOTAL * innerHeight}px`; };
  sizeTrack();
  const { Stage } = await import('./gl/stage');
  const stage = new Stage($<HTMLCanvasElement>('[data-gl]'), LOW);
  stage.resize(innerWidth, innerHeight);

  // real loading: fonts, the film, the first card frames
  const jobs: Promise<unknown>[] = [
    document.fonts.load(`300 64px "Geist Mono"`), document.fonts.load(`400 16px "Geist Mono"`),
    ...['appsiege-icon.png', 'report-still.webp'].map((src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = MEDIA + src; })),
  ];
  let done = 0;
  jobs.forEach((j) => j.then(() => setProgress(++done / jobs.length)));
  const t0 = performance.now();
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 2400))]);
  // let the counter be read: never shorter than 1.3 s
  await new Promise((r) => setTimeout(r, Math.max(0, 1300 - (performance.now() - t0))));
  setProgress(1);
  stage.work.drawHeadline(innerWidth, innerHeight); // with the font now loaded
  // card titles were drawn before the font settled: redraw
  stage.work.cards.forEach((cm, k) => { cm.mat.uniforms.uText.value = stage.work.titleTexture(cards[k].title, cards[k].tag, k); });

  // every world, every state, once, behind the loader: no compile or upload stalls mid-scroll
  await stage.warmScenes();
  stage.warm();
  stage.render({ u: 0, time: 0, melt: 0 });
  if (/[?&]debug=1/.test(location.search)) (window as unknown as { __stage: unknown }).__stage = stage;

  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4, syncTouch: false });
  lenis.on('scroll', () => { state.u = Math.min(MAXU, lenis!.scroll / innerHeight); });
  if (location.hash === '#agents') lenis.scrollTo(cardU(0) * innerHeight, { immediate: true });
  gsap.ticker.lagSmoothing(0);

  const ptr = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 };
  let hovering = false, idle = 0;
  const hint = $('[data-hint]');
  const chip = $('[data-chip]');
  let cur = -1;
  gsap.ticker.add((t) => {
    lenis!.raf(t * 1000);
    state.time = t;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    stage.setPointer(ptr.x, ptr.y);
    stage.render(state);
    const u = state.u;
    root.classList.toggle('chat-on', u > T.chat[0] && u < T.chat[1]);
    idle = u < 0.03 ? idle + gsap.ticker.deltaRatio() / 60 : 0;
    hint.classList.toggle('is-on', idle > 3.2);
    root.classList.toggle('is-outro', u > T.wipe3[1]);
    root.classList.toggle('cap-on', u < 1.1);
    root.classList.toggle('end-on', u > 16.3);
    const work = u > T.chat[0] && u < T.chat[1];
    const k = work ? Math.max(0, Math.min(cards.length - 1, Math.round(cardIndex(u)))) : -1;
    if (k !== cur) {
      cur = k;
      railBtns.forEach((b, i) => b.classList.toggle('is-on', i === k));
      railBtns.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      optBtns.forEach((b) => b.classList.toggle('is-near', chat.options[+b.dataset.opt!].card === k));
    }
    // the tip shows while a card sits centred, until the visitor has opened one
    root.classList.toggle('tip-on', work && !opened && Math.abs(cardIndex(u) - k) < 0.18);
    if (hovering) chip.style.transform = `translate(${ptr.px}px, ${ptr.py}px)`;
  });

  addEventListener('pointermove', (e) => {
    ptr.tx = (e.clientX / innerWidth) * 2 - 1; ptr.ty = -((e.clientY / innerHeight) * 2 - 1);
    ptr.px = e.clientX; ptr.py = e.clientY;
    if (e.pointerType !== 'mouse') return;
    const over = (e.target as Element).closest('a,button,input,.chat,.top') ? null : stage.pickCard(ptr.tx, ptr.ty);
    if ((over !== null) !== hovering) { hovering = over !== null; root.classList.toggle('is-pointer', hovering); }
  }, { passive: true });
  addEventListener('click', (e) => {
    if ((e.target as Element).closest('a,button,input,.chat,.top,.ct,.cs')) return;
    const k = stage.pickCard((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    if (k !== null) openCase(k);
  });
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { sizeTrack(); stage.resize(innerWidth, innerHeight); lenis!.resize(); }); });

  // loader out: >>> and the bloom, then the ring settles in
  const bloom = $('[data-bloom]');
  bloom.innerHTML = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 360; return `<path transform="rotate(${a})" d="M0 -70 C 22 -95, 30 -140, 8 -175 M0 -70 C -22 -95, -30 -140, -8 -175"/>`; }).join('');
  ldNum.textContent = '>>>';
  const tl = gsap.timeline({ onComplete: () => { loader.remove(); } });
  tl.to('.ld__bloom', { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' })
    .to('.ld__disc', { scale: 0.92, duration: 0.5, ease: 'power2.inOut' }, 0)
    .add(() => root.classList.add('is-ready'), 0.45)
    .to(loader, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0.5)
    .to(stage.hero, { intro: 1, duration: 1.8, ease: 'expo.out' }, 0.5);
}
boot();
