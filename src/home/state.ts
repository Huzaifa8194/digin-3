// Shared, per-frame state the radar writes and the 3D core reads (one source of truth for the bearing).
export const home = {
  /** Smoothed bearing from scroll only (0 → 360), without the hero's idle sweep. */
  scrollDeg: 0,
  /** Radar layout in CSS px: centre and radius. */
  cx: 0, cy: 0, r: 0,
  /** Loader finished and the radar is live. */
  ready: false,
  /** Footer covers the screen: 3D can pause. */
  footer: false,
};
