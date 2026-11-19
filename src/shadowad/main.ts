// /shadowad: the reference's single scroll story, told for SysBastion.
// One clock (gsap.ticker) drives Lenis, the GL scenes and every DOM label laid over them.
import './style.css';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import * as THREE from 'three';
import { createGL, CHAPTERS, type ChapterName, type Ranges, type GL } from './gl';
import { N_CRYSTALS } from './gl/crystals';
import { scramble, prepScramble, tickScrambles } from './scramble';
import { createSound } from './sound';
import { mountApp } from './app/app';
import { TOURS } from './app/tours';
import { initScope } from './scope';
import { foldSections } from './fold';

const html = document.documentElement;
// the finale's scope declaration works with or without WebGL
const scope = initScope();
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const touch = matchMedia('(hover: none), (pointer: coarse)').matches;

prepScramble($$('[data-scramble]'));
if (touch) $$('[data-explore]').forEach((e) => { e.dataset.text = 'Tap to open'; e.textContent = 'Tap to open'; });

const sound = createSound();
const soundBtn = $('[data-sound]');
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  const lab = $('[data-sound-label]', soundBtn);
  lab.textContent = on ? 'On' : 'Off';
});

if (html.classList.contains('gl')) boot();

async function boot() {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const loader = $('.sb-loader');
  const bar = $('[data-bar]');
  let progress = 0, shown = 0;
  // the ASCII loader: '=' is loaded, '+++' sweeps, '-' is still to come
  const drawBar = (time: number) => {
    shown += (progress - shown) * 0.12;
    const n = 10, filled = Math.round(shown * n), sweep = Math.floor(time * 14) % (n + 3);
    let s = '';
    for (let i = 0; i < n; i++) s += i >= sweep - 3 && i < sweep ? '+' : i < filled ? '=' : '-';
    bar.textContent = s;
    loader.setAttribute('aria-valuenow', String(Math.round(shown * 100)));
  };
  gsap.ticker.add(drawBar);

  let gl: GL;
  try {
    gl = await createGL($<HTMLCanvasElement>('.sb-gl'), (k) => { progress = k; }, document.fonts.ready);
  } catch (err) {
    console.warn('[shadowad] WebGL unavailable, showing the static page', err);
    gsap.ticker.remove(drawBar);
    html.classList.remove('gl');
    return;
  }
  progress = 1;
  await new Promise<void>((r) => setTimeout(r, 220));
  gsap.ticker.remove(drawBar);
  bar.textContent = '==========';
  html.classList.add('is-loaded');
  run(gl);
}

function run(gl: GL) {
  // ---------- scroll ----------
  // Lenis smooths wheel and touch alike (syncTouch), so both end in the same snap logic below.
  const lenis = new Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 1, syncTouch: true, syncTouchLerp: 0.085, touchInertiaExponent: 1.6 });
  lenis.stop();
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const sections = Object.fromEntries(CHAPTERS.map((c) => [c, $(`[data-ch="${c}"]`)])) as Record<ChapterName, HTMLElement>;
  const ranges = {} as Ranges;
  let maxScroll = 1;
  const at = (ch: ChapterName, local: number) => { const [a, b] = ranges[ch]; return a + (b - a) * local; };

  // The places a scroll comes to rest. Every one of them has something to read.
  const STOPS: { ch: ChapterName; local: () => number; name: string }[] = [
    { ch: 'bastion', local: () => 0, name: 'hero' },
    { ch: 'bastion', local: () => 0.6, name: 'sealed' },
    ...Array.from({ length: N_CRYSTALS }, (_, i) => ({ ch: 'crystals' as ChapterName, local: () => gl.crystals.centerOf(i), name: `crystal-${i}` })),
    { ch: 'rings', local: () => 0.6, name: 'restore' },
    { ch: 'finale', local: () => 1, name: 'next' },
  ];
  let stopsPx: number[] = [];
  const measure = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    for (const c of CHAPTERS) {
      const el = sections[c];
      ranges[c] = [el.offsetTop / maxScroll, Math.min(1, (el.offsetTop + el.offsetHeight) / maxScroll)];
    }
    ranges.finale[1] = 1;
    stopsPx = STOPS.map((s) => Math.round(at(s.ch, s.local()) * maxScroll));
  };
  measure();

  // ---------- snapping ----------
  let landed = 0;                 // index of the stop we last came to rest on
  let snapping = false;
  let inputAt = -1;               // ticker time of the last wheel/touch input
  let pendingInput = false;       // input happened since the last landing
  let movedAt = 0, lastY = 0;
  const easeSnap = (t: number) => 1 - Math.pow(1 - t, 3.2);
  const nearest = (y: number) => { let b = 0; stopsPx.forEach((s, k) => { if (Math.abs(s - y) < Math.abs(stopsPx[b] - y)) b = k; }); return b; };

  function goTo(i: number, immediate = false) {
    i = clamp(i, 0, stopsPx.length - 1);
    const y = stopsPx[i];
    const dist = Math.abs(y - lenis.scroll);
    pendingInput = false;
    if (immediate || dist < 2) { lenis.scrollTo(y, { immediate: true, force: true }); landed = i; snapping = false; return; }
    snapping = true;
    lenis.scrollTo(y, {
      duration: clamp(0.5 + (dist / innerHeight) * 0.3, 0.6, 2.1), easing: easeSnap, force: true, lock: false,
      onComplete: () => { snapping = false; landed = i; },
    });
    landed = i;
  }
  function decide() {
    // where the gesture was heading, not where the smoothing has got to
    const y = lenis.targetScroll;
    const from = stopsPx[landed];
    const moved = y - from;
    const vh = innerHeight;
    let target = landed;
    if (moved > vh * 0.04) {
      target = Math.min(stopsPx.length - 1, landed + 1);
      while (target < stopsPx.length - 1 && stopsPx[target] < y - vh * 0.35) target++;
    } else if (moved < -vh * 0.04) {
      target = Math.max(0, landed - 1);
      while (target > 0 && stopsPx[target] > y + vh * 0.35) target--;
    }
    goTo(target);
  }
  let touching = false;
  const onInput = () => { inputAt = gsap.ticker.time; pendingInput = true; snapping = false; };
  addEventListener('wheel', onInput, { passive: true });
  addEventListener('touchstart', () => { touching = true; onInput(); }, { passive: true });
  addEventListener('touchmove', onInput, { passive: true });
  addEventListener('touchend', () => { touching = false; inputAt = gsap.ticker.time; }, { passive: true });
  addEventListener('touchcancel', () => { touching = false; }, { passive: true });

  addEventListener('resize', () => { measure(); gl.resize(); tagSizes.clear(); if (!snapping) goTo(landed, true); });

  // ---------- pointer ----------
  const pointer = new THREE.Vector2(), pTarget = new THREE.Vector2(), ndc = new THREE.Vector2();
  let pointerMoved = false;
  addEventListener('pointermove', (e) => {
    pTarget.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    ndc.copy(pTarget);
    pointerMoved = true;
  }, { passive: true });

  // ---------- the intro (time based) ----------
  const state = { intro: 0, dark: 0, glitch: 0 };
  let ready = false;
  gsap.to(state, {
    intro: 1, duration: 5.2, ease: 'none',
    onUpdate() {
      if (!ready && state.intro > 0.8) {
        ready = true;
        html.classList.add('is-ready');
        $$('.sb-logo__word, [data-intro-ui] [data-scramble], [data-intro-ui][data-scramble]').forEach((el, k) => scramble(el, { delay: k * 0.08 }));
        sound.blip(1);
      }
    },
    onComplete() { lenis.start(); },
  });

  // ---------- DOM laid over the scenes ----------
  const labelsBox = $('.sb-labels');
  const wires = $<SVGSVGElement>('.sb-wires');
  const NS = 'http://www.w3.org/2000/svg';
  const nums = gl.bastion.labelNums.map((n) => { const s = document.createElement('span'); s.className = 'sb-num'; s.textContent = n; labelsBox.append(s); return s; });
  const numLine = document.createElementNS(NS, 'polyline'); wires.append(numLine);
  const crystalEls = $$('[data-crystal]');
  const tagsOf = crystalEls.map((el) => ({
    el, title: $('.sb-tag--title', el), side: $('.sb-tag--side', el), foot: $('.sb-tag--foot', el),
    lines: [0, 1, 2].map(() => { const l = document.createElementNS(NS, 'polyline'); wires.append(l); return l; }),
    on: false,
  }));
  const frame = document.createElement('div');
  frame.className = 'sb-target'; frame.setAttribute('aria-hidden', 'true');
  frame.innerHTML = '<i></i><i></i><i></i><i></i><b>OPEN</b>';
  labelsBox.append(frame);
  const notes = { sealed: $('[data-note="sealed"]'), ring: $('[data-ch="rings"] .sb-ringnote') };
  const finaleEl = $('.sb-finale');
  const flags: Record<string, boolean> = {};
  /** Toggle a class only when the state changes; decode its text as it appears. */
  const show = (key: string, el: Element, on: boolean, decode = true) => {
    if (flags[key] === on) return;
    flags[key] = on;
    el.classList.toggle('is-on', on);
    if (on && decode) $$('[data-scramble]', el).forEach((t, k) => scramble(t, { delay: k * 0.08, duration: 0.8 }));
  };

  // Sizes of the floating tags never change while they are shown (monospace, fixed copy),
  // so measure once instead of forcing layout every frame.
  const tagSizes = new Map<HTMLElement, { w: number; h: number }>();
  const size = (el: HTMLElement) => { let s = tagSizes.get(el); if (!s) { s = { w: el.offsetWidth, h: el.offsetHeight }; tagSizes.set(el, s); } return s; };
  const lineCache = new WeakMap<SVGPolylineElement, string>();
  const setLine = (l: SVGPolylineElement, pts: number[][], o = 1) => {
    const v = pts.map((p) => `${p[0].toFixed(0)},${p[1].toFixed(0)}`).join(' ') + '|' + o.toFixed(2);
    if (lineCache.get(l) === v) return;
    lineCache.set(l, v);
    l.setAttribute('points', v.split('|')[0]);
    l.style.opacity = o.toFixed(2);
  };
  const place = (el: HTMLElement, x: number, y: number) => { el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };

  // ---------- crystals: hover, open, close ----------
  let hover = -1, openIdx = -1, lastFocus: HTMLElement | null = null;
  const dialog = $('.sb-module');
  const dTitle = $('.sb-module__title', dialog), dBody = $('[data-module-body]', dialog);
  const live = $('[data-live]');

  /** One panel for everything that opens over the story: a fleet crystal, or the responsible-use notes. */
  let appHandle: { destroy(): void } | null = null;
  /** The brief beside the console: every section folded shut, and no link row (the finale is where to ask). */
  function trimBrief(body: HTMLElement) {
    $$('.sb-links', body).forEach((e) => e.remove());
    foldSections(body);
  }
  function openPanel(o: { title: string; body: string; crystal?: number; hash?: string }) {
    if (openIdx >= 0) return;
    openIdx = o.crystal ?? 99;
    lastFocus = document.activeElement as HTMLElement;
    dTitle.textContent = o.title;
    const withApp = o.crystal != null;
    dialog.classList.toggle('is-app', withApp);
    // a crystal opens the shadowAD console itself, on the screen where that part of the fleet lives
    dBody.innerHTML = withApp
      ? `<div class="sa-stage"><aside class="sa-brief"><div class="sa-brief__body">${o.body}</div><ol class="sa-legend" aria-label="Parts of the screen"></ol></aside><div class="sa-host"></div></div>`
      : o.body;
    // beside the console, only what helps read it: closed dropdowns and the numbered parts
    if (withApp) { trimBrief($('.sa-brief__body', dBody)); } else foldSections(dBody, true);
    if (withApp) {
      const host = $('.sa-host', dBody), legendEl = $<HTMLOListElement>('.sa-legend', dBody);
      gsap.delayedCall(0.35, () => { if (openIdx === o.crystal) appHandle = mountApp(host, TOURS, o.crystal!, legendEl, switchFleet); });
    }
    const parts = $$(withApp ? '.sa-brief__body p, .sa-brief__body a, .sa-brief > p' : 'p, li, a', dBody).filter((e) => !e.querySelector('a, b'));
    prepScramble(parts);
    if (o.crystal != null) gl.crystals.setOpen(o.crystal);
    lenis.stop();
    if (o.hash) history.replaceState(null, '', `#${o.hash}`);
    sound.blip(2);
    gsap.timeline()
      .to(state, { glitch: 1, duration: 0.25, ease: 'power2.in' })
      .to(state, { glitch: 0, duration: 0.7, ease: 'power2.out' })
      .to(state, { dark: 1, duration: 1.1, ease: 'power2.out' }, 0.2);
    dialog.hidden = false;
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    gsap.delayedCall(0.5, () => {
      dTitle.dataset.text = o.title;   // a new title every time, not the cached first one
      scramble(dTitle, { duration: 0.8 });
      parts.forEach((el, k) => scramble(el, { delay: 0.15 + k * 0.04, duration: 0.9 }));
    });
    dTitle.focus({ preventScroll: true });
    live.textContent = `${o.title} opened`;
  }
  /** The visitor moved to another fleet's screen inside the console: everything around it follows. */
  function switchFleet(i: number) {
    if (openIdx < 0 || openIdx === 99 || i === openIdx) return;
    const art = crystalEls[i];
    const title = ($('h3', art).dataset.text || '').replace(/\n/g, ' ');
    openIdx = i;
    gl.crystals.setOpen(i);
    goTo(2 + i, true);   // behind the panel, so closing it lands on this fleet's crystal
    history.replaceState(null, '', '#' + art.id);
    dTitle.textContent = title; dTitle.dataset.text = title;
    scramble(dTitle, { duration: 0.7 });
    const body = $('.sa-brief__body', dBody), brief = $('.sa-brief', dBody);
    body.innerHTML = $('[data-body]', art).innerHTML;
    trimBrief(body);
    brief.scrollTop = 0;
    const parts = $$('p, a', body).filter((e) => !e.querySelector('a, b'));
    prepScramble(parts);
    parts.forEach((el, k) => scramble(el, { delay: 0.05 + k * 0.035, duration: 0.7 }));
    sound.blip(1);
    live.textContent = title + ' opened';
  }
  function openModule(i: number) {
    const art = crystalEls[i];
    openPanel({ title: ($('h3', art).dataset.text || '').replace(/\n/g, ' '), body: $('[data-body]', art).innerHTML, crystal: i, hash: art.id });
  }
  const respBody = $('#responsible-use [data-body]');
  $('[data-open-responsible]').addEventListener('click', () => openPanel({ title: 'Responsible use', body: respBody.innerHTML, hash: 'responsible-use' }));
  function closeModule() {
    if (openIdx < 0) return;
    openIdx = -1;
    gl.crystals.setOpen(-1);
    dialog.classList.remove('is-open');
    sound.blip(0);
    gsap.timeline()
      .to(state, { glitch: 0.8, duration: 0.18 })
      .to(state, { glitch: 0, duration: 0.5 })
      .to(state, { dark: 0, duration: 0.8, ease: 'power2.out' }, 0);
    gsap.delayedCall(0.8, () => { if (openIdx >= 0) return; dialog.hidden = true; appHandle?.destroy(); appHandle = null; dialog.classList.remove('is-app'); });
    history.replaceState(null, '', location.pathname);
    lenis.start();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => openModule(+b.dataset.open!)));
  $('[data-close]', dialog).addEventListener('click', closeModule);

  // keyboard: Esc closes a module; arrows, Page keys, Space, Home and End step between stops
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModule(); return; }
    if (openIdx >= 0) {
      if (e.key === 'Tab') {
        const f = $$<HTMLElement>('button, a[href], [tabindex="-1"]', dialog);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (!ready || state.intro < 1) return;
    if (e.key === 'Enter' && gl.chapter === 'crystals' && !(document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLAnchorElement)) {
      const i = tagsOf.findIndex((t) => t.on);
      if (i >= 0) { e.preventDefault(); openModule(i); return; }
    }
    const el = document.activeElement as HTMLElement | null;
    const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    const onControl = el && /^(BUTTON|A)$/.test(el.tagName);
    if (typing) return;
    const fwd = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey && !onControl);
    const back = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey && !onControl);
    if (fwd || back || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : e.key === 'End' ? stopsPx.length - 1 : landed + (fwd ? 1 : -1));
    }
  });
  const canvas = $<HTMLCanvasElement>('.sb-gl');
  canvas.addEventListener('click', (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    const i = gl.pick(ndc);
    if (i >= 0) { openModule(i); return; }
    if (gl.pickFinale(ndc)) scope.set(scope.env + 1, scope.size);   // click the estate to try the next one
  });

  // ---------- finale: declare your scope ----------
  const scopeRead = $('[data-scope-read]');
  scope.listen((env, size, fromUser) => {
    gl.finale.setShape(env, size);
    if (fromUser) { scramble(scopeRead, { duration: 0.6 }); sound.blip(1); }
  });
  const scopeCta = $('[data-scope-cta]');
  scopeCta.addEventListener('pointerenter', () => gl.finale.setPulse(true));
  scopeCta.addEventListener('pointerleave', () => gl.finale.setPulse(false));
  scopeCta.addEventListener('focus', () => gl.finale.setPulse(true));
  scopeCta.addEventListener('blur', () => gl.finale.setPulse(false));

  // ---------- the six controls, pinned around the ring ----------
  const controls = $$('[data-controls] li');
  const controlLines = controls.map(() => { const l = document.createElementNS(NS, 'polyline'); wires.append(l); return l; });

  // ---------- the tick ----------
  let last = gsap.ticker.time;
  let chapterNow = '';
  let pickAt = 0;
  const tick = (time: number) => {
    const dt = Math.min(0.05, Math.max(0.001, time - last));
    last = time;

    // snapping: a gesture has ended (no input for a beat) → come to rest on a stop
    const y = lenis.scroll;
    const scrolledNow = Math.abs(y - lastY) > 0.5;
    if (scrolledNow) movedAt = time;
    lastY = y;
    if (ready && state.intro >= 1 && openIdx < 0 && !snapping && !touching) {
      if (pendingInput && time - inputAt > 0.13) decide();
      else if (!pendingInput && time - movedAt > 0.3 && Math.abs(y - stopsPx[landed]) > 2) goTo(nearest(y)); // scrollbar drag, find-in-page
    }

    pointer.lerp(pTarget, Math.min(1, dt * 2.5));
    const p = clamp(y / maxScroll);
    // with a module open and fully dark, the canvas sits behind an opaque, blurred panel: skip the GPU work
    const covered = openIdx >= 0 && state.dark > 0.99 && state.glitch < 0.01;
    if (!covered) gl.render({ t: time, dt, p, intro: state.intro, pointer, ranges, dark: state.dark, glitch: state.glitch });
    tickScrambles(time);

    const ch = gl.chapter, local = gl.local;
    if (ch !== chapterNow) { chapterNow = ch; html.dataset.chapter = ch; }
    const introUi = ready && ch === 'bastion' && local < 0.08;
    if (flags.intro !== introUi) { flags.intro = introUi; html.classList.toggle('is-intro-ui', introUi); }
    sound.mood(ch, local);

    // bastion numbers, strung on one hairline
    const showNums = ready && ch === 'bastion' && gl.bastion.explode > 0.18 && local < 0.55;
    if (flags.nums !== showNums) {
      flags.nums = showNums;
      nums.forEach((n, k) => { n.style.opacity = showNums ? '1' : '0'; if (showNums) scramble(n, { delay: k * 0.06, duration: 0.5 }); });
      if (!showNums) setLine(numLine, [], 0);
    }
    if (showNums) {
      const pts: number[][] = [];
      gl.bastion.anchors.forEach((a, k) => { const s = gl.project(a); place(nums[k], s.x + 7, s.y - 5); pts.push([s.x, s.y]); });
      setLine(numLine, pts, clamp((gl.bastion.explode - 0.18) * 3) * 0.75);
    }
    show('sealed', notes.sealed, ch === 'bastion' && local > 0.5 && local < 0.72);

    // crystal tags
    const small = innerWidth < 720, edge = small ? 16 : 40;
    tagsOf.forEach((tg, i) => {
      const on = ch === 'crystals' && gl.crystals.focus[i] > 0.5 && openIdx < 0;
      if (on !== tg.on) {
        tg.on = on;
        tg.el.classList.toggle('is-on', on);
        if (on) { $$('[data-scramble]', tg.el).forEach((el, k) => scramble(el, { delay: 0.05 + k * 0.05, duration: 0.7 })); sound.blip(0); }
        else tg.lines.forEach((l) => setLine(l, [], 0));
      }
      if (!on) return;
      const [aT, aS, aF] = gl.crystals.anchors[i].map((v) => gl.project(v));
      const T = size(tg.title), S = size(tg.side), F = size(tg.foot);
      const tx = Math.max(edge, aT.x - T.w - (small ? 40 : 90)), ty = Math.max(70, aT.y - T.h - (small ? 34 : 60));
      place(tg.title, tx, ty);
      setLine(tg.lines[0], [[tx, ty + T.h], [tx + T.w + 18, ty + T.h], [aT.x, aT.y]]);
      const sx = Math.min(innerWidth - edge - S.w, aS.x + 60), sy = aS.y - S.h - 4;
      place(tg.side, sx, sy);
      setLine(tg.lines[1], small ? [] : [[sx + S.w, sy + S.h + 4], [aS.x, aS.y]]);
      const fx = Math.min(innerWidth - edge - F.w, aF.x + (small ? -F.w / 2 : 20)), fy = Math.min(innerHeight - F.h - 70, aF.y + (small ? 26 : 12));
      place(tg.foot, fx, fy);
      setLine(tg.lines[2], [[fx + F.w, fy + F.h], [fx - 24, fy + F.h], [aF.x, aF.y]]);
    });

    // the targeting frame: snaps around the crystal in focus, tightens on hover
    const tgt = tagsOf.findIndex((t) => t.on);
    if (flags.frame !== (tgt >= 0)) { flags.frame = tgt >= 0; frame.classList.toggle('is-on', tgt >= 0); }
    if (tgt >= 0) {
      const c = gl.project(gl.crystals.centers[tgt]), e2 = gl.project(gl.crystals.edge(tgt));
      const rad = Math.max(60, Math.abs(e2.x - c.x)) * (hover === tgt ? 0.92 : 1);
      frame.style.transform = 'translate3d(' + (c.x - rad).toFixed(1) + 'px,' + (c.y - rad * 1.12).toFixed(1) + 'px,0)';
      frame.style.width = (rad * 2).toFixed(0) + 'px'; frame.style.height = (rad * 2.24).toFixed(0) + 'px';
      frame.classList.toggle('is-hot', hover === tgt);
    }

    // hover: only when something under the pointer could have changed, at most 30 times a second
    if (!touch && (pointerMoved || scrolledNow) && time - pickAt > 0.033) {
      pickAt = time; pointerMoved = false;
      if (ch === 'crystals' && openIdx < 0) {
        const h = gl.pick(ndc);
        if (h !== hover) { hover = h; gl.crystals.setHover(h); if (h >= 0) sound.blip(0); }
      } else if (hover !== -1) { hover = -1; gl.crystals.setHover(-1); }
      const hot = hover >= 0 || (ch === 'finale' && !!gl.pickFinale(ndc));
      if (flags.hot !== hot) { flags.hot = hot; html.classList.toggle('is-hover-crystal', hot); }
    }

    show('ring', notes.ring, ch === 'rings' && local > 0.4 && local < 0.86);

    // the six controls, pinned to the outer wall while the mark is lit
    const ctlOn = ch === 'rings' && local > 0.42 && local < 0.64;
    if (flags.ctl !== ctlOn) {
      flags.ctl = ctlOn;
      $('[data-controls]').classList.toggle('is-on', ctlOn);
      if (ctlOn) controls.forEach((li, k) => $$('[data-scramble]', li).forEach((t, j) => scramble(t, { delay: k * 0.07 + j * 0.05, duration: 0.7 })));
      else controlLines.forEach((l) => setLine(l, [], 0));
    }
    if (ctlOn) {
      const cx = innerWidth / 2, cy = innerHeight / 2;
      gl.rings.controlAnchors.forEach((a, k) => {
        const p = gl.project(a), S = size(controls[k]);
        const dx = p.x - cx, dy = p.y - cy, len = Math.hypot(dx, dy) || 1;
        const ox = p.x + (dx / len) * (small ? 28 : 64), oy = p.y + (dy / len) * (small ? 24 : 40);
        const centred = Math.abs(dx) < 60;
        const x = clamp(centred ? ox - S.w / 2 : dx < 0 ? ox - S.w : ox, edge, innerWidth - edge - S.w);
        const y = clamp(centred ? (dy < 0 ? oy - S.h : oy) : oy - S.h / 2, 70, innerHeight - S.h - 60);
        place(controls[k], x, y);
        const end: number[] = centred ? [x + S.w / 2, dy < 0 ? y + S.h : y] : [dx < 0 ? x + S.w : x, y + S.h / 2];
        setLine(controlLines[k], [[p.x, p.y], end], 0.85);
      });
    }
    show('finale', finaleEl, ch === 'finale' && local > 0.4);
  };
  // dev: CPU cost of a frame (JS + GL command submission), as an exponential average
  const perf = { cpu: 0 };
  gsap.ticker.add(import.meta.env.DEV ? (t: number) => { const a = performance.now(); tick(t); perf.cpu += (performance.now() - a - perf.cpu) * 0.05; } : tick);

  // deep link to a module: land on its crystal once the intro has played
  const hashIdx = crystalEls.findIndex((el) => `#${el.id}` === location.hash);
  if (hashIdx >= 0) gsap.delayedCall(5.3, () => goTo(2 + hashIdx, true));

  // dev-only: render an exact frame for visual QA (the preview pane throttles rAF)
  if (import.meta.env.DEV) {
    (window as unknown as { __sb: unknown }).__sb = {
      gl, lenis, state, ranges, at, perf,
      get stops() { return STOPS.map((s, k) => ({ name: s.name, px: stopsPx[k] })); },
      get landed() { return landed; }, get snapping() { return snapping; },
      goTo,
      seek(o: { intro?: number; p?: number; t?: number }) {
        gsap.killTweensOf(state);
        if (o.intro != null) state.intro = o.intro;
        if (o.p != null) { lenis.start(); lenis.scrollTo(o.p * maxScroll, { immediate: true, force: true }); landed = nearest(o.p * maxScroll); pendingInput = false; lastY = lenis.scroll; }
        if (state.intro > 0.8 && !ready) { ready = true; html.classList.add('is-ready'); }
        const t = o.t ?? gsap.ticker.time;
        movedAt = t; last = t - 0.016; tick(t); tickScrambles(t + 10);
        return { chapter: gl.chapter, local: +gl.local.toFixed(3) };
      },
    };
  }
}
