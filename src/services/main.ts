import '../standalone-page'; // shared header (mega menu), footer and site styles
import './services.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, onPage, onScroll, prefersReducedMotion } from '../engine';
import { startButtons } from '../engine/fill';
import { drawServiceArtwork } from '../service-artwork';
import { startSpectrum } from './spectrum';
import { startIndexPreview } from './index-preview';

// Header compacts once you leave the top.
function startHeader() {
  const sync = (y: number) => document.body.classList.toggle('svc-compact', y > 72);
  onScroll(({ y }) => sync(y));
  sync(scrollY);
}

// The animated explainer diagrams from the previous page, now on the shared clock.
function startExplainers() {
  onPage(() => {
    const reduced = prefersReducedMotion();
    document.querySelectorAll<HTMLCanvasElement>('.svc-ch__fig canvas').forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const diagram = Number(canvas.dataset.serviceArt);
      const fit = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        drawServiceArtwork(ctx, diagram, 0);
      };
      new ResizeObserver(fit).observe(canvas);
      if (reduced) return;
      let last = 0;
      const tick = (t: number) => {
        const ms = t * 1000;
        if (ms - last < 32) return;
        last = ms;
        drawServiceArtwork(ctx, diagram, ms);
      };
      ScrollTrigger.create({
        trigger: canvas, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => (self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
      });
    });
  });
}

boot(() => {
  startHeader();
  startSpectrum();
  startExplainers();
  startIndexPreview();
  startButtons();
});
