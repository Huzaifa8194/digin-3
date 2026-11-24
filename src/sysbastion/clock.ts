// The one clock. Lenis, the scroll driver and every scene tick from gsap.ticker; nothing on this
// page owns a requestAnimationFrame loop of its own. Each scene decides per frame whether it has
// anything to draw, and sleeps when it doesn't.
//
// Every frame has two phases. Reads (getBoundingClientRect, offsetWidth...) all run first, while
// the layout from the last frame is still clean, so they cost nothing. Ticks run after and only
// write. A read after a write forces the browser to redo style and layout on the spot; doing that
// once per module per frame was most of the scroll cost on slower machines.
import { gsap } from 'gsap';
import { lowerQuality } from './device';

export type Tick = (t: number, dt: number) => void;
const reads = new Set<() => void>();
const ticks = new Set<Tick>();
let last = 0;

gsap.ticker.lagSmoothing(0);
// frame-time watch: two seconds averaging under ~38 fps steps the quality tier down (never up)
let slowAcc = 0, slowN = 0, warmUntil = performance.now() + 5000;
gsap.ticker.add((time) => {
  const raw = last ? time - last : 0.016;
  const dt = Math.min(0.05, raw);
  last = time;
  if (raw < 0.25 && !document.hidden && performance.now() > warmUntil) {
    slowAcc += raw; slowN++;
    if (slowAcc > 2) {
      if (slowAcc / slowN > 0.026 && lowerQuality()) warmUntil = performance.now() + 3000;
      slowAcc = 0; slowN = 0;
    }
  }
  for (const fn of reads) fn();
  for (const fn of ticks) fn(time, dt);
});

export function addTick(fn: Tick): () => void {
  ticks.add(fn);
  return () => ticks.delete(fn);
}
/** Layout reads for this frame; runs before any tick writes. */
export function addRead(fn: () => void): () => void {
  reads.add(fn);
  return () => reads.delete(fn);
}
/** performance.now() in seconds, the time base scenes compare against. */
export const now = () => performance.now() / 1000;
