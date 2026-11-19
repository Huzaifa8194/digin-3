// Builds the HTML of one DarkIntel360 product screen from data.ts. Pure functions, no state.
import { PAGES, TIPS, NAV, NAV_MODULE, PHISH_CARDS, LIVE, FLAG, SESSION, type Stat, type Page, type Drawer, type Tip, type Row } from './data';

import { flagUrl } from './flags';
export const flag = (cc: string) => {
  const url = flagUrl(cc);
  return url ? `<img class="pq-flag" src="${url}" alt="" width="18" height="13" loading="lazy">` : '<i class="pq-flag pq-flag--none" aria-hidden="true"></i>';
};
const tipId = (t?: Tip) => (t ? Object.keys(TIPS).find((k) => TIPS[k] === t) || '' : '');
const PALETTE = ['#7b5cd6', '#ab8ddd', '#8cc3b3', '#b4c2dc', '#dcbfe8', '#e7e1f3'];
const fmt = (n: number) => n.toLocaleString('en-US');

function donut(s: Extract<Stat, { kind: 'donut' }>) {
  const sum = s.items.reduce((a, [, v]) => a + v, 0);
  let acc = 0;
  const segs = s.items.map(([label, v], i) => {
    const len = (v / sum) * 100, off = acc; acc += len;
    return `<circle class="pq-donut__seg" cx="60" cy="60" r="46" pathLength="100" style="--len:${Math.max(0.6, len - 0.8).toFixed(2)};--off:${(-off).toFixed(2)};stroke:${PALETTE[i % PALETTE.length]}" data-seg="${label}: ${fmt(v)}"/>`;
  }).join('');
  return `<div class="pq-donut"><div class="pq-donut__ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="pq-donut__bg" cx="60" cy="60" r="46"/>${segs}</svg><p><b>${s.total}</b><small>${s.totalLabel}</small></p></div>
  <ul class="pq-legend">${s.items.map(([l, v], i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${l}</span><b>${fmt(v)}</b></li>`).join('')}</ul></div>`;
}
function bars(s: Extract<Stat, { kind: 'bars' }>) {
  const max = Math.max(...s.items.map(([, , v]) => v), s.other || 0);
  const row = (rank: string, cc: string, l: string, v: number) => `<li><span class="pq-rank">${rank}</span>${cc ? flag(cc) : ''}<span>${l}</span><b>${fmt(v)}</b><i class="pq-bar"><i style="--w:${((v / max) * 100).toFixed(1)}%"></i></i></li>`;
  return `<ol class="pq-bars">${s.items.map(([cc, l, v], i) => row(`0${i + 1}`, cc, l, v)).join('')}${s.other ? row('–', '', 'Other', s.other) : ''}</ol>`;
}
function split(s: Extract<Stat, { kind: 'split' }>) {
  return `<div class="pq-split"><p class="pq-split__pct">${s.pct}<small>%</small></p><div><p class="pq-split__lead">${s.lead}</p><p class="pq-muted pq-small">${s.leadSub}</p></div></div>
  <p class="pq-stack">${s.items.map(([, , p], i) => `<i style="flex:${parseFloat(p) || 0.2};background:${PALETTE[i % PALETTE.length]}"></i>`).join('')}</p>
  <ul class="pq-legend pq-legend--pct">${s.items.map(([l, v, p], i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${l}</span><b>${fmt(v)}</b><em>${p}</em></li>`).join('')}</ul>`;
}
function columns(s: Extract<Stat, { kind: 'columns' }>) {
  const max = Math.max(...s.items.map(([, v]) => v));
  return `<div class="pq-cols">${s.items.map(([, v], i) => `<div><b>${v}</b><span><i style="--h:${((v / max) * 100).toFixed(0)}%;background:${PALETTE[i % PALETTE.length]}"></i></span><small>0${i + 1}</small></div>`).join('')}</div>
  <ol class="pq-collist">${s.items.map(([l, v], i) => `<li><span class="pq-rank">0${i + 1}</span><span>${l}</span><b>${v}</b></li>`).join('')}</ol>`;
}
function stat(s: Stat) {
  const body = s.kind === 'donut' ? donut(s) : s.kind === 'bars' ? bars(s) : s.kind === 'split' ? split(s) : columns(s);
  return `<section class="pq-card pq-stat" data-tip-id="${tipId(s.tip)}"><p class="pq-eyebrow">${s.eyebrow}</p><h4>${s.title}</h4>${'sub' in s && s.sub ? `<p class="pq-muted pq-small">${s.sub}</p>` : ''}<div class="pq-stat__body">${body}</div><p class="pq-foot">${s.foot}</p></section>`;
}

/** Cell renderer: a few tokens stand for product widgets. */
export function cell(v: string) {
  if (v === 'actions') return '<span class="pq-actions"><button type="button" class="pq-btn pq-btn--sm" data-open-src>Open ↗</button><button type="button" class="pq-btn pq-btn--ghost" data-open-row>View details</button></span>';
  if (v === 'details') return '<button type="button" class="pq-btn pq-btn--sm" data-open-row>Details</button>';
  if (v === 'mirror') return '<button type="button" class="pq-btn pq-btn--sm" data-mirror>Open Mirror</button>';
  if (v === 'source') return '<span class="pq-src"><button type="button" class="pq-btn pq-btn--sm" data-open-src>Open ↗</button><small>Accessible</small></span>';
  if (v.startsWith('flag:')) return `<span class="pq-flags">${v.split('|').map((f) => { const [, cc, name] = f.split(':'); return `<span>${flag(cc)}${name}</span>`; }).join('')}</span>`;
  return v;
}
export function rowsHtml(p: Page, rows: Row[]) {
  return rows.map((r) => `<tr${r._drawer ? ` data-drawer="${r._drawer}" tabindex="0"` : ''} data-search="${Object.values(r).join(' ').replace(/<[^>]+>/g, ' ').replace(/"/g, '').toLowerCase()}">${p.table!.cols.map((c) => `<td class="${c.cls || ''}">${cell(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('');
}

function filters(p: Page) {
  if (!p.filters.length) return '';
  return `<section class="pq-card pq-filters" data-tip-id="filters"><div class="pq-filters__head"><span class="pq-filters__ico" aria-hidden="true">⫶</span><div><h4>Analysis filters</h4><p class="pq-muted">Refine results by keyword, date range and more.</p></div></div>
  <div class="pq-filters__row">${p.filters.map((f, i) => `<label class="pq-field${f.kind === 'text' ? ' pq-field--wide' : ''}"><span>${f.label}</span>${f.kind === 'text' ? `<input type="search" placeholder="${f.ph}" data-filter-text>` : f.kind === 'date' ? `<input type="text" value="mm/dd/yyyy" readonly aria-readonly="true" class="pq-date">` : `<select data-filter-sel="${f.filter || ''}" aria-label="${f.label}">${f.opts!.map((o) => `<option>${o}</option>`).join('')}</select>`}</label>`).join('')}</div></section>`;
}
function table(p: Page) {
  const t = p.table!;
  return `<section class="pq-card pq-tablecard"><div class="pq-tablehead"><div>${t.title ? `<h4>${t.title}</h4><p class="pq-muted">${t.count}</p>` : ''}</div><div class="pq-tablehead__ctl"><label class="pq-select" data-tip-id="perpage"><span class="pq-sr">Rows per page</span><select data-perpage><option value="25">25 per page</option><option value="5">5 per page</option><option value="10">10 per page</option></select></label>${t.date ? '<span class="pq-sortwrap" data-tip-id="sort"><button type="button" class="pq-btn pq-btn--line" data-sort>Date ↓</button></span>' : ''}</div></div>
  <div class="pq-scroll"><table class="pq-table"><thead><tr>${t.cols.map((c) => `<th${c.w ? ` style="width:${c.w}"` : ''}${c.tip ? ` data-tip-id="${tipId(c.tip)}"` : ''}>${c.label}</th>`).join('')}</tr></thead><tbody data-rows>${rowsHtml(p, t.rows)}</tbody></table></div>
  <p class="pq-empty" hidden>No records match this filter.</p></section>`;
}
const look = (kind: string) => kind === 'bank'
  ? '<div class="cap cap--bank"><b class="cap__nav"></b><b class="cap__hero"><i></i><i></i><i></i></b><b class="cap__row"><i></i><i></i><i></i><i class="cap__green"></i></b></div>'
  : kind === 'app'
    ? '<div class="cap cap--app"><b class="cap__stripe"></b><b class="cap__login"><i></i><i></i><i></i></b><b class="cap__phone"></b><b class="cap__title">Descarga la app</b></div>'
    : '<div class="cap cap--doc"><b class="cap__h">Complete guide to setting up your wallet</b>' + Array.from({ length: 9 }, (_, i) => `<i style="width:${60 + ((i * 37) % 40)}%"></i>`).join('') + '</div>';
function phishCards() {
  const pair = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v.startsWith('flag:') ? cell(v) : v}</dd></div>`;
  return `<section class="pq-pcards">${PHISH_CARDS.map((c, i) => `<article class="pq-card pq-pcard" data-search="${(c.site + ' ' + c.trail.join(' ') + ' ' + c.place.join(' ')).toLowerCase()}">
    <div class="pq-capture" data-tip-id="${i === 0 ? 'pCapture' : ''}">${look(c.look)}<button type="button" class="pq-btn pq-btn--float" data-enlarge="${i}">Enlarge image</button><span class="pq-capture__tag">Website capture</span></div>
    <div class="pq-pcard__body"><p class="pq-pcard__site"><b>${c.site}</b><small>#${i + 1}</small></p><p class="pq-muted pq-pcard__url">${c.url}</p>
    <dl class="pq-pgrid">${pair('Submitted', c.submitted)}${pair('Submitter', c.submitter)}</dl>
    <div class="pq-pwrap" data-tip-id="${i === 2 ? 'pTrail' : ''}"><dl class="pq-pgrid">${pair('IP address', c.trail[0])}${pair('Organization', c.trail[1])}${pair('ISP', c.trail[2])}${pair('ASN', c.trail[3])}</dl></div>
    <div class="pq-pwrap" data-tip-id="${i === 2 ? 'pPlace' : ''}"><dl class="pq-pgrid">${pair('Country', c.place[0])}${pair('Region', c.place[1])}${pair('City', c.place[2])}${pair('Timezone', c.place[3])}${pair('Hosting type', c.hosting)}</dl></div>
    <button type="button" class="pq-btn pq-btn--wide" data-preview>Preview <span aria-hidden="true">↗</span></button></div></article>`).join('')}</section>`;
}
function livemap() {
  return `<div class="pq-live">
    <div class="pq-live__map" data-map></div>
    <div class="pq-card pq-live__head" data-tip-id="globe"><h3 class="pq-maptitle">Live Map</h3><p class="pq-muted">Showing world view</p><p class="pq-seg"><button type="button" class="is-on" data-mapmode="2d">2D</button><button type="button" data-mapmode="3d">3D Globe</button></p></div>
    <div class="pq-live__counters" data-tip-id="counters">${LIVE.counters.map(([k, v]) => `<div class="pq-card"><p class="pq-eyebrow">${k}</p><b>${v}</b></div>`).join('')}</div>
    <div class="pq-card pq-live__top" data-tip-id="topCountries"><h4>Top Affected Countries</h4><p class="pq-muted pq-small">Ranked by exposure volume across sources</p>
      <label class="pq-select" data-tip-id="dates"><span class="pq-sr">Date range</span><select><option>All Dates</option><option>Last 7 days</option><option>Last 30 days</option></select></label>
      <ol>${LIVE.top.map(([c, n]) => `<li><button type="button" data-country="${c}">${flag(FLAG[c])}<span>${c}</span><b>${n}</b></button></li>`).join('')}</ol></div>
    <div class="pq-live__zoom"><button type="button" data-zoom="1" aria-label="Zoom in">+</button><button type="button" data-zoom="-1" aria-label="Zoom out">−</button></div>
    <p class="pq-live__attr">Map data: Natural Earth</p>
  </div>`;
}

const PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg>';
const AIM = '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3.5"/><path d="M10 0v4M10 16v4M0 10h4M16 10h4"/></svg>';
/** The first thing on every module screen: two clear ways in. */
const startHere = (map = false) => `<section class="pq-start${map ? ' pq-start--map' : ''}" data-start aria-label="Start here">
  <p class="pq-start__k">Start here</p>
  <button type="button" class="pq-start__card pq-start__card--tour" data-tour-start><span class="pq-start__ico">${PLAY}</span><span><b>Take the tour</b><small>See every feature of this page, step by step</small></span><i aria-hidden="true">→</i></button>
  <button type="button" class="pq-start__card pq-start__card--game" data-px-hunt><span class="pq-start__ico">${AIM}</span><span><b data-start-game>Play: find the 3 signals</b><small data-start-game-sub>Each one unlocks a feature, out in the landscape</small></span><i aria-hidden="true">→</i></button>
  <button type="button" class="pq-start__x" data-start-x aria-label="Hide these options">×</button>
</section>`;
export function pageHtml(i: number) {
  const p = PAGES[i];
  if (i === 0) return livemap() + startHere(true);
  return `${startHere()}<header class="pq-head"><p class="pq-eyebrow pq-eyebrow--accent">${p.eyebrow}</p><h3 class="pq-h1">${p.title}</h3><p class="pq-muted pq-lead">${p.sub}</p></header>
  ${p.stats.length ? `<div class="pq-stats pq-stats--${p.stats.length}">${p.stats.map(stat).join('')}</div>` : ''}
  ${filters(p)}${i === 5 ? phishCards() : ''}${p.table ? table(p) : ''}`;
}

export function shellHtml(i: number) {
  const p = PAGES[i];
  return `<div class="px__bar"><span class="px__dots" aria-hidden="true"><i></i><i></i><i></i></span><p class="px__title" id="px-title">DarkIntel360 · ${p.nav}</p><span class="px__badge">Product demo · sensitive data masked</span><button type="button" class="px__x" data-px-close aria-label="Close the product and return to the landscape"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
  <div class="px__app">
    <aside class="pq-side" data-tip-id="nav"><p class="pq-brand">DarkIntel<b>360</b></p>
      <nav class="pq-nav" aria-label="Product modules">${NAV.map((n) => `<button type="button" data-nav="${n}"${NAV_MODULE[n] === i ? ' class="is-on" aria-current="page"' : ''}>${n}</button>`).join('')}</nav>
      <div class="pq-side__foot"><div class="pq-themewrap" data-tip-id="dark"><button type="button" class="pq-theme" data-theme-toggle aria-pressed="false"><span aria-hidden="true">☾</span>Dark theme<i aria-hidden="true"></i></button></div><p class="pq-session"><b>●</b>${SESSION}</p></div>
    </aside>
    <div class="pq-mainwrap"><div class="pq-main${i === 0 ? ' pq-main--map' : ''}" data-px-main tabindex="-1" role="region" aria-label="${p.nav} workspace">${pageHtml(i)}</div>
    <aside class="pq-drawer" data-px-drawer aria-label="Record details" hidden></aside></div>
  </div>
  <div class="pq-modal" data-px-modal hidden></div>
  <div class="pq-tip" role="tooltip" id="pq-tip" hidden><p class="pq-tip__t"></p><p class="pq-tip__d"></p></div>`;
}

export function drawerHtml(d: Drawer, tab: string) {
  return `<div class="pq-drawer__top"><p class="pq-eyebrow">${d.kicker}</p><p class="pq-drawer__act"${(d.actions || []).length > 1 ? ' data-tip-id="open"' : ''}>${(d.actions || []).map((a) => `<button type="button" class="pq-btn pq-btn--line" ${a === 'Close' ? 'data-drawer-close' : 'data-open-src'}>${a}</button>`).join('')}</p></div>
  <h4 class="pq-drawer__title">${d.title}</h4><p class="pq-muted">${d.meta}</p>
  <div class="pq-tabs" role="tablist" data-tip-id="drawerTabs">${d.tabs.map((t) => `<button type="button" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">${t.label}${t.badge ? `<span>${t.badge}</span>` : ''}</button>`).join('')}</div>
  <div class="pq-drawer__body" role="tabpanel">${(d.tabs.find((t) => t.id === tab) || d.tabs[0]).html}</div>`;
}
export function mirrorHtml(url: string, attacker: string, team: string) {
  return `<div class="pq-modal__card pq-modal__card--mirror"><div class="pq-modal__bar"><p><b>Mirror capture</b> · ${url.replace(/<[^>]+>/g, '')}</p><button type="button" class="pq-btn pq-btn--line" data-modal-close>Close</button></div>
  <div class="mir"><p class="mir__glitch" data-text="HACKED">HACKED</p><p class="mir__by">by ${attacker}</p><p class="mir__team">${team}</p><p class="mir__note">Captured as defaced. The owner has since restored the page; this mirror keeps the evidence.</p></div></div>`;
}
export function captureHtml(i: number) {
  const c = PHISH_CARDS[i];
  return `<div class="pq-modal__card"><div class="pq-modal__bar"><p><b>Website capture</b> · ${c.url}</p><button type="button" class="pq-btn pq-btn--line" data-modal-close>Close</button></div><div class="pq-capture pq-capture--big">${look(c.look)}</div><p class="pq-muted pq-small pq-modal__note">The lure as it looked when it was reported. Brand imagery is not reproduced on this page.</p></div>`;
}
export { PAGES };
