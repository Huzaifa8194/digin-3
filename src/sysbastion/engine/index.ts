// Engine core, trimmed from the /awwwards engine for a single landing page:
// one clock (gsap.ticker → Lenis → ScrollTrigger), declarative reveals, onPage() modules.
// No loader, no WebGL and no page transitions: links leave to other DigiInn360 pages.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScroll } from './scroll';
import { initReveals } from './reveal';
import { prefersReducedMotion } from './env';

export { onScroll, scrollState, scrollToTarget, stopScroll, startScroll } from './scroll';
export { ease, isTouch, isMobile, prefersReducedMotion } from './env';

export type PageFn = (page: { intro: gsap.core.Timeline }) => void | (() => void);
const pageFns = new Set<PageFn>();
let ctx: gsap.Context | null = null;
let intro: gsap.core.Timeline | null = null;
let ready = false;

/** Run fn once the page is initialised, inside a gsap.context. */
export function onPage(fn: PageFn) {
  pageFns.add(fn);
  if (ready) run(fn);
  return () => { pageFns.delete(fn); };
}

function run(fn: PageFn) {
  ctx?.add(() => { fn({ intro: intro! }); });
}

export function boot(setup?: () => void) {
  const h = document.documentElement.classList;
  h.add('js', 'is-booted');
  h.toggle('motion', !prefersReducedMotion());
  initScroll();
  setup?.();
  ctx = gsap.context(() => { intro = initReveals(document); });
  ready = true;
  pageFns.forEach(run);
  requestAnimationFrame(() => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  intro?.play();
}
