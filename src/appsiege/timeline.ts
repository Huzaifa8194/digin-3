// The scroll track, in viewport heights (u). Segment sizes follow the reference track
// (420 | 105 | 1050 | 210 | 126 | 420 vh); the card run is sized for 8 cards at the reference pace.

export const SEG = { hero: 4.2, intro: 1.05, work: 6.0, lab: 2.1, panel: 1.26, outro: 4.2 };
export const TOTAL = SEG.hero + SEG.intro + SEG.work + SEG.lab + SEG.panel + SEG.outro; // 18.81
export const MAXU = TOTAL - 1;

export const CARD0 = 5.35;      // u where card 0 sits centred
export const CARD_STEP = 0.7;   // u between cards
export const CARD_COUNT = 8;

export const T = {
  heroReveal: [1.55, 3.0],
  wipe1: [3.28, 4.1],
  head: [3.3, 5.2],
  ring: [3.45, 5.0],
  chat: [4.8, 10.6],
  wipe2: [10.5, 11.17],
  wipeL: [12.55, 13.15],
  wipe3: [13.9, 14.44],
  outro: 14.44,
} as const;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const rng = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const ease = (x: number) => 1 - Math.pow(1 - x, 3);
export const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Card float index for a scroll position (0 = card 0 centred). */
export const cardIndex = (u: number) => (u - CARD0) / CARD_STEP;
/** u that centres card k. */
export const cardU = (k: number) => CARD0 + k * CARD_STEP;
