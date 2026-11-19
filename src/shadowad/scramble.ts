// Text decodes in from random glyphs, left to right with a scrambled leading edge (the
// reference's MSDF text effect, done on real DOM text). Driven by the shared gsap ticker.
import { gsap } from 'gsap';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=-_/<>[]{}?!^';
type Job = { el: HTMLElement; text: string; start: number; dur: number; order: Float32Array };
const jobs = new Map<HTMLElement, Job>();
const tmp = document.createElement('div');

export function prepScramble(els: HTMLElement[]) {
  for (const el of els) {
    if (el.dataset.text != null) continue;
    tmp.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    const text = (tmp.textContent || '').replace(/[ \t]*\n[ \t]*/g, '\n').trim();
    el.dataset.text = text;
    el.textContent = text;
  }
}

export function scramble(el: HTMLElement, o: { delay?: number; duration?: number } = {}) {
  if (el.dataset.text == null) prepScramble([el]);
  const text = el.dataset.text!;
  const L = text.length;
  const order = new Float32Array(L);
  for (let i = 0; i < L; i++) order[i] = (i / Math.max(1, L)) * 0.72 + Math.random() * 0.28;
  const dur = (o.duration ?? 0.6) * (0.75 + Math.min(1.6, L / 60));
  jobs.set(el, { el, text, start: gsap.ticker.time + (o.delay ?? 0), dur, order });
  render(jobs.get(el)!, -1);
}

function render(j: Job, k: number) {
  let s = '';
  for (let i = 0; i < j.text.length; i++) {
    const c = j.text[i];
    if (c === ' ' || c === '\n' || c === ' ') { s += c; continue; }
    const r = j.order[i];
    if (k >= r) s += c;
    else if (k >= r - 0.3) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    else s += ' ';
  }
  j.el.textContent = s;
}

let lastFrame = 0;
export function tickScrambles(time: number) {
  if (!jobs.size) return;
  // glyphs flicker at ~30 fps, which reads as text, not noise
  if (time - lastFrame < 1 / 32) return;
  lastFrame = time;
  for (const j of jobs.values()) {
    const k = (time - j.start) / j.dur;
    if (k >= 1) { j.el.textContent = j.text; jobs.delete(j.el); continue; }
    render(j, k);
  }
}
