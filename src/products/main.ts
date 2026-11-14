// Products: the reel. Each screen is sticky; as the next one slides up, the current card sinks back
// (scale + dim, scrubbed). Each screen plays its own coded loop (src/products/loops), only while active.
import '../site-dark';
import './products.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { isTouch, onPage, onScroll, prefersReducedMotion } from '../engine';
import { Loop } from './loops/kit';
import { aegis, darkintel, mobile, shadowad, sysbastion } from './loops/scenes';

const SCENES = { shadowad, sysbastion, 'aegis-shield': aegis, 'mobile-pentest': mobile, darkintel360: darkintel } as const;
const ACCENTS: Record<string, string> = { shadowad: '#c9ed91', sysbastion: '#8cc0ff', 'aegis-shield': '#b8dcff', 'mobile-pentest': '#f5cfab', darkintel360: '#dbc4ff' };
const NAMES: Record<string, string> = { shadowad: 'ShadowAD', sysbastion: 'SysBastion', 'aegis-shield': 'AEGIS-SHIELD', 'mobile-pentest': 'Mobile pentest', darkintel360: 'DarkIntel360' };

function startReel() {
  onPage(() => {
    const screens = [...document.querySelectorAll<HTMLElement>('[data-screen]')];
    const reduced = prefersReducedMotion();
    screens.forEach((screen, i) => {
      const card = screen.querySelector<HTMLElement>('[data-screen-card]')!;
      const canvas = screen.querySelector<HTMLCanvasElement>('[data-loop]');
      const next = screens[i + 1];
      if (next && !reduced) {
        gsap.to(card, {
          scale: 0.9, opacity: 0.35, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
        });
      }
      if (canvas) {
        const id = canvas.dataset.loop as keyof typeof SCENES;
        const loop = new Loop(canvas, SCENES[id], NAMES[id], ACCENTS[id]);
        const fit = () => (reduced ? loop.still(1) : loop.resize());
        new ResizeObserver(() => { loop.resize(); if (reduced) loop.still(1); }).observe(canvas);
        document.fonts?.ready.then(fit);
        if (!reduced) {
          const tick = (_t: number, dt: number) => loop.advance(Math.min(dt, 50) / 1000);
          ScrollTrigger.create({
            trigger: screen, start: 'top 85%', end: 'bottom 15%',
            onToggle: (self) => (self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
          });
        }
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
