// /design3/specs: the spec sheet, with the device turning in the hero.
import './design3.css';
import { gsap } from 'gsap';
import { boot, prefersReducedMotion } from '../engine';

boot(() => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  if (!canvas) return;
  const reduced = prefersReducedMotion();
  requestAnimationFrame(async () => {
    const { createStage, baseScene, makeDevice } = await import('./three');
    const stage = createStage(canvas);
    const { scene, camera } = baseScene(30, 8);
    const d = makeDevice(); scene.add(d.group); d.group.rotation.x = 0.25;
    stage.add({ el: document.querySelector<HTMLElement>('[data-view="hero"]')!, scene, camera, update: (t) => {
      const e = (Math.sin(t * 0.6) + 1) / 2;
      d.explode(e * 0.6);
      d.group.rotation.y = t * 0.3;
    } });
    let t = 0;
    gsap.ticker.add((_x, dms) => { if (!reduced) t += Math.min(0.05, dms / 1000); stage.render(t, 0); });
  });
});
