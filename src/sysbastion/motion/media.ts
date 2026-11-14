// Film excerpts in each section play only while on screen; under reduced motion their posters stay.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, prefersReducedMotion } from '../../engine';

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

export { startButtons } from '../../engine/fill';
