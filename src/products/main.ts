// Products: the reel. Each screen is sticky; as the next one slides up, the current card sinks back
// (scale + dim, scrubbed). The trailer on the active screen plays; the rest stay paused.
import '../site-dark';
import './products.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { isMobile, isTouch, onPage, onScroll, prefersReducedMotion } from '../engine';

function startReel() {
  onPage(() => {
    const screens = [...document.querySelectorAll<HTMLElement>('[data-screen]')];
    const reduced = prefersReducedMotion();
    screens.forEach((screen, i) => {
      const card = screen.querySelector<HTMLElement>('[data-screen-card]')!;
      const video = screen.querySelector<HTMLVideoElement>('[data-trailer]');
      const next = screens[i + 1];
      if (next && !reduced) {
        gsap.to(card, {
          scale: 0.9, opacity: 0.35, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
        });
      }
      // Phones keep the poster (2.5 MB per trailer is too much to autoplay on data).
      if (video && !reduced && !isMobile()) {
        ScrollTrigger.create({
          trigger: screen, start: 'top 60%', end: 'bottom 40%',
          onToggle: (self) => (self.isActive ? video.play().catch(() => {}) : video.pause()),
        });
      }
    });
  });
}

function startPickPoster() {
  onPage(() => {
    const list = document.querySelector<HTMLElement>('[data-pick]');
    const box = document.querySelector<HTMLElement>('[data-pick-poster]');
    const img = box?.querySelector('img');
    if (!list || !box || !img || isTouch() || prefersReducedMotion()) return;
    const x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3.out' });
    const rot = gsap.quickTo(box, 'rotate', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0, px = 0, py = 0;
    list.querySelectorAll<HTMLAnchorElement>('a[data-poster]').forEach((a) => a.addEventListener('pointerenter', () => {
      img.src = a.dataset.poster!;
      gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    }));
    const hide = () => gsap.to(box, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'expo.out' });
    list.addEventListener('pointerleave', hide);
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; x(px + 140); y(py); rot(gsap.utils.clamp(-10, 10, (px - lastX) * 0.5)); lastX = px; }, { passive: true });
    onScroll(() => { if (!list.contains(document.elementFromPoint(px, py))) hide(); });
  });
}

bootDark(() => {
  startReel();
  startPickPoster();
});
