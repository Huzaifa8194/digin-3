// Shared boot for the dark site pages: site chrome, engine, compact header, button fills.
import './standalone-page';
import './site-dark.css';
import { boot, onScroll } from './engine';
import { startButtons } from './engine/fill';

export function bootDark(setup?: () => void) {
  boot(() => {
    const sync = (y: number) => document.body.classList.toggle('dk-compact', y > 72);
    onScroll(({ y }) => sync(y));
    sync(scrollY);
    startButtons();
    setup?.();
  });
}
