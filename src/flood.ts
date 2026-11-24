// Rows that flood red from the pointer's entry point (same treatment as About's "what we do").
import { gsap } from 'gsap';
import { ease, isTouch, onPage, prefersReducedMotion } from './engine';

export function startFloods() {
  onPage(() => {
    if (isTouch() || prefersReducedMotion()) return;
    document.querySelectorAll<HTMLElement>('[data-flood]').forEach((row) => {
      const fill = row.querySelector<HTMLElement>('.dk-flood');
      if (!fill) return;
      const at = (e: PointerEvent) => { const r = row.getBoundingClientRect(); return `${e.clientX - r.left}px ${e.clientY - r.top}px`; };
      const open = (p: string) => { row.classList.add('is-filled'); gsap.fromTo(fill, { clipPath: `circle(0% at ${p})` }, { clipPath: `circle(150% at ${p})`, duration: 0.7, ease: ease.soft, overwrite: true }); };
      const close = (p: string) => { row.classList.remove('is-filled'); gsap.to(fill, { clipPath: `circle(0% at ${p})`, duration: 0.55, ease: ease.soft, overwrite: true }); };
      row.addEventListener('pointerenter', (e) => open(at(e)));
      row.addEventListener('pointerleave', (e) => close(at(e)));
      row.addEventListener('focus', () => row.matches(':focus-visible') && open('0% 50%'));
      row.addEventListener('blur', () => close('0% 50%'));
    });
  });
}

/** Copy buttons: data-copy="text". Falls back to selecting the text if the clipboard is refused. */
export function startCopyButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy!); btn.textContent = 'Copied'; }
      catch { btn.textContent = btn.dataset.copy!; }
      setTimeout(() => { btn.textContent = label; }, 1800);
    });
  });
}
