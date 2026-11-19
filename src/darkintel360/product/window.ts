// The product window: a working replica of one DarkIntel360 screen, opened from the probe's beam.
// Everything here is real DOM: tables sort and filter, rows open drawers, tabs switch, the map turns.
// Layout: bar / (sidebar + workspace) / mission dock. The dock takes its own space, so nothing covers the product.
// Clarity: a 3-step tracker is always visible; tours dim everything but the part they explain and say what comes next.
import { gsap } from 'gsap';
import { PAGES, TIPS, NAV_MODULE, NAV_EXTRA, PHISH_CARDS, type Page, type Row } from './data';
import { shellHtml, drawerHtml, rowsHtml, mirrorHtml, captureHtml } from './render';
import type { MapApi } from './map';

export type Guide =
  | { kind: 'overview'; kicker: string; title: string; body: string; facts: string[]; found: number }
  | { kind: 'stop'; k: number; kicker: string; title: string; stat: string; text: string; found: number };
type Hooks = { onClose: () => void; onHunt: () => void; onNav: (i: number) => void; say: (t: string) => void; reduced: boolean };

const EASE = 'expo.out';
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const touch = () => matchMedia('(hover: none), (pointer: coarse)').matches;

export function createProduct(host: HTMLElement, hooks: Hooks) {
  const root = document.createElement('div');
  root.className = 'px'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'px-title');
  host.appendChild(root);
  let mod = -1, page: Page = PAGES[0], rows: Row[] = [], guide: Guide | null = null;
  let drawerId = '', reversed = false, perPage = 25, map: MapApi | null = null, mapMode: '2d' | '3d' = '2d';
  let tour: { tips: string[]; i: number; kind: 'stop' | 'free' } | null = null;
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string) => [...root.querySelectorAll<T>(s)];

  // ---------- render ----------
  function render(i: number) {
    mod = i; page = PAGES[i]; drawerId = ''; reversed = false; perPage = 25;
    map?.destroy(); map = null; mapMode = '2d';
    root.innerHTML = shellHtml(i) +
      `<section class="px-dock" data-dock aria-label="Your mission in this module"></section>
       <div class="px-call" data-call role="dialog" aria-live="polite" hidden></div>`;
    $('.pq-mainwrap')!.insertAdjacentHTML('beforeend', '<div class="px-spot" data-spot hidden></div>');
    root.dataset.mod = String(i);
    $('[data-theme-toggle]')?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark')); // theme survives a module switch
    // on tablets and phones the sidebar is a scrolling strip: bring the current module into view
    requestAnimationFrame(() => {
      const on = $('.pq-nav .is-on'), side = $('.pq-side');
      if (on && side && side.scrollWidth > side.clientWidth) side.scrollLeft = on.offsetLeft - side.clientWidth / 2 + on.offsetWidth / 2;
    });
    rows = page.table?.rows || [];
    hotspots();
    $$('.pq-main, .pq-drawer').forEach((el) => el.addEventListener('scroll', placeSpot, { passive: true }));
    if (i === 0) import('./map').then((mm) => { if (mod !== 0 || !$('[data-map]')) return; map = mm.mountMap($('[data-map]')!); });
  }
  /** A lime dot on every part that has a "what it does" note. */
  function hotspots(scope: ParentNode = root) {
    scope.querySelectorAll<HTMLElement>('[data-tip-id]').forEach((el) => {
      const id = el.dataset.tipId!;
      if (!id || !TIPS[id] || el.querySelector(':scope > .pq-hot')) return;
      if (getComputedStyle(el).position === 'static') el.classList.add('has-hot');
      el.insertAdjacentHTML('beforeend', `<button type="button" class="pq-hot" data-hot="${id}" aria-label="What is ${TIPS[id].t}?" aria-describedby="pq-tip"><span aria-hidden="true">?</span></button>`);
    });
  }

  // ---------- hover tooltip (outside a tour) ----------
  function tipShow(anchor: Element, t: { t: string; d: string }) {
    if (tour) return;
    const tip = $('.pq-tip')!, rr = root.getBoundingClientRect(), a = anchor.getBoundingClientRect();
    $('.pq-tip__t')!.textContent = t.t; $('.pq-tip__d')!.textContent = t.d;
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = a.left - rr.left + a.width / 2 - tw / 2, y = a.bottom - rr.top + 10;
    if (y + th > rr.height - 8) y = a.top - rr.top - th - 10;
    x = Math.max(10, Math.min(rr.width - tw - 10, x)); y = Math.max(50, y);
    gsap.set(tip, { x, y });
    if (!hooks.reduced) gsap.fromTo(tip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, overwrite: true });
  }
  const tipHide = () => { const t = $('.pq-tip'); if (t) t.hidden = true; };
  function toast(text: string) {
    const t = document.createElement('p'); t.className = 'pq-toast'; t.textContent = text; t.setAttribute('role', 'status');
    $('.pq-mainwrap')!.appendChild(t);
    gsap.fromTo(t, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE });
    gsap.to(t, { autoAlpha: 0, y: -8, delay: 3.6, duration: 0.4, onComplete: () => t.remove() });
  }

  // ---------- table ----------
  function drawRows() {
    const body = $('[data-rows]'); if (!body || !page.table) return;
    const q = ($<HTMLInputElement>('[data-filter-text]')?.value || '').trim().toLowerCase();
    const sels = $$<HTMLSelectElement>('[data-filter-sel]').filter((s) => s.selectedIndex > 0).map((s) => s.value.toLowerCase());
    let list = rows.filter((r) => { const hay = Object.values(r).join(' ').replace(/<[^>]+>/g, ' ').toLowerCase(); return (!q || hay.includes(q)) && sels.every((s) => hay.includes(s)); });
    if (reversed) list = [...list].reverse();
    list = list.slice(0, perPage);
    body.innerHTML = rowsHtml(page, list);
    $('.pq-empty')!.hidden = list.length > 0;
    if (!hooks.reduced) gsap.from(body.children, { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.025, ease: EASE });
  }
  function filterCards() {
    const q = ($<HTMLInputElement>('[data-filter-text]')?.value || '').trim().toLowerCase();
    const sel = $$<HTMLSelectElement>('[data-filter-sel]').filter((s) => s.selectedIndex > 0).map((s) => s.value.toLowerCase());
    $$<HTMLElement>('.pq-pcard').forEach((c) => { const hay = c.dataset.search || ''; c.hidden = !((!q || hay.includes(q)) && sel.every((s) => hay.includes(s))); });
  }

  // ---------- drawer ----------
  function openDrawer(id: string, tab?: string) {
    const d = page.drawers?.[id]; if (!d) return;
    const el = $('[data-px-drawer]')!;
    drawerId = id;
    el.innerHTML = drawerHtml(d, tab || d.tabs[0].id);
    hotspots(el);
    if (el.hidden) { el.hidden = false; if (!hooks.reduced) gsap.fromTo(el, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: EASE, onUpdate: placeSpot }); }
    requestAnimationFrame(() => el.classList.add('is-in'));
    $$('tr[data-drawer]').forEach((tr) => tr.classList.toggle('is-sel', tr.dataset.drawer === id));
  }
  function closeDrawer() {
    const el = $('[data-px-drawer]'); if (!el || el.hidden) return;
    drawerId = '';
    el.classList.remove('is-in');
    $$('tr.is-sel').forEach((tr) => tr.classList.remove('is-sel'));
    if (hooks.reduced) { el.hidden = true; return; }
    gsap.to(el, { xPercent: 100, duration: 0.45, ease: 'power2.in', onComplete: () => { el.hidden = true; gsap.set(el, { xPercent: 0 }); } });
  }

  // ---------- modal ----------
  function openModal(html: string) {
    const m = $('[data-px-modal]')!; m.innerHTML = html; m.hidden = false;
    if (!hooks.reduced) gsap.fromTo(m.firstElementChild, { autoAlpha: 0, scale: 0.94, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: EASE });
    m.querySelector<HTMLElement>('[data-modal-close]')?.focus({ preventScroll: true });
  }
  const closeModal = () => { const m = $('[data-px-modal]'); if (m && !m.hidden) { m.hidden = true; m.innerHTML = ''; return true; } return false; };

  // ---------- map ----------
  async function setMapMode(m2: '2d' | '3d') {
    mapMode = m2;
    $$('[data-mapmode]').forEach((b) => b.classList.toggle('is-on', b.dataset.mapmode === m2));
    for (let t = 0; t < 40 && !map; t++) await wait(50);
    map?.mode(m2);
  }

  // ---------- the dock: one slim bar. Progress, the question, and one clear action ----------
  const SIGNALS = 3;
  const TARGET = '<svg class="px-target" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3.5"/><path d="M10 0v4M10 16v4M0 10h4M16 10h4"/></svg>';
  const pips = (found: number) => `<span class="px-pips" aria-hidden="true">${[0, 1, 2].map((n) => `<i class="${n < found ? 'is-on' : ''}"></i>`).join('')}</span>`;
  function primaryLabel(g: Guide) {
    const left = SIGNALS - g.found;
    if (g.kind === 'overview') return left <= 0 ? 'Back to the landscape' : g.found ? 'Keep hunting' : 'Find the signals';
    return left > 0 ? 'Back to the hunt' : 'See your debrief';
  }
  function drawDock(g: Guide) {
    const dock = $('[data-dock]')!;
    const left = SIGNALS - g.found;
    const tips = g.kind === 'stop' ? page.stops[g.k]?.tips.length || 0 : freeTips().length;
    const prog = g.kind === 'overview' ? (left <= 0 ? 'All 3 signals found' : `${g.found} of 3 signals found`) : `Signal found · ${g.found} of 3`;
    const sub = g.kind === 'overview' ? (left > 0 ? `${left} hidden in this world` : '') : (left > 0 ? `${left} left` : '');
    const about = g.kind === 'overview'
      ? `<p class="px-about__k">${g.kicker}</p><p>${g.body}</p><ul class="px-about__facts">${g.facts.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : `<p class="px-about__k">${g.kicker}</p><p><b>${g.stat}</b> ${g.text}</p>`;
    dock.innerHTML = `<div class="px-dock__prog">${pips(g.found)}<span>${prog}</span></div>
      <p class="px-dock__t">${g.title}</p>
      <div class="px-dock__cta">
        <button type="button" class="px-chip" data-dock-fold aria-expanded="false" aria-controls="px-about">About</button>
        <button type="button" class="px-btn px-btn--tour" data-tour-start><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg><span>${g.kind === 'stop' ? 'Replay the tour' : 'Tour this page'}<small>${tips} features</small></span></button>
        <button type="button" class="px-btn px-btn--lime px-btn--game" ${g.kind === 'overview' ? 'data-px-hunt' : 'data-px-close'}>${g.kind === 'overview' && left > 0 ? TARGET : ''}<span>${primaryLabel(g)}${sub ? `<small>${sub}</small>` : ''}</span><span aria-hidden="true">→</span></button>
      </div>
      <div class="px-about" id="px-about" hidden>${about}<p class="px-about__how"><i class="pq-hot pq-hot--demo" aria-hidden="true"><span>?</span></i>${touch() ? 'Tap' : 'Hover'} a lime dot on the screen to see what that part does.</p></div>`;
    setFold(true);
    // the start strip follows progress; the hint above the tour button shows until someone takes a tour
    const sg = $('[data-start-game]'), ss = $('[data-start-game-sub]');
    if (sg && ss) { sg.textContent = left <= 0 ? 'All 3 signals found' : g.found ? `Keep hunting: ${left} signal${left > 1 ? 's' : ''} left` : 'Play: find the 3 signals'; ss.textContent = left <= 0 ? 'Back to the landscape for your debrief' : 'Each one unlocks a feature, out in the landscape'; }
    $('[data-start]')?.toggleAttribute('hidden', startHidden || g.kind === 'stop');
    if (!tourTaken && g.kind === 'overview') {
      dock.insertAdjacentHTML('beforeend', '<p class="px-coach" data-coach>Click to see every feature of this page</p>');
      setTimeout(() => $('[data-coach]')?.remove(), 9000);
    }
  }
  let tourTaken = false, startHidden = false;
  /** The About panel holds the reading; the dock itself stays one line. */
  function setFold(folded: boolean) {
    const ab = $('#px-about'), b = $('[data-dock-fold]');
    if (!ab || !b) return;
    ab.hidden = folded; b.setAttribute('aria-expanded', String(!folded)); b.classList.toggle('is-on', !folded);
    if (!folded && !hooks.reduced) gsap.fromTo(ab, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: EASE });
  }

  // ---------- tours: dim everything but one part, explain it, say what is next ----------
  const freeTips = () => {
    const seen = new Set<string>();
    return [...$$<HTMLElement>('.pq-main [data-tip-id]'), ...$$<HTMLElement>('.pq-side[data-tip-id]')].map((el) => el.dataset.tipId!).filter((id) => id && TIPS[id] && !seen.has(id) && !!seen.add(id)).slice(0, 7);
  };
  function anchorFor(id: string) {
    return $$<HTMLElement>(`[data-tip-id="${id}"]`).find((el) => el.offsetParent !== null) || null;
  }
  function numberHotspots() {
    $$('.pq-hot[data-step]').forEach((h) => { h.removeAttribute('data-step'); h.querySelector('span')!.textContent = '?'; });
    if (!tour) return;
    tour.tips.forEach((id, n) => { const h = anchorFor(id)?.querySelector<HTMLElement>(':scope > .pq-hot'); if (h) { h.dataset.step = String(n + 1); h.querySelector('span')!.textContent = String(n + 1); } });
  }
  function startTour(tips: string[], kind: 'stop' | 'free') {
    if (!tips.length) return;
    tourTaken = true; $('[data-coach]')?.remove();
    tour = { tips, i: 0, kind };
    tipHide();
    root.classList.add('is-touring');
    numberHotspots();
    focusTip();
  }
  function endTour() {
    tour = null;
    root.classList.remove('is-touring');
    $('[data-call]')!.hidden = true;
    $('[data-spot]')!.hidden = true;
    $$('.is-spot').forEach((x) => x.classList.remove('is-spot'));
    numberHotspots();
  }
  function step(d: number) {
    if (!tour) return;
    const n = tour.i + d;
    if (n < 0) return;
    if (n >= tour.tips.length) { // the end of a walkthrough points at the next action
      endTour();
      const cta = $<HTMLElement>('.px-dock [data-px-hunt], .px-dock [data-px-close]');
      if (cta) { cta.classList.add('is-pulse'); cta.focus({ preventScroll: true }); setTimeout(() => cta.classList.remove('is-pulse'), 4000); }
      return;
    }
    tour.i = n;
    focusTip();
  }
  let spotEl: HTMLElement | null = null;
  function placeSpot() {
    const spot = $('[data-spot]'), wrap = $('.pq-mainwrap');
    if (!spot || !wrap || !spotEl || !tour) return;
    const w = wrap.getBoundingClientRect(), r = spotEl.getBoundingClientRect(), pad = 8;
    const l = Math.max(4, r.left - w.left - pad), t = Math.max(4, r.top - w.top - pad);
    const rt = Math.min(w.width - 4, r.right - w.left + pad), bt = Math.min(w.height - 4, r.bottom - w.top + pad);
    gsap.set(spot, { x: l, y: t, width: Math.max(0, rt - l), height: Math.max(0, bt - t) });
    placeCall();
  }
  function placeCall() {
    const call = $('[data-call]'); if (!call || call.hidden || !spotEl) return;
    const rr = root.getBoundingClientRect(), r0 = spotEl.getBoundingClientRect(), wr = $('.pq-mainwrap')!.getBoundingClientRect();
    const r = { left: Math.max(r0.left, wr.left), right: Math.min(r0.right, wr.right), top: Math.max(r0.top, wr.top), bottom: Math.min(r0.bottom, wr.bottom), width: 0, height: 0 };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    const cw = call.offsetWidth, ch = call.offsetHeight, gap = 16;
    const room = { right: rr.right - r.right, left: r.left - rr.left, below: rr.bottom - r.bottom, above: r.top - rr.top };
    let x: number, y: number, side: string;
    if (room.right > cw + gap + 10) { side = 'right'; x = r.right - rr.left + gap; y = r.top - rr.top; }
    else if (room.left > cw + gap + 10) { side = 'left'; x = r.left - rr.left - cw - gap; y = r.top - rr.top; }
    else if (room.below > ch + gap + 10) { side = 'below'; x = r.left - rr.left + r.width / 2 - cw / 2; y = r.bottom - rr.top + gap; }
    else { side = 'above'; x = r.left - rr.left + r.width / 2 - cw / 2; y = r.top - rr.top - ch - gap; }
    const dock = $('[data-dock]')!.getBoundingClientRect();
    // phones: the callout sits right above the dock, full width, so it never hides the part it explains
    if (innerWidth < 761) { side = r.top - rr.top > rr.height * 0.45 ? 'dock-top' : 'dock'; x = 10; y = side === 'dock' ? dock.top - rr.top - ch - 10 : 54; }
    x = Math.max(10, Math.min(rr.width - cw - 10, x));
    y = Math.max(54, Math.min(dock.top - rr.top - ch - 10, y));
    call.dataset.side = side;
    gsap.set(call, { x, y });
  }
  function focusTip() {
    if (!tour) return;
    const id = tour.tips[tour.i], el = anchorFor(id), t = TIPS[id], last = tour.i === tour.tips.length - 1;
    $$('.is-spot').forEach((x) => x.classList.remove('is-spot'));
    const call = $('[data-call]')!;
    const nextLabel = last ? 'Done' : 'Next';
    call.innerHTML = `<p class="px-call__k">Step ${tour.i + 1} of ${tour.tips.length}<span>${tour.tips.map((_, n) => `<i class="${n === tour!.i ? 'is-on' : n < tour!.i ? 'is-done' : ''}"></i>`).join('')}</span></p>
      <p class="px-call__t">${t.t}</p><p class="px-call__d">${t.d}</p>
      ${last ? `<p class="px-call__next">Next: ${primaryLabel(guide!).toLowerCase()} with the lime button below.</p>` : ''}
      <div class="px-call__row"><button type="button" class="px-btn px-btn--ghost px-btn--sm" data-tour-prev${tour.i === 0 ? ' disabled' : ''}>← Back</button><button type="button" class="px-btn px-btn--lime px-btn--sm" data-tour-next>${nextLabel} <span aria-hidden="true">${last ? '✓' : '→'}</span></button></div>
      <button type="button" class="px-call__x" data-tour-end aria-label="End the walkthrough">×</button>`;
    call.hidden = false;
    spotEl = el;
    if (!el) { $('[data-spot]')!.hidden = true; placeCall(); return; }
    el.classList.add('is-spot');
    const scroller = el.closest<HTMLElement>('.pq-drawer, .pq-main');
    const show = () => {
      $('[data-spot]')!.hidden = false; placeSpot();
      if (!hooks.reduced) gsap.fromTo(call, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: EASE });
      call.querySelector<HTMLElement>('[data-tour-next]')?.focus({ preventScroll: true });
    };
    if (scroller && !scroller.classList.contains('pq-main--map')) {
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 70;
      gsap.to(scroller, { scrollTop: Math.max(0, top), duration: hooks.reduced ? 0 : 0.7, ease: 'expo.inOut', onUpdate: placeSpot, onComplete: show });
    } else show();
    hooks.say(`Step ${tour.i + 1} of ${tour.tips.length}. ${t.t}. ${t.d}`);
  }
  addEventListener('resize', () => { if (!root.hidden) placeSpot(); });

  // ---------- events ----------
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement, at = (s: string) => t.closest<HTMLElement>(s);
    if (at('[data-tour-next]')) return step(1);
    if (at('[data-tour-prev]')) return step(-1);
    if (at('[data-tour-end]')) return endTour();
    if (at('[data-tour-start]')) return startTour(guide?.kind === 'stop' ? page.stops[guide.k].tips : freeTips(), guide?.kind === 'stop' ? 'stop' : 'free');
    if (at('[data-dock-fold]')) return setFold(!$('#px-about')!.hidden);
    if (at('[data-start-x]')) { startHidden = true; $('[data-start]')?.setAttribute('hidden', ''); return; }
    if (at('[data-px-close]')) { endTour(); return hooks.onClose(); }
    if (at('[data-px-hunt]')) { endTour(); return hooks.onHunt(); }
    const hot = at('[data-hot]');
    if (hot) { e.stopPropagation(); if (tour) { const n = tour.tips.indexOf(hot.dataset.hot!); if (n >= 0) { tour.i = n; focusTip(); } return; } tipShow(hot, TIPS[hot.dataset.hot!]); return; }
    const nav = at('[data-nav]');
    if (nav) { const n = nav.dataset.nav!; if (NAV_MODULE[n] != null && NAV_MODULE[n] !== mod) { endTour(); return hooks.onNav(NAV_MODULE[n]); } if (NAV_EXTRA[n]) toast(`${n}: ${NAV_EXTRA[n]}`); return; }
    const th = at('[data-theme-toggle]');
    if (th) { const dark = root.dataset.theme !== 'dark'; root.dataset.theme = dark ? 'dark' : ''; th.setAttribute('aria-pressed', String(dark)); if (map) map.mode(mapMode); return; }
    if (at('[data-drawer-close]')) return closeDrawer();
    const tab = at('[data-tab]'); if (tab && drawerId) { openDrawer(drawerId, tab.dataset.tab); if (tour) numberHotspots(); return; }
    if (at('[data-open-src]')) return toast('In the product this opens the original post. Links stay saved even after the post is taken down.');
    if (at('[data-preview]')) return toast('Preview opens the reported page in an isolated viewer, so analysts never load the lure directly.');
    if (at('[data-sort]')) { reversed = !reversed; at('[data-sort]')!.textContent = reversed ? 'Date ↑' : 'Date ↓'; return drawRows(); }
    const mir = at('[data-mirror]');
    if (mir) { const tr = mir.closest('tr')!, td = tr.querySelectorAll('td'); return openModal(mirrorHtml(td[4].innerHTML, td[2].textContent || '', td[3].textContent || '')); }
    const en = at('[data-enlarge]'); if (en) return openModal(captureHtml(+en.dataset.enlarge!));
    if (at('[data-modal-close]') || t.matches('[data-px-modal]')) { closeModal(); return; }
    const mm = at('[data-mapmode]'); if (mm) return void setMapMode(mm.dataset.mapmode as '2d' | '3d');
    const cc = at('[data-country]'); if (cc) { $$('[data-country]').forEach((b) => b.classList.toggle('is-on', b === cc)); map?.focus(cc.dataset.country!); return; }
    const zm = at('[data-zoom]'); if (zm) return map?.zoom(+zm.dataset.zoom!);
    const row = at('[data-open-row]')?.closest<HTMLElement>('tr') || at('tr[data-drawer]');
    if (row?.dataset.drawer) return openDrawer(row.dataset.drawer);
    if (!at('.pq-tip')) tipHide();
  });
  root.addEventListener('keydown', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-drawer]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(tr.dataset.drawer!); }
    if (tour && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (tour && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  root.addEventListener('input', (e) => { if ((e.target as HTMLElement).matches('[data-filter-text]')) (mod === 5 ? filterCards() : drawRows()); });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.matches('[data-filter-sel]')) mod === 5 ? filterCards() : drawRows();
    if (t.matches('[data-perpage]')) { perPage = +t.value; drawRows(); }
  });
  root.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const hot = t.closest<HTMLElement>('[data-hot]'); if (hot) return tipShow(hot, TIPS[hot.dataset.hot!]);
    const seg = t.closest<SVGElement>('[data-seg]'); if (seg) { const [a, b] = seg.dataset.seg!.split(': '); tipShow(seg, { t: a, d: b }); }
  });
  root.addEventListener('pointerout', (e) => { const t = e.target as HTMLElement; if (t.closest('[data-hot], [data-seg]')) tipHide(); });
  root.addEventListener('focusin', (e) => { const hot = (e.target as HTMLElement).closest<HTMLElement>('[data-hot]'); if (hot) tipShow(hot, TIPS[hot.dataset.hot!]); });

  // ---------- open / close ----------
  // Every open or close takes a ticket; a close that finishes after something newer started does nothing.
  let ticket = 0;
  /** Switch module without leaving the product: fade the screen over to the next module, in place. */
  async function swap(i: number, g: Guide) {
    const my = ++ticket;
    gsap.killTweensOf(root); gsap.set(root, { clearProps: 'clipPath' });
    endTourIfAny(); closeModal(); tipHide();
    if (root.hidden) return open(i, g);
    if (!hooks.reduced) await new Promise<void>((res) => gsap.to(root.children, { autoAlpha: 0, duration: 0.18, ease: 'power1.in', onComplete: res }));
    if (my !== ticket) return;
    render(i);
    guide = g; drawDock(g);
    root.classList.remove('is-in');
    if (!hooks.reduced) gsap.fromTo(root.children, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: EASE, stagger: 0.03, clearProps: 'opacity,visibility,transform' });
    setTimeout(() => root.classList.add('is-in'), hooks.reduced ? 0 : 200);
    $<HTMLElement>('#px-title')?.setAttribute('tabindex', '-1');
    $<HTMLElement>('#px-title')?.focus({ preventScroll: true });
    hooks.say(`${PAGES[i].nav}. ${g.title}`);
  }
  async function open(i: number, g: Guide, from?: { x: number; y: number }) {
    ++ticket;
    gsap.killTweensOf(root); gsap.set(root, { clearProps: 'clipPath' });
    endTourIfAny();
    if (mod !== i || root.hidden) render(i);
    guide = g;
    drawDock(g);
    const firstOpen = root.hidden;
    root.hidden = false;
    document.documentElement.dataset.product = '1';
    if (firstOpen && !hooks.reduced) {
      const r = root.getBoundingClientRect(), x = (from?.x ?? r.left + r.width / 2) - r.left, y = (from?.y ?? r.top + r.height) - r.top;
      gsap.fromTo(root, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${Math.hypot(r.width, r.height)}px at ${x}px ${y}px)`, duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' });
      gsap.fromTo('.px-dock > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.6, stagger: 0.06, ease: EASE });
    }
    root.classList.remove('is-in');
    setTimeout(() => root.classList.add('is-in'), hooks.reduced ? 0 : 500);
    $<HTMLElement>('#px-title')?.setAttribute('tabindex', '-1');
    $<HTMLElement>('#px-title')?.focus({ preventScroll: true });
    if (g.kind === 'stop') await runStop(g.k);
    else { const main = $('[data-px-main]'); if (main) main.scrollTop = 0; closeDrawer(); }
  }
  function endTourIfAny() { if (tour && $('[data-call]')) endTour(); else tour = null; }
  async function runStop(k: number) {
    const st = page.stops[k]; if (!st) return;
    closeModal();
    if (st.open) openDrawer(st.open, st.tab); else closeDrawer();
    if (st.globe) { await wait(hooks.reduced ? 0 : 900); await setMapMode('3d'); }
    await wait(hooks.reduced ? 0 : 1100);
    if (root.hidden) return;
    startTour(st.tips, 'stop');
    if (st.modal === 'mirror') {
      const b = $('[data-mirror]'); b?.classList.add('is-pulse');
    }
  }
  async function close(to?: { x: number; y: number }) {
    if (root.hidden) return;
    const my = ++ticket;
    endTourIfAny(); closeModal(); tipHide();
    if (!hooks.reduced) {
      const r = root.getBoundingClientRect(), x = (to?.x ?? r.left + r.width / 2) - r.left, y = (to?.y ?? r.top + r.height) - r.top;
      await new Promise<void>((res) => gsap.fromTo(root, { clipPath: `circle(${Math.hypot(r.width, r.height)}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)`, duration: 0.8, ease: 'expo.inOut', onComplete: res, onInterrupt: res }));
    }
    if (my !== ticket) return; // something opened meanwhile: leave it alone
    root.hidden = true; gsap.set(root, { clearProps: 'clipPath' });
    delete document.documentElement.dataset.product;
  }
  return {
    open, close, swap,
    tour: () => { if (!root.hidden) startTour(freeTips(), 'free'); },
    isOpen: () => !root.hidden,
    escape: () => { if (tour) { endTour(); return true; } if (closeModal()) return true; if (drawerId) { closeDrawer(); return true; } return false; },
    cardsFor: () => PHISH_CARDS.length,
  };
}
export type Product = ReturnType<typeof createProduct>;
