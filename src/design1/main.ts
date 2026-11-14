// /design1: the cipher. One pinned stage; scroll progress picks the word, the drums lock into it,
// the matching panel swaps in. Three.js is lazy-loaded after the hero text has painted.
import '../site-dark';
import './design1.css';
import '../inquiry';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { onPage, prefersReducedMotion, scrollToTarget } from '../engine';

const STATES = 7;
const WORDS_FALLBACK = ['SEE RISK', 'TEST', 'PROTECT', 'WATCH', 'PRODUCTS', 'TRAIN', 'TALK'];

function startStage() {
  onPage(() => {
    const pin = document.querySelector<HTMLElement>('[data-pin]');
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    const canvas = document.querySelector<HTMLCanvasElement>('[data-cipher]');
    if (!pin || !stage || !canvas) return;
    const panels = [...stage.querySelectorAll<HTMLElement>('[data-panel]')];
    const index = [...stage.querySelectorAll<HTMLAnchorElement>('.d1-index a')];
    const word = stage.querySelector<HTMLElement>('[data-word]');
    const bar = stage.querySelector<HTMLElement>('[data-progress]');
    const reduced = prefersReducedMotion();
    let state = -1;
    let cipher: { setWord: (i: number, instant?: boolean) => void; scramble: () => void } | null = null;

    const show = (i: number) => {
      if (i === state) return;
      const prev = state;
      state = i;
      stage.dataset.state = String(i);
      panels.forEach((p, k) => {
        p.classList.toggle('is-in', k === i);
        p.classList.toggle('is-out', k === prev);
        p.setAttribute('aria-hidden', String(k !== i));
        if (k === prev) setTimeout(() => p.classList.remove('is-out'), 400);
      });
      index.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      if (word) word.textContent = WORDS_FALLBACK[i];
      if (prev >= 0) cipher?.setWord(i);
    };

    const yFor = (i: number) => pin.offsetTop + ((i + 0.5) / STATES) * (pin.offsetHeight - innerHeight);
    ScrollTrigger.create({
      trigger: pin, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        show(Math.min(STATES - 1, Math.floor(self.progress * STATES * 0.9999)));
        if (bar) bar.style.scale = `${self.progress} 1`;
      },
    });
    show(0);
    document.querySelectorAll<HTMLElement>('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget(yFor(+a.dataset.goto!));
    }));

    // Lazy 3D: after the hero text has painted and the browser is idle.
    const start = async () => {
      try {
        const { createCipher } = await import('./cipher');
        cipher = createCipher(canvas, {
          reduced,
          layout: () => {
            const vw = innerWidth, vh = innerHeight;
            const hdr = parseFloat(getComputedStyle(document.body).getPropertyValue('--hdr')) || 80;
            const mobile = vw < 760;
            return { cx: vw / 2, cy: hdr + (vh - hdr) * (mobile ? 0.25 : 0.31), width: mobile ? vw * 0.92 : Math.min(vw * 0.7, vh * 1.02) };
          },
        });
        document.documentElement.classList.add('cipher-on');
        if (reduced) cipher.setWord(Math.max(0, state), true);
        else if (state <= 0) cipher.scramble();
        else cipher.setWord(state);
      } catch {
        document.documentElement.classList.remove('cipher-on');
      }
    };
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 600 }) : setTimeout(cb, 200));
    requestAnimationFrame(() => idle(start));
  });
}

bootDark(() => {
  startStage();
});
