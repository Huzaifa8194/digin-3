// The one clock. Lenis, the scroll driver and every scene tick from gsap.ticker; nothing on this
// page owns a requestAnimationFrame loop of its own. Each scene decides per frame whether it has
// anything to draw, and sleeps when it doesn't.
import { gsap } from 'gsap';

export type Tick = (t: number, dt: number) => void;
const ticks = new Set<Tick>();
let last = 0;

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time) => {
  const dt = Math.min(0.05, last ? time - last : 0.016);
  last = time;
  for (const fn of ticks) fn(time, dt);
});

export function addTick(fn: Tick): () => void {
  ticks.add(fn);
  return () => ticks.delete(fn);
}
/** performance.now() in seconds, the time base scenes compare against. */
export const now = () => performance.now() / 1000;
