// Outbound diagram, the idle state of section 04: packets keep leaving the endpoint.
// Not applied: they reach the internet. Applied: each one stops at the Defender Firewall wall.
// Runs on gsap.ticker only while the diagram is on screen; nothing moves under reduced motion.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, prefersReducedMotion } from '../../engine';

const NS = 'http://www.w3.org/2000/svg';
const WALL_X = 322;

export function startWire() {
  onPage(() => {
    const fig = document.querySelector<HTMLElement>('[data-wire]');
    const host = fig?.querySelector<SVGGElement>('[data-packets]');
    const section = fig?.closest<HTMLElement>('[data-group]');
    if (!fig || !host || !section || prefersReducedMotion()) return;

    // Pre-sample each path once: cheap lookups per frame.
    const paths = [...fig.querySelectorAll<SVGPathElement>('.wire__paths path')].map((p) => {
      const len = p.getTotalLength();
      const pts = Array.from({ length: 121 }, (_, i) => p.getPointAtLength((i / 120) * len));
      const stop = pts.findIndex((pt) => pt.x >= WALL_X) / 120;
      return { pts, stop };
    });
    const sample = (pts: DOMPoint[], t: number) => pts[Math.max(0, Math.min(120, Math.round(t * 120)))];

    const packets = Array.from({ length: 9 }, (_, i) => {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('r', '3.2');
      host.appendChild(el);
      return { el, path: i % paths.length, t: -(i * 0.13), speed: 0.0042 + (i % 3) * 0.0011, hold: 0 };
    });

    const tick = () => {
      const blocked = section.classList.contains('is-applied');
      const r = gsap.ticker.deltaRatio();
      packets.forEach((p) => {
        const path = paths[p.path];
        const end = blocked ? path.stop : 1;
        if (p.hold > 0) {
          p.hold -= r;
          p.el.style.opacity = String(Math.max(0, p.hold / 24));
          if (p.hold <= 0) { p.t = -Math.random() * 0.3; p.path = (p.path + 2) % paths.length; }
          return;
        }
        p.t += p.speed * r;
        if (p.t >= end) {
          p.t = end;
          p.hold = blocked ? 24 : 1;
          if (blocked) p.el.style.fill = '#ff4d5e';
        } else if (p.t >= 0) {
          p.el.style.fill = '';
        }
        const pt = sample(path.pts, Math.max(0, p.t));
        p.el.setAttribute('cx', pt.x.toFixed(1));
        p.el.setAttribute('cy', pt.y.toFixed(1));
        if (p.hold <= 0) p.el.style.opacity = p.t < 0 ? '0' : '1';
      });
    };

    ScrollTrigger.create({
      trigger: fig,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
    });
  });
}
