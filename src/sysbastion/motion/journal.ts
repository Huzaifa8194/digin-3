// The driver module: one state (which control groups are applied) mapped to every visual that
// carries the concept: section status chips, switches, struck extensions, firewall walls, the
// bottom bar, the drawer, the Restore All table and the audit log. Scrolling applies a group;
// "Restore all applied" rewinds them in reverse order to the exact original values.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { groups } from '../data';
import { onPage, prefersReducedMotion } from '../engine';

type RowState = 'applied' | 'restored';
type Row = { setting: string; from: string; to: string; state: RowState; fresh: boolean };
type Audit = { time: string; change: string; action: string };

const applied: string[] = [];
const rows = new Map<string, Row>();
const audit: Audit[] = [];
let mode: 'auto' | 'manual' = 'auto';
let busy = false;

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const clock = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function setSection(id: string, status: 'Not applied' | 'Applied' | 'Restored') {
  const section = document.querySelector<HTMLElement>(`[data-group="${id}"]`);
  if (!section) return;
  section.classList.toggle('is-applied', status === 'Applied');
  section.classList.toggle('is-restored', status === 'Restored');
  const text = $('[data-status-text]', section);
  if (text) text.textContent = status;
}

export function apply(id: string) {
  if (applied.includes(id)) return;
  const g = groups.find((x) => x.id === id);
  if (!g) return;
  applied.push(id);
  setSection(id, 'Applied');
  g.entries.forEach((e) => rows.set(e.setting, { ...e, state: 'applied', fresh: true }));
  audit.unshift({ time: clock(), change: g.audit.change, action: g.audit.action });
  render(true);
}

function restore(id: string) {
  const i = applied.indexOf(id);
  if (i < 0) return;
  const g = groups.find((x) => x.id === id)!;
  applied.splice(i, 1);
  setSection(id, 'Restored');
  g.entries.forEach((e) => { const r = rows.get(e.setting); if (r) { r.state = 'restored'; r.fresh = true; } });
  audit.unshift({ time: clock(), change: g.audit.change, action: 'restored' });
  render(false);
}

/** The signature: rewind every applied group, last applied first. */
function restoreAll() {
  if (busy || !applied.length) return;
  busy = true;
  mode = 'manual';
  const order = [...applied].reverse();
  const step = prefersReducedMotion() ? 0 : 0.22;
  order.forEach((id, i) => gsap.delayedCall(i * step, () => restore(id)));
  gsap.delayedCall(order.length * step + 0.05, () => {
    busy = false;
    toast(`${order.length} control group${order.length > 1 ? 's' : ''} restored to the exact original values.`);
  });
}

function applyAll() {
  if (busy) return;
  busy = true;
  mode = 'auto';
  const todo = groups.map((g) => g.id).filter((id) => !applied.includes(id));
  const step = prefersReducedMotion() ? 0 : 0.18;
  todo.forEach((id, i) => gsap.delayedCall(i * step, () => apply(id)));
  gsap.delayedCall(todo.length * step + 0.05, () => { busy = false; toast('All six control groups applied. Every change is in the journal.'); });
}

function render(up: boolean) {
  const n = applied.length;
  $$('[data-count]').forEach((el) => {
    el.textContent = String(n);
    if (!prefersReducedMotion()) gsap.fromTo(el, { yPercent: up ? 60 : -60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
  });
  $$('[data-entries]').forEach((el) => (el.textContent = String(rows.size)));
  $$('[data-restore-label]').forEach((el) => (el.textContent = n ? 'Restore all applied' : 'Apply all'));
  const count = $('[data-entry-count]');
  if (count) count.textContent = `${rows.size} journaled change${rows.size === 1 ? '' : 's'}`;

  const body = $('[data-journal-rows]');
  if (body && rows.size) {
    body.innerHTML = [...rows.values()].map((r) => {
      const cur = r.state === 'applied'
        ? `<span class="cur cur--applied"><span class="cur__v">${esc(r.to)}</span></span>`
        : `<span class="cur cur--restored"><span class="cur__v">${esc(r.from)}</span><span class="chip chip--orig">original</span></span>`;
      return `<tr class="${r.fresh ? 'jrow-enter' : ''}"><td>${esc(r.setting)}</td><td>${esc(r.from)}</td><td>${cur}</td></tr>`;
    }).join('');
  }
  rows.forEach((r) => (r.fresh = false));

  const log = $('[data-audit-rows]');
  if (log && audit.length) {
    log.innerHTML = audit.slice(0, 12).map((a, i) =>
      `<tr class="${i === 0 ? 'jrow-enter' : ''}"><td>${a.time}</td><td>${esc(a.change)}</td><td>${a.action}</td><td><span class="chip chip--by">SYSBASTION</span></td></tr>`).join('');
  }

  const list = $('[data-drawer-list]');
  if (list && audit.length) {
    list.innerHTML = audit.map((a) => {
      const g = groups.find((x) => x.audit.change === a.change);
      const detail = g ? g.entries.map((e) => a.action === 'restored' ? `${e.setting}: back to <b>${esc(e.from)}</b>` : `${e.setting}: ${esc(e.from)} to <b>${esc(e.to)}</b>`).join('<br>') : '';
      return `<li><time>${a.time}</time><span><b>${esc(a.change)}</b> ${a.action}</span><span class="d-change">${detail}</span></li>`;
    }).join('');
  }
}

let toastTl: gsap.core.Timeline | null = null;
function toast(msg: string) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  toastTl?.kill();
  toastTl = gsap.timeline()
    .fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' })
    .to(el, { autoAlpha: 0, y: 8, duration: 0.4, ease: 'power3.out' }, '+=3');
}

export function startJournal() {
  onPage(() => {
    const sections = $$('[data-group]');
    if (!sections.length) return;
    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        onEnter: () => { if (mode === 'auto' && !busy) apply(section.dataset.group!); },
      });
    });
    const onClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('[data-restore]');
      if (!btn) return;
      if (applied.length) restoreAll(); else applyAll();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  });
}
