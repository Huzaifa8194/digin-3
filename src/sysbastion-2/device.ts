// Device and viewport helpers shared by every scene.

export const coarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
/** A phone or small tablet: touch pointer and a short screen side under 820px. */
export const isMobile = () => /[?&]forceMobile=1/.test(location.search) || (coarse() && Math.min(screen.width, screen.height) < 820);
export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let soft: boolean | null = null;
/** True when WebGL is missing or runs on a software rasteriser. */
export function softwareGL(): boolean {
  if (soft !== null) return soft;
  soft = false;
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!gl) return (soft = true);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    soft = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(r);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { soft = false; }
  return soft;
}
/** Device pixel ratio, capped (desktop cap, mobile cap). */
export const dpr = (d: number, m: number) => (softwareGL() ? 0.5 : Math.min(isMobile() ? m : d, devicePixelRatio || 1));
export const richGL = () => !isMobile() && !softwareGL();

let probe: HTMLDivElement | null = null;
let lvhCache = 0;
let dirty = true;
/** Large viewport height (100lvh) in px, stable while mobile toolbars move. */
export function lvh(): number {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${CSS.supports('height', '100lvh') ? '100lvh' : '100vh'}`;
    probe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(probe);
    addEventListener('resize', () => (dirty = true));
  }
  if (dirty || !lvhCache) { lvhCache = probe.offsetHeight || innerHeight; dirty = false; }
  return lvhCache;
}

/** Debounced resize that fires only when the viewport really changed. */
export function onViewport(fn: () => void): () => void {
  let w = innerWidth, h = lvh(), t = 0;
  const h2 = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      const nh = lvh();
      if (innerWidth !== w || nh !== h) { w = innerWidth; h = nh; fn(); }
    }, 150);
  };
  addEventListener('resize', h2);
  addEventListener('orientationchange', h2);
  return () => { removeEventListener('resize', h2); removeEventListener('orientationchange', h2); };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => { const r = clamp01((v - a) / (b - a)); return r * r * (3 - 2 * r); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
