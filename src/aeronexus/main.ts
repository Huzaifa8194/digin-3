// /aeronexus/ driver. Scroll position (in viewport heights) drives every chapter:
// the fixed 3D stage (stage.ts), the fixed "pin" layers and the sticky chapters.
// One clock: gsap.ticker runs Lenis, the timeline and the render.
import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { drawScreen, setLost, SW, SH, type Mode } from './screen';
import { createStage, type StageState } from './stage';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s)!;
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const root = document.documentElement;
const RM = root.classList.contains('rm');
const COARSE = matchMedia('(pointer: coarse)').matches;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const sm = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sg = (p: number, a: number, b: number) => sm(seg(p, a, b));
const out3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

// ---------- text: split into characters that light up left to right ----------
type Lit = HTMLElement & { _c?: HTMLElement[]; _k?: number };
function split(el: Lit) {
  const label = el.innerText.replace(/\s+/g, ' ').trim();
  const inner = document.createElement('span'); inner.setAttribute('aria-hidden', 'true');
  inner.append(...[...el.childNodes]);
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
  el.append(sr, inner);
  const cs: HTMLElement[] = [];
  const walk = (node: Node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of n.textContent!.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(' '); continue; }
          const w = document.createElement('span'); w.className = 'w';
          for (const ch of part) { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; c.style.opacity = '0'; w.append(c); cs.push(c); }
          frag.append(w);
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && (n as Element).tagName !== 'BR') walk(n);
    }
  };
  walk(inner); el._c = cs; el._k = -1;
}
function lit(el: Lit, k: number, lo = 0) {
  const cs = el._c; if (!cs) return;
  k = Math.round(clamp(k) * 400) / 400;
  if (el._k === k + lo * 7) return; el._k = k + lo * 7;
  const n = cs.length, spread = Math.min(10, n * 0.5 + 2), f = k * (n + spread);
  for (let i = 0; i < n; i++) cs[i].style.opacity = String(Math.round((lo + (1 - lo) * clamp((f - i) / spread)) * 100) / 100);
}
$$<Lit>('[data-lit]').forEach(split);
const L = (s: string) => $<Lit>(s);
const o = (el: HTMLElement, v: number) => { v = Math.round(clamp(v) * 100) / 100; const s = String(v); if (el.style.opacity !== s) el.style.opacity = s; };

// hover: each letter rolls up to a copy of itself
$$('[data-flip]').forEach((el) => {
  const text = el.textContent!.trim(); el.setAttribute('aria-label', text);
  el.innerHTML = `<span class="fl" aria-hidden="true">${[...text].map((ch, i) => `<b style="--i:${i}" data-c="${ch === ' ' ? ' ' : ch}">${ch === ' ' ? ' ' : ch}</b>`).join('')}</span>`;
});
$$('.c3__orbit span').forEach((el, i) => { el.style.setProperty('--i', String(i)); el.style.setProperty('--x', String((i % 2 ? -1 : 1) * (8 + (i * 7) % 16))); });

// ---------- elements ----------
const gl = $<HTMLCanvasElement>('[data-gl]');
const glow = $('[data-glow]'), edge = $('[data-edge]'), veil = $('[data-veil]'), frameEl = $('[data-frame]'), frameDot = $('i', frameEl);
const brand = $('[data-brand]'), tab = $('.tab'), cue = $('[data-cue]');
const hero = $('[data-hero]'), hTag = L('.hero__tag'), hCopy = L('.hero__copy'), hCard = $('[data-hcard]'), hVid = $('[data-hvid]');
const pins: Record<string, HTMLElement> = {}; $$('[data-pin]').forEach((p) => (pins[p.dataset.pin!] = p));
const iPre = $('.intro__pre'), iPre1 = L('[data-ipre1]'), iPre2 = L('[data-ipre2]'), iHead = $('.intro__head'), iTitle = L('[data-ititle]'), iTag = L('[data-itag]');
const iHint = $('[data-ihint]'), iHintTxt = $('[data-ihinttxt]'), iCap = L('[data-icap]'), iFoot = $('[data-ifoot]');
const rLab = $('[data-rlab]'), rBig = $('[data-rbig]'), strip = $('[data-strip]'), cvNum = $('[data-cvnum]');
const rOdo = $('[data-rodo]'), rKm = $('[data-rkm]'), rLink = $('[data-rlink]'), rState = $('[data-rstate]');
const fp = $('[data-fp]'), fts = $$('[data-ft]'), ftBigs = $$<Lit>('[data-ftbig]'), ftCaps = $$('[data-ftcap]'), fScale = $('[data-fscale]');
const bp = $('[data-bp]'), bpWord = $('[data-bpword]'), bpO = $('[data-bpo]'), bpC = $<SVGElement>('[data-bpc]'), bpIn = $<SVGElement>('[data-bpin]'), bpHd = $<SVGElement>('[data-bphd]'), sks = $$<SVGGElement>('[data-sk]');
const lostC = $('[data-lostc]'), remC = $('[data-remc]');
const audit = $('[data-audit]'), aWord = L('[data-aword]'), aTop = $('[data-atop]'), aSide = $('[data-aside]'), aBody = $('[data-abody]');
const rows = $$('.row'), reelTrack = $('[data-reel]'), rcBigs = $$('[data-rcbig]');
const modesTop = $('.modes__top');
if (COARSE) iHintTxt.textContent = 'Tap the phone';

// filmstrip: full-size cards inside the frame window, thumbnails either side
const cards = $$('.card', strip);
const win = document.createElement('div'); win.className = 'strip__win';
const track = document.createElement('div'); track.className = 'strip__track'; win.append(track);
const thumbs = cards.map((c) => { const t = c.cloneNode(true) as HTMLElement; t.classList.add('th'); t.setAttribute('aria-hidden', 'true'); t.querySelectorAll('img').forEach((im) => (im.alt = '')); return t; });
track.append(...cards); strip.append(...thumbs, win);
const cvNumAll = $$('[data-cvnum]');
const KMS = cards.map((c) => parseFloat(c.dataset.km ?? '40'));
// the phone screens on the cards are drawn with the same code as the 3D phone
function paintCardScreens() {
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const cx = cv.getContext('2d')!; const done: Record<string, string> = {};
  $$<HTMLImageElement>('img[data-scr]', strip).forEach((im) => { const k = im.dataset.scr + '|' + im.dataset.sp; if (!done[k]) { drawScreen(cx, im.dataset.scr as Mode, parseFloat(im.dataset.sp || '1'), 9.68); done[k] = cv.toDataURL('image/png'); } im.src = done[k]; });
}

// ---------- 3D stage ----------
const stage = createStage(gl);
const st: StageState = { mode: 'desk', opacity: 1, px: 0, py: 0, ps: 1, rx: 0, ry: 0, rz: 0, drop: 0, spin: 0, screen: 'home', sp: 0, ring: 0, ringOut: 0, wire: 0, gray: 0, intro: 0, shake: 0, mx: 0, my: 0 };
let mx = 0, my = 0, pxl = -1, pyl = -1;
addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; pxl = e.clientX; pyl = e.clientY; }, { passive: true });

// ---------- measurements ----------
let vw = innerWidth, vh = innerHeight, u = vw / 1440;
type Sec = { top: number; h: number };
const S: Record<string, Sec> = {};
let brandW = 1, brandBig = 1, bigH = 1, labH = 1, fw = 1, fh = 1, reelW = 1, oRect = { x: 0, y: 0, d: 1 };
function measure() {
  vw = innerWidth; vh = innerHeight; u = vw / (vw <= 760 ? 560 : 1440);
  const sy = scrollY;
  $$('.s').forEach((el) => { const r = el.getBoundingClientRect(); S[el.id] = { top: r.top + sy, h: r.height }; });
  // the wordmark is set at its hero size and scaled DOWN into the header, so it is never an upscaled bitmap
  brand.style.transform = 'none'; brand.style.fontSize = ''; brandW = brand.getBoundingClientRect().width; brandBig = (vw * (vw <= 760 ? 0.78 : 0.615)) / brandW;
  brand.style.fontSize = parseFloat(getComputedStyle(brand).fontSize) * brandBig + 'px';
  bigH = rBig.offsetHeight; labH = rLab.offsetHeight;
  fh = Math.min(vh * 0.807, vw * 1.05); fw = Math.min(fh * 0.78, vw * 0.86); fh = fw / 0.78;
  strip.style.setProperty('--fw2', fw + 'px'); strip.style.setProperty('--fh', fh + 'px');
  strip.style.setProperty('--tw', fw * 0.35 + 'px'); strip.style.setProperty('--th', fh * 0.35 + 'px');
  reelW = reelTrack.scrollWidth;
  // fit the big audit word to the width
  aWord.style.fontSize = ''; const ww = aWord.scrollWidth; const inner = aWord.lastElementChild as HTMLElement; const iw = inner.getBoundingClientRect().width;
  if (iw > 0) aWord.style.fontSize = (parseFloat(getComputedStyle(aWord).fontSize) * (vw - 2 * 0.03125 * vw)) / iw + 'px'; void ww;
  // where the O of the faint wordmark sits (the construction circle lands on it)
  const prevT = bpWord.style.transform; bpWord.style.transform = 'translate(-50%, -50%)';
  const r = bpO.getBoundingClientRect(); oRect = { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width * 0.93 }; bpWord.style.transform = prevT;
  stage.resize(vw, vh);
}

// ---------- interactive state ----------
let hover = false, hoverT = 0;           // intro: opening the camera on the phone
let lostOn = true, lostFlip = 0;         // Lost Mode form
let cmd = 0, cmdT = 1;                   // remote commands
let tabI = 0;                            // policy profile
const CMDS: { name: string; mode: Mode }[] = [{ name: 'Lock', mode: 'lost' }, { name: 'Ring', mode: 'lost' }, { name: 'Reboot', mode: 'setup' }, { name: 'Push file', mode: 'file' }];

gl.addEventListener('pointerdown', () => { if (COARSE && inIntroB) { hover = !hover; } });
let inIntroB = false;

const lostInput = $<HTMLInputElement>('[data-lostinput]'), lostBtn = $('[data-lostbtn]');
setLost(lostInput.value);
lostInput.addEventListener('input', () => { setLost(lostInput.value); stage.dirty(); if (!lostOn) toggleLost(); });
function setFlipLabel(el: HTMLElement, text: string) {
  const f = $('[data-flip]', el); f.setAttribute('aria-label', text);
  f.innerHTML = `<span class="fl" aria-hidden="true">${[...text].map((ch, i) => `<b style="--i:${i}" data-c="${ch === ' ' ? ' ' : ch}">${ch === ' ' ? ' ' : ch}</b>`).join('')}</span>`;
}
function toggleLost() {
  lostOn = !lostOn; setFlipLabel(lostBtn, lostOn ? 'Unlock device' : 'Activate Lost Mode');
  gsap.fromTo({ v: 0 }, { v: 0 }, { v: 1, duration: 0.9, ease: 'power3.inOut', onUpdate() { lostFlip = (this.targets()[0] as { v: number }).v; } });
}
$('[data-lostform]').addEventListener('submit', (e) => { e.preventDefault(); toggleLost(); });

const cmdName = $('[data-cmdname]'), cmdScr = $<HTMLCanvasElement>('[data-cmdscr]'), cmdBtns = $$('[data-cmdbtn]');
function setCmd(i: number) {
  cmd = i; cmdName.textContent = CMDS[i].name; cmdBtns.forEach((b, k) => b.setAttribute('aria-checked', String(k === i)));
  gsap.fromTo({ v: 0 }, { v: 0 }, { v: 1, duration: 1.1, ease: 'power2.out', onUpdate() { cmdT = (this.targets()[0] as { v: number }).v; } });
}
cmdBtns.forEach((b, i) => b.addEventListener('click', () => setCmd(i)));

const PROFILES = [
  { name: 'Kiosk', desc: 'One phone, one app. The home screen, the settings and everything else stay out of reach until you say otherwise.', list: ['Pinned to a single app', 'No home screen or settings', 'Exit only from the panel'] },
  { name: 'Fleet', desc: 'The everyday profile. Approved apps installed for the team, every phone live on the map, and help one remote session away.', list: ['Approved apps, pushed by you', 'Live locations and geofences', 'Remote screen when someone is stuck'] },
  { name: 'Lockdown', desc: 'For sites where nothing should leave. The camera is off, the fence is on, and a missing phone locks itself down.', list: ['Camera and data switches off', 'Geofence alerts on exit', 'Lost Mode and wipe on standby'] },
];
const mName = $('[data-mname]'), mDesc = $('[data-mdesc]'), mList = $('[data-mlist]'), tabBtns = $$('[data-tab]');
function setTab(i: number) {
  tabI = i; const p = PROFILES[i]; mName.textContent = p.name; mDesc.textContent = p.desc; mList.innerHTML = p.list.map((l) => `<li>${l}</li>`).join('');
  tabBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  gsap.fromTo([mName, mDesc, ...$$('li', mList)], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
}
tabBtns.forEach((b, i) => b.addEventListener('click', () => setTab(i))); setTab(0);

// film overlay
const vo = $<HTMLDialogElement>('[data-vo]'), voVideo = $<HTMLVideoElement>('[data-vovideo]');
$$('[data-play]').forEach((b) => b.addEventListener('click', () => { vo.showModal(); lenis?.stop(); voVideo.play().catch(() => {}); }));
const closeVo = () => { voVideo.pause(); if (vo.open) vo.close(); lenis?.start(); };
$('[data-voclose]').addEventListener('click', closeVo); vo.addEventListener('close', closeVo);
vo.addEventListener('click', (e) => { if (e.target === vo) closeVo(); });

$('[data-copy]').addEventListener('click', async (e) => {
  const b = e.currentTarget as HTMLElement;
  try { await navigator.clipboard.writeText(location.href); setFlipLabel(b, 'Copied'); } catch { setFlipLabel(b, 'Press Ctrl+C'); }
  setTimeout(() => setFlipLabel(b, 'Copy URL'), 1800);
});

// ---------- scroll ----------
const lenis = RM ? null : new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
const goto = (y: number) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo(0, y));
const anchors: Record<string, () => number> = {
  content: () => 0, intro: () => 1.5 * vh, features: () => S.features.top - vh + 1.6 * vh, modes: () => S.modes.top,
  panel: () => S.panel.top,
};
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const id = a.getAttribute('href')!.slice(1); if (anchors[id]) { e.preventDefault(); goto(anchors[id]()); } }));
const navs = $$<HTMLAnchorElement>('[data-nav]');

// ---------- loader + hero entrance ----------
const ld = $('[data-loader]');
const boot = { p: 0, hero: 0 };
const ready = Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === 'complete' ? r(0) : addEventListener('load', () => r(0))))]);
gsap.to(boot, { p: 0.8, duration: RM ? 0.01 : 1.1, ease: 'power2.out', onUpdate: ldDraw });
function ldDraw() { ld.style.setProperty('--o', String(1 - boot.p)); ld.style.setProperty('--h', String(sg(boot.p, 0.55, 1))); }
ready.then(() => {
  measure(); stage.dirty(); paintCardScreens();
  gsap.to(boot, { p: 1, duration: RM ? 0.01 : 0.5, ease: 'power2.inOut', onUpdate: ldDraw, onComplete() {
    $('[data-ldsr]').textContent = 'AeroNexus loaded';
    gsap.to(ld, { opacity: 0, duration: RM ? 0.01 : 0.7, ease: 'power2.inOut', onComplete: () => ld.remove() });
    gsap.to(st, { intro: 1, duration: RM ? 0.01 : 2.2, ease: 'power3.out' });
    gsap.to(boot, { hero: 1, duration: RM ? 0.01 : 1.8, delay: RM ? 0 : 0.35, ease: 'power2.out' });
  } });
});

// ---------- the timeline ----------
const INK = [7, 16, 24], BLACK = [3, 7, 11], PAPER = [230, 255, 248], NIGHT = [5, 11, 16];
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(' ')})`;
let lastBg = '', lastTheme = '', shown = '';
let wireO = 0, clockT = 0, wireWant = 0;
const dropS = { v: 0 };

function tick(time: number, dt: number) {
  lenis?.raf(time * 1000);
  const sy = scrollY; clockT = time;
  const d = Math.min(0.05, dt / 1000);
  const total = document.documentElement.scrollHeight - vh;
  if (!S.intro) return;

  // chained chapters: each one runs from the moment its top reaches the bottom of the viewport
  const v = sy / vh;                                   // hero + intro, 0..8
  const r = (sy - (S.reach.top - vh)) / vh;            // reach, 0..13
  const f = (sy - (S.features.top - vh)) / vh;         // features, 0..10.5
  const l = (sy - (S.lost.top - vh)) / vh;             // lost, 0..4
  const m = (sy - (S.remote.top - vh)) / vh;           // remote, 0..4
  const endChain = (S.remote.top + S.remote.h - vh) / vh;
  const active = v < 8 ? 'intro' : r < 13 ? 'reach' : f < 10.5 ? 'features' : l < 4 ? 'lost' : sy / vh < endChain + 0.02 ? 'remote' : '';
  if (active !== shown) { shown = active; for (const k in pins) pins[k].classList.toggle('on', k === active); }

  // fixed UI
  const bk = sg(v, 0, 0.5);
  brand.style.transform = `translate3d(0, ${lerp(vh * (vw <= 760 ? 0.1 : 0.085), 20 * u, bk)}px, 0) scale(${(lerp(brandBig, 1, bk) / brandBig) * (0.94 + 0.06 * Math.min(1, boot.hero * 1.4))})`;
  o(brand, boot.hero * 1.6);
  const prog = clamp(sy / total); const tabH = tab.offsetHeight;
  tab.style.transform = `translate3d(0, ${prog * (vh - tabH)}px, 0)`; tab.classList.toggle('is-thin', v > 0.6);
  const inFlow = !active && !(sy > S.reel.top && sy < S.reel.top + S.reel.h - vh) && !(sy > S.audit.top && sy < S.audit.top + 3 * vh);
  o(cue, inFlow || prog > 0.985 ? 0 : boot.hero);
  const cur = sy >= S.modes.top - vh * 0.5 ? (sy >= S.contact.top - vh * 0.6 ? 'contact' : 'modes') : sy >= S.features.top - vh * 0.5 ? 'features' : 'intro';
  navs.forEach((a) => (a.dataset.nav === cur && v > 0.5 ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));

  // ---- 01 hero ----
  const heroOut = sg(v, 0.04, 0.5);
  hero.style.visibility = v < 0.7 ? 'visible' : 'hidden';
  if (v < 0.7) {
    lit(hTag, boot.hero * 1.3 - heroOut * 1.4); lit(hCopy, boot.hero * 1.15 - heroOut * 1.3);
    o(hCard, sg(boot.hero, 0.3, 0.9) * (1 - sg(v, 0.02, 0.32))); o(hVid, sg(boot.hero, 0.5, 1) * (1 - sg(v, 0.02, 0.32)));
    hCard.style.transform = `translate3d(0, ${-v * 60}px, 0)`;
  }

  // ---- 3D defaults ----
  st.mx = mx; st.my = my; st.gray = 0; st.ring = 0; st.wire = 0; st.shake = 0; st.spin = 0; st.rz = 0;
  let glO = 0, veilO = 0, glowO = 0, edgeO = 0, frO = 0, frW = 0, frH = 0, frR = 0, dotO = 0;
  let bg = INK, bgK = 0;
  inIntroB = false;

  // ---- 02 intro ----
  if (active === 'intro') {
    veilO = Math.min(sg(v, 0.12, 0.55), 1 - sg(v, 0.62, 0.95)) * 0.96;
    glowO = sg(v, 1.0, 2.4);
    if (v < 0.6) { st.mode = 'desk'; glO = 1; st.screen = 'home'; st.sp = 0; }
    else {
      st.mode = 'float'; glO = 1;
      const b = sg(v, 3.05, 3.75), end = sg(v, 7.35, 7.95);
      st.px = 0; st.py = lerp(lerp(0, -0.66, b), 0, end); st.ps = lerp(lerp(1.02, 1.82, b), 0.5, end) * out3(seg(v, 0.6, 1.05));
      st.ry = Math.sin(time * 0.5) * 0.42 + mx * 0.25; st.rx = -0.08 + my * 0.12 + lerp(0, -0.1, b);
      glO = 1 - sg(v, 7.6, 7.98);
      inIntroB = v > 3.6 && v < 7.4;
      if (!COARSE) hover = inIntroB && stage.hit(pxl, pyl);
      else if (!inIntroB) hover = false;
      hoverT = clamp(hoverT + (hover ? d : -d) / 0.8);
      st.screen = hoverT > 0 ? 'camblock' : 'home'; st.sp = 0.25 + hoverT * 0.75;
      gl.style.cursor = hover ? 'pointer' : '';
    }
    o(iPre, 1 - sg(v, 2.9, 3.35)); lit(iPre1, seg(v, 0.55, 1.0)); lit(iPre2, seg(v, 0.6, 1.25));
    o(iHead, 1 - sg(v, 7.45, 7.9)); lit(iTitle, seg(v, 3.3, 4.2)); lit(iTag, seg(v, 3.9, 4.4));
    iHead.style.transform = `translate3d(0, ${-sg(v, 7.45, 7.9) * 30}px, 0)`;
    lit(iCap, seg(v, 4.3, 4.9)); o(iCap, 1 - sg(v, 7.3, 7.7));
    o(iHint, sg(v, 4.9, 5.4) * (1 - sg(v, 7.3, 7.7)) * (1 - hoverT * 0.6)); o(iFoot, sg(v, 4.4, 4.9) * 0.8 * (1 - sg(v, 7.3, 7.7)));
    edgeO = sg(v, 5.3, 6.0) * (1 - sg(v, 7.4, 7.9)) * 0.95 + hoverT * 0.2 * sg(v, 3.6, 4);
    frO = sg(v, 7.55, 7.95); frW = frH = 300 * u * lerp(0.72, 1, frO); frR = frW / 2;
  }

  // ---- 03 reach ----
  if (active === 'reach') {
    glowO = 1; st.mode = 'off';
    const outK = 1 - sg(r, 12.4, 12.95);
    const sq = sg(r, 1.9, 2.3), grow = sg(r, 2.4, 3.3);
    const d0 = lerp(300, 366, sg(r, 0, 1.9)) * u;
    frW = lerp(d0, fw, grow); frH = lerp(d0, fh, grow); frR = lerp(d0 / 2, 0, sq); frO = outK; dotO = sq;
    const arrive = out3(seg(r, 1.1, 2.4)), small = sg(r, 3.5, 4.8);
    const sS = lerp(1, (27 * u) / parseFloat(getComputedStyle(rBig).fontSize), small);
    const bigY = lerp(vh * 0.5, vh * 0.275 + labH + 18 * u, small);
    rBig.style.transform = `translate3d(${lerp(vw, 0, arrive)}px, ${bigY - bigH / 2}px, 0) scale(${sS})`;
    rBig.style.textShadow = `0 0 ${lerp(0, 40, Math.min(sg(r, 2.3, 3.0), 1 - small))}px rgba(230,255,248,.55)`;
    o(rBig, outK);
    const labY = lerp(lerp(vh * 0.49, vh * 0.5 - bigH * 0.5 - labH * 0.2, sg(r, 1.2, 2.2)), vh * 0.275, small);
    rLab.style.transform = `translate3d(0, ${labY}px, 0)`; o(rLab, sg(r, 0.55, 1.0) * outK);
    // filmstrip
    const N = cards.length, a = (N - 1) * seg(r, 5.0, 11.0);
    const winO = sg(r, 2.7, 3.4) * outK; o(win, winO);
    win.style.filter = r < 4.3 ? `blur(${(1 - sg(r, 3.0, 4.2)) * 18}px)` : '';
    track.style.transform = `translate3d(${-a * fw}px, 0, 0)`;
    const tw = fw * 0.35, g = 8 * u, G = 20 * u, thO = sg(r, 4.7, 5.3) * outK * 0.62, cx = vw / 2;
    for (let i = 0; i < N; i++) {
      const t = thumbs[i], dlt = i - a;
      const x = dlt < 0 ? cx - fw / 2 - G - (-dlt - 1) * (tw + g) - tw : cx + fw / 2 + G + (dlt - 1) * (tw + g);
      t.style.transform = `translate3d(${x}px, 0, 0)`; o(t, Math.abs(dlt) < 0.02 ? 0 : thO);
    }
    const n = String(19 + Math.floor(seg(r, 11.3, 12.5) * 3.99)); if (cvNumAll[0].textContent !== n) cvNumAll.forEach((e) => (e.textContent = n));
    void cvNum;
    // how far the phone is, and that the panel still has it
    const i0 = Math.min(N - 1, Math.floor(a)), i1 = Math.min(N - 1, i0 + 1), km = lerp(KMS[i0], KMS[i1], sm(a - i0));
    const kmT = (km < 1 ? km.toFixed(1) : String(Math.round(km))) + ' km'; if (rKm.textContent !== kmT) rKm.textContent = kmT;
    const stT = a > N - 1.5 ? 'Logged' : 'Live'; if (rState.textContent !== stT) rState.textContent = stT;
    const sideO = sg(r, 4.7, 5.3) * outK; o(rOdo, sideO); o(rLink, sideO);
  }

  // ---- 04 features ----
  if (active === 'features') {
    glowO = 1 - sg(f, 9.6, 10.4); bg = BLACK; bgK = sg(f, 9.6, 10.4);
    const pin = sg(f, 0.5, 0.95) * (1 - sg(f, 5.95, 6.45));
    fp.style.transform = `translate3d(${(pin - 1) * 101}%, 0, 0)`;
    const wins = [[0.8, 1.5, 2.0, 2.45], [2.5, 3.2, 3.9, 4.35], [4.4, 5.1, 5.75, 6.2]];
    let which = 0;
    wins.forEach((w, i) => {
      const inn = seg(f, w[0], w[1]), ou = sg(f, w[2], w[3]); const it = fts[i];
      o(it, inn > 0 ? 1 - ou : 0); it.style.visibility = inn > 0 && ou < 1 ? 'visible' : 'hidden';
      $$<Lit>('[data-lit]', it).forEach((e, k) => lit(e, inn * (1.25 - k * 0.2)));
      lit(ftBigs[i], seg(f, w[0] + 0.15, w[1] + 0.1)); o(ftBigs[i], inn > 0 ? 1 - ou : 0);
      o(ftCaps[i], sg(f, w[0] + 0.1, w[1]) * (1 - ou));
      if (f >= w[0]) which = i;
    });
    o(fScale, sg(f, 2.6, 3.2) * (1 - sg(f, 3.9, 4.35)));
    // phone
    const phIn = out3(seg(f, 0.7, 1.3)), phOut = sg(f, 5.55, 6.05);
    if (f > 0.6 && f < 6.1) {
      st.mode = 'float'; glO = 1 - phOut;
      const rightC = vw <= 760 ? 0 : ((0.316 + 0.684 / 2) - 0.5) * stage.viewW();
      const k3 = sg(f, 4.4, 5.1);
      st.rgx = rightC; st.px = rightC + sg(f, 5.0, 5.75) * 1.75; st.py = vw <= 760 ? 1.0 : 0; st.ps = lerp(1.9, 1.25, k3) * phIn * (vw <= 760 ? 0.62 : 1);
      st.ry = lerp(lerp(-0.42, 0.38, sg(f, 2.3, 3.0)), 0, k3) + mx * 0.12; st.rx = lerp(-0.06, -1.02, k3) + my * 0.06;
      st.spin = sg(f, 2.3, 3.0);
      st.screen = which === 0 ? 'kiosk' : which === 1 ? 'camblock' : 'home';
      st.sp = which === 0 ? seg(f, 1.2, 1.8) : which === 1 ? seg(f, 3.0, 3.8) : 0;
      st.ring = sg(f, 4.6, 5.1) * (1 - phOut); st.ringOut = sg(f, 5.2, 5.6);
    } else st.mode = 'off';
    // the construction
    const bpO2 = sg(f, 5.5, 6.05) * (1 - sg(f, 10.1, 10.45)); o(bp, bpO2);
    if (bpO2 > 0) {
      const toO = sg(f, 7.3, 8.3), shrink = sg(f, 9.4, 10.2);
      const cx0 = lerp(vw <= 760 ? vw / 2 : (0.316 + 0.342) * vw + 0.3 * (vh / 5.36), vw / 2, sg(f, 5.95, 6.5)), cy0 = vh / 2;
      const wS = lerp(1, 0.16, shrink);
      const ox = vw / 2 + (oRect.x - vw / 2) * wS, oy = vh / 2 + (oRect.y - vh / 2) * wS;
      const cX = lerp(cx0, ox, toO), cY = lerp(cy0, oy, toO);
      const sc = lerp(lerp(1.35, 1, sg(f, 5.5, 6.5)), (oRect.d * wS) / (128 * u), toO);
      bpC.style.transform = `translate3d(${cX}px, ${cY}px, 0) scale(${sc})`;
      o(bpIn as unknown as HTMLElement, sg(f, 6.6, 7.1)); o(bpHd as unknown as HTMLElement, 1 - sg(f, 8.9, 9.4));
      (bpIn as SVGCircleElement).setAttribute('r', String(lerp(36, 33, toO)));
      bpWord.style.transform = `translate(-50%, -50%) scale(${wS})`; o(bpWord, sg(f, 7.4, 8.3) * lerp(0.16, 0.5, shrink));
      sks.forEach((s, i) => {
        const dd = parseFloat(s.style.getPropertyValue('--d'));
        s.style.transform = `translate3d(${(f - 6.6) * dd * 46}px, ${(f - 6.6) * -dd * 14}px, 0)`;
        o(s as unknown as HTMLElement, sg(f, 5.5 + i * 0.12, 6.3 + i * 0.12) * (1 - sg(f, 7.2, 7.8)) * 0.5);
      });
    }
  }

  // ---- 05 lost ----
  if (active === 'lost') {
    bg = BLACK; bgK = 1;
    const inn = seg(l, 0.35, 1.0), ou = sg(l, 2.5, 3.05);
    $$<Lit>('[data-lit]', lostC).forEach((e, k) => lit(e, inn * (1.3 - k * 0.12)));
    o(lostC, inn > 0 ? 1 - ou : 0); o($('[data-lostform]'), sg(l, 0.7, 1.1));
    lostC.style.pointerEvents = 'none';
    st.mode = l > 0.2 && l < 3.1 ? 'float' : 'off'; glO = sg(l, 0.3, 0.95) * (1 - ou);
    st.px = 0; st.py = lerp(-3.4, vw <= 760 ? -2.3 : -2.28, out3(seg(l, 0.3, 1.1))); st.ps = vw <= 760 ? 1.5 : 2.05; st.rx = -0.72 + my * 0.05; st.ry = mx * 0.1 + lostFlip * Math.PI * 2;
    st.screen = lostOn ? 'lost' : 'home'; st.sp = 1;
  }

  // ---- 06 remote ----
  if (active === 'remote') {
    bg = BLACK; bgK = 1;
    const inn = seg(m, 0.5, 1.2), ou = sg(m, 2.6, 3.2);
    $$<Lit>('[data-lit]', remC).forEach((e, k) => lit(e, inn * (1.3 - k * 0.12)));
    o(remC, inn > 0 ? 1 - ou : 0);
    o($('[data-cmd]'), sg(m, 0.9, 1.3)); o($('.cmd__pick'), sg(m, 1.0, 1.4)); o($('.cmd__hint'), sg(m, 1.1, 1.5) * 0.7);
    st.mode = 'macro'; st.gray = 1; glO = sg(m, 0.02, 0.6) * (1 - ou) * 0.9; veilO = 0;
    st.screen = CMDS[cmd].mode; st.sp = cmdT; st.shake = cmd === 1 ? Math.sin(time * 60) * (1 - cmdT * 0.4) : 0; st.px = sg(m, 0, 4);
    // mirror the phone screen into the widget
    const cx = cmdScr.getContext('2d')!; const src = stage.screenCanvas();
    cx.drawImage(src, 0, cmd === 3 ? 60 : cmd === 2 ? 350 : 380, 420, 150, 0, 0, 420, 150);
  }

  // ---- 07 audit (sticky) ----
  const a = (sy - S.audit.top) / vh;
  let theme = 'dark';
  if (a > -1 && sy < S.audit.top + S.audit.h) {
    lit(aWord, seg(a, 0.05, 1.15), 0.09);
    o(aTop, sg(a, 0.9, 1.3)); o(aSide, sg(a, 1.0, 1.4)); o(aBody, sg(a, 1.1, 1.6));
    const t = sg(a, 1.9, 2.7);
    audit.style.setProperty('--abg', mix(NIGHT, PAPER, t)); audit.style.setProperty('--afg', mix(PAPER, INK, t)); audit.style.setProperty('--shade', String(t));
    const rect = audit.getBoundingClientRect();
    if (t > 0.5 && rect.top < 40 && rect.bottom > 60) theme = 'light';
  }
  if (theme !== lastTheme) { lastTheme = theme; root.dataset.theme = theme; root.style.setProperty('--fg', theme === 'light' ? 'var(--ink)' : 'var(--paper)'); }

  // ---- 08 field log: the lit row, and the phone tumbling down the middle column ----
  let fieldOn = false;
  if (sy > S.field.top - vh && sy < S.field.top + S.field.h) {
    const cs: number[] = [];
    for (const row of rows) { const b = row.getBoundingClientRect(); const c = b.top + b.height / 2; cs.push(c); o(row, lerp(1, 0.3, sm(seg(Math.abs((c - vh * 0.5) / vh), 0.12, 0.5)))); }
    if (vw > 760 && stage.ok) {
      const fq = (sy - (S.field.top - vh)) / (S.field.h + vh);
      let rf = 0; for (let i = 0; i < cs.length - 1; i++) if (vh * 0.5 >= cs[i]) rf = i + clamp((vh * 0.5 - cs[i]) / (cs[i + 1] - cs[i]));
      const i0 = Math.floor(rf), flip = sg(rf - i0, 0.22, 0.78);            // faces you at each row, flips once between rows
      const dropIn = out3(seg(fq, 0.13, 0.36)), fall = Math.pow(seg(fq, 0.8, 0.97), 2);
      const lb = $('.row__l', rows[0]).getBoundingClientRect(), ib = $('img', rows[0]).getBoundingClientRect();
      fieldOn = true; st.mode = 'float'; glO = sg(fq, 0.1, 0.2);
      st.px = (((lb.right + ib.left) / 2) / vw - 0.5) * stage.viewW(); st.py = lerp(0.55, -0.55, seg(fq, 0.3, 0.8)) + (1 - dropIn) * 5.2 - fall * 6;
      st.ps = 1.32; st.rx = Math.PI * 2 * (i0 + flip) - (1 - dropIn) * 5 + fall * 4 - 0.1 + my * 0.08;
      st.ry = Math.sin(time * 0.6) * 0.22 + mx * 0.2 + (1 - dropIn) * 2.4; st.rz = Math.sin(time * 0.45) * 0.07 + (rf - i0 - 0.5) * 0.12;
      st.screen = (['kiosk', 'games', 'home', 'lost', 'home'] as Mode[])[Math.round(rf)] ?? 'home'; st.sp = 1;
    }
  }

  // ---- 09 reel (sticky, sideways) ----
  if (sy > S.reel.top - vh && sy < S.reel.top + S.reel.h) {
    const rp = clamp((sy - S.reel.top) / (S.reel.h - vh));
    const x = -rp * (reelW - vw);
    reelTrack.style.transform = `translate3d(${x}px, 0, 0)`;
    for (const b of rcBigs) { const pr = (b.parentElement as HTMLElement); const c = pr.offsetLeft + pr.offsetWidth / 2 + x - vw / 2; b.style.transform = `translate3d(${c * 0.16}px, 0, 0)`; }
  }

  // ---- 10 modes: the phone lands behind the wordmark, wireframes for the rest of the fleet ----
  if (!active) {
    const b = modesTop.getBoundingClientRect();
    const want = b.top < vh * 0.75 && b.bottom > vh * 0.45 ? 1 : 0;
    if (want !== wireWant) { wireWant = want; gsap.to(dropS, { v: want, duration: want ? 1.5 : 0.35, ease: want ? 'bounce.out' : 'power2.in', overwrite: true }); }
    wireO = clamp(wireO + (want - wireO) * Math.min(1, d * 4));
    if (wireO > 0.01) { st.mode = 'wire'; st.wire = tabI; st.drop = dropS.v; glO = wireO * 0.55; st.screen = (['kiosk', 'home', 'camblock'] as Mode[])[tabI]; st.sp = 1; }
    else if (!fieldOn) st.mode = 'off';
    if (sy > S.modes.top - vh) { bg = BLACK; bgK = sg((sy - S.modes.top) / vh, -0.6, 0.3); }
  }

  // ---- apply fixed layers ----
  o(veil, veilO); o(glow, glowO * (theme === 'light' ? 0 : 1)); o(edge, edgeO);
  if (edgeO > 0.01) edge.style.setProperty('--a', ((time * 34) % 360).toFixed(1) + 'deg');
  o(frameEl, frO); if (frO > 0) { frameEl.style.width = frW + 'px'; frameEl.style.height = frH + 'px'; frameEl.style.borderRadius = frR + 'px'; o(frameDot, dotO); }
  const bgs = mix(INK, bg, bgK); if (bgs !== lastBg) { lastBg = bgs; root.style.setProperty('--bg', bgs); }
  st.opacity = glO * (0.35 + 0.65 * Math.min(1, st.intro * 1.5));
  stage.render(st, time, d);
}

// ---------- footer particles: the Apex Node mark, pushed around by the pointer ----------
function particles(cv: HTMLCanvasElement) {
  const cx = cv.getContext('2d')!; let W = 0, H = 0, dpr = 1;
  type P = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; c: number };
  let ps: P[] = [];
  const build = () => {
    dpr = Math.min(2, devicePixelRatio || 1); const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr;
    const off = document.createElement('canvas'); off.width = off.height = 120; const g = off.getContext('2d')!;
    g.fillStyle = '#fff'; g.fill(new Path2D('M60 27 L93 92 H75 L60 61 L45 92 H27 Z')); g.beginPath(); g.arc(60, 82, 6.5, 0, 7); g.fill();
    const data = g.getImageData(0, 0, 120, 120).data; ps = [];
    const s = Math.min(W, H) / 112, ox = Math.min(W * 0.34, 20 * u + 60 * s) - 60 * s + 40 * u, oy = H * 0.5 - 60 * s;
    for (let y = 20; y < 100; y += 1.25) for (let x = 20; x < 100; x += 1.25) {
      if (data[(Math.round(y) * 120 + Math.round(x)) * 4 + 3] > 120) { const hx = ox + x * s, hy = oy + y * s; ps.push({ hx, hy, x: hx + (Math.random() - 0.5) * 300, y: hy + (Math.random() - 0.5) * 300, vx: 0, vy: 0, c: Math.random() }); }
    }
  };
  build(); addEventListener('resize', build);
  let px = -999, py = -999;
  addEventListener('pointermove', (e) => { const b = cv.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; }, { passive: true });
  return (time: number) => {
    const b = cv.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const R = 110 * Math.max(0.6, u);
    for (const p of ps) {
      const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
      if (d2 < R * R) { const dd = Math.sqrt(d2) || 1, fo = (1 - dd / R) * 2.6; p.vx += (dx / dd) * fo; p.vy += (dy / dd) * fo; }
      const wob = RM ? 0 : Math.sin(time * 0.9 + p.c * 40) * 0.6;
      p.vx += (p.hx + wob - p.x) * 0.035; p.vy += (p.hy + Math.cos(time * 0.7 + p.c * 30) * (RM ? 0 : 0.6) - p.y) * 0.035; p.vx *= 0.86; p.vy *= 0.86; p.x += p.vx; p.y += p.vy;
      cx.fillStyle = p.c > 0.8 ? '#2dd4bf' : `rgba(230,255,248,${0.45 + p.c * 0.55})`;
      const sz = 1.4 + p.c * 1.2; cx.fillRect(p.x, p.y, sz, sz);
    }
  };
}
const drawParticles = particles($<HTMLCanvasElement>('[data-particles]'));

// ---------- go ----------
measure();
let rz = 0; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { measure(); lenis?.resize(); }); });
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, dt) => { tick(time, dt); drawParticles(time); });
void clockT;
