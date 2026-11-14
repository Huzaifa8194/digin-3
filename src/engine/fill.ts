// Buttons flood from the pointer's side (motion.md "Button fill from the pointer's side").
// Markup: [data-fill] with a child whose class ends in "__fill". Touch and reduced motion use CSS.
import { gsap } from 'gsap';
import { ease, isTouch, prefersReducedMotion } from './env';
import { onPage } from './index';

export function startButtons() {
  onPage(() => {
    if (isTouch() || prefersReducedMotion()) return;
    document.querySelectorAll<HTMLElement>('[data-fill]').forEach((btn) => {
      const fill = btn.querySelector<HTMLElement>('[class$="__fill"]');
      if (!fill) return;
      const at = (e: PointerEvent) => { const r = btn.getBoundingClientRect(); return `${e.clientX - r.left}px ${e.clientY - r.top}px`; };
      let closed = true;
      const open = (p: string) => {
        if (closed) gsap.set(fill, { clipPath: `circle(0% at ${p})` });
        closed = false;
        btn.classList.add('is-filled');
        gsap.to(fill, { clipPath: `circle(150% at ${p})`, duration: 0.6, ease: ease.soft, overwrite: true });
      };
      const close = (p: string) => {
        btn.classList.remove('is-filled');
        gsap.to(fill, { clipPath: `circle(0% at ${p})`, duration: 0.5, ease: ease.soft, overwrite: true, onComplete: () => { closed = true; } });
      };
      btn.addEventListener('pointerenter', (e) => open(at(e)));
      btn.addEventListener('pointerleave', (e) => close(at(e)));
      btn.addEventListener('focus', () => btn.matches(':focus-visible') && open('50% 50%'));
      btn.addEventListener('blur', () => close('50% 50%'));
    });
  });
}
