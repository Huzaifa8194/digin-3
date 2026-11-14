// Index of all 28 services: a floating loop video follows the pointer and leans with its speed
// (motion.md "Index list with cursor preview"). Fine pointers only; touch gets the plain list.
import { gsap } from 'gsap';
import { isTouch, onPage, onScroll, prefersReducedMotion } from '../engine';

export function startIndexPreview() {
  onPage(() => {
    const list = document.querySelector<HTMLElement>('[data-index]');
    const box = document.querySelector<HTMLElement>('[data-preview-box]');
    const video = box?.querySelector('video');
    if (!list || !box || !video || isTouch() || prefersReducedMotion()) return;

    const x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3.out' });
    const rot = gsap.quickTo(box, 'rotate', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0, px = 0, py = 0, current = '';

    const show = (e: Event) => {
      const key = (e.currentTarget as HTMLElement).dataset.preview!;
      if (key !== current) {
        current = key;
        video.poster = `/service-loops/${key}.webp`;
        video.src = `/service-loops/${key}.mp4`;
        video.play().catch(() => {});
      }
      gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    };
    const hide = () => { gsap.to(box, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'expo.out' }); };

    list.querySelectorAll<HTMLAnchorElement>('a[data-preview]').forEach((a) => a.addEventListener('pointerenter', show));
    list.addEventListener('pointerleave', hide);
    addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      x(px + 150); y(py); rot(gsap.utils.clamp(-10, 10, (px - lastX) * 0.5)); lastX = px;
    }, { passive: true });
    // pointerleave never fires when the page scrolls out from under a still pointer
    onScroll(() => { if (!list.contains(document.elementFromPoint(px, py))) hide(); });
  });
}
