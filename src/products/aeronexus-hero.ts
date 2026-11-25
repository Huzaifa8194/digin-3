// AeroNexus (/aeronexus/, src/aeronexus/main.ts + stage.ts): after its loader, the staging desk
// comes into focus (blur and a 1.12 zoom settle over 2.2 s, power3.out), the giant wordmark grows
// in from 94 % and the tagline, copy, glass card and film thumb fade up. Idle: the phone and the
// desk drift toward the pointer, like the hero camera does.
import { gsap } from 'gsap';
import type { Hero } from './heroes';
import { drawScreen } from '../aeronexus/screen';

export function aeroNexus(root: HTMLElement): Hero {
  const desk = root.querySelector<HTMLElement>('[data-anx-desk]')!;
  const phone = root.querySelector<HTMLElement>('[data-anx-phone]')!;
  const word = root.querySelector<HTMLElement>('[data-anx-word]')!;
  const ui = [...root.querySelectorAll<HTMLElement>('[data-anx-ui]')];
  const screen = root.querySelector<HTMLCanvasElement>('[data-anx-screen]')!;
  const paint = () => drawScreen(screen.getContext('2d')!, 'home', 0, 9.68);
  paint();
  document.fonts.load('600 24px "Hanken Grotesk"').then(paint, () => {});
  const st = { intro: 1 };
  let px = 0, py = 0, tx = 0, ty = 0, t = 0;
  const place = () => {
    const z = 1 - st.intro;
    desk.style.transform = `translate(${px * -6}px, ${py * -4}px) scale(${1 + z * 0.12})`;
    desk.style.filter = z > 0.01 ? `blur(${(z * 8).toFixed(2)}px)` : '';
    phone.style.translate = `${px * 5}px ${py * 4 + Math.sin(t * 0.8) * 1.5}px`;
  };
  place();
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  const tick = (_t: number, dt: number) => {
    const s = Math.min(dt, 50) / 1000;
    t += s; px += (tx - px) * Math.min(1, s * 3); py += (ty - py) * Math.min(1, s * 3);
    place();
  };
  let tl: gsap.core.Timeline | null = null;
  return {
    play() {
      tl?.kill();
      gsap.ticker.add(tick);
      tl = gsap.timeline();
      tl.fromTo(st, { intro: 0 }, { intro: 1, duration: 2.2, ease: 'power3.out', onUpdate: place }, 0)
        .fromTo(word, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, 0.35)
        .fromTo(ui, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.08 }, 0.6);
    },
    stop() {
      tl?.kill(); tl = null;
      gsap.ticker.remove(tick);
      tx = ty = 0;
      gsap.to(st, { intro: 1, duration: 0.4, onUpdate: place });
      gsap.to(word, { opacity: 1, scale: 1, duration: 0.3 });
      gsap.to(ui, { opacity: 1, y: 0, duration: 0.3 });
      gsap.to({ v: 0 }, { v: 1, duration: 0.5, onUpdate() { px *= 0.85; py *= 0.85; place(); } });
    },
  };
}
