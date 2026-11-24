// Products: five cards, each one that product's own hero rebuilt in code (src/products/heroes.ts).
// At rest a card shows its hero's finished frame. Pointing at it (or focusing it) replays that
// hero's opening; on touch screens it plays as the card scrolls into view. A click anywhere opens
// the product's website, and on the way the card opens into that product's own loading screen,
// which the product page then continues. Cards stack as you scroll, each earlier one kept as a tab.
import '../site-dark';
import './products.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { isTouch, onPage, onScroll, prefersReducedMotion } from '../engine';
import { markSVG } from '../sysbastion/patterns';
import { aegis, appSiege, darkIntel, shadowAD, sysBastion, type Hero } from './heroes';

const DRIVERS: Record<string, (root: HTMLElement) => Hero> = {
  shadowad: shadowAD, sysbastion: sysBastion, aegis, appsiege: appSiege, darkintel: darkIntel,
};
const stacked = () => matchMedia('(min-width: 901px)').matches;
let current: (() => void) | null = null; // the stop() of the hero that is playing

function startReel() {
  onPage(() => {
    const screens = [...document.querySelectorAll<HTMLElement>('[data-screen]')];
    const reduced = prefersReducedMotion();
    screens.forEach((screen, i) => {
      const card = screen.querySelector<HTMLElement>('.ph')!;
      // Keyboard: Tab into a card the next one has slid over and bring it back to its own place.
      // (Keyboard only: a mouse click must never move the page under the pointer.)
      screen.addEventListener('focusin', (e) => {
        if (!stacked() || !(e.target as Element).matches(':focus-visible')) return;
        const reel = screen.parentElement!;
        let flow = 0; // cards differ in height, so add up the ones before this one
        for (let k = 0; k < i; k++) flow += screens[k].offsetHeight;
        const top = reel.getBoundingClientRect().top + scrollY + flow - (parseFloat(getComputedStyle(screen).top) || 0);
        if (Math.abs(scrollY - top) > 2) scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      });
      const next = screens[i + 1];
      if (next && !reduced) {
        gsap.matchMedia().add('(min-width: 901px)', () => {
          const veil = card.querySelector<HTMLElement>('[data-veil]');
          const st = { trigger: next, start: 'top bottom', end: 'top top', scrub: true };
          if (veil) gsap.to(veil, { opacity: 0.7, ease: 'none', scrollTrigger: { ...st } });
          // Covered by the next card (only its tab still shows): skip painting the hero underneath.
          const stage = card.querySelector<HTMLElement>('.ph__stage');
          ScrollTrigger.create({ trigger: next, start: 'top top+=1', onEnter: () => gsap.set(stage, { opacity: 0 }), onLeaveBack: () => gsap.set(stage, { opacity: 1 }) });
        });
      }
    });
  });
}

function startHeroes() {
  onPage(() => {
    const reduced = prefersReducedMotion();
    // Each hero is built only when its card comes near the screen, so none of that work
    // competes with the page's first paint.
    const near = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      near.unobserve(e.target);
      wire(e.target as HTMLAnchorElement);
    }), { rootMargin: '300px 0px' });
    document.querySelectorAll<HTMLAnchorElement>('a.ph[data-hero]').forEach((card) => near.observe(card));

    function wire(card: HTMLAnchorElement) {
      const stage = card.querySelector<HTMLElement>('.ph__stage')!;
      const hero = DRIVERS[card.dataset.hero!]?.(stage);
      if (!hero || reduced) return;
      let playing = false;
      const stop = () => { if (!playing) return; playing = false; hero.stop(); if (current === stop) current = null; };
      const play = () => {
        if (playing) return;
        current?.(); // only one hero runs at a time
        current = stop; playing = true; hero.play();
      };
      if (isTouch()) {
        // No hover on touch: the hero opens once you stop scrolling with its card in the middle
        // of the screen, so no hero animates while the page is moving.
        let centered = false, idle = 0;
        ScrollTrigger.create({ trigger: card, start: 'top center', end: 'bottom center', onToggle: (s) => { centered = s.isActive; if (!centered) stop(); } });
        onScroll(() => { clearTimeout(idle); idle = window.setTimeout(() => { if (centered) play(); }, 220); });
      } else {
        // A real pointer movement starts it (not the page scrolling under a resting mouse).
        card.addEventListener('pointermove', (e) => { if (e.movementX || e.movementY) play(); });
        card.addEventListener('pointerleave', stop);
        card.addEventListener('focus', () => card.matches(':focus-visible') && play());
        card.addEventListener('blur', stop);
        if (card.matches(':hover')) play();
      }
      ScrollTrigger.refresh();
    }
  });
}

/** The way in: the card opens into the product's own loading screen, then the browser goes there. */
const LOADERS: Record<string, string> = {
  shadowad: '<span data-bar>==--------</span>',
  sysbastion: `<span class="pr-enter__sb">${markSVG}<span>Loading</span></span>`,
  aegis: '<span class="pr-enter__ag"><svg viewBox="-1.1 -1.15 2.2 2.3"><path d="M0-1Q.42-.8.86-.86C.88-.05.62.62 0 1.02-.62.62-.88-.05-.86-.86Q-.42-.8 0-1Z"/></svg><span>Powering the Mi713 <b>00</b></span></span>',
  darkintel: '<span class="pr-enter__di"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="6.2" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="14" cy="14" rx="12.4" ry="4.6" transform="rotate(-24 14 14)" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="24.6" cy="9.6" r="2.3" fill="#c6f36d"/></svg>DarkIntel<b>360</b></span>',
  appsiege: '<span class="pr-enter__as"><svg viewBox="0 0 120 120"><defs><pattern id="pr-hatch" width="7" height="9" patternUnits="userSpaceOnUse"><text x="0" y="8" font-size="9" font-family="monospace" fill="currentColor">/</text></pattern><clipPath id="pr-ldclip"><rect x="0" y="40" width="120" height="120"/></clipPath></defs><circle cx="60" cy="60" r="58" fill="url(#pr-hatch)" clip-path="url(#pr-ldclip)"/><circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width=".6"/><text x="60" y="64" text-anchor="middle" font-size="11" font-family="monospace" fill="#c9d1ff">/30</text></svg><p><img src="/appsiege/media/appsiege-icon.png" alt="" width="22" height="22">AppSiege</p></span>',
};
function startEnter() {
  const overlay = document.querySelector<HTMLElement>('[data-enter]');
  if (!overlay) return;
  addEventListener('pageshow', () => { overlay.hidden = true; }); // coming back with the Back button
  document.querySelectorAll<HTMLAnchorElement>('a.ph[data-loader]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || prefersReducedMotion()) return;
      e.preventDefault();
      const href = card.href;
      const r = card.querySelector('.ph__stage')!.getBoundingClientRect();
      overlay.dataset.p = card.dataset.loader!;
      overlay.innerHTML = LOADERS[card.dataset.loader!] ?? '';
      overlay.hidden = false;
      const go = () => location.assign(href);
      const safety = setTimeout(go, 1200);
      gsap.timeline({ onComplete: () => { clearTimeout(safety); go(); } })
        .fromTo(overlay, { clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 12px)` },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.6, ease: 'expo.inOut' })
        .fromTo(overlay.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.3)
        .to({}, { duration: 0.15 });
    });
  });
}

/** The products' own typefaces (Archivo, Geist, Inter) load after first paint, so they never hold up the page. */
function loadProductFonts() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112..125,400..900&family=Geist:wght@400..500&family=Geist+Mono:wght@400;500&family=Inter:wght@500;700&display=swap';
  document.head.append(link);
}

bootDark(() => {
  if (document.readyState === 'complete') loadProductFonts();
  else addEventListener('load', loadProductFonts, { once: true });
  startReel();
  startHeroes();
  startEnter();
  addEventListener('load', () => ScrollTrigger.refresh());
});
