// Film excerpts in each section play only while on screen; under reduced motion their posters stay.
// Buttons flood from the pointer's side (motion.md "Button fill from the pointer's side").
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ease, isTouch, onPage, prefersReducedMotion } from '../engine';

export function startClips() {
  onPage(() => {
    if (prefersReducedMotion()) return;
    document.querySelectorAll<HTMLVideoElement>('video[data-clip]').forEach((v) => {
      ScrollTrigger.create({
        trigger: v,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) v.play().catch(() => {});
          else v.pause();
        },
      });
    });
  });
}

export function startButtons() {
  onPage(() => {
    if (isTouch() || prefersReducedMotion()) return;
    document.querySelectorAll<HTMLElement>('[data-fill]').forEach((btn) => {
      const fill = btn.querySelector<HTMLElement>('.btn__fill');
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
