// About: the mosaic lights one teammate at a time (idle state, on the gsap clock); the team index
// floats the hovered person's portrait beside the pointer; "what we do" rows flood red.
import '../site-dark';
import './about.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { ease, isTouch, onPage, onScroll, prefersReducedMotion } from '../engine';

function startMosaic() {
  onPage(() => {
    const mosaic = document.querySelector<HTMLElement>('[data-mosaic]');
    const tiles = [...document.querySelectorAll<HTMLElement>('[data-tile]')];
    if (!mosaic || !tiles.length) return;
    let lit = 0;
    const light = (i: number) => { lit = i; tiles.forEach((t, k) => t.classList.toggle('is-lit', k === i)); };
    light(0);
    if (prefersReducedMotion()) return;
    // Pointing at a tile lights it; otherwise the light moves on every 2.4 s while the hero is on screen.
    let hold = false;
    tiles.forEach((t, k) => {
      t.addEventListener('pointerenter', () => { hold = true; light(k); });
      t.addEventListener('pointerleave', () => { hold = false; });
    });
    mosaic.style.pointerEvents = 'auto';
    const step = gsap.delayedCall(2.4, function tick() { if (!hold) light((lit + 1) % tiles.length); step.restart(true); }).pause();
    ScrollTrigger.create({ trigger: mosaic, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? step.restart(true) : step.pause()) });
  });
}

function startPortraitIndex() {
  onPage(() => {
    const list = document.querySelector<HTMLElement>('[data-team]');
    const box = document.querySelector<HTMLElement>('[data-portrait]');
    const img = box?.querySelector('img');
    if (!list || !box || !img || isTouch() || prefersReducedMotion()) return;
    const x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3.out' });
    const rot = gsap.quickTo(box, 'rotate', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0, px = 0, py = 0;
    list.querySelectorAll<HTMLElement>('li[data-person]').forEach((li) => li.addEventListener('pointerenter', () => {
      img.src = li.dataset.person!;
      img.style.objectPosition = li.dataset.pos || '50% 30%';
      gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    }));
    const hide = () => gsap.to(box, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'expo.out' });
    list.addEventListener('pointerleave', hide);
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; x(px + 170); y(py); rot(gsap.utils.clamp(-10, 10, (px - lastX) * 0.5)); lastX = px; }, { passive: true });
    onScroll(() => { if (!list.contains(document.elementFromPoint(px, py))) hide(); });
  });
}

function startFloods() {
  onPage(() => {
    if (isTouch() || prefersReducedMotion()) return;
    document.querySelectorAll<HTMLElement>('[data-flood]').forEach((row) => {
      const fill = row.querySelector<HTMLElement>('.ab-do__flood')!;
      const at = (e: PointerEvent) => { const r = row.getBoundingClientRect(); return `${e.clientX - r.left}px ${e.clientY - r.top}px`; };
      const open = (p: string) => { row.classList.add('is-filled'); gsap.fromTo(fill, { clipPath: `circle(0% at ${p})` }, { clipPath: `circle(150% at ${p})`, duration: 0.7, ease: ease.soft, overwrite: true }); };
      const close = (p: string) => { row.classList.remove('is-filled'); gsap.to(fill, { clipPath: `circle(0% at ${p})`, duration: 0.55, ease: ease.soft, overwrite: true }); };
      row.addEventListener('pointerenter', (e) => open(at(e)));
      row.addEventListener('pointerleave', (e) => close(at(e)));
      row.addEventListener('focus', () => row.matches(':focus-visible') && open('0% 50%'));
      row.addEventListener('blur', () => close('0% 50%'));
    });
  });
}

bootDark(() => {
  startMosaic();
  startPortraitIndex();
  startFloods();
});
