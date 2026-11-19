// The finale's scope declaration: estate + size. It updates the readout and the demo request in
// plain DOM (so it works on the static page too) and tells anyone listening, e.g. the particle estate.
const ENV = ['On-prem AD', 'Cloud tenant', 'Hybrid'];
const ENV_SHORT = ['on-prem AD', 'cloud tenant', 'hybrid'];
const SIZE_SHORT = ['≤250 hosts', '≤2,500 hosts', '2,500+ hosts'];

export type ScopeListener = (env: number, size: number, fromUser: boolean) => void;

export function initScope() {
  const envBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-env]')];
  const sizeBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-size]')];
  const read = document.querySelector<HTMLElement>('[data-scope-read]');
  const draft = document.querySelector<HTMLElement>('[data-scope-draft]');
  const cta = document.querySelector<HTMLAnchorElement>('[data-scope-cta]');
  const listeners: ScopeListener[] = [];
  // the explanation of the pedestal stays folded until asked for
  const more = document.querySelector<HTMLButtonElement>('[data-more]');
  more?.addEventListener('click', () => {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    document.getElementById(more.getAttribute('aria-controls')!)!.hidden = !open;
  });
  let env = 2, size = 1;

  function apply(fromUser: boolean) {
    envBtns.forEach((b, k) => { b.setAttribute('aria-checked', String(k === env)); b.tabIndex = k === env ? 0 : -1; });
    sizeBtns.forEach((b, k) => { b.setAttribute('aria-checked', String(k === size)); b.tabIndex = k === size ? 0 : -1; });
    const sizeText = sizeBtns[size]?.dataset.text ?? '';
    const text = `${ENV[env]} estate, ${sizeText}. ${envBtns[env]?.dataset.text ?? ''}`;
    if (read) { read.textContent = text; read.dataset.text = text; }
    if (draft) draft.textContent = `${ENV_SHORT[env]} · ${SIZE_SHORT[size]} · review mode`;
    if (cta) {
      const subject = `shadowAD demo: ${ENV_SHORT[env]} estate, ${sizeText}`;
      const body = [
        'Hello DigiInn360,', '',
        'We would like a shadowAD demo for this scope:',
        `Estate: ${ENV[env]}`, `Size: ${sizeText}`, 'Mode: review (risky steps wait for approval)', '',
        'Company:', 'Role:', 'Best time to talk:',
      ].join('\n');
      cta.href = `mailto:info@digiinn360.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    listeners.forEach((l) => l(env, size, fromUser));
  }
  const set = (e: number, s: number, fromUser = true) => {
    e = (e + 3) % 3; s = (s + 3) % 3;
    if (e === env && s === size) return;
    env = e; size = s; apply(fromUser);
  };
  // radio groups: click, or arrow keys to move within the group
  const wire = (btns: HTMLButtonElement[], pick: (k: number) => void, cur: () => number) => {
    btns.forEach((b, k) => {
      b.addEventListener('click', () => pick(k));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        const n = (cur() + d + btns.length) % btns.length;
        pick(n); btns[n].focus();
      });
    });
  };
  wire(envBtns, (k) => set(k, size), () => env);
  wire(sizeBtns, (k) => set(env, k), () => size);
  apply(false);

  return {
    get env() { return env; }, get size() { return size; },
    set,
    listen(l: ScopeListener) { listeners.push(l); l(env, size, false); },
  };
}
