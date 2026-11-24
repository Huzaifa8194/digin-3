// The interactive SysBastion window, opened from the "ways in" rows of Chapter 03. No backend:
// selections, Apply, the journal, Restore and the audit log are simulated in the page, and every
// control explains itself in a tooltip (with what the V1.4 engineering report found, where it
// tested it). State lasts for the visit, so you can close the demo and come back to your changes.
import './demo.css';
import { icon, windowHTML } from './ui';
import { cards, journal as hardeningJournal, nav, type PageId } from './ui-data';
import { outboundTip, tips, toolTip, typeTip, type Tip } from './demo-tips';

type Entry = { key: string; s: string; o: string; c: string; t: string; restored: boolean };
type Opts = { from: HTMLElement; page: PageId; focus?: string; lenis?: { stop(): void; start(): void } | null; reduced: boolean; onBook?: () => void };

const BASE_W = 1066, BASE_H = 716;
const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
const st = {
  page: 'scripts' as PageId,
  sel: new Map<string, boolean>(),
  active: new Map<string, Entry>(), // applied and not restored, by key
  radio: new Map<string, number>(),
  radioBase: new Map<string, number>(),
  journal: [] as Entry[],
  audit: [] as { t: string; c: string; a: string }[],
  rp: true,
  busy: false,
  booked: false,
};
// defaults for the radio groups, from the app's own screens
for (const id of ['uacAdmin', 'uacStd', 'psPolicy'] as const) {
  const i = cards[id].radios.findIndex((r) => r.on);
  st.radio.set(id, i); st.radioBase.set(id, i);
}

const pad = (n: number) => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pageLabel = (id: PageId) => [...nav.harden, ...nav.manage].find((n) => n.id === id)?.label ?? id;

function tipFor(key: string): Tip | null {
  if (key.startsWith('ob:')) return outboundTip(key.slice(3));
  if (key.startsWith('type:')) return typeTip(key.slice(5));
  if (key.startsWith('tool:')) return toolTip(key.slice(5));
  return tips[key] ?? null;
}
const nameFor = (key: string) => {
  const [card, i] = key.split(':');
  if (card === 'outbound') return `Outbound block: ${cards.outbound.rows[+i].t.split(' ').pop()}`;
  return tipFor(key)?.t ?? key;
};

let root: HTMLElement | null = null;
let opts: Opts;
let winBox: HTMLElement, tipEl: HTMLElement, ringEl: HTMLElement, toastEl: HTMLElement;
let fluid = false, scale = 1, pos = { x: 0, y: 0 };
let tour = -1;

// ---------------------------------------------------------------- rendering
function render(focusKey?: string) {
  const page = st.page;
  winBox.innerHTML = windowHTML(page, page);
  const win = winBox.querySelector<HTMLElement>('.sbw')!;
  win.classList.toggle('fluid', fluid);
  if (page === 'journal' || page === 'audit') renderLog(win, page);
  hydrate(win);
  updateCounts();
  if (focusKey) win.querySelector<HTMLElement>(`[data-key="${focusKey}"], [data-nav-key="${focusKey}"]`)?.focus({ preventScroll: false });
}

function renderLog(win: HTMLElement, page: 'journal' | 'audit') {
  const main = win.querySelector<HTMLElement>('[data-main]')!;
  const rows = st.journal.length
    ? st.journal.map((e) => `<div class="sbw-tr${e.restored ? ' restored' : ''}"><b>${esc(e.s)}</b><span>${esc(e.o)}</span><span class="sbw-cur"><em>${esc(e.restored ? e.o : e.c)}</em></span><span class="sbw-time">${e.t}</span></div>`).join('')
    : `<p class="demo-empty">Nothing applied yet. Tick a control on any Harden page, then press Apply selected.</p>`;
  const journalCard = `<section class="sbw-card sbw-journal" data-card="journal"><div class="sbw-card__head">${icon('history')}<b>Change journal</b><span>${st.journal.length} change${st.journal.length === 1 ? '' : 's'}</span></div><div class="sbw-th sbw-th--4"><span>Setting</span><span>Original</span><span>Current</span><span>Time</span></div><div class="demo-rows">${rows}</div><div class="sbw-card__foot"><span class="sbw-btn pri" data-act="restore" data-tip="btn:restore">${icon('history')}Restore all applied</span></div></section>`;
  const log = st.audit.length
    ? st.audit.map((r) => `<div class="sbw-tr sbw-tr--log"><span class="sbw-time">${r.t}</span><b>${esc(r.c)}</b><span class="sbw-act">${esc(r.a)}</span></div>`).join('')
    : `<p class="demo-empty">No actions yet. Every Apply and Restore you make lands here.</p>`;
  const auditCard = `<section class="sbw-card" data-card="audit"><div class="sbw-card__head">${icon('list')}<b>Execution log</b><span>What · when · who</span></div>${log}</section>`;
  main.innerHTML = page === 'journal'
    ? `<header class="sbw-page"><h4>Journal &amp; restore</h4><p>Every change made in this demo, with the value it replaced.</p></header><div class="sbw-jpage">${journalCard}${auditCard}</div>`
    : `<header class="sbw-page"><h4>Audit log</h4><p>What changed, when, and who ran it.</p></header>${auditCard}`;
}

const btn = (el: Element, tip: string, label?: string) => {
  el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('data-tip', tip);
  if (label) el.setAttribute('aria-label', label);
};

function hydrate(win: HTMLElement) {
  win.querySelectorAll<HTMLElement>('[data-nav]').forEach((n) => {
    const id = n.dataset.nav!;
    btn(n, `nav:${id}`); n.dataset.navKey = `nav:${id}`;
    if (id === st.page) n.setAttribute('aria-current', 'page');
  });
  win.querySelector('.sbw-title nav')?.setAttribute('data-tip', 'menus');
  const x = win.querySelector('[data-x]');
  if (x) btn(x, 'close', 'Close the demo');
  win.querySelector('[data-status]')?.setAttribute('data-tip', 'status');
  win.querySelector('[data-status]')?.setAttribute('aria-live', 'polite');
  // restore point
  const rp = win.querySelector<HTMLElement>('.sbw-rp');
  if (rp) {
    const tg = rp.querySelector<HTMLElement>('.sbw-tg')!;
    rp.dataset.tip = 'rp';
    tg.setAttribute('role', 'switch'); tg.tabIndex = 0; tg.dataset.key = 'rp'; tg.setAttribute('aria-label', 'System restore point before rules apply');
    tg.classList.toggle('on', st.rp); tg.setAttribute('aria-checked', String(st.rp));
  }
  // toggles, rows by card
  win.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
    const id = card.dataset.card!;
    card.querySelectorAll<HTMLElement>(':scope > .sbw-row').forEach((row, i) => {
      const key = `${id}:${i}`;
      const tg = row.querySelector<HTMLElement>('.sbw-tg');
      const title = row.querySelector('b')?.textContent ?? key;
      row.dataset.tip = id === 'outbound' ? `ob:${title.split(' ').pop()}` : key;
      row.classList.add('demo-row');
      if (!tg) return;
      tg.setAttribute('role', 'switch'); tg.tabIndex = 0; tg.dataset.key = key; tg.setAttribute('aria-label', title);
      paintRow(row, key);
    });
    card.querySelectorAll<HTMLElement>(':scope > .sbw-radio').forEach((r, i) => {
      const key = `${id}:${i}`;
      r.dataset.tip = key; r.dataset.key = key; r.dataset.radio = id; r.dataset.i = String(i);
      r.setAttribute('role', 'radio'); r.tabIndex = 0;
      const on = st.radio.get(id) === i;
      r.setAttribute('aria-checked', String(on));
      r.querySelector('.sbw-rd')?.classList.toggle('on', on);
    });
    if (card.querySelector(':scope > .sbw-radio')) card.setAttribute('role', 'radiogroup');
  });
  win.querySelectorAll<HTMLElement>('.sbw-chip').forEach((c) => { const ext = c.textContent!.trim(); c.tabIndex = 0; c.dataset.tip = `type:${ext}`; c.setAttribute('aria-label', `${ext}: opens in Notepad`); });
  win.querySelectorAll<HTMLElement>('.sbw-actions .sbw-btn').forEach((b) => { btn(b, `act:${b.textContent!.trim()}`); b.dataset.act = `ps:${b.textContent!.trim()}`; });
  win.querySelectorAll<HTMLElement>('.sbw-tool').forEach((t) => { btn(t, `tool:${t.textContent!.trim()}`); t.dataset.act = `tool:${t.textContent!.trim()}`; });
  const bar = win.querySelectorAll<HTMLElement>('.sbw-bar .sbw-btn');
  if (bar.length >= 4) {
    btn(bar[0], 'btn:help', 'Take the tour'); bar[0].dataset.act = 'tour';
    btn(bar[1], 'btn:select'); bar[1].dataset.act = 'select';
    btn(bar[2], 'btn:restore'); bar[2].dataset.act = 'restore';
    btn(bar[3], 'btn:apply'); bar[3].dataset.act = 'apply';
  }
  win.querySelectorAll<HTMLElement>('[data-act="restore"]').forEach((b) => { if (!b.hasAttribute('role')) btn(b, 'btn:restore'); });
}

function paintRow(row: HTMLElement, key: string) {
  const tg = row.querySelector<HTMLElement>('.sbw-tg')!;
  const on = !!st.sel.get(key);
  tg.classList.toggle('on', on); tg.setAttribute('aria-checked', String(on));
  row.querySelector('.demo-applied')?.remove();
  if (st.active.has(key)) tg.insertAdjacentHTML('beforebegin', '<span class="sbw-badge ok demo-applied">Applied</span>');
}

function pending(): { key: string; s: string; o: string; c: string }[] {
  const out: { key: string; s: string; o: string; c: string }[] = [];
  for (const [key, on] of st.sel) {
    if (!on || st.active.has(key) || key === 'rp') continue;
    const [card, i] = key.split(':');
    if (card === 'hardening') { const j = hardeningJournal[+i]; out.push({ key, s: j.s, o: j.o, c: j.c }); }
    else out.push({ key, s: nameFor(key), o: 'Not set', c: 'Enforced' });
  }
  for (const [id, i] of st.radio) {
    const base = st.radioBase.get(id)!;
    if (i === base) continue;
    const rs = cards[id as 'uacAdmin'].radios;
    out.push({ key: `radio:${id}`, s: cards[id as 'uacAdmin'].title, o: rs[base].t, c: rs[i].t });
  }
  return out;
}

function updateCounts() {
  if (!root) return;
  const n = pending().length;
  const badge = root.querySelector<HTMLElement>('[data-apply-n]');
  if (badge) badge.textContent = String(n);
}

function setStatus(msg: string, ok = false) {
  const s = root?.querySelector<HTMLElement>('[data-status]');
  if (!s) return;
  s.textContent = msg; s.classList.toggle('ok', ok);
}

let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('on'), 2800);
}

// ---------------------------------------------------------------- actions
function toggle(key: string) {
  if (st.busy) return;
  if (key === 'rp') {
    st.rp = !st.rp;
    const tg = root!.querySelector<HTMLElement>('[data-key="rp"]')!;
    tg.classList.toggle('on', st.rp); tg.setAttribute('aria-checked', String(st.rp));
    setStatus(st.rp ? 'A restore point will be offered before rules apply.' : 'No restore point this time. The journal still records every change.');
    return;
  }
  const on = !st.sel.get(key);
  st.sel.set(key, on);
  const row = root!.querySelector<HTMLElement>(`[data-key="${key}"]`)?.closest<HTMLElement>('.sbw-row');
  if (row) paintRow(row, key);
  const n = pending().length;
  if (!on && st.active.has(key)) setStatus('Unticked. A setting already applied stays as it is until Restore all applied.');
  else setStatus(n ? `${n} control${n > 1 ? 's' : ''} selected. Nothing changes until you apply.` : 'Selections cleared. Previously applied Windows settings remain unchanged until Restore.');
  updateCounts();
}

function pickRadio(id: string, i: number) {
  if (st.busy) return;
  st.radio.set(id, i);
  root!.querySelectorAll<HTMLElement>(`[data-radio="${id}"]`).forEach((r) => {
    const on = +r.dataset.i! === i;
    r.setAttribute('aria-checked', String(on)); r.querySelector('.sbw-rd')?.classList.toggle('on', on);
  });
  setStatus(`${cards[id as 'uacAdmin'].radios[i].t}: selected. Apply selected to set it.`);
  updateCounts();
}

function selectAll() {
  if (st.busy) return;
  const keys = [...root!.querySelectorAll<HTMLElement>('[data-main] .sbw-tg[data-key]')].map((t) => t.dataset.key!);
  if (!keys.length) { setStatus('Nothing to select on this page. Pick a Harden section in the sidebar.'); return; }
  keys.forEach((k) => st.sel.set(k, true));
  root!.querySelectorAll<HTMLElement>('[data-main] .sbw-row').forEach((row) => { const k = row.querySelector<HTMLElement>('.sbw-tg')?.dataset.key; if (k) paintRow(row, k); });
  const n = pending().length;
  setStatus(`${n} control${n === 1 ? '' : 's'} selected. Nothing changes until you apply.`);
  updateCounts();
}

async function apply() {
  if (st.busy) return;
  const list = pending();
  const applyBtn = root!.querySelector<HTMLElement>('[data-apply]');
  if (!list.length) {
    setStatus('Nothing selected yet. Tick a control first, then apply.');
    root!.querySelector<HTMLElement>('[data-main] .sbw-tg')?.closest('.sbw-row')?.classList.add('demo-pulse');
    return;
  }
  st.busy = true;
  applyBtn?.classList.add('press');
  if (st.rp) { setStatus('Creating a Windows restore point first…'); await wait(opts.reduced ? 100 : 700); }
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    setStatus(`Applying ${i + 1} of ${list.length}: ${p.s}. Journal entry written first.`);
    const e: Entry = { key: p.key, s: p.s, o: p.o, c: p.c, t: now(), restored: false };
    st.journal.unshift(e);
    st.active.set(p.key, e);
    if (p.key.startsWith('radio:')) st.radioBase.set(p.key.slice(6), st.radio.get(p.key.slice(6))!);
    const row = root!.querySelector<HTMLElement>(`[data-key="${p.key}"]`)?.closest<HTMLElement>('.sbw-row');
    if (row) { paintRow(row, p.key); row.classList.add('demo-flash'); }
    updateCounts();
    await wait(opts.reduced ? 20 : 150);
  }
  st.audit.unshift({ t: now(), c: `${pageLabel(st.page)}, ${list.length} change${list.length > 1 ? 's' : ''}`, a: 'applied' });
  applyBtn?.classList.remove('press');
  setStatus(`${list.length} change${list.length > 1 ? 's' : ''} applied. Journal written; the readback from Windows matches.`, true);
  toast('Simulated. Nothing on your computer changed. Open Journal & restore to see the entries.');
  st.busy = false;
}

function askRestore() {
  if (st.busy) return;
  const list = st.journal.filter((e) => !e.restored);
  if (!list.length) { setStatus('Nothing to restore yet. Apply something first.'); return; }
  const win = winBox.querySelector<HTMLElement>('.sbw');
  if (!win || win.querySelector('.sbw-dialog')) return;
  hideTip();
  win.insertAdjacentHTML('beforeend', `<div class="sbw-dim" data-dlg></div><div class="sbw-dialog" role="alertdialog" aria-modal="true" aria-labelledby="demo-dlg-t" aria-describedby="demo-dlg-d" data-dlg><h5 id="demo-dlg-t">${icon('history')}Restore all applied?</h5><p id="demo-dlg-d">${list.length} change${list.length > 1 ? 's' : ''} will be written back to the values SysBastion recorded before it changed them. Settings it never touched stay as they are.</p><div class="row"><span class="sbw-btn" role="button" tabindex="0" data-act="restore-no">Cancel</span><span class="sbw-btn pri" role="button" tabindex="0" data-act="restore-go">Restore all</span></div></div>`);
  const d = win.querySelector<HTMLElement>('.sbw-dialog')!;
  if (!opts.reduced) d.animate([{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: EASE });
  d.querySelector<HTMLElement>('[data-act="restore-go"]')!.focus();
}
function closeAsk(refocus = true) {
  const els = winBox.querySelectorAll('[data-dlg]');
  if (!els.length) return false;
  els.forEach((el) => el.remove());
  if (refocus) winBox.querySelector<HTMLElement>('[data-act="restore"]')?.focus();
  return true;
}

async function restoreAll() {
  if (st.busy) return;
  closeAsk(false);
  const list = st.journal.filter((e) => !e.restored);
  if (!list.length) { setStatus('Nothing to restore yet. Apply something first.'); return; }
  st.busy = true;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    setStatus(`Restoring ${i + 1} of ${list.length}: ${e.s} back to ${e.o}.`);
    e.restored = true;
    st.active.delete(e.key);
    st.sel.set(e.key, false);
    if (e.key.startsWith('radio:')) {
      const id = e.key.slice(6) as 'uacAdmin';
      const idx = cards[id].radios.findIndex((r) => r.t === e.o);
      st.radio.set(id, idx); st.radioBase.set(id, idx);
    }
    await wait(opts.reduced ? 20 : 140);
  }
  st.audit.unshift({ t: now(), c: `Restore all applied, ${list.length} value${list.length > 1 ? 's' : ''}`, a: 'restored' });
  st.busy = false;
  render();
  setStatus(`${list.length} value${list.length > 1 ? 's' : ''} restored. Exact originals, not Windows defaults.`, true);
  if (opts.onBook && !st.booked) { st.booked = true; toast('That was the whole loop: apply, journal, restore. Book a walkthrough to see it on a real machine.'); }
}

const psSays: Record<string, string> = {
  Prepare: 'Prepared: the reviewed machine-wide policy is staged, not yet enforced.',
  Audit: 'Audit mode: anything the policy would block is logged; nothing is stopped yet.',
  Enforce: 'Enforcing for every account on this PC.',
  Status: 'Status read back from Windows: the policy in effect matches what was applied.',
  Remove: 'Policy removed. PowerShell is back to its previous state.',
};

function act(a: string) {
  if (a === 'apply') return void apply();
  if (a === 'restore') return askRestore();
  if (a === 'restore-go') return void restoreAll();
  if (a === 'restore-no') { closeAsk(); return; }
  if (a === 'select') return selectAll();
  if (a === 'tour') return startTour();
  if (a.startsWith('ps:')) { const k = a.slice(3); setStatus(psSays[k] ?? k); toast(`${k} (simulated)`); return; }
  if (a.startsWith('tool:')) { const t = toolTip(a.slice(5)); toast(`${t.d.split(',')[0]}. In the real app.`); }
}

// ---------------------------------------------------------------- tooltips
let tipTarget: HTMLElement | null = null, tipTimer = 0, pinned = false;
const evLabel = { pass: 'Tested · passed', partial: 'Tested · partly', pending: 'Still being tested', config: 'Configured · app check pending', no: 'Not supported' };
function showTip(el: HTMLElement, key = el.dataset.tip!, extra = '') {
  const t = tipFor(key);
  if (!t) return;
  tipTarget = el;
  tipEl.innerHTML = `<b>${esc(t.t)}</b><p>${esc(t.d)}</p>${t.ev ? `<span class="demo-ev ${t.ev.tone}"><i>${evLabel[t.ev.tone]}</i>${esc(t.ev.text)}</span>` : ''}${extra}`;
  tipEl.hidden = false;
  placeTip(el);
}
function placeTip(el: HTMLElement) {
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const below = r.bottom + 10 + h < innerHeight - 8;
  const y = below ? r.bottom + 10 : Math.max(8, r.top - h - 10);
  const x = Math.min(innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
  tipEl.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  tipEl.dataset.side = below ? 'below' : 'above';
}
function hideTip() { if (pinned) return; tipEl.hidden = true; tipTarget = null; }

// ---------------------------------------------------------------- tour
const steps: { sel: string; tip: Tip }[] = [
  { sel: '.sbw-side', tip: { t: '1 · Sections', d: 'Each section of the Harden menu owns one way in. Click one to switch pages; Manage holds the tools, the journal and the audit log.' } },
  { sel: '[data-main] .sbw-tg', tip: { t: '2 · Select', d: 'A toggle is a selection, not a change. Nothing touches Windows until you apply. Hover any control to see what it does.' } },
  { sel: '[data-apply]', tip: { t: '3 · Apply selected', d: 'Applies everything you ticked. Each change is written to the journal first, with the value it replaced, then read back from Windows.' } },
  { sel: '.sbw-bar .sbw-btn:nth-of-type(4)', tip: { t: '4 · Restore all applied', d: 'Walks the journal backwards and writes each original value back. What you had, not Windows defaults.' } },
  { sel: '.sbw-rp', tip: { t: '5 · Restore point', d: 'Before rules apply, a Windows restore point is offered too: a second net, separate from the journal.' } },
];
function startTour() {
  clearTimeout(tipTimer);
  // the tour needs something to tick: start it from System hardening if this page has no toggles
  if (!root!.querySelector('[data-main] .sbw-tg')) { st.page = 'hardening'; render(); setStatus('System hardening. The tour starts here.'); }
  tour = 0; showStep();
}
function endTour() { tour = -1; pinned = false; ringEl.hidden = true; hideTip(); }
function showStep() {
  const s = steps[tour];
  const el = root!.querySelector<HTMLElement>(s.sel);
  if (!el) { endTour(); return; }
  const r = el.getBoundingClientRect();
  ringEl.hidden = false;
  ringEl.style.transform = `translate(${r.left - 6}px, ${r.top - 6}px)`;
  ringEl.style.width = `${r.width + 12}px`; ringEl.style.height = `${r.height + 12}px`;
  pinned = false;
  tips.__tour = s.tip;
  showTip(el, '__tour', `<div class="demo-tour"><span>${tour + 1} / ${steps.length}</span>${tour ? '<button type="button" data-tour="back">Back</button>' : ''}<button type="button" data-tour="next" class="pri">${tour === steps.length - 1 ? 'Done' : 'Next'}</button></div>`);
  pinned = true;
  tipEl.querySelector<HTMLElement>('[data-tour="next"]')?.focus();
}

// ---------------------------------------------------------------- layout + motion
function layout() {
  fluid = innerWidth < 820 || innerHeight < 520;
  root!.classList.toggle('demo--fluid', fluid);
  winBox.querySelector('.sbw')?.classList.toggle('fluid', fluid);
  if (fluid) { winBox.style.transform = ''; return; }
  const top = 64, bottom = 56;
  scale = Math.min((innerWidth - 64) / BASE_W, (innerHeight - top - bottom) / BASE_H, 1.3);
  pos = { x: (innerWidth - BASE_W * scale) / 2, y: top + (innerHeight - top - bottom - BASE_H * scale) / 2 };
  winBox.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${scale})`;
}

function fromFrame() {
  const r = opts.from.getBoundingClientRect();
  if (fluid) return { clip: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 8px)` };
  const k = r.width / BASE_W;
  const cut = Math.max(0, BASE_H - r.height / k);
  return { transform: `translate(${r.left}px, ${r.top}px) scale(${k})`, clip: `inset(0px 0px ${cut}px 0px round ${8 / k}px)` };
}

export function openDemo(o: Opts) {
  if (root) return;
  opts = o;
  st.page = o.page;
  root = document.createElement('div');
  root.className = 'demo';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'SysBastion interactive demo');
  root.setAttribute('data-lenis-prevent', '');
  root.innerHTML = `<div class="demo__bg" data-close></div>
  <div class="demo__top"><p><b>Try SysBastion</b><span>No backend. Nothing on your computer changes.</span></p><div class="demo__acts">${o.onBook ? '<button class="demo__book" type="button" data-book>Book a walkthrough</button>' : ''}<button class="demo__close" type="button" data-close>Close <kbd>Esc</kbd></button></div></div>
  <div class="demo__win" data-winbox></div>
  <p class="demo__hint">Hover or focus anything to see what it does. Tick a control, then <b>Apply selected</b>. The <b>?</b> starts a tour.</p>
  <div class="demo__ring" hidden></div>
  <div class="demo__tip" role="tooltip" id="demo-tip" hidden></div>
  <div class="demo__toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(root);
  winBox = root.querySelector('[data-winbox]')!;
  tipEl = root.querySelector('.demo__tip')!;
  ringEl = root.querySelector('.demo__ring')!;
  toastEl = root.querySelector('.demo__toast')!;
  o.lenis?.stop();
  document.documentElement.classList.add('demo-open');
  render();
  layout();
  bind();

  const done = () => {
    root?.classList.add('ready');
    const target = o.focus ? root?.querySelector<HTMLElement>(`[data-key="${o.focus}"]`) : null;
    const row = target?.closest<HTMLElement>('.sbw-row, .sbw-radio') ?? target;
    if (target && row) {
      row.classList.add('demo-pulse');
      if (fluid) row.scrollIntoView({ block: 'center' });
      target.focus({ preventScroll: true });
      showTip(row, row.dataset.tip);
    } else root?.querySelector<HTMLElement>('.demo__close')?.focus();
  };
  if (o.reduced) { root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).finished.then(done); return; }
  o.from.style.visibility = 'hidden';
  const f = fromFrame();
  const to = fluid ? { clip: 'inset(0px 0px 0px 0px round 12px)' } : { transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, clip: 'inset(0px 0px 0px 0px round 12px)' };
  if (fluid) winBox.animate([{ clipPath: f.clip }, { clipPath: to.clip }], { duration: 760, easing: EASE });
  else winBox.animate([{ transform: f.transform, clipPath: f.clip }, { transform: to.transform, clipPath: to.clip }], { duration: 900, easing: EASE });
  root.querySelector('.demo__bg')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
  root.querySelectorAll('.demo__top, .demo__hint').forEach((el, i) => el.animate([{ opacity: 0, transform: `translateY(${i ? 10 : -10}px)` }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
  setTimeout(done, 900);
}

export function closeDemo(then?: () => void) {
  if (!root) return;
  const r = root, o = opts;
  endTour(); tipEl.hidden = true;
  unbind();
  const finish = () => {
    r.remove(); root = null;
    o.from.style.visibility = '';
    document.documentElement.classList.remove('demo-open');
    o.lenis?.start();
    if (then) { then(); return; }
    const back = o.from.closest<HTMLElement>('.s5__row')?.querySelector<HTMLElement>('.s5__open') ?? o.from.closest<HTMLElement>('button, a') ?? o.from;
    back.focus({ preventScroll: true });
  };
  if (o.reduced) { r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish); return; }
  const f = fromFrame();
  r.classList.remove('ready');
  const anim = fluid
    ? winBox.animate([{ clipPath: 'inset(0px 0px 0px 0px round 12px)' }, { clipPath: f.clip }], { duration: 620, easing: EASE, fill: 'forwards' })
    : winBox.animate([{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, clipPath: 'inset(0px 0px 0px 0px round 12px)' }, { transform: f.transform!, clipPath: f.clip }], { duration: 760, easing: EASE, fill: 'forwards' });
  r.querySelector('.demo__bg')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, fill: 'forwards' });
  r.querySelectorAll('.demo__top, .demo__hint').forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
  anim.finished.then(finish);
}

// ---------------------------------------------------------------- events
function onClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  const tourBtn = t.closest<HTMLElement>('[data-tour]');
  if (tourBtn) { if (tourBtn.dataset.tour === 'back') tour = Math.max(0, tour - 1); else tour++; if (tour >= steps.length) endTour(); else showStep(); return; }
  if (t.closest('[data-book]')) { const go = opts.onBook; closeDemo(go); return; }
  if (t.closest('[data-close], [data-x]')) { closeDemo(); return; }
  if (tour >= 0) endTour();
  const nav = t.closest<HTMLElement>('[data-nav]');
  if (nav) { st.page = nav.dataset.nav as PageId; render(`nav:${st.page}`); setStatus(`${pageLabel(st.page)}. Hover a control to see what it does.`); return; }
  const a = t.closest<HTMLElement>('[data-act]');
  if (a) { act(a.dataset.act!); return; }
  const radio = t.closest<HTMLElement>('[data-radio]');
  if (radio) { pickRadio(radio.dataset.radio!, +radio.dataset.i!); return; }
  const rpRow = t.closest('.sbw-rp');
  if (rpRow) { toggle('rp'); return; }
  const row = t.closest<HTMLElement>('.sbw-row');
  const key = row?.querySelector<HTMLElement>('.sbw-tg[data-key]')?.dataset.key;
  if (key) { toggle(key); if ((e as PointerEvent).pointerType === 'touch' || matchMedia('(pointer: coarse)').matches) showTip(row!, row!.dataset.tip); }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); if (closeAsk()) return; if (tour >= 0) endTour(); else closeDemo(); return; }
  const t = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && t.matches('[role="button"], [role="switch"], [role="radio"]')) {
    e.preventDefault();
    if (t.matches('[role="switch"]')) toggle(t.dataset.key!);
    else t.click();
  }
  if (e.key === 'Tab') {
    const f = [...root!.querySelectorAll<HTMLElement>('button, [tabindex="0"]')].filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
}
function onOver(e: PointerEvent) {
  if (e.pointerType === 'touch' || pinned || !root?.classList.contains('ready')) return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
  clearTimeout(tipTimer);
  if (!el) { tipTimer = window.setTimeout(hideTip, 80); return; }
  if (el === tipTarget) return;
  tipTimer = window.setTimeout(() => { if (!pinned && root?.classList.contains('ready')) showTip(el); }, 110);
}
function onFocus(e: FocusEvent) {
  if (pinned || !root?.classList.contains('ready')) return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('.sbw-row, .sbw-radio, [data-tip]');
  if (el?.dataset.tip) showTip(el);
}
const onResize = () => { layout(); if (tipTarget && !tipEl.hidden) placeTip(tipTarget); if (tour >= 0) showStep(); };
function bind() {
  root!.addEventListener('click', onClick);
  root!.addEventListener('pointerover', onOver);
  root!.addEventListener('focusin', onFocus);
  root!.addEventListener('pointerleave', () => { if (!pinned) hideTip(); });
  root!.addEventListener('animationend', (e) => (e.target as HTMLElement).classList.remove('demo-pulse', 'demo-flash'));
  root!.addEventListener('scroll', () => { if (tipTarget && !tipEl.hidden) placeTip(tipTarget); }, { passive: true, capture: true });
  addEventListener('keydown', onKey);
  addEventListener('resize', onResize);
}
function unbind() { removeEventListener('keydown', onKey); removeEventListener('resize', onResize); }
