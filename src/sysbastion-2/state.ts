// Shared scroll state, written by the driver in main.ts once per scroll event and read by scenes.
export const S = {
  /** scroll position in viewport heights (100lvh) */
  p: 0,
  /** 0..1, the ink retreating into the forge after Chapter 04 */
  collapse: 0,
  /** 0..1, the loader's spiral reveal; 1 when there is no loader */
  reveal: 1,
  /** phones stop the spiral before the flip (the window chapter is static there) */
  spMax: Infinity,
  /** where the last spiral tile docks: the slot's screen rect inside the app window, or null */
  dock: null as null | (() => DOMRect | null),
  /** true while the loader holds the page */
  loading: false,
  /** pointer in px, or -1 before it moves */
  mx: -1,
  my: -1,
};

addEventListener('pointermove', (e) => { S.mx = e.clientX; S.my = e.clientY; }, { passive: true });
