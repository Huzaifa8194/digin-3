export const SCROLL_TUNING = {
  gestureGap: 420, threshold: 18, reversalThreshold: 30,
  minDuration: .85, maxDuration: 1.4,
  upward: { gestureGap: 150, threshold: 10, reversalThreshold: 16, minDuration: .38, maxDuration: .63 },
} as const;

const tuningFor = (direction: number) => direction < 0 ? SCROLL_TUNING.upward : SCROLL_TUNING;

/** Device-independent intent. Momentum belongs to its original gesture. */
export class ScrollIntent {
  private last = -Infinity;
  private direction = 0;
  private distance = 0;
  private spent = false;
  private candidate = 0;
  get progress() { return this.spent ? 1 : Math.min(1, this.distance / this.requiredDistance(this.candidate)); }
  private requiredDistance(direction: number) {
    const tuning = tuningFor(direction);
    return this.direction !== 0 && direction !== this.direction ? tuning.reversalThreshold : tuning.threshold;
  }
  reset() { this.last = -Infinity; this.direction = 0; this.distance = 0; this.spent = false; this.candidate = 0; }
  feed(delta: number, now: number): { direction: number; continuation: boolean } | null {
    if (!Number.isFinite(delta) || Math.abs(delta) < .5) return null;
    const direction = Math.sign(delta);
    const fresh = now - this.last > tuningFor(this.direction || direction).gestureGap;
    if (fresh) {
      this.direction = 0; this.distance = 0; this.spent = false; this.candidate = 0;
    }
    this.last = now;
    if(this.candidate !== direction) { this.candidate = direction; this.distance = 0; }
    this.distance += Math.min(Math.abs(delta), 180);
    const reverse = this.direction !== 0 && direction !== this.direction;
    if ((reverse || !this.spent) && this.distance >= this.requiredDistance(direction)) {
      this.direction = direction; this.spent = true; this.distance = 0;
      return { direction, continuation: false };
    }
    return null;
  }
}

export function normalizeWheel(delta: number, mode: number, height: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? height : 1);
}
export function transitionDuration(distance: number, viewport: number) {
  const tuning = tuningFor(distance);
  const screens = Math.abs(distance) / Math.max(1, viewport);
  const duration = distance < 0 ? .31 + screens * .08 : .7 + screens * .18;
  return Math.min(tuning.maxDuration, Math.max(tuning.minDuration, duration));
}
