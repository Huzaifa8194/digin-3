// The SysBastion V1.4 window, rebuilt as HTML from the app's own screens. Used live on the page
// (Chapters 02 and 04 happen inside it) and, through the ui-lab page, to capture the panels the
// hero spiral is made of, so the WebGL tiles and the live window are the same pixels.
import { audit, cards, journal, nav, toolsList, type PageId, type Row } from './ui-data';

const P: Record<string, string> = {
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  code: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5"/>',
  terminal: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m7.5 10 2.5 2-2.5 2M12.5 15h4"/>',
  file: '<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z"/><path d="M14 3.5V8h4.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.2 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.2-3.4-8.5s1-6.1 3.4-8.5Z"/>',
  doc: '<rect x="5.5" y="3.5" width="13" height="17" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5l-8.5 8.5a2.1 2.1 0 0 1-3-3l8.5-8.5a4 4 0 0 0-2-2Z"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4.2l2.8 1.8"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',
  shield: '<path d="M12 3.5 5 6v5.2c0 4.4 2.9 8 7 9.3 4.1-1.3 7-4.9 7-9.3V6l-7-2.5Z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>',
};
export const icon = (k: string, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k] ?? ''}</svg>`;
const mark = `<svg class="sbw-mark" viewBox="0 0 24 26" aria-hidden="true"><path d="M12 1.2 2.6 4.6v7.1c0 6 3.9 10.9 9.4 13.1 5.5-2.2 9.4-7.1 9.4-13.1V4.6L12 1.2Z" fill="#1d8bff"/><path d="m7.4 13.1 3.2 3.2 6-6.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const toggle = (on?: boolean) => `<span class="sbw-tg${on ? ' on' : ''}"><i></i></span>`;
const badge = (r: Row) => (r.badge ? `<span class="sbw-badge ${r.badge.tone}">${esc(r.badge.text)}</span>` : '');
const rowsHTML = (rows: Row[], all?: boolean) => rows.map((r, i) => `<div class="sbw-row" data-row="${i}"><div class="sbw-row__txt"><b>${esc(r.t)}</b>${r.d ? `<small>${esc(r.d)}</small>` : ''}</div>${badge(r)}${toggle(all ?? r.on)}</div>`).join('');
const cardHead = (ic: string | undefined, title: string, meta?: string) => `<div class="sbw-card__head">${ic ? icon(ic) : ''}<b>${esc(title)}</b>${meta ? `<span>${esc(meta)}</span>` : ''}</div>`;

/** One group card. `allOn` forces every toggle (used for the before/after of Apply). */
export function cardHTML(id: keyof typeof cards | 'types' | 'journal' | 'audit' | 'tools', opts: { allOn?: boolean; narrow?: boolean } = {}): string {
  const n = opts.narrow ? ' narrow' : '';
  switch (id) {
    case 'uacAdmin': case 'uacStd': case 'psPolicy': {
      const c = cards[id];
      return `<section class="sbw-card${n}">${cardHead(undefined, c.title)}${c.radios.map((r) => `<div class="sbw-radio"><span class="sbw-rd${r.on ? ' on' : ''}"></span><b>${esc(r.t)}</b>${badge(r)}</div>`).join('')}</section>`;
    }
    case 'types':
      return `<section class="sbw-card${n}">${cardHead('file', 'Risky file types', '14 extensions')}<p class="sbw-note">Double-click opens these in Notepad. Reading is safe; running takes a deliberate choice.</p><div class="sbw-chips">${cards.types.map((t) => `<span class="sbw-chip"><s>${t}</s></span>`).join('')}</div><div class="sbw-row"><div class="sbw-row__txt"><b>Open in Notepad</b><small>Instead of the script host</small></div>${toggle(true)}</div></section>`;
    case 'powershell': {
      const c = cards.powershell;
      return `<section class="sbw-card${n}">${cardHead(c.icon, c.title, c.meta)}<div class="sbw-actions">${c.actions.map((a, i) => `<span class="sbw-btn sm${i === 2 ? ' pri' : ''}">${a}</span>`).join('')}</div>${rowsHTML(c.rows)}</section>`;
    }
    case 'journal':
      return `<section class="sbw-card sbw-journal${n}">${cardHead('history', 'Change journal', `${journal.length} changes`)}<div class="sbw-th"><span>Setting</span><span>Original</span><span>Current</span></div>${journal.map((r) => `<div class="sbw-tr"><b>${esc(r.s)}</b><span>${r.o}</span><span class="sbw-cur"><em>${r.c}</em></span></div>`).join('')}<div class="sbw-card__foot"><span class="sbw-btn pri">${icon('history')}Restore all</span></div></section>`;
    case 'audit':
      return `<section class="sbw-card${n}">${cardHead('list', 'Execution log', 'What · when · who')}${audit.map((r, i) => `<div class="sbw-tr sbw-tr--log"><span class="sbw-time">12:${String(40 + i).padStart(2, '0')}</span><b>${esc(r.c)}</b><span class="sbw-act">${r.a}</span></div>`).join('')}</section>`;
    case 'tools':
      return `<section class="sbw-card${n}">${cardHead('wrench', 'System tools', '16 tools')}<div class="sbw-tools">${toolsList.map((t) => `<span class="sbw-tool">${esc(t)}</span>`).join('')}</div></section>`;
    case 'restore':
      return `<section class="sbw-card${n}"><div class="sbw-row"><div class="sbw-row__txt"><b>${cards.restore.title}</b><small>${cards.restore.d}</small></div>${toggle(true)}</div></section>`;
    default: {
      const c = cards[id] as { icon: string; title: string; meta: string; rows: Row[] };
      return `<section class="sbw-card${n}" data-card="${id}">${cardHead(c.icon, c.title, c.meta)}${rowsHTML(c.rows, opts.allOn)}</section>`;
    }
  }
}

/** Main area per page. Chapter 02 uses the special 'apply' layout: the group card in a fixed slot,
 *  the live journal beside it. */
function mainHTML(page: PageId | 'apply'): string {
  const head = (t: string, s: string) => `<header class="sbw-page"><h4>${t}</h4><p>${s}</p></header>`;
  switch (page) {
    case 'apply':
      return `${head('Harden Windows', 'Choose the controls to enforce. Nothing changes until you apply.')}<div class="sbw-apply"><div class="sbw-slot" data-slot>${cardHTML('hardening', { narrow: true })}</div><section class="sbw-card sbw-live"><div class="sbw-card__head">${icon('history')}<b>Change journal</b><span data-live-count>Waiting for Apply</span></div><div class="sbw-th"><span>Setting</span><span>Was</span><span>Now</span><span>Time</span></div><div class="sbw-live__rows" data-live-rows></div><p class="sbw-live__empty" data-live-empty>Nothing written yet. Each change is recorded before it is made.</p></section></div>`;
    case 'uac':
      return `${head('Harden Windows', 'Choose the controls to enforce. Nothing changes until you apply.')}${cardHTML('uac')}<div class="sbw-two">${cardHTML('uacAdmin')}${cardHTML('uacStd')}</div>`;
    case 'hardening':
      return `${head('Harden Windows', 'Choose the controls to enforce. Nothing changes until you apply.')}${cardHTML('hardening', { allOn: true })}`;
    case 'scripts':
      return `${head('Script & execution', 'Scripts read, they don’t run.')}<div class="sbw-two">${cardHTML('scripts')}${cardHTML('types')}</div>`;
    case 'powershell':
      return `${head('PowerShell', 'Locked at the machine level.')}<div class="sbw-two">${cardHTML('powershell')}${cardHTML('psPolicy')}</div>`;
    case 'network':
      return `${head('Network & firewall', 'Enforced twice: Defender Firewall and the Filtering Platform.')}<div class="sbw-two">${cardHTML('outbound')}${cardHTML('shields')}</div>`;
    case 'readers':
      return `${head('Document readers', 'Hardened before they’re installed, through official machine policy.')}<div class="sbw-three">${cardHTML('adobe')}${cardHTML('office')}${cardHTML('foxit')}</div>`;
    case 'journal':
      return `${head('Journal & restore', 'Every change SysBastion owns, with the value it replaced.')}<div class="sbw-jpage" data-jpage>${cardHTML('journal')}${cardHTML('audit')}</div>`;
    case 'audit':
      return `${head('Audit log', 'What changed, when, and who ran it.')}${cardHTML('audit')}`;
    case 'tools':
      return `${head('System tools', 'Sixteen admin tools, one tab away.')}${cardHTML('tools')}`;
    default:
      return `${head('Harden Windows', '')}`;
  }
}

/** The whole window. `active` picks the sidebar item; `page` the main area. */
export function windowHTML(active: PageId, page: PageId | 'apply' = active, status = 'Selections cleared. Previously applied Windows settings remain unchanged until Restore.', count = 0): string {
  const item = (n: { id: PageId; label: string; icon: string }) => `<span class="sbw-nav${n.id === active ? ' on' : ''}" data-nav="${n.id}">${icon(n.icon)}${esc(n.label)}</span>`;
  return `<div class="sbw" data-page="${page}">
  <div class="sbw-title">${mark}<b>SysBastion</b><span class="sbw-ver">V1.4</span><nav><span>File</span><span>Tweaks</span><span>Tools</span><span>Help</span></nav><span class="sbw-who">DigiInn360</span><span class="sbw-ctl"><i>–</i><i>▢</i><i>✕</i></span></div>
  <aside class="sbw-side"><p>Harden</p>${nav.harden.map(item).join('')}<p>Manage</p>${nav.manage.map(item).join('')}<div class="sbw-rp"><div><b>System restore point</b><small>Offered before rules apply</small></div>${toggle(true)}</div></aside>
  <main class="sbw-main" data-main>${mainHTML(page)}</main>
  <footer class="sbw-bar"><span class="sbw-status" data-status>${esc(status)}</span><span class="sbw-btn sq">?</span><span class="sbw-btn">Select all</span><span class="sbw-btn">${icon('history')}Restore all applied</span><span class="sbw-btn pri" data-apply>Apply selected <i data-apply-n>${count}</i></span></footer>
</div>`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const stamp = (d = new Date(), plus = 0) => { const t = new Date(d.getTime() + plus * 1000); return `${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`; };

/** Chapter 02. `sel` rows ticked (0..8), `done` journal rows written (0..8), `pressed` Apply held. */
export function setApplyState(win: HTMLElement, sel: number, done: number, pressed = false, at = new Date()) {
  const rows = win.querySelectorAll<HTMLElement>('[data-slot] .sbw-row');
  rows.forEach((r, i) => r.querySelector('.sbw-tg')!.classList.toggle('on', i < sel));
  const n = rows.length;
  const badge = win.querySelector<HTMLElement>('[data-apply-n]');
  if (badge) badge.textContent = String(Math.max(0, sel - done) || (done ? 0 : sel));
  win.querySelector('[data-apply]')?.classList.toggle('press', pressed);
  const live = win.querySelector<HTMLElement>('[data-live-rows]');
  if (live && live.childElementCount !== done) {
    while (live.childElementCount > done) live.lastElementChild!.remove();
    for (let i = live.childElementCount; i < done; i++) {
      const j = journal[i];
      live.insertAdjacentHTML('beforeend', `<div class="sbw-tr"><b>${esc(j.s)}</b><span>${j.o}</span><span class="sbw-cur"><em>${j.c}</em></span><span class="sbw-time">${stamp(at, i)}</span></div>`);
    }
  }
  win.querySelector<HTMLElement>('[data-live-empty]')?.toggleAttribute('hidden', done > 0);
  const count = win.querySelector<HTMLElement>('[data-live-count]');
  if (count) count.textContent = done ? `${done} of ${n} written` : sel ? 'Waiting for Apply' : 'Empty';
  const status = win.querySelector<HTMLElement>('[data-status]')!;
  const msg = done >= n ? `${n} changes applied. The readback from Windows matches the journal.`
    : done ? `Applying ${done} of ${n}. Each change is journaled before it is made.`
    : sel ? `${sel} control${sel > 1 ? 's' : ''} selected. Nothing changes until you apply.`
    : 'Selections cleared. Previously applied Windows settings remain unchanged until Restore.';
  if (status.textContent !== msg) status.textContent = msg;
  status.classList.toggle('ok', done >= n);
}

/** Chapter 04. `dlg` 1 = confirm dialog showing, 0 = gone; `restored` rows written back (0..8). */
export function setRestoreState(win: HTMLElement, dlg: number, restored: number, pressed = false) {
  win.style.setProperty('--dlg', dlg.toFixed(3));
  const rows = win.querySelectorAll<HTMLElement>('.sbw-journal .sbw-tr');
  rows.forEach((r, i) => {
    const done = i < restored;
    r.classList.toggle('restored', done);
    r.classList.toggle('now', i === restored && restored < rows.length && dlg < 0.5);
    const em = r.querySelector('em')!;
    const want = done ? journal[i].o : journal[i].c;
    if (em.textContent !== want) em.textContent = want;
  });
  win.querySelector('.sbw-journal .sbw-btn')?.classList.toggle('press', pressed);
  const status = win.querySelector<HTMLElement>('[data-status]')!;
  const n = rows.length;
  const msg = restored >= n ? `${n} values restored. Exact originals, not Windows defaults.`
    : restored ? `Restoring ${restored} of ${n}, newest change first.`
    : 'Restore all applied: every change SysBastion owns goes back to its recorded value.';
  if (status.textContent !== msg) status.textContent = msg;
  status.classList.toggle('ok', restored >= n);
}

export const dialogHTML = `<div class="sbw-dim"></div><div class="sbw-dialog" role="presentation"><h5>${icon('history')}Restore all applied?</h5><p>${journal.length} changes will be written back to the values SysBastion recorded before it changed them. Settings it never touched stay as they are.</p><div class="row"><span class="sbw-btn">Cancel</span><span class="sbw-btn pri">Restore all</span></div></div>`;
