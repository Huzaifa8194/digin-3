// Page chrome: top bar steps aside on scroll down, nav marks the current region,
// phone menu overlay (focus trap, Escape), and the journal drawer on the bottom bar.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, onScroll, startScroll, stopScroll } from '../engine';

export function startChrome() {
  let last = 0;
  onScroll(({ y }) => {
    if (Math.abs(y - last) < 4) return;
    const menuOpen = !document.querySelector<HTMLElement>('[data-menu]')?.hidden;
    document.documentElement.classList.toggle('top-away', !menuOpen && y > 240 && y > last);
    last = y;
  });

  onPage(() => {
    // Current region in the nav
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.top__nav a[href^="#"]')];
    const regions: [string, string, string?][] = [['#film', '#film'], ['#controls', '#controls', '#readers'], ['#restore', '#restore']];
    regions.forEach(([href, start, end]) => {
      const link = links.find((a) => a.getAttribute('href') === href);
      const trigger = document.querySelector(start);
      if (!link || !trigger) return;
      ScrollTrigger.create({
        trigger, endTrigger: end ? document.querySelector(end)! : trigger,
        start: 'top 50%', end: 'bottom 50%',
        onToggle: (s) => (s.isActive ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current')),
      });
    });

    // Menu overlay
    const menu = document.querySelector<HTMLElement>('[data-menu]');
    const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
    if (menu && openBtn) {
      const focusables = () => [...menu.querySelectorAll<HTMLElement>('a, button')];
      const close = (restore = true) => {
        menu.hidden = true;
        openBtn.setAttribute('aria-expanded', 'false');
        startScroll();
        if (restore) openBtn.focus();
      };
      openBtn.addEventListener('click', () => {
        menu.hidden = false;
        openBtn.setAttribute('aria-expanded', 'true');
        stopScroll();
        focusables()[0]?.focus();
      });
      menu.querySelector('[data-menu-close]')?.addEventListener('click', () => close());
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => close(false)));
      menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
        if (e.key !== 'Tab') return;
        const f = focusables();
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
    }

    // Journal drawer
    const drawer = document.querySelector<HTMLElement>('[data-drawer]');
    const jBtn = document.querySelector<HTMLButtonElement>('[data-journal-open]');
    if (drawer && jBtn) {
      const set = (open: boolean) => { drawer.hidden = !open; jBtn.setAttribute('aria-expanded', String(open)); };
      jBtn.addEventListener('click', () => set(drawer.hidden));
      drawer.querySelector('[data-journal-close]')?.addEventListener('click', () => { set(false); jBtn.focus(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { set(false); jBtn.focus(); } });
      document.addEventListener('pointerdown', (e) => {
        if (!drawer.hidden && !(e.target as HTMLElement).closest('[data-bar]')) set(false);
      });
    }
  });
}
