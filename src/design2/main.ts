// /design2: scroll drives one value, the act (0 → 4). The 3D story morphs to it, the overlay shows
// the act's line, the counter and rail follow. Three.js loads lazily after first paint.
import './design2.css';
import { boot, onScroll, prefersReducedMotion } from '../engine';

const NAMES = ['The storm', 'The way in', 'Every angle', 'The shield', 'Digiinn360'];

boot(() => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-story]');
  const acts = [...document.querySelectorAll<HTMLElement>('[data-act]')];
  const count = document.querySelector<HTMLElement>('[data-count]');
  const name = document.querySelector<HTMLElement>('[data-count-name]');
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  const hint = document.querySelector<HTMLElement>('[data-hint]');
  const reduced = prefersReducedMotion();
  let story: { setAct: (a: number) => void } | null = null;
  let shown = -1;

  const apply = (progress: number) => {
    const act = Math.max(0, Math.min(4, progress * 4.3 - 0.1));
    story?.setAct(reduced ? 4 : act);
    const i = Math.min(4, Math.round(act));
    if (i !== shown) {
      shown = i;
      acts.forEach((a, k) => a.classList.toggle('is-on', k === i));
      if (count) count.textContent = `0${i + 1}`;
      if (name) name.textContent = NAMES[i];
    }
    if (rail) rail.style.scale = `1 ${Math.min(1, progress * 1.08)}`;
    hint?.classList.toggle('is-gone', progress > 0.02);
  };
  onScroll(({ progress }) => apply(progress));
  apply(0);

  if (!canvas) return;
  requestAnimationFrame(async () => {
    try {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); // wordmark is drawn in Manrope
      const { createStory } = await import('./story');
      story = createStory(canvas, { reduced });
      story.setAct(reduced ? 4 : 0);
    } catch {
      canvas.remove();
    }
  });
});
