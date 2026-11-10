export const SCROLL_TUNING = {
  gestureGap: 150, threshold: 10, reversalThreshold: 16,
  minDuration: .38, maxDuration: .63,
} as const;

/** Device-independent intent. Momentum belongs to its original gesture. */
export class ScrollIntent {
  private last = -Infinity;
  private direction = 0;
  private distance = 0;
  private spent = false;
  private candidate = 0;
  get progress() { return this.spent ? 1 : Math.min(1, this.distance / this.requiredDistance(this.candidate)); }
  private requiredDistance(direction: number) {
    return this.direction !== 0 && direction !== this.direction ? SCROLL_TUNING.reversalThreshold : SCROLL_TUNING.threshold;
  }
  reset() { this.last = -Infinity; this.direction = 0; this.distance = 0; this.spent = false; this.candidate = 0; }
  feed(delta: number, now: number): { direction: number; continuation: boolean } | null {
    if (!Number.isFinite(delta) || Math.abs(delta) < .5) return null;
    const direction = Math.sign(delta);
    const fresh = now - this.last > SCROLL_TUNING.gestureGap;
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
  const screens = Math.abs(distance) / Math.max(1, viewport);
  const duration = .31 + screens * .08;
  return Math.min(SCROLL_TUNING.maxDuration, Math.max(SCROLL_TUNING.minDuration, duration));
}
