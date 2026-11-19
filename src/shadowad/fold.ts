// Less to read at once: copy written as "kicker, then paragraphs" folds into an accordion (one section
// open at a time), and a list of "bold rule. explanation" items folds each explanation behind its rule.
let uid = 0;
const chevron = '<i class="sb-fold__i" aria-hidden="true"></i>';

function makeFold(label: string, open: boolean) {
  const id = `sb-fold-${++uid}`;
  const fold = document.createElement('div');
  fold.className = 'sb-fold' + (open ? ' is-open' : '');
  fold.innerHTML = `<button type="button" class="sb-fold__h" aria-expanded="${open}" aria-controls="${id}"><span>${label}</span>${chevron}</button><div class="sb-fold__b" id="${id}"><div class="sb-fold__in"></div></div>`;
  if (!open) fold.querySelector('.sb-fold__b')!.setAttribute('inert', '');
  return { fold, inner: fold.querySelector<HTMLElement>('.sb-fold__in')! };
}

function setOpen(fold: HTMLElement, open: boolean) {
  fold.classList.toggle('is-open', open);
  fold.querySelector(':scope > .sb-fold__h')!.setAttribute('aria-expanded', String(open));
  fold.querySelector(':scope > .sb-fold__b')!.toggleAttribute('inert', !open);
}

/** Fold `root`'s kicker-led sections, all closed unless `openFirst`. Links (`.sb-links`) stay outside. */
export function foldSections(root: HTMLElement, openFirst = false) {
  let cur: HTMLElement | null = null, n = 0;
  for (const el of [...root.children] as HTMLElement[]) {
    if (el.classList.contains('sb-kicker')) {
      const label = (el.textContent || '').replace(/^\/+\s*/, '');
      const { fold, inner } = makeFold(label, openFirst && n++ === 0);
      fold.dataset.group = 'sections';
      el.replaceWith(fold);
      cur = inner;
    } else if (el.classList.contains('sb-links')) cur = null;
    else if (cur) cur.append(el);
  }
  // "Rule. Explanation." list items: the rule stays, the explanation drops down from it
  root.querySelectorAll<HTMLLIElement>('.sb-caps > li').forEach((li) => {
    const b = li.querySelector(':scope > b');
    if (!b) return;
    // keep the <b>: the panel's text-decode effect skips elements that hold one, so the row survives it
    const { fold, inner } = makeFold(b.outerHTML, false);
    const p = document.createElement('p');
    while (b.nextSibling) p.append(b.nextSibling);
    p.textContent = (p.textContent || '').trim();
    inner.append(p);
    li.replaceChildren(...fold.childNodes);
    li.classList.add('sb-fold');
  });
  if (root.dataset.folds) return;
  root.dataset.folds = '1';
  root.addEventListener('click', (e) => {
    const h = (e.target as HTMLElement).closest<HTMLElement>('.sb-fold__h');
    if (!h || h.closest('[data-folds]') !== root) return;   // a nested folded root handles its own
    const fold = h.parentElement!;
    const open = !fold.classList.contains('is-open');
    // sections are an accordion; list items open independently
    if (open && fold.dataset.group) root.querySelectorAll<HTMLElement>(`.sb-fold[data-group="${fold.dataset.group}"]`).forEach((f) => { if (f !== fold) setOpen(f, false); });
    setOpen(fold, open);
  });
}
