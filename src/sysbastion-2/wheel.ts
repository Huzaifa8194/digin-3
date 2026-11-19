// Chapter 07: a wheel of crests turns slowly, faster with scroll speed. Crests swell toward the
// cursor along their spoke, and the one nearest the top names its tool underneath.
import { addTick } from './clock';
import { isMobile, reduced } from './device';

const SPIN = 4, VEL_K = 0.05, VEL_MAX = 110, FALLOFF = 26, LABEL_FADE = 16;
const wrapDeg = (a: number) => (((a % 360) + 540) % 360) - 180;

export function mountWheel(section: HTMLElement, wheel: HTMLElement, label: HTMLElement, crests: HTMLElement[], names: string[]) {
  const n = crests.length, still = reduced(), mobile = isMobile();
  const push = new Array(n).fill(0);
  let rot = 15, lastY = scrollY, vel = 0, on = false;
  const ptr = { x: 0, y: 0, on: false };
  const move = (e: PointerEvent) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; };
  const leave = () => (ptr.on = false);
  addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; section.classList.toggle('in', on); }, { threshold: 0.12 });
  io.observe(section);
  const off = addTick((_, dt) => {
    if (!on) { lastY = scrollY; return; }
    const y = scrollY, v = dt > 0 ? (y - lastY) / dt : 0;
    lastY = y; vel += (v - vel) * Math.min(1, dt * 6);
    const boost = Math.max(-VEL_MAX, Math.min(VEL_MAX, vel * VEL_K));
    if (!still) rot += (SPIN + boost) * dt;
    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, half = wheel.offsetWidth / 2;
    const sr = section.getBoundingClientRect(), k = sr.width / section.offsetWidth || 1;
    const lh = (crests[0]?.offsetHeight ?? 0) / 2;
    wheel.style.transform = `rotate(${rot}deg)`;
    const dx = ptr.x - cx, dy = ptr.y - cy, dist = Math.hypot(dx, dy);
    const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const ra = half * (mobile ? 0.78 : 1), rb = half * (mobile ? 1.04 : 1);
    const radiusAt = (deg: number) => { const t = (deg * Math.PI) / 180; return (ra * rb) / Math.hypot(rb * Math.sin(t), ra * Math.cos(t)); };
    let top = 0, best = 1e9, topDeg = 0;
    for (let i = 0; i < n; i++) {
      const deg = wrapDeg((i * 360) / n + 15 + rot);
      if (Math.abs(deg) < best) { best = Math.abs(deg); top = i; topDeg = deg; }
      let want = 0;
      if (ptr.on && !mobile) {
        const d = wrapDeg(ang - deg), fall = Math.exp(-((d / FALLOFF) ** 2)), along = dist * Math.cos((d * Math.PI) / 180);
        want = Math.max(-0.09 * half, Math.min(0.13 * half, (along - half) * 1.8)) * fall;
      }
      push[i] += (want - push[i]) * Math.min(1, dt * 7);
      const off = radiusAt(deg) - half + push[i];
      crests[i].style.transform = `translate(-50%, calc(-50% + ${(-off).toFixed(1)}px))`;
    }
    const calm = Math.max(0, 1 - Math.abs(SPIN + boost) / 80);
    const vis = Math.max(0, Math.min(1, 1 - (best - 6) / LABEL_FADE)) * calm;
    const t = (topDeg * Math.PI) / 180, L = radiusAt(topDeg) + push[top];
    label.style.left = `${((cx + Math.sin(t) * L - sr.left) / k).toFixed(1)}px`;
    label.style.top = `${((cy - Math.cos(t) * L - sr.top) / k + lh + 14).toFixed(1)}px`;
    // ten crests, sixteen tools: the slot passing the top counts on, so every name comes round
    const slot = Math.round((-rot - 15) / (360 / n));
    const name = names[((slot % names.length) + names.length) % names.length];
    if (label.textContent !== name) label.textContent = name;
    label.style.opacity = vis.toFixed(2);
  });
  return () => { off(); io.disconnect(); removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
}
