// Dev-only: renders one panel or one window state for capture (see tools in DESIGN.md).
import './ui.css';
import { cardHTML, dialogHTML, setApplyState, setRestoreState, windowHTML } from './ui';
import type { PageId } from './ui-data';

const q = new URLSearchParams(location.search);
const out = document.getElementById('out')!;
const tile = q.get('tile');
if (tile) out.innerHTML = `<div class="sbw" style="all:unset;display:block;font:400 12px/1.3 'SB UI',Inter,sans-serif;color:#e8eaee;--w-bg:#101318;--w-card:#181b22;--w-line:#252931;--w-row:#1e222a;--w-text:#e8eaee;--w-muted:#7b818c;--w-faint:#565c67;--w-acc:#0a86ff;--w-acc-soft:rgba(10,134,255,.16)">${cardHTML(tile as never, { narrow: true, allOn: q.get('on') === '1' ? true : undefined })}</div>`;
else {
  const page = (q.get('win') || 'uac') as PageId | 'apply';
  out.innerHTML = windowHTML((q.get('active') || page) as PageId, page, q.get('status') || undefined, +(q.get('n') || 0));
  const win = out.querySelector<HTMLElement>('.sbw')!;
  if (q.has('sel')) setApplyState(win, +q.get('sel')!, +(q.get('done') || 0), false, new Date(2026, 10, 19, 12, 41, 7));
  if (q.has('restored')) { win.insertAdjacentHTML('beforeend', dialogHTML); setRestoreState(win, +(q.get('dlg') || 0), +q.get('restored')!); }
}
document.fonts.ready.then(() => document.body.setAttribute('data-ready', '1'));
