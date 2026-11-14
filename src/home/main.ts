// Homepage: radar (signature), product loops inside the chapters, sweep reveals, inquiry form.
import '../site-dark';
import './home.css';
import '../inquiry';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { isTouch, onPage, prefersReducedMotion } from '../engine';
import { startRadar } from './radar';
import { startCore } from './core3d';
import { Loop } from '../products/loops/kit';
import { aegis, darkintel, mobile, shadowad, sysbastion } from '../products/loops/scenes';

const SCENES = { shadowad, sysbastion, 'aegis-shield': aegis, 'mobile-pentest': mobile, darkintel360: darkintel } as const;
const ACCENTS: Record<string, string> = { shadowad: '#c9ed91', sysbastion: '#8cc0ff', 'aegis-shield': '#b8dcff', 'mobile-pentest': '#f5cfab', darkintel360: '#dbc4ff' };
const NAMES: Record<string, string> = { shadowad: 'ShadowAD', sysbastion: 'SysBastion', 'aegis-shield': 'AEGIS-SHIELD', 'mobile-pentest': 'Mobile pentest', darkintel360: 'DarkIntel360' };

// Product cards: each runs its coded loop while on screen; pointing at a card fast-forwards it.
function startCards() {
  onPage(() => {
    const reduced = prefersReducedMotion();
    document.querySelectorAll<HTMLElement>('[data-card]').forEach((card, i) => {
      const canvas = card.querySelector<HTMLCanvasElement>('[data-loop]');
      if (!canvas) return;
      const id = canvas.dataset.loop as keyof typeof SCENES;
      const loop = new Loop(canvas, SCENES[id], NAMES[id], ACCENTS[id]);
      loop.t = i * 1.3; // cards side by side never cut in sync
      new ResizeObserver(() => (reduced ? loop.still(1) : loop.resize())).observe(canvas);
      document.fonts?.ready.then(() => (reduced ? loop.still(1) : loop.resize()));
      if (reduced) return;
      let speed = 1;
      if (!isTouch()) {
        card.addEventListener('pointerenter', () => gsap.to({ v: speed }, { v: 2.2, duration: 0.4, onUpdate() { speed = this.targets()[0].v; } }));
        card.addEventListener('pointerleave', () => gsap.to({ v: speed }, { v: 1, duration: 0.5, onUpdate() { speed = this.targets()[0].v; } }));
      }
      const tick = (_t: number, dt: number) => loop.advance((Math.min(dt, 50) / 1000) * speed);
      ScrollTrigger.create({ trigger: card, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)) });
    });
  });
}

// Sweep reveals: product cards open along an angle as they arrive, like the beam passing.
function startSweeps() {
  onPage(() => {
    document.querySelectorAll<HTMLElement>('[data-sweep]').forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => el.classList.add('is-in') });
    });
  });
}

bootDark(() => {
  startRadar();
  startCore();
  startCards();
  startSweeps();
});
