// /sysbastion-2/ driver. One Lenis scroll value becomes ~25 CSS variables on .page each scroll
// event; CSS turns them into every transition. Scenes read S (state.ts) on the shared clock.
import './style.css';
import './ui.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { addTick } from './clock';
import { evidence, footer as F, modules, tools } from './content';
import { dialogHTML, icon, setApplyState, setRestoreState, windowHTML } from './ui';
import { toolsList, type PageId } from './ui-data';
import { clamp01, coarse, isMobile, lvh, onViewport, reduced, smooth, softwareGL } from './device';
import { LOADER, runLoader, task } from './loader';
import { crestURL, markSVG, patternCanvas } from './patterns';
import { S } from './state';
import type { GroupId } from './content';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const page = $('[data-page]');
const root = document.documentElement;
const RM = reduced();
const MOBILE = isMobile();
const GL = !softwareGL() && !RM && !/[?&]nogl=1/.test(location.search);
const RICH = GL && !MOBILE;
if (!GL) root.classList.add('no-gl');
const setVar = (k: string, v: number) => page.style.setProperty(k, v.toFixed(4));
if (MOBILE) S.spMax = 1.85;

// ---------- static decoration ----------
$$('[data-mark]').forEach((el) => (el.innerHTML = markSVG));

// hero headline: letters with a 45ms stagger
const headline = $('[data-headline]');
{
  const text = headline.textContent!.trim();
  headline.setAttribute('aria-label', text);
  let i = 0;
  headline.innerHTML = text.split(' ').map((w) => `<span class="wd" aria-hidden="true">${[...w].map((c) => `<span class="lt" style="animation-delay:${(i++ * 0.045).toFixed(3)}s">${c}</span>`).join('')}</span>`).join('<span class="sp" aria-hidden="true"></span>');
}
// tools title (rows of letters that fade in, then morph out) and its replacement lead
{
  const head = $('[data-split="morph"]');
  const rows = head.textContent!.split('|');
  head.setAttribute('aria-label', rows.join(' '));
  let i = 0;
  head.innerHTML = rows.map((r) => `<span class="row" aria-hidden="true">${[...r].map((c) => (c === ' ' ? '<span>&nbsp;</span>' : `<span class="lt" style="--i:${i++}">${c}</span>`)).join('')}</span>`).join('');
  const lead = $('[data-split="lead"]');
  const t = lead.textContent!.trim();
  let j = 0;
  lead.innerHTML = `<span class="sr-only">${t}</span>` + t.split(' ').map((w) => `<span class="wd" aria-hidden="true">${[...w].map((c) => `<span class="lt" style="--i:${j++}">${c}</span>`).join('')}</span>`).join(' ');
}
// footer: words rise in sequence once the footer is live
{
  let k = 0;
  $$('[data-foot] [data-words]').forEach((el) => {
    const words = el.textContent!.trim().split(' ');
    const base = el.closest('.foot__top') ? 1.4 : el.classList.contains('foot__lead') ? 0.5 : el.classList.contains('foot__pitch') ? 0.65 : 1.3 + k++ * 0.1;
    const step = el.classList.contains('foot__pitch') ? 0.015 : 0.05;
    el.innerHTML = words.map((w, i) => `<span class="fw" style="animation-delay:${(base + i * step).toFixed(2)}s">${w}${i < words.length - 1 ? ' ' : ''}</span>`).join('');
  });
  $$('[data-hl]').forEach((a) => {
    const t = a.textContent!.trim();
    a.setAttribute('aria-label', t);
    a.innerHTML = `<span aria-hidden="true">${[...t].map((c, i) => `<span class="hl" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span>`;
  });
  const ph = $('[data-ph]');
  const mid = (F.placeholder.length - 1) / 2;
  ph.innerHTML = [...F.placeholder].map((c, i) => (c === ' ' ? '<span>&nbsp;</span>' : `<span class="pl" style="animation-delay:${(0.9 + Math.abs(i - mid) * 0.07).toFixed(2)}s">${c}</span>`)).join('');
}

// fit the hero headline to the viewport width minus 2 x 40px
const fitHeadline = () => {
  if (MOBILE || innerWidth <= 768) { headline.style.fontSize = ''; return; }
  headline.style.fontSize = '200px';
  const w = headline.scrollWidth;
  if (w > 0) headline.style.fontSize = `${(200 * (innerWidth - 80)) / w}px`;
};
fitHeadline();
document.fonts?.ready.then(fitHeadline);

// Chapter 02 copy is written once in the HTML; the fixed overlay borrows it
{
  const src = $('[data-applied-src]');
  $('[data-applied-lead]').textContent = src.children[0].textContent;
  $('[data-applied-para]').textContent = src.children[1].textContent;
}

// ---------- Chapter 02 clock: the journal's timestamp, live ----------
const clockEl = $('[data-clock]');
clockEl.innerHTML = [0, 1, 2].map((g) => `${g ? '<span class="c">:</span>' : ''}<span class="g"><span class="d"></span><span class="d"></span></span>`).join('');
const digits = $$('.d', clockEl);
const pad = (n: number) => String(n).padStart(2, '0');
const tickClock = () => { const d = new Date(); const s = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()); digits.forEach((el, i) => { if (el.textContent !== s[i]) el.textContent = s[i]; }); };
tickClock();
if (!RM) setInterval(tickClock, 1000);

// ---------- Chapter 03: headline crest cycles through the groups ----------
const crestBox = $('[data-crests]');
const crestIds: GroupId[] = ['hardening', 'scripts', 'powershell', 'network', 'readers', 'uac', 'tools'];
crestBox.innerHTML = crestIds.map((id, i) => `<img src="${crestURL(id, 160)}" alt="" style="opacity:${+(i === 0)};transform:translateY(${i === 0 ? 0 : 45}%)">`).join('');
const crestImgs = $$('img', crestBox);
const s5Head = $('[data-s5-head]');
{
  let timer = 0, k = 0;
  new IntersectionObserver(([e]) => {
    s5Head.classList.toggle('in', e.isIntersecting || s5Head.classList.contains('in'));
    clearInterval(timer);
    if (e.isIntersecting && !RM) timer = window.setInterval(() => {
      k = (k + 1) % crestImgs.length;
      crestImgs.forEach((im, i) => { im.style.opacity = i === k ? '1' : '0'; im.style.transform = `translateY(${i === k ? 0 : 45}%)`; });
    }, 1400);
  }, { threshold: 0.55 }).observe(s5Head);
}
// Chapter 01 reveal
const s2 = $('[data-s2]');
new IntersectionObserver(([e]) => e.isIntersecting && s2.classList.add('in'), { threshold: 0.25 }).observe($('.s2__inner'));

// rows: photos lean toward the cursor
const rowsEl = $('[data-rows]');
const rows = $$('.s5__row', rowsEl);
if (!coarse() && !RM) {
  const lean = rows.map(() => 0);
  addTick(() => {
    const r = rowsEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    rows.forEach((row, i) => {
      const img = row.children[1] as HTMLElement;
      let want = 0;
      if (S.mx >= 0) {
        const b = img.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const fall = 1 / (1 + ((S.my - cy) / 140) ** 2);
        want = Math.max(-60, Math.min(60, (S.mx - cx) * 0.16)) * fall;
      }
      lean[i] += (want - lean[i]) * 0.12;
      img.style.transform = `translateX(${lean[i].toFixed(1)}px)`;
    });
  });
}

// ---------- Chapter 03: each way in opens the interactive window on its own page ----------
$$<HTMLButtonElement>('.s5__open').forEach((b) => {
  const warm = () => { void import('./demo'); };
  b.addEventListener('pointerenter', warm, { once: true });
  b.addEventListener('focus', warm, { once: true });
  b.addEventListener('click', () => {
    const img = b.closest('.s5__row')!.querySelector<HTMLElement>('.s5__photo')!;
    import('./demo').then(({ openDemo }) => openDemo({ from: img, page: b.dataset.page as PageId, focus: b.dataset.focus, lenis, reduced: RM }));
  });
});

// ---------- the SysBastion window: Chapters 02 and 04 happen inside it ----------
// Chapter 02 is the Harden page with the System hardening card in its slot and the change journal
// beside it; once the sheet of Chapter 03 has covered it, it becomes Journal & restore.
const device = $('[data-device]');
type WinPage = 'apply' | 'journal';
let winPage: WinPage | '' = '';
let win: HTMLElement = device;
let applyAt: Date | null = null;
const setWinPage = (pg: WinPage) => {
  if (pg === winPage) return;
  winPage = pg;
  device.innerHTML = pg === 'apply' ? windowHTML('hardening', 'apply') : windowHTML('journal', 'journal');
  win = $('.sbw', device);
  if (pg === 'journal') win.insertAdjacentHTML('beforeend', dialogHTML);
};
setWinPage('apply');
const fitWindow = () => device.style.setProperty('--ws', (device.clientHeight / 716).toFixed(4));
fitWindow();
addEventListener('resize', fitWindow);
S.dock = () => (winPage === 'apply' ? win.querySelector('[data-slot]')?.getBoundingClientRect() ?? null : null);

// ---------- Chapter 05: modules ----------
const totemSec = $('[data-totem]');
const pillsBox = $('[data-pills]');
pillsBox.innerHTML = modules.list.map((m, i) => `<button class="tp" type="button" role="tab" id="totem-tab-${i}" aria-controls="totem-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${m.name}</button>`).join('');
const pillBtns = $$<HTMLButtonElement>('.tp', pillsBox);
const nameBack = $('[data-name-back]'), nameFront = $('[data-name-front]'), desc = $('[data-totem-desc]'), digit = $('[data-digit]');
const parenL = $('[data-paren-l]'), parenR = $('[data-paren-r]');
let totemIdx = 0, totemShow: ((k: (typeof modules.list)[number]['shape'], dir: number) => void) | null = null;
const words = (t: string, base = 0) => t.split(' ').map((w, i) => `<span class="wm"><span style="animation-delay:${(base + i * 0.09).toFixed(2)}s">${w}</span></span>`).join('');
const still = $<HTMLImageElement>('[data-totem-still]');
// long epithets ("The gatekeeper") shrink so the line never runs past the viewport
const fitNames = () => {
  if (innerWidth <= 768) { nameFront.parentElement!.style.removeProperty('--fit'); nameBack.parentElement!.style.removeProperty('--fit'); return; }
  for (const el of [nameFront, nameBack]) {
    const box = el.parentElement!;
    box.style.setProperty('--fit', '1');
    // the back name is centred at 35.5% of the width, so it has less room than the front one
    const w = box.scrollWidth, max = innerWidth * (el === nameBack ? 0.66 : 0.92);
    if (w > max) box.style.setProperty('--fit', (max / w).toFixed(3));
  }
};
addEventListener('resize', fitNames);
document.fonts?.ready.then(fitNames);
const renderTotem = (i: number, dir: number, first = false) => {
  const m = modules.list[i];
  nameBack.innerHTML = words(m.name);
  nameFront.innerHTML = words(m.epithet, 0.14);
  desc.textContent = m.desc;
  desc.setAttribute('aria-labelledby', `totem-tab-${i}`);
  desc.style.animation = 'none'; void desc.offsetWidth; desc.style.animation = '';
  digit.textContent = String(i + 1);
  digit.style.animation = 'none'; void digit.offsetWidth; digit.style.animation = '';
  if (!first && !RM) {
    const o = { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
    parenL.animate([{ transform: 'none' }, { transform: 'translateX(-0.42em)' }, { transform: 'none' }], o);
    parenR.animate([{ transform: 'none' }, { transform: 'translateX(0.42em)' }, { transform: 'none' }], o);
  }
  pillBtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
  totemShow?.(m.shape, dir);
  // the section's own panel from the app, behind the object
  const ui = $<HTMLImageElement>('[data-totem-ui]');
  const tile = ({ uac: 'uac', hardening: 'hardening-on', scripts: 'types', powershell: 'powershell', network: 'outbound', readers: 'adobe' } as Record<string, string>)[m.slug];
  ui.src = `/sysbastion-2/ui/tile-${tile}.webp`;
  // without the 3D stage (phones, no WebGL), the panel itself stands in for the object
  if (!RICH) { still.hidden = false; still.src = ui.src; }
  if (!first && !RM) ui.animate([{ opacity: 0, transform: `translate(calc(-50% + ${dir * 5}vw), -50%) perspective(1600px) rotateY(${-16 - dir * 18}deg) scale(.94)` }, { opacity: 1, transform: 'translate(-50%, -50%) perspective(1600px) rotateY(-16deg) scale(1)' }], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });

  fitNames();
};
const selectTotem = (i: number, dir: number) => { if (i === totemIdx) return; totemIdx = i; renderTotem(i, dir); };
pillBtns.forEach((b, i) => b.addEventListener('click', (e) => { e.stopPropagation(); selectTotem(i, i > totemIdx ? 1 : -1); }));
pillsBox.addEventListener('keydown', (e) => {
  const n = pillBtns.length; let k = totemIdx;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = (k + 1) % n; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = (k - 1 + n) % n; else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = n - 1; else return;
  e.preventDefault(); selectTotem(k, k > totemIdx ? 1 : -1); pillBtns[k].focus();
});
const BOTTOM_ZONE = 232;
totemSec.addEventListener('click', (e) => {
  if (e.clientY > innerHeight - BOTTOM_ZONE || (e.target as Element).closest('[data-controls]') || getSelection()?.toString()) return;
  const d = e.clientX < innerWidth / 2 ? -1 : 1;
  selectTotem((totemIdx + d + modules.list.length) % modules.list.length, d);
});
// arrow cursor while over the stage
const arrow = $('[data-arrow]');
let totemOn = false;
if (!coarse()) {
  addEventListener('pointermove', (e) => {
    const low = e.clientY > innerHeight - BOTTOM_ZONE;
    arrow.style.transform = `translate(${e.clientX - 48}px, ${e.clientY - 48}px)`;
    arrow.classList.toggle('on', totemOn && !low);
    totemSec.classList.toggle('hide-cursor', totemOn && !low);
    arrow.dataset.side = e.clientX < innerWidth / 2 ? 'left' : 'right';
  }, { passive: true });
  document.addEventListener('pointerleave', () => arrow.classList.remove('on'));
}
new IntersectionObserver(([e]) => { totemOn = e.isIntersecting; if (!totemOn) { arrow.classList.remove('on'); totemSec.classList.remove('hide-cursor'); } }, { threshold: 0.4 }).observe(totemSec);
renderTotem(0, 1, true);

// ---------- Chapter 06 labels ----------
const labelsBox = $('[data-labels]');
labelsBox.innerHTML = evidence.cols.map((c, i) => `<div class="sl" style="left:calc(${i * 25}% + 32px)"><span class="sl__name">${c.label}</span><span class="sl__count">0</span></div>`).join('');
const counts = $$('.sl__count', labelsBox);
// phones: tiles instead of physics
const SMALL = MOBILE || innerWidth <= 768;
{
  const grid = $('[data-grid]');
  const target = [24, 32, 28, 20];
  grid.innerHTML = evidence.cols.map((c, i) => `<div class="st"><div class="st__fill" style="background-image:url(${patternCanvas(c.group, 512).toDataURL('image/png')});--target:${Math.round((target[i] / 40) * 100)}%"></div><div class="st__label"><span class="sl__name">${c.label}</span><span class="sl__count">0</span></div></div>`).join('');
  if (SMALL) {
    const tc = $$('.sl__count', grid);
    const stats = $('[data-stats]');
    let done = false;
    new IntersectionObserver(([e]) => {
      if (e.intersectionRatio < 0.35 || done) return;
      done = true;
      stats.classList.add('in');
      const t0 = performance.now();
      const off = addTick(() => { const k = Math.min(1, (performance.now() - t0) / 1200), e2 = 1 - (1 - k) ** 3; tc.forEach((el, i) => (el.textContent = String(Math.round(target[i] * (RM ? 1 : e2))))); if (k >= 1) off(); });
    }, { threshold: [0, 0.35] }).observe(stats);
  }
}

// ---------- Chapter 07 wheel ----------
const wheelEl = $('[data-wheel]');
// the System tools tab, as a wheel of its own sixteen buttons
const toolIcons = ['history', 'sliders', 'list', 'user', 'wrench', 'shield', 'list', 'globe', 'doc', 'history', 'doc', 'terminal', 'sliders', 'terminal', 'file', 'code'];
const SPOKES = toolsList.length;
wheelEl.innerHTML = toolsList.map((t, i) => `<div class="spoke" style="transform:rotate(${(i * 360) / SPOKES + 15}deg)"><span class="crest crest--tool">${icon(toolIcons[i])}<b>${t}</b></span></div>`).join('');
const crestEls = $$('.crest', wheelEl);

// ---------- scenes ----------
const loaderOn = !root.classList.contains('no-loader');
const spiralTask = task('spiral', 2);
const sceneEl = $('[data-scene]');
const inkCanvas = $<HTMLCanvasElement>('[data-ink]');
const forgeCanvas = $<HTMLCanvasElement>('[data-forge]');
const clockBox = $('.clock');
let inkOn = false, forgeOn = false, sceneOn = true, footLive = false;
// heavy scenes load after the first frame has painted, so text paints first
const afterPaint = (fn: () => void) => { const go = () => requestAnimationFrame(() => setTimeout(fn, 0)); (document.fonts?.ready ?? Promise.resolve()).then(go, go); };
if (GL) afterPaint(() => {
  import('./spiral').then(({ mountSpiral }) => { mountSpiral($<HTMLCanvasElement>('[data-spiral]')); spiralTask.step(); setTimeout(() => spiralTask.finish(), 250); }).catch(() => spiralTask.finish());
  import('./ink').then(({ mountInk }) => mountInk(inkCanvas, () => inkOn));
  import('./forge').then(({ mountForge }) => mountForge(forgeCanvas, () => forgeOn));
  import('./totem').then(({ mountTotem }) => { const t = mountTotem($<HTMLCanvasElement>('[data-totem-stage]'), () => totemVisible); totemShow = t.show; t.show(modules.list[totemIdx].shape, 1); });
  import('./rays').then(({ mountRays }) => mountRays($<HTMLCanvasElement>('[data-rays]'), $('[data-tile]'), () => footLive || foot.classList.contains('live')));
});
else spiralTask.finish();
let totemVisible = false;
new IntersectionObserver(([e]) => (totemVisible = e.isIntersecting), { threshold: 0 }).observe(totemSec);
// physics loads as Chapter 06 approaches
{
  const stats = $('[data-stats]');
  let started = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || started || SMALL) return;
    started = true;
    import('./stats').then(({ mountStats }) => mountStats(stats, $<HTMLCanvasElement>('[data-balls]'), $<HTMLCanvasElement>('[data-goo]'), counts));
  }, { rootMargin: '150% 0px' }).observe(stats);
}
import('./wheel').then(({ mountWheel }) => mountWheel($('[data-guilds]'), wheelEl, $('[data-wheel-label]'), crestEls, tools.list));
// fonts and the window image count toward the loader too
{
  const t = task('assets', 2);
  document.fonts?.ready.then(() => t.step()).catch(() => t.step());
  t.step();
  patternCanvas('uac');
}

// ---------- scroll driver ----------
history.scrollRestoration = 'manual';
scrollTo(0, 0);
const lenis = RM ? null : new Lenis({ syncTouch: false });
if (lenis) addTick((t) => lenis.raf(t * 1000));
const scrollY0 = () => (lenis ? lenis.scroll : scrollY);
const s5 = $('[data-s5]');
const totemWrap = $('[data-totem-wrap]');
const guildsWrap = $('[data-guilds-wrap]');
const guildTitle = $('[data-guild-title]');
const footWrap = $('[data-foot-wrap]');
const foot = $('[data-foot]');
const pill = $('[data-pill]');
const applied = $('.applied');
const absTop = (el: HTMLElement) => { let t = 0, n: HTMLElement | null = el; while (n) { t += n.offsetTop; n = n.offsetParent as HTMLElement | null; } return t; };
let geo = { s5Top: 0, s5H: 0, totemTop: 0, g8Top: 0, g8H: 0, footTop: 0 };
const measure = () => { geo = { s5Top: absTop(s5), s5H: s5.offsetHeight, totemTop: absTop(totemWrap), g8Top: absTop(guildsWrap), g8H: guildsWrap.offsetHeight, footTop: absTop(footWrap) }; };
measure();
let pillTheme = '';
const drive = () => {
  const H = lvh(), ih = innerHeight;
  const y = scrollY0();
  const a = H > 0 ? y / H : 0;
  S.p = a;
  const g8 = guildsWrap.getBoundingClientRect();
  const s5r = s5.getBoundingClientRect();
  const tr = totemWrap.getBoundingClientRect();
  const atGuilds = g8.bottom < ih * 0.6;
  pill.classList.toggle('on', (MOBILE ? true : y > H * 0.15) && !atGuilds);
  setVar('--pillx', clamp01(y / Math.max(1, geo.footTop - H)));
  // b: progress through the restore chapter, from the sheet's bottom to the modules
  const b = MOBILE ? smooth(geo.totemTop - H * 0.42, geo.totemTop - H * 0.06, y) : smooth(geo.s5Top + geo.s5H + H * 0.25, geo.totemTop - H * 0.1, y);
  const vcard = smooth(0.46, 0.74, b);
  const O = MOBILE ? smooth(geo.totemTop - H * 0.86, geo.totemTop - H * 0.15, y) : smooth(0.52, 0.82, b);
  S.collapse = O;
  setVar('--vsheet', smooth(0, 0.35, b));
  if (MOBILE) setVar('--vout', smooth(0.15, 0.75, O));
  const forge = MOBILE ? smooth(geo.totemTop - H * 0.95, geo.totemTop - H * 0.32, y) : O;
  setVar('--forge', forge);
  setVar('--vcard', vcard);
  if (MOBILE) setVar('--deckout', smooth(1.98, 2.12, a));
  sceneOn = vcard < 0.999 && !(MOBILE && a > 2.15);
  sceneEl.classList.toggle('off', !sceneOn);
  inkOn = a > (MOBILE ? 2 : 1.55) && O < 0.999;
  inkCanvas.classList.toggle('on', inkOn);
  applied.classList.toggle('on', inkOn);
  $('.ink--still').classList.toggle('on', inkOn);
  clockBox.classList.toggle('on', inkOn);
  setVar('--treveal', smooth(0.8, 1, b));
  setVar('--dreveal', smooth(0.9, 1, b));
  const ink = smooth(1.9, 2.6, a);
  setVar('--ink', ink);
  setVar('--inkfill', (Math.min(1, ink) * (1 - O)));
  setVar('--dgrow', smooth(2.1, 2.45, a));
  setVar('--hl', smooth(2.3, 2.72, a));
  setVar('--phone', smooth(2.2, 2.65, a) * (1 - vcard));
  // the window: dock, select, apply (Chapter 02), then restore (Chapter 04)
  // the WebGL tile hands over to the HTML card once it has landed (no WebGL: the card is simply there)
  const dock = GL && !MOBILE ? smooth(2.63, 2.68, a) : 1;
  setVar('--docked', dock);
  setVar('--gldock', GL && !MOBILE ? dock : 0);
  setWinPage(y > geo.s5Top + Math.max(0, geo.s5H - H) * 0.5 ? 'journal' : 'apply');
  setVar('--dshrink', winPage === 'journal' ? 0.9 : 1);
  if (winPage === 'apply') {
    const sel = Math.min(8, Math.floor(clamp01((a - 2.7) / 0.3) * 8.999));
    const done = Math.min(8, Math.floor(clamp01((a - 3.04) / 0.38) * 8.999));
    if (done && !applyAt) applyAt = new Date();
    setApplyState(win, sel, done, a > 2.98 && a < 3.06, applyAt ?? new Date());
  } else {
    // restore plays as soon as the white sheet has cleared the window
    const y0 = geo.s5Top + geo.s5H;
    const restored = Math.min(8, Math.floor(clamp01((y - y0 - H * 0.12) / (H * 0.55)) * 8.999));
    setRestoreState(win, 1 - smooth(y0 - H * 0.05, y0 + H * 0.2, y), restored, y > y0 - H * 0.05 && y < y0 + H * 0.06);
  }
  for (const row of rows) { const t = row.getBoundingClientRect().top; row.style.setProperty('--rp', clamp01((ih * 0.9 - t) / (ih * 0.45)).toFixed(3)); }
  {
    const n = geo.s5Top - y, i = geo.s5Top + geo.s5H - y;
    const vr = clamp01((H - i) / H), s = clamp01((H - n) / H);
    setVar('--vreveal', vr);
    setVar('--afade', clamp01(n / (H * 0.7)));
    setVar('--s5off', Math.min(1, 1 - s + vr));
    setVar('--s5rot', 1 - s - vr);
  }
  if (!MOBILE) { const e = smooth(geo.totemTop + H * 0.99, geo.totemTop + H * 2.19, y); setVar('--totemscale', 1 - 0.5 * e); setVar('--totemlag', e); }
  let F2 = 0;
  {
    const n = (H - (geo.g8Top - y)) / H;
    F2 = n;
    const i = clamp01(n);
    if (i > 0.995 && !footLive) { footLive = true; foot.classList.add('live'); }
    setVar('--g8off', 1 - i);
    setVar('--g8rot', 1 - i);
    const tt = guildTitle.getBoundingClientRect().top / (ih || H);
    setVar('--g8hl', smooth(1.05, 0.6, tt));
    setVar('--g8morph', smooth(0.52, 0.12, tt));
    setVar('--g8par', clamp01((y + H - geo.g8Top) / (H + geo.g8H)));
  }
  forgeOn = GL ? forge > 0.004 && F2 < 1.05 : forge > 0.004;
  forgeCanvas.classList.toggle('on', forgeOn);
  // pill colour follows what is under it
  {
    const line = ih - 52;
    const spans = (r: DOMRect) => r.top < line && r.bottom > line;
    let th = 'dark';
    if (spans(s5r) || spans(g8)) th = 'light';
    else {
      const below = s5r.top > line, above = s5r.bottom < line, totemBelow = tr.top > line;
      if ((ink > 0.55 && below) || (above && totemBelow && O < 0.5)) th = 'ink';
    }
    if (th !== pillTheme) { pillTheme = th; pill.classList.toggle('pill--light', th === 'light'); pill.classList.toggle('pill--ink', th === 'ink'); }
  }
  // hero headline shrinks back and fades as you leave the top
  if (!MOBILE) {
    const L = Math.min(1, y / (H * 0.33));
    headline.style.transform = `translate3d(0, ${(-y * 0.18).toFixed(1)}px, 0) scale(${(1 - 0.62 * L).toFixed(4)})`;
    headline.style.opacity = String(1 - L);
  }
};
if (lenis) lenis.on('scroll', drive); else addEventListener('scroll', drive, { passive: true });
drive();
onViewport(() => {
  const ratio = scrollY0() / Math.max(1, lvh());
  fitHeadline(); measure();
  lenis?.resize();
  if (lenis) lenis.scrollTo(ratio * lvh(), { immediate: true });
  drive();
});
addEventListener('load', () => { measure(); drive(); });

// keyboard: focusing into a section that reveals on scroll brings it fully into its revealed state
foot.addEventListener('focusin', () => { const end = document.documentElement.scrollHeight; if (lenis) lenis.scrollTo(end, { immediate: true }); else scrollTo({ top: end }); drive(); });
totemSec.addEventListener('focusin', () => { const y = geo.totemTop + (MOBILE ? 0 : lvh() * 0.2); if (Math.abs(scrollY0() - y) > lvh() * 0.6) { if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo({ top: y }); drive(); } });

// nav: logo to top, demo buttons to the end
$$('[data-top]').forEach((b) => b.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.4 }) : scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }))));
$$<HTMLAnchorElement>('[data-to-end]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  const end = document.documentElement.scrollHeight;
  if (lenis) lenis.scrollTo(end, { duration: 1.8, onComplete: () => $<HTMLInputElement>('[data-email]').focus({ preventScroll: true }) });
  else { scrollTo({ top: end }); $<HTMLInputElement>('[data-email]').focus({ preventScroll: true }); }
}));

// ---------- loader ----------
if (loaderOn) {
  S.loading = true; S.reveal = 0;
  lenis?.stop();
  root.style.overflow = 'hidden';
  runLoader($('[data-loader]'), (l) => {
    S.reveal = l < 0 ? 0 : clamp01((l - LOADER.spiralDelay) / LOADER.spiralDur);
    if (l >= LOADER.titleDelay) headline.classList.add('on');
  }, () => {
    headline.classList.add('on');
    $('[data-loader]').remove();
    root.style.overflow = '';
    lenis?.start();
    S.loading = false;
    // finish the spiral's reveal on the clock
    const t0 = performance.now(), from = S.reveal;
    const off = addTick(() => { const k = Math.min(1, from + (performance.now() - t0) / 1000 / LOADER.spiralDur); S.reveal = k; if (k >= 1) off(); });
  });
} else {
  headline.classList.add('on');
  S.reveal = 1;
}

// ---------- footer form ----------
import('./form').then(({ mountForm }) => mountForm(foot));

gsap.ticker.fps(-1);
