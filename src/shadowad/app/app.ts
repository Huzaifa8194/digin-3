// A working HTML replica of the shadowAD console (from the product screenshots), shown inside the
// module panel. It renders at a fixed design size and scales to fit, so it looks the same everywhere.
// Each fleet crystal opens it on the screen where that part of shadowAD lives, with numbered pins.
// All data is synthetic lab data, as in the concept overview.
import './app.css';

export type Screen = 'home' | 'dashboard' | 'explorer' | 'live' | 'agents' | 'reports' | 'report';
export type Pin = { at: string; title: string; text: string };
export type Tour = { screen: Screen; pins: Pin[]; agent?: string; tab?: string };

const W = 1180, H = 720;
const NAV: { id: Screen; label: string; icon: string; badge?: string; group: 'OPERATE' | 'REFERENCE' }[] = [
  { id: 'home', label: 'Control plane', group: 'OPERATE', icon: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z"/>' },
  { id: 'dashboard', label: 'Dashboard', group: 'OPERATE', icon: '<rect x="3.5" y="3.5" width="5" height="5" rx="1"/><rect x="11.5" y="3.5" width="5" height="5" rx="1"/><rect x="3.5" y="11.5" width="5" height="5" rx="1"/><rect x="11.5" y="11.5" width="5" height="5" rx="1"/>' },
  { id: 'explorer', label: 'Attack graph', group: 'OPERATE', badge: 'map', icon: '<circle cx="5" cy="5" r="2"/><circle cx="15" cy="7" r="2"/><circle cx="7" cy="15" r="2"/><path d="M7 5h4l2 1M5 7v6"/>' },
  { id: 'live', label: 'War room', group: 'OPERATE', badge: '2', icon: '<path d="M2.5 10h4l2-5 3 10 2-5h4"/>' },
  { id: 'agents', label: 'Agents', group: 'REFERENCE', icon: '<circle cx="8" cy="7" r="3"/><path d="M2.5 16.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M13.5 4.5a3 3 0 0 1 0 5.6M15.5 12.5c1.2.7 2 2 2.3 4"/>' },
  { id: 'reports', label: 'Reports', group: 'REFERENCE', icon: '<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5"/>' },
];

type Agent = { id: string; area: string; mode: 'EXEC' | 'ADVISORY'; text: string; keys: string[]; caps: string[] };
const AGENTS: Agent[] = [
  { id: 'recon-advisor', area: 'Recon', mode: 'EXEC', text: 'Network discovery, enumeration and attack-surface mapping.', keys: ['scan', 'recon', 'enum'], caps: ['Finds live hosts inside the declared scope', 'Maps services and exposed surface', 'Hands a map to the specialists that follow'] },
  { id: 'web-hunter', area: 'Web', mode: 'EXEC', text: 'Hidden-endpoint discovery and input-handling checks.', keys: ['web', 'http', 'endpoint'], caps: ['Maps reachable endpoints of an in-scope app', 'Checks how input, sessions and access are handled', 'Stops at proof and records the evidence'] },
  { id: 'api-security', area: 'Web', mode: 'ADVISORY', text: 'REST and GraphQL review, OAuth and token handling.', keys: ['api', 'graphql', 'oauth'], caps: ['Reviews API design and auth flows', 'Flags token and session handling issues', 'Recommends fixes; runs no commands'] },
  { id: 'ad-attacker', area: 'AD', mode: 'EXEC', text: 'Domain configuration review and path mapping toward privileged groups.', keys: ['domain', 'AD', 'DC'], caps: ['Reviews domain configuration you own', 'Maps paths toward privileged groups', 'Credential-touching steps wait for approval', 'Stops at proof of concept'] },
  { id: 'database-attacker', area: 'Web', mode: 'EXEC', text: 'Database exposure and authentication review.', keys: ['sql', 'database'], caps: ['Checks database exposure in scope', 'Reviews authentication and access', 'Evidence only, nothing changed'] },
  { id: 'code-auditor', area: 'Web', mode: 'ADVISORY', text: 'Secure-code review for injection, auth, secrets and OWASP bugs.', keys: ['sast', 'source', 'owasp'], caps: ['Reads source for common flaw classes', 'Flags hard-coded secrets', 'Maps findings to OWASP'] },
  { id: 'crypto-analyzer', area: 'Web', mode: 'ADVISORY', text: 'Weak algorithms, key management and TLS misuse.', keys: ['crypto', 'tls', 'cipher'], caps: ['Reviews algorithms and key handling', 'Checks TLS configuration', 'Advisory only'] },
  { id: 'report-generator', area: 'Reporting', mode: 'ADVISORY', text: 'Client-ready reports from a finished run.', keys: ['report', 'summary'], caps: ['Executive summary and findings by severity', 'Evidence and affected assets for each', 'A one-line fix for every finding'] },
];
const AREAS = [['All', 52], ['Recon', 3], ['Network', 1], ['AD', 1], ['Web', 7], ['Cloud', 4], ['Mobile', 2], ['IoT/OT', 3], ['AI', 2], ['Creds', 2], ['Exploit', 4], ['Post-ex', 5], ['Planning', 4], ['Validation', 2], ['Reporting', 4], ['Defense', 4], ['OpSec', 1]] as const;

// ---------- the attack-surface graph (Fleet 04) ----------
type Sev = 'info' | 'low' | 'med' | 'crit';
type GNode = {
  id: string; name: string; ip: string; kind: 'op' | 'fw' | 'win' | 'srv' | 'idle'; tone: string; x: number; y: number;
  chip: string; sev?: Sev; os?: string; agent?: string; finding?: string; evidence?: string; activity?: [string, string][];
};
const GNODES: GNode[] = [
  { id: 'op', name: 'DESKTOP-OPS', ip: 'operator · op-01', kind: 'op', tone: 'red', x: 92, y: 262, chip: 'OPERATOR', os: 'Windows 11 · operator console', agent: 'you',
    finding: 'Driving this simulation under AUTH-2026-014', evidence: '$ scope declared · 10.0.0.0/24 · review mode',
    activity: [['CMD', 'declare scope 10.0.0.0/24 --rules non-destructive,rate-limited'], ['OUT', 'Scope accepted. 3 agents dispatched in parallel.']] },
  { id: 'fw', name: 'PERIMETER INGRESS', ip: '0.0.0.0/0', kind: 'fw', tone: 'red', x: 318, y: 348, chip: 'EDGE', sev: 'low', os: 'edge firewall', agent: 'recon-advisor',
    finding: 'Inbound remote desktop allowed from any address', evidence: '$ rule 14 · allow tcp/3389 any → 10.0.0.23',
    activity: [['CMD', 'review edge rules · read-only export'], ['OUT', '1 rule wider than policy: tcp/3389 from any']] },
  { id: 'entry', name: 'ENTRY HOST', ip: '10.0.0.23', kind: 'win', tone: 'cyan', x: 468, y: 168, chip: 'SCANNED', sev: 'info', os: 'Windows Server 2022', agent: 'recon-advisor',
    finding: '2 open ports: 22, 3389', evidence: '$ ms-wbt-server · ssh',
    activity: [['CMD', 'nmap -sT -sV -n --host-timeout 3m 10.0.0.23'], ['OUT', '22/tcp ssh · 3389/tcp ms-wbt-server'], ['CMD', 'save evidence/10.0.0.23_services.txt']] },
  { id: 'pivot', name: 'FILE SERVER', ip: '10.0.0.11', kind: 'win', tone: 'amber', x: 662, y: 392, chip: 'IN PATH', sev: 'med', os: 'Windows Server 2019', agent: 'ad-attacker',
    finding: 'SMB signing enabled but not required', evidence: '$ smb2 · signing: enabled, not required',
    activity: [['CMD', 'nmap --script smb2-security-mode -p445 10.0.0.11'], ['OUT', 'Message signing enabled but not required'], ['CMD', 'record finding · medium']] },
  { id: 'dc', name: 'DC01 ★', ip: '10.0.0.10', kind: 'srv', tone: 'red', x: 886, y: 222, chip: 'TIER-0', sev: 'crit', os: 'Domain controller · corp.lab', agent: 'ad-attacker',
    finding: 'Delegation setting opens a path to tier-0', evidence: '$ ldap · userAccountControl: TRUSTED_FOR_DELEGATION',
    activity: [['CMD', 'collect domain graph · corp.lab (read-only)'], ['OUT', '1 host trusted for delegation · path to tier-0'], ['OUT', 'Stopped at proof · waiting for the operator']] },
  { id: 'nas', name: 'NAS-02', ip: '10.0.0.52', kind: 'idle', tone: 'idle', x: 690, y: 150, chip: 'IDLE' },
  { id: 'ws', name: 'WS-114', ip: '10.0.0.41', kind: 'idle', tone: 'idle', x: 470, y: 488, chip: 'IDLE' },
  { id: 'prn', name: 'PRINTER', ip: '10.0.0.60', kind: 'idle', tone: 'idle', x: 878, y: 470, chip: 'IDLE' },
];
// paths agents found: [from, to, label, colour]
const GEDGES: [string, string, string, string][] = [
  ['op', 'fw', '', 'green'], ['fw', 'entry', 'RDP exposed', 'amber'], ['entry', 'pivot', 'SMB signing off', 'amber'], ['pivot', 'dc', 'delegation → tier-0', 'red'],
];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const icon = (p: string, cls = '') => `<svg class="sa-i ${cls}" viewBox="0 0 20 20" aria-hidden="true">${p}</svg>`;
const LOGO = '<svg class="sa-logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#f5a524"/><path d="M16 7.5 23.5 11.6v8.8L16 24.5l-7.5-4.1v-8.8L16 7.5Zm-7.5 4.1L16 15.7l7.5-4.1M16 15.7v8.8" fill="none" stroke="#1a1206" stroke-width="1.9" stroke-linejoin="round"/></svg>';

// ---------- views ----------
function homeView() {
  const groups = (['Recon', 'AD', 'Web', 'Reporting'] as const).map((g) => [g.toUpperCase(), AGENTS.filter((a) => a.area === g)] as const);
  return `
  <section class="sa-home">
    <h1 class="sa-h1">Control plane</h1>
    <p class="sa-sub">Pick the agents, define the scope, set the rules and the goals. Then it runs <b>in the background</b>.</p>
    <div class="sa-runrow">
      <div class="sa-picker" data-pin="picker">
        <button class="sa-picker__btn" type="button" data-act="picker"><span><b data-pick-label>ad-attacker <em>+2</em></b><small data-pick-sub>3 agents selected · <em>review mode</em></small></span>${icon('<path d="m6 8 4 4 4-4"/>', 'sa-chev')}</button>
        <div class="sa-menu" data-menu hidden>
          <div class="sa-menu__search">${icon('<circle cx="9" cy="9" r="5"/><path d="m13 13 4 4"/>')}Search agents…</div>
          ${groups.map(([g, list]) => `<p class="sa-menu__g">${g}</p>${list.map((a) => `<button type="button" data-pick="${a.id}" class="sa-menu__it ${['ad-attacker', 'recon-advisor', 'report-generator'].includes(a.id) ? 'is-sel' : ''}"><span class="sa-badge ${a.mode === 'EXEC' ? 'is-exec' : ''}">${a.mode}</span><b>${a.id}</b><small>${esc(a.text)}</small></button>`).join('')}`).join('')}
        </div>
      </div>
      <label class="sa-target" data-pin="target"><span class="sa-target__l">SCOPE</span><input type="text" placeholder="10.10.10.0/24 or corp.lab" value="10.10.10.0/24 · corp.lab"><small>AUTH-2026-014 on file · everything else is out of scope</small></label>
    </div>
    <div class="sa-brief-box">
      <div class="sa-roe" data-pin="roe"><p class="sa-cap">RULES OF ENGAGEMENT</p>
        <div class="sa-roe__chips">${[['Non-destructive', 1], ['Rate-limited · 5 req/s', 1], ['No persistence', 1], ['Review mode: risky steps wait for me', 1], ['Business hours only', 0], ['Lab accounts only', 1]].map(([t, on]) => `<button type="button" class="sa-roe__c ${on ? 'is-on' : ''}" data-roe><i></i>${t}</button>`).join('')}</div>
      </div>
      <div class="sa-goals" data-pin="goals"><p class="sa-cap">GOALS</p>
        <p contenteditable="true" spellcheck="false">Map the exploitable paths inside the scope, prove each one and stop there, then deliver a findings report with a fix for every finding.</p>
      </div>
      <div class="sa-brief-box__foot"><span><kbd>⌘</kbd><kbd>↵</kbd> to run in background</span><span><button type="button" class="sa-ghost">Clear</button><button type="button" class="sa-run" data-act="run" data-pin="run">Run ↵</button></span></div>
    </div>
    <p class="sa-vpn">VPN <b>connected</b></p>
  </section>`;
}

function dashboardView() {
  const bars = [0.72, 0.16, 0.15, 0.16, 0.17, 0.24, 0.16, 0.15, 1, 0.8];
  return `
  <section class="sa-pad">
    <h1 class="sa-title">Engagement dashboard</h1><p class="sa-muted">1 running now · 16 runs across 7 targets</p>
    <div class="sa-tiles" data-pin="tiles">
      ${[['Active runs', 1, '9 completed', ''], ['Open findings', 50, '3 critical', 'crit'], ['Runs recorded', 16, '9 complete · 1 live', ''], ['Targets in scope', 7, '3 subnets · 4 hosts', '']].map(([l, n, s, c]) => `<div class="sa-tile"><p>${l}</p><b data-count="${n}">0</b><small class="${c ? 'is-' + c : ''}">${c ? '<i></i>' : ''}${s}</small></div>`).join('')}
    </div>
    <div class="sa-dash2">
      <div><div class="sa-hrow"><h2>Findings per run</h2><span class="sa-mono">Last 10 runs</span></div>
        <div class="sa-bars">${bars.map((b, i) => `<i style="--h:${b};--d:${i * 60}ms" class="${i === 9 ? 'is-hot' : ''}">${i === 9 ? '<em>8</em>' : ''}</i>`).join('')}</div>
        <div class="sa-hrow sa-muted"><small>10 runs ago</small><small>Latest</small></div></div>
      <div>
        <div class="sa-hrow"><h2>Open findings by severity</h2><span class="sa-link">View all →</span></div>
        <div class="sa-sev" data-pin="severity"><i style="--w:9%" class="c"></i><i style="--w:16%" class="h"></i><i style="--w:45%" class="m"></i><i style="--w:30%" class="l"></i></div>
        <p class="sa-legend-row"><span class="c">Critical <b>3</b></span><span class="h">High <b>6</b></span><span class="m">Medium <b>17</b></span><span class="l">Low <b>11</b></span></p>
        <div class="sa-hrow" style="margin-top:22px"><h2>Top attack paths</h2><span class="sa-link">Open map →</span></div>
        <div class="sa-paths" data-pin="paths">
          <p><span class="a">ad-attacker</span> → LAB-DC01 → <span class="a">tier-0 group</span><b class="crit">CRIT</b></p>
          <p><span class="a">web-hunter</span> → app.corp.lab → <span class="a">/admin/</span><b class="high">HIGH</b></p>
        </div>
      </div>
    </div>
    <h2 class="sa-h2">Recent runs</h2>
    <table class="sa-table" data-pin="runs"><thead><tr><th>Agent</th><th>Target</th><th>Status</th><th>Findings</th></tr></thead><tbody>
      <tr><td><b>web-hunter</b></td><td class="sa-mono">jobs.example.com</td><td><span class="sa-st is-run"><i></i>Running</span></td><td><i class="sa-dot c"></i>1 critical, 1 high, 3 medium, 2 low</td></tr>
      <tr><td><b>exploit-chainer</b></td><td class="sa-mono">10.10.90.0/24</td><td><span class="sa-st">■ Ended</span></td><td><i class="sa-dot c"></i>1 critical, 5 medium, 3 low</td></tr>
      <tr><td><b>recon-advisor</b></td><td class="sa-mono">10.10.20.0/24</td><td><span class="sa-st">✓ Complete</span></td><td class="sa-muted"><i class="sa-dot"></i>no findings</td></tr>
    </tbody></table>
  </section>`;
}

const HW: Record<GNode['kind'], number> = { op: 46, fw: 36, win: 42, srv: 42, idle: 42 };
const GN = Object.fromEntries(GNODES.map((n) => [n.id, n])) as Record<string, GNode>;
function edgePath(a: GNode, b: GNode) {
  const ax = a.x + HW[a.kind], ay = a.y, bx = b.x - HW[b.kind], by = b.y, dx = (bx - ax) * 0.55;
  // with these control points the curve's midpoint is exactly the chord's midpoint: labels sit on the line
  return { d: `M${ax} ${ay} C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`, mx: (ax + bx) / 2, my: (ay + by) / 2 };
}
function gEdge([a, b, label, c]: [string, string, string, string], i: number, motion: boolean) {
  const { d, mx, my } = edgePath(GN[a], GN[b]);
  const w = label.length * 6.3 + 18;
  return `<path class="sa-ge is-${c}" d="${d}" style="--d:${i * 0.2}s"/>`
    + (motion ? `<circle r="2.8" class="sa-pkt is-${c}"><animateMotion dur="${2.4 + i * 0.35}s" repeatCount="indefinite" path="${d}"/></circle>` : '')
    + (label ? `<g class="sa-gl is-${c}"><rect x="${mx - w / 2}" y="${my - 10}" width="${w}" height="20" rx="4"/><text x="${mx}" y="${my + 4}">${esc(label)}</text></g>` : '');
}
function gNode(n: GNode, sel: string) {
  const { x, y } = n;
  const card = (w: number, dy: number) => `<g class="lb"><rect x="${x - w / 2}" y="${y + dy}" width="${w}" height="34" rx="4"/><text x="${x}" y="${y + dy + 14}" class="nm">${esc(n.name)}</text><text x="${x}" y="${y + dy + 27}" class="ip">${n.ip}</text></g>`;
  const cls = `sa-gn is-${n.tone} k-${n.kind} ${n.id === sel ? 'is-sel' : ''}`;
  if (n.kind === 'op') return `<g class="${cls}" data-node="op">
      <text x="${x}" y="${y - 44}" class="role">OPERATOR</text>
      <rect class="fr" x="${x - 44}" y="${y - 32}" width="88" height="64" rx="6"/>
      <rect class="ln" x="${x - 19}" y="${y - 15}" width="38" height="24" rx="2"/><path class="ln" d="M${x - 26} ${y + 14}h52"/>
      <text x="${x - 9}" y="${y + 2}" class="pr">&gt;_</text>
      <text x="${x - 50}" y="${y + 62}" class="nm-l">DESKTOP-OPS</text><text x="${x + 50}" y="${y + 62}" class="id">ID: op-01</text>
      <line class="sep" x1="${x - 50}" x2="${x + 50}" y1="${y + 72}" y2="${y + 72}"/>
      <text x="${x - 50}" y="${y + 90}" class="pk">DATA PACKETS</text>
      <text x="${x - 50}" y="${y + 106}" class="pk dim">SENT</text><text x="${x - 6}" y="${y + 106}" class="pk dim">RECEIVED</text>
      <text x="${x - 50}" y="${y + 130}" class="cnt" data-cnt="sent">0</text><text x="${x - 6}" y="${y + 130}" class="cnt r" data-cnt="rcvd">0</text>
    </g>`;
  if (n.kind === 'fw') {
    let bricks = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const off = r % 2 ? -7 : 0, bx = x - 30 + c * 14 + off, w = Math.min(13, x + 31 - bx);
      if (bx < x - 31 || w < 4) continue;
      bricks += `<rect x="${bx}" y="${y - 2 + r * 8}" width="${w}" height="7" rx="1"/>`;
    }
    return `<g class="${cls}" data-node="fw">
      <path class="fl" d="M${x - 27} ${y - 2}c-4-12 2-20 9-26 0 7 3 10 6 11-1-13 6-24 14-28-2 10 2 17 7 20 3-6 8-9 12-10-3 8 4 14 4 22 0 4-1 8-3 11z"/>
      <path class="fl2" d="M${x - 12} ${y - 2}c-2-8 2-13 6-16 0 5 3 7 5 7 0-7 4-12 8-14-1 7 3 11 5 14 2 3 2 6 1 9z"/>
      <g class="br">${bricks}</g>${card(132, 38)}</g>`;
  }
  const logo = n.kind === 'srv'
    ? [0, 1, 2].map((k) => `<rect class="rk" x="${x - 17}" y="${y - 17 + k * 11}" width="34" height="8" rx="2"/><circle class="rkd" cx="${x - 11}" cy="${y - 13 + k * 11}" r="1.4"/><circle class="rkd" cx="${x - 6}" cy="${y - 13 + k * 11}" r="1.4"/>`).join('')
    : `<path class="wl" d="M${x - 13} ${y - 11}l11-1.6v10.6h-11zM${x} ${y - 12.9}l14-2v13.9h-14zM${x - 13} ${y + 1}h11v10.6l-11-1.6zM${x} ${y + 1}h14v13.9l-14-2z"/>`;
  return `<g class="${cls}" data-node="${n.id}" ${n.kind === 'idle' ? 'data-pin="idle"' : ''}>
    <rect class="fr" x="${x - 40}" y="${y - 30}" width="80" height="58" rx="3"/><rect class="sc" x="${x - 35}" y="${y - 25}" width="70" height="46" rx="1"/>
    ${logo}<circle class="led" cx="${x}" cy="${y + 24}" r="1.2"/>
    <rect class="st" x="${x - 5}" y="${y + 28}" width="10" height="6"/><rect class="st" x="${x - 18}" y="${y + 34}" width="36" height="3" rx="1.5"/>
    ${card(n.name.length > 10 ? 128 : 116, 42)}</g>`;
}
function explorerView(sel = 'entry') {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const active = ['entry', 'pivot', 'dc'];
  return `
  <section class="sa-explorer">
    <div class="sa-map">
      <div class="sa-zoom"><button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Zoom out">−</button><button type="button" aria-label="Fit">⊡</button></div>
      <svg class="sa-map__svg" viewBox="0 0 980 600" preserveAspectRatio="xMidYMid meet" aria-label="Attack-surface graph">
        <defs>
          <linearGradient id="sa-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e5484d"/><stop offset=".55" stop-color="#f76b15"/><stop offset="1" stop-color="#ffcf6b"/></linearGradient>
        </defs>
        <g class="sa-subnet"><rect x="396" y="92" width="572" height="482" rx="14"/></g>
        <g class="sa-idle-links">${[['nas', 'entry'], ['ws', 'pivot'], ['prn', 'dc']].map(([a, b]) => `<line x1="${GN[a].x}" y1="${GN[a].y}" x2="${GN[b].x}" y2="${GN[b].y}"/>`).join('')}</g>
        ${GNODES.filter((n) => n.kind === 'idle').map((n) => gNode(n, sel)).join('')}
        <path class="sa-ge is-green" d="${edgePath(GN.op, GN.fw).d}"/>
        <g class="sa-perim" data-pin="perimeter"><line x1="214" y1="104" x2="214" y2="560"/><text x="214" y="94">PERIMETER</text>${gNode(GN.fw, sel)}</g>
        <text class="sa-subnet__t" x="412" y="112" data-pin="perimeter">DOMAIN SUBNET · corp.lab · 10.0.0.0/24</text>
        <g data-pin="paths">${GEDGES.slice(1).map((e, i) => gEdge(e, i + 1, motion)).join('')}${active.map((id) => gNode(GN[id], sel)).join('')}</g>
        <g data-pin="operator">${gNode(GN.op, sel)}</g>
      </svg>
    </div>
    <aside class="sa-insp" data-pin="sidecard">${inspector(sel)}</aside>
  </section>`;
}
const SEV: Record<Sev, string> = { info: 'Info', low: 'Low', med: 'Medium', crit: 'Critical' };
function inspector(id: string) {
  const n = GN[id];
  const head = `<button type="button" class="sa-x" aria-label="Close">×</button>
    <h2 class="sa-mono sa-insp__t">${n.kind === 'op' ? n.name : n.ip}</h2><p class="sa-mono sa-muted">${n.kind === 'op' ? n.ip : n.name}</p>
    <span class="sa-chip is-${n.kind === 'idle' ? 'idle' : n.sev ?? 'op'}">${n.chip}</span>`;
  if (n.kind === 'idle') return `${head}
    <p class="sa-cap">PROPERTIES</p>
    <dl class="sa-props"><dt>severity</dt><dd class="dim">none</dd><dt>host</dt><dd>${n.ip}</dd><dt>os</dt><dd class="dim">not fingerprinted</dd><dt>agent</dt><dd class="dim">none assigned</dd></dl>
    <p class="sa-cap">WHY IT IS GREY</p>
    <div class="sa-finding is-idle"><b>No agent is working on this asset.</b><p>It answered the sweep but sits on no path the agents found, so it stays grey until one leads here.</p></div>`;
  return `${head}
    <p class="sa-cap">PROPERTIES</p>
    <dl class="sa-props"><dt>severity</dt><dd class="sv-${n.sev ?? 'op'}">${n.sev ? SEV[n.sev] : 'n/a'}</dd><dt>host</dt><dd>${n.kind === 'op' ? n.name : n.ip}</dd><dt>os</dt><dd>${n.os}</dd><dt>agent</dt><dd class="a">${n.agent}</dd></dl>
    <p class="sa-cap">FINDING</p>
    <div class="sa-finding sv-${n.sev ?? 'op'}"><p><i></i>${n.sev ? SEV[n.sev].toUpperCase() + ' FINDING' : 'ENGAGEMENT'}</p><b>${esc(n.finding!)}</b></div>
    <p class="sa-cap">EVIDENCE</p>
    <pre class="sa-pre"><span>$</span>${esc(n.evidence!.slice(1))}</pre>
    <p class="sa-cap sa-cap--row">ACTIVITY <span class="sa-live"><i></i>${n.agent === 'you' ? 'operator session' : n.agent + ' working'}</span></p>
    <ul class="sa-act">${n.activity!.map(([k, t], i) => `<li style="--d:${i * 0.35 + 0.2}s"><span class="k-${k.toLowerCase()}">${k}</span><code>${esc(t)}</code></li>`).join('')}</ul>`;
}

const ACTIVITY = [
  ['note', 'Scope confirmed: jobs.example.com. Rules: non-destructive, rate-limited, review mode.'],
  ['cmd', '$ nmap · service scan · jobs.example.com'],
  ['note', 'Split into 4 subagents. endpoint-mapper and auth-review now running in parallel.'],
  ['cmd', '$ httpx · headers · 14 endpoints'],
  ['act', '▸ Record finding  verbose error page leaks a local path (medium)'],
  ['note', 'feroxbuster is not installed. Asking the operator to approve it.'],
  ['ok', '✓ Operator added a parameter: include the staging API'],
  ['cmd', '$ nuclei · templates: exposures · rate 5/s'],
  ['act', '▸ Write REPORT.md'],
  ['note', 'Report complete: 1 critical, 1 high, 3 medium, 2 low. Evidence saved with each finding.'],
  ['turn', '— turn complete · awaiting your reply —'],
];
const TOOLS = ['nmap', 'rustscan', 'ghidra', 'netscan', 'httpx', 'nuclei'];
const SUBAGENTS: [string, string][] = [['endpoint-mapper', 'run'], ['auth-review', 'run'], ['header-check', 'done'], ['report-draft', 'wait']];
function liveView() {
  return `
  <section class="sa-pad sa-war">
    <div class="sa-war__h"><h1 class="sa-title">War room</h1><p class="sa-muted">Steer the simulation while it runs. Agents split the work and run in parallel.</p></div>
    <div class="sa-tools" data-pin="tools">
      <span class="sa-tools__l">TOOLS IN USE</span>
      ${TOOLS.map((t, i) => `<span class="sa-tool" data-tool="${i}">${t}</span>`).join('')}
      <span class="sa-tool is-ask" data-act="approve-tool"><b>+ feroxbuster</b> wants to install · <u>Approve</u></span>
    </div>
    <div class="sa-runcard">
      <header class="sa-runcard__h">
        <p class="sa-mono" data-pin="run-head"><i class="sa-blip"></i><b>web-hunter</b> <span class="sa-muted">·</span> <b>jobs.example.com</b></p>
        <nav class="sa-tabs" data-pin="tabs"><button type="button" class="is-on" data-tab="activity">Activity <small>short</small></button><button type="button" data-tab="terminal">Terminal <small>full detail</small></button><span class="sa-ro">VIEW ONLY</span></nav>
        <span class="sa-mono sa-muted sa-await">AWAITING REPLY</span>
      </header>
      <div class="sa-subs" data-pin="subagents"><span class="sa-subs__l"><b>web-hunter</b> → ${SUBAGENTS.length} subagents</span>${SUBAGENTS.map(([n, s]) => `<span class="sa-sub-a is-${s}"><i></i>${n}</span>`).join('')}<span class="sa-sub-a is-more">+ more on demand</span></div>
      <div class="sa-runcard__b">
        <div class="sa-feed" data-feed="activity"></div>
        <div class="sa-term" data-feed="terminal" hidden>
          <p class="sa-term__h"><b>S-02</b> 10:08:51 web-hunter › endpoint-mapper <span>4s</span></p>
          <pre>$ nmap -sT -sV -n --host-timeout 3m -p 80,443,8080 jobs.example.com -oN evidence/services.txt

PORT     STATE SERVICE  VERSION
80/tcp   open  http     nginx
443/tcp  open  ssl/http nginx
8080/tcp closed http-proxy</pre>
          <p class="sa-term__h"><b>S-03</b> 10:10:23 web-hunter › auth-review <span>0s</span></p>
          <pre>$ cd /root/engagement/runs/20261116-093244_web-hunter_jobs.example.com_001/evidence
curl -s -I --connect-timeout 10 https://jobs.example.com -o home_https_headers.txt
wc -l home_https_headers.txt

22 home_https_headers.txt</pre>
        </div>
      </div>
      <div data-pin="reply">
        <button type="button" class="sa-reply" data-act="reply"><span>💬 Steer the run: add a parameter, change direction, or answer the agent</span><small>click to expand</small><i>⌃</i></button>
        <div class="sa-replybox" hidden><p contenteditable="true">Also check the staging API, keep it rate-limited, and stop at proof for the critical.</p><button type="button" class="sa-run" data-act="send">Send</button></div>
      </div>
      <footer class="sa-runcard__f">
        <span data-pin="stats"><span class="sa-pill sa-mono">39m 32s <small>elapsed</small></span><span class="sa-pill sa-mono">9 <small>turns</small></span><span class="sa-pill sa-mono">$3.35</span></span>
        <span data-pin="outputs"><button type="button" class="sa-ghost-btn" data-act="arch">⌬ Architecture graph</button><button type="button" class="sa-run" data-act="open-report">✓ Report ready</button><button type="button" class="sa-stop">□ Stop</button></span>
      </footer>
    </div>
  </section>`;
}

function agentsView(filter = 'All') {
  const list = filter === 'All' ? AGENTS : AGENTS.filter((a) => a.area === filter);
  return `
  <section class="sa-pad">
    <h1 class="sa-title">Agents</h1><p class="sa-muted">52 specialist agents, browsable by work area. They self-select from the words in your prompt.</p>
    <nav class="sa-areas" data-pin="areas">${AREAS.map(([a, n]) => `<button type="button" data-area="${a}" class="${a === filter ? 'is-on' : ''}">${a} <small>${n}</small></button>`).join('')}</nav>
    <div class="sa-cards">${list.length ? list.map((a) => `
      <button type="button" class="sa-card" data-agent="${a.id}" ${a.id === 'ad-attacker' ? 'data-pin="card-ad"' : ''}>
        <span class="sa-card__h"><b class="sa-mono">${a.id}</b><span class="sa-area">${a.area}</span><span class="sa-badge ${a.mode === 'EXEC' ? 'is-exec' : ''}" ${a.id === 'ad-attacker' ? 'data-pin="mode"' : ''}>${a.mode}</span></span>
        <span class="sa-card__t">${esc(a.text)}</span>
        <span class="sa-card__k">auto-dispatched when prompt mentions: ${a.keys.map((k) => `<b>${k}</b>`).join(', ')}</span>
      </button>`).join('') : '<p class="sa-empty">This concept view shows 8 of the 52 agents. Pick All to see them.</p>'}
    </div>
  </section>`;
}
function agentModal(id: string, tab = 'summary') {
  const a = AGENTS.find((x) => x.id === id)!;
  return `
  <div class="sa-modal" role="dialog" aria-label="${a.id}">
    <div class="sa-modal__card">
      <header><b class="sa-mono">${a.id}</b><span class="sa-area">${a.area === 'AD' ? 'Active Directory' : a.area}</span><span class="sa-badge ${a.mode === 'EXEC' ? 'is-exec' : ''}">${a.mode}</span><button type="button" class="sa-x" data-act="close-modal" aria-label="Close">×</button></header>
      <nav class="sa-tabs sa-tabs--u"><button type="button" class="${tab === 'summary' ? 'is-on' : ''}" data-mtab="summary">Summary</button><button type="button" class="${tab === 'details' ? 'is-on' : ''}" data-mtab="details">Details</button></nav>
      ${tab === 'summary' ? `
        <p class="sa-cap">WHAT IT DOES</p><p class="sa-lead">${esc(a.text)} Under authorization, stopping at proof of concept.</p>
        <p class="sa-cap">CAPABILITIES</p><ul class="sa-caps">${a.caps.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        <p class="sa-cap">AUTO-DISPATCHED WHEN THE PROMPT MENTIONS</p><p class="sa-chips">${a.keys.map((k) => `<span>${k}</span>`).join('')}</p>`
      : `
        <p class="sa-cap">FULL AGENT DEFINITION</p>
        <p class="sa-lead">You are an expert tester for <b>authorized</b> engagements. You evidence impact using industry-standard tools, and you execute commands only within an authorized scope.</p>
        <div data-pin="scope"><h3 class="sa-h3">Scope Enforcement (MANDATORY)</h3><p class="sa-b">Before executing ANY command against a target:</p>
        <ol class="sa-ol"><li>Ask the user to declare the authorized scope.</li><li>Ask for the engagement type.</li><li>Store the scope declaration for the session.</li><li>Confirm whether destructive actions are authorized, and require explicit operator approval before any destructive step. No persistence beyond the engagement.</li></ol></div>`}
    </div>
  </div>`;
}

const REPORTS = [
  ['web-hunter', 'jobs.example.com', 'Live · Nov 16 09:32 AM · 9 turns', '1 critical, 1 high, 3 medium, 2 low', 'c'],
  ['exploit-chainer', '10.10.90.0/24', 'Ended · Nov 13 03:41 PM · 4 turns', '1 critical, 5 medium, 3 low', 'c'],
  ['recon-advisor', '10.10.20.0/24', 'Nov 13 02:37 PM · 2 turns', 'no findings', ''],
  ['report-generator', '127.0.0.1', 'Nov 13 02:30 PM · 1 turn', 'no findings', ''],
  ['report-generator', '127.0.0.1', 'Nov 13 12:21 PM · 1 turn', '1 low', 'l'],
  ['recon-advisor', '10.10.90.0/24', 'Nov 13 11:17 AM · 1 turn', 'no findings', ''],
];
function reportsView() {
  return `
  <section class="sa-pad">
    <h1 class="sa-title">Reports</h1><p class="sa-muted">One write-up for each run: findings map, agent reports and the full work timeline.</p>
    <ul class="sa-reports" data-pin="reports-list">${REPORTS.map(([a, t, meta, f, c], i) => `
      <li><div><b>${a} · ${t}</b><small class="sa-mono">${meta}</small></div><span class="${c ? 'has' : 'sa-muted'}"><i class="sa-dot ${c}"></i>${f}</span><button type="button" class="sa-ghost-btn" data-act="open-report" ${i === 1 ? 'data-pin="view-report"' : ''}>View report</button></li>`).join('')}
    </ul>
  </section>`;
}
function reportView(tab = 'report') {
  const boxes = [
    ['m', 'MEDIUM: Lab dev server exposed on LAN, verbose stack trace leaks local path'],
    ['i', 'INFO: Remote-access client reachable on LAN'],
    ['l', 'LOW: SMB signing enabled but not required'],
    ['c', 'CRITICAL: Anonymous file-share access on LAB-DC01'],
    ['m', 'MEDIUM: Password-reset wizard disclosed before login'],
  ];
  return `
  <section class="sa-console">
    <header class="sa-console__h"><span>${LOGO}<b>Agent Console</b><span class="sa-st is-run"><i></i>Ended</span></span><span class="sa-console__nav"><button type="button" class="${tab === 'report' ? 'is-on' : ''}" data-rtab="report">Report</button><button type="button" class="${tab === 'artifacts' ? 'is-on' : ''}" data-rtab="artifacts" data-pin="artifacts">Artifacts</button><button type="button" data-act="back-reports">← All reports</button></span></header>
    ${tab === 'report' ? `
    <h1 class="sa-h1 sa-h1--l">exploit-chainer · 10.10.90.0/24</h1>
    <p class="sa-muted">11/13/2026, 3:41:41 PM · 41m 12s · review mode · 4 turns</p>
    <div class="sa-tiles sa-tiles--4" data-pin="rtiles">${[['FINDINGS', '13'], ['CRITICAL · HIGH', '<span class="c">1</span> · 0'], ['AGENTS', '1'], ['COST', '$2.10']].map(([l, v]) => `<div class="sa-tile"><p class="sa-cap">${l}</p><b>${v}</b></div>`).join('')}</div>
    <p class="sa-cap">ENGAGEMENT</p>
    <dl class="sa-eng" data-pin="rules"><dt>AGENT</dt><dd>exploit-chainer</dd><dt>SCOPE</dt><dd>10.10.90.0/24</dd><dt>RULES</dt><dd>non-destructive · evidence-only · no persistence</dd><dt>PERMISSION</dt><dd>review (operator approves risky steps)</dd><dt>SAVED TO</dt><dd>C:\\Users\\lab\\Desktop\\Agent-Console-Results\\20261113-154141_exploit-chainer_10.10.90.0-24_001</dd></dl>
    <p class="sa-cap">FINDINGS MAP <small>produced by the agent</small></p>
    <div class="sa-fmap" data-pin="fmap">
      <span class="sa-fmap__t">TARGET: 10.10.90.0/24</span>
      <div class="sa-fmap__hosts">${['HOST 10.10.90.6', 'HOST 10.10.90.120 (LAB-WS02)', 'HOST 10.10.90.139 (LAB-DC01)', 'HOST 10.10.90.253 (lab gateway)'].map((h) => `<span>${h}</span>`).join('')}</div>
      <div class="sa-fmap__f">${boxes.map(([c, t], i) => `<span class="${c}" style="--d:${i * 90}ms">${t}</span>`).join('')}</div>
    </div>` : `
    <p class="sa-cap">ARTIFACTS <small>Click a file to open</small></p>
    <div class="sa-art"><ul>${[['agents.json', '261B'], ['cfg.json', '619B'], ['events.jsonl', '467.5KB'], ['final-report.md', '213B'], ['findings.json', '1.5KB'], ['findings.md', '1.1KB'], ['prompt.txt', '2.4KB'], ['README.txt', '490B'], ['reports.json', '13.5KB'], ['run.json', '14.9KB'], ['terminal.log', '48.2KB'], ['transcript.md', '24.1KB']].map(([f, s], i) => `<li class="${i === 6 ? 'is-on' : ''}"><span>${f}</span><small>${s}</small></li>`).join('')}</ul>
    <pre class="sa-pre sa-pre--l">{
  "note": "SYNTHETIC lab share · canary files only, no real user data",
  "access": "guest (read) · write denied",
  "files": [
    { "path": "canary_share/CANARY_do-not-exfil.txt", "pii": "none (synthetic)" },
    { "path": "canary_share/README_synthetic.txt", "pii": "none (synthetic)" }
  ],
  "retention": "encrypted at rest · purged at engagement close"
}</pre></div>
    <p class="sa-muted sa-small">Loot contains synthetic canary files only · PII redacted · evidence encrypted at rest and purged at engagement close.</p>`}
  </section>`;
}

// ---------- mount ----------
/**
 * Mount the console for fleet `start`. When the visitor moves to a screen that belongs to another
 * fleet (from the sidebar, or a button inside the app), the tour follows: pins, legend and spotlight
 * switch, and `onFleet` lets the page update everything around the console.
 */
export function mountApp(host: HTMLElement, tours: Tour[], start: number, legend: HTMLOListElement, onFleet?: (i: number) => void) {
  let fleet = start;
  let tour = tours[start];
  // the report list belongs to the reporting fleet, like the report itself
  const fleetOf = (s: Screen) => tours.findIndex((t) => t.screen === (s === 'reports' ? 'report' : s));
  host.innerHTML = `
  <div class="sa-scale"><div class="sa-win" style="width:${W}px;height:${H}px">
    <div class="sa-chrome"><i></i><i></i><i></i><span class="sa-url">${icon('<rect x="5" y="9" width="10" height="7" rx="1.5"/><path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2"/>')}127.0.0.1:7777 <em>· localhost only</em></span><span class="sa-chrome__r">shadowAD console · concept</span></div>
    <div class="sa-app">
      <nav class="sa-side" aria-label="shadowAD">
        <p class="sa-brand">${LOGO}<b>shadow<span>AD</span></b></p>
        ${(['OPERATE', 'REFERENCE'] as const).map((g) => `<p class="sa-side__g">${g}</p>${NAV.filter((n) => n.group === g).map((n) => `<button type="button" class="sa-nav" data-nav="${n.id}">${icon(n.icon)}<span>${n.label}</span>${n.badge ? `<em class="${n.badge === 'map' ? 'is-map' : ''}">${n.badge}</em>` : ''}</button>`).join('')}`).join('')}
        <p class="sa-side__f"><i></i>Engine online · 52 agents</p>
      </nav>
      <div class="sa-main">
        <header class="sa-top"><button type="button" class="sa-railbtn" data-act="rail" aria-label="Toggle sidebar">${icon('<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M8 4v12"/>')}</button><span class="sa-search">${icon('<circle cx="9" cy="9" r="5"/><path d="m13 13 4 4"/>')}Search runs, hosts, findings<kbd>⌘K</kbd></span><button type="button" class="sa-new" data-act="new">+ New run</button></header>
        <div class="sa-view" data-view></div>
      </div>
    </div>
    <div class="sa-pins" aria-hidden="true"></div>
    <div class="sa-toast" role="status" hidden></div>
    <div class="sa-scan" aria-hidden="true"></div>
  </div></div>`;
  const scaleBox = host.querySelector<HTMLElement>('.sa-scale')!;
  const win = host.querySelector<HTMLElement>('.sa-win')!;
  const view = host.querySelector<HTMLElement>('[data-view]')!;
  const pinsBox = host.querySelector<HTMLElement>('.sa-pins')!;
  const toast = host.querySelector<HTMLElement>('.sa-toast')!;
  const appEl = host.querySelector<HTMLElement>('.sa-app')!;
  let railPinned = false;
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => { timers.push(window.setTimeout(f, ms)); };
  let screen: Screen = tour.screen;
  let scale = 1;

  // fit the fixed-size window to the space it has
  const fit = () => {
    const avail = host.clientWidth;
    // fit inside the box both ways (the panel is exactly one screen tall); on a phone, never below
    // half size: the window scrolls sideways instead of shrinking to a thumbnail
    const availH = host.clientHeight || H;
    const narrow = matchMedia('(max-width: 980px)').matches;
    scale = narrow ? Math.max(Math.min(1, avail / W), 0.5) : Math.min(1.3, avail / W, availH / H);   // large screens may grow it
    scaleBox.style.width = `${W * scale}px`;
    win.style.transform = `scale(${scale})`;
    scaleBox.style.height = `${H * scale}px`;
    placePins();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);

  // pins: numbered markers over the parts of the screen the tour explains
  function placePins() {
    pinsBox.innerHTML = '';
    // a note opened by click stays open across a resize or a re-render of the same screen
    const keep = !guided && cur != null && screen === tour.screen ? cur : pendingOpen;
    pendingOpen = null;
    hot(null);
    if (screen !== tour.screen) { legend.classList.add('is-away'); return; }
    if (view.querySelector('.sa-modal')) return;   // a modal covers what the pins point at
    legend.classList.remove('is-away');
    const wr = win.getBoundingClientRect();
    tour.pins.forEach((p, k) => {
      const el = win.querySelector<HTMLElement | SVGElement>(`[data-pin="${p.at}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const b = document.createElement('span');
      b.className = 'sa-pin';
      b.textContent = String(k + 1);
      b.style.left = `${(r.left - wr.left) / scale}px`;
      b.style.top = `${(r.top - wr.top) / scale}px`;
      b.style.animationDelay = `${k * 120}ms`;
      b.dataset.k = String(k);
      pinsBox.append(b);
    });
    if (keep != null && !guided) hot(keep);
  }
  const drawLegend = () => {
    legend.innerHTML = tour.pins.map((p, k) => `<li data-k="${k}" style="--d:${k * 60}ms"${guided ? '' : ' tabindex="0" role="button"'}><span>${k + 1}</span><div><b>${p.title}</b><p>${p.text}</p></div></li>`).join('');
  };

  // Guide mode. On (default): pointing at a part of the console spotlights it. Off: only the numbers
  // show; a number grows under the pointer and a click opens its spotlight and note, with a close button.
  // a touch screen cannot hover, so it starts with tap-to-open notes
  let guided = matchMedia('(hover: hover)').matches;
  try { const m = localStorage.getItem('sb-guide'); if (m) guided = m !== 'click'; } catch { /* storage blocked: keep the default */ }
  let pendingOpen: number | null = null;
  const guide = document.createElement('div');
  guide.className = 'sa-guide';
  guide.innerHTML = `<button type="button" role="switch" class="sa-switch" data-guide><i aria-hidden="true"></i><span>Highlight on hover</span></button>`;
  legend.before(guide);
  const guideBtn = guide.querySelector<HTMLButtonElement>('[data-guide]')!;
  const applyGuide = () => {
    guideBtn.setAttribute('aria-checked', String(guided));
    win.classList.toggle('is-click', !guided);
    legend.classList.toggle('is-click', !guided);
    drawLegend();
  };
  guideBtn.addEventListener('click', () => {
    guided = !guided;
    try { localStorage.setItem('sb-guide', guided ? 'hover' : 'click'); } catch { /* fine */ }
    clearTimeout(offTimer); offTimer = 0;
    hot(null);
    applyGuide();
  });

  // hovering a numbered region (or its pin, or its legend entry) spotlights it and says what it does
  const hl = document.createElement('div');
  hl.className = 'sa-hl';
  hl.setAttribute('aria-hidden', 'true');
  // the explanation sits in its own layer, above the numbered pins
  const tipEl = document.createElement('div');
  tipEl.className = 'sa-tipl';
  win.append(hl, tipEl);
  const off = () => { hl.classList.remove('is-on'); tipEl.classList.remove('is-on'); };
  let cur: number | null = null;
  function hot(k: number | null) {
    cur = k;
    pinsBox.querySelectorAll('.sa-pin').forEach((b) => b.classList.toggle('is-hot', (b as HTMLElement).dataset.k === String(k)));
    legend.querySelectorAll('li').forEach((li) => li.classList.toggle('is-hot', li.dataset.k === String(k)));
    const els = k == null || screen !== tour.screen || view.querySelector('.sa-modal') ? [] : [...win.querySelectorAll(`[data-pin="${tour.pins[k].at}"]`)];
    if (!els.length) { off(); return; }
    const wr = win.getBoundingClientRect(), pad = 7;
    const rs = els.map((e) => { const r = e.getBoundingClientRect(); return { x: (r.left - wr.left) / scale - pad, y: (r.top - wr.top) / scale - pad, w: r.width / scale + pad * 2, h: r.height / scale + pad * 2 }; })
      // clip to the window, below its title bar
      .map((r) => { const x0 = Math.max(4, r.x), y0 = Math.max(38, r.y), x1 = Math.min(W - 4, r.x + r.w), y1 = Math.min(H - 4, r.y + r.h); return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }; })
      .filter((r) => r.w > 0 && r.h > 0);
    if (!rs.length) { off(); return; }
    const p = tour.pins[k!];
    hl.innerHTML = `<svg width="${W}" height="${H}"><defs><mask id="sa-hlm"><rect width="${W}" height="${H}" fill="#fff"/>${rs.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="#000"/>`).join('')}</mask></defs><rect width="${W}" height="${H}" fill="rgba(4,4,6,.6)" mask="url(#sa-hlm)"/></svg>`
      + rs.map((r) => `<i style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></i>`).join('');
    tipEl.innerHTML = `<div class="sa-tip"${guided ? '' : ' role="dialog" aria-label="' + esc(p.title) + '"'}><span>${k! + 1}</span><b>${esc(p.title)}</b><p>${esc(p.text)}</p>`
      + (guided ? '' : `<button type="button" class="sa-tip__x" data-act="tip-close" aria-label="Close note">${icon('<path d="m6 6 8 8M14 6l-8 8"/>')}</button>`) + '</div>';
    tipEl.classList.remove('is-on'); void tipEl.offsetWidth; tipEl.classList.add('is-on');
    const tip = tipEl.querySelector<HTMLElement>('.sa-tip')!, r0 = rs[0];
    const th = tip.offsetHeight, tw = 300;
    // beside the region if it is tall, under it if there is room, otherwise above
    let tx = r0.x, ty = r0.y + r0.h + 10;
    if (r0.h > H * 0.55) { tx = r0.x + r0.w + 12 > W - tw - 8 ? r0.x - tw - 12 : r0.x + r0.w + 12; ty = r0.y + 24; }
    else if (ty + th > H - 8) ty = r0.y - th - 10;
    tip.style.left = `${Math.min(Math.max(10, tx), W - tw - 10)}px`;
    tip.style.top = `${Math.min(Math.max(44, ty), H - th - 8)}px`;
    hl.classList.add('is-on');
  }
  // Which region is under the pointer, by rectangle, not by the element underneath: SVG groups have
  // unpainted gaps between their nodes and lines, and the window's tilt slides edges under a still
  // pointer, so element hit-testing flickered on and off. The smallest region containing the point wins.
  const hitTest = (x: number, y: number): number | null => {
    if (screen !== tour.screen || view.querySelector('.sa-modal')) return null;
    const under = document.elementFromPoint(x, y);
    const wr = win.getBoundingClientRect();
    if (x < wr.left || x > wr.right || y < wr.top || y > wr.bottom || under?.closest('.sa-menu')) return null;
    const pin = under?.closest<HTMLElement>('.sa-pin');
    if (pin) return +pin.dataset.k!;
    const inside = (k: number, pad: number) => {
      let area = Infinity;
      win.querySelectorAll(`[data-pin="${tour.pins[k].at}"]`).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) area = Math.min(area, r.width * r.height);
      });
      return area;
    };
    let best: number | null = null, bestA = Infinity;
    tour.pins.forEach((_, k) => { const a = inside(k, 6 * scale); if (a < bestA) { bestA = a; best = k; } });
    // hysteresis: a lit region stays lit until the pointer is clearly outside it (the tilt moves edges)
    if (best == null && cur != null && inside(cur, 26 * scale) < Infinity) return cur;
    return best;
  };
  // a short grace before switching off, so brushing past a gap or an edge does not blink
  let offTimer = 0, px = 0, py = 0, queued = false;
  const want = (k: number | null) => {
    if (k === cur) { clearTimeout(offTimer); offTimer = 0; return; }
    if (k == null) { if (!offTimer) offTimer = window.setTimeout(() => { offTimer = 0; hot(null); }, 220); return; }
    clearTimeout(offTimer); offTimer = 0;
    hot(k);
  };
  win.addEventListener('pointermove', (e) => {
    if (!guided) return;
    px = e.clientX; py = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; if (guided) want(hitTest(px, py)); });
  });
  win.addEventListener('pointerleave', () => { if (guided) want(null); });
  // with hover off, a legend entry only points at its number; with it on, it spotlights the region
  const peek = (k: number | null) => pinsBox.querySelectorAll<HTMLElement>('.sa-pin').forEach((b) => b.classList.toggle('is-peek', b.dataset.k === String(k)));
  legend.addEventListener('pointerover', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (guided) want(li ? +li.dataset.k! : null); else peek(li ? +li.dataset.k! : null);
  });
  legend.addEventListener('pointerleave', () => { if (guided) want(null); else peek(null); });
  // click mode: a number (on the screen or in the legend) opens its note; the same number again closes it
  const openNote = (k: number) => { hot(cur === k ? null : k); if (cur != null) tipEl.querySelector<HTMLElement>('.sa-tip__x')?.focus({ preventScroll: true }); };
  legend.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (screen !== tour.screen) { if (!guided && li) pendingOpen = +li.dataset.k!; go(tour.screen); return; }
    if (!guided && li) openNote(+li.dataset.k!);
  });
  legend.addEventListener('keydown', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (guided || !li || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); li.click();
  });
  // Esc closes an open note first; the next Esc closes the panel
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || guided || cur == null) return;
    e.stopImmediatePropagation();
    const k = cur; hot(null);
    legend.querySelector<HTMLElement>(`li[data-k="${k}"]`)?.focus({ preventScroll: true });
  };
  window.addEventListener('keydown', onKey, true);
  applyGuide();

  // ---------- screens ----------
  function render(s: Screen, sub?: string) {
    screen = s;
    const f = fleetOf(s);
    if (f >= 0 && f !== fleet) {
      fleet = f; tour = tours[f];
      hot(null);
      drawLegend();
      legend.classList.remove('is-swap'); void legend.offsetWidth; legend.classList.add('is-swap');
      onFleet?.(f);
    }
    win.querySelectorAll('.sa-nav').forEach((b) => b.classList.toggle('is-on', (b as HTMLElement).dataset.nav === (s === 'report' ? 'reports' : s)));
    view.classList.remove('is-in');
    view.innerHTML = s === 'home' ? homeView() : s === 'dashboard' ? dashboardView() : s === 'explorer' ? explorerView(sub)
      : s === 'live' ? liveView() : s === 'agents' ? agentsView(sub) : s === 'reports' ? reportsView() : reportView(sub);
    // the graph wants the room: the sidebar folds to an icon rail there, as in the product
    appEl.classList.toggle('is-rail', s === 'explorer' || railPinned);
    void view.offsetWidth;
    view.classList.add('is-in');
    if (s === 'dashboard') countUp();
    if (s === 'live') { streamFeed(); cycleTools(); }
    if (s === 'explorer') packets();
    if (s === 'agents' && tour.agent && s === tour.screen && !sub) view.insertAdjacentHTML('beforeend', agentModal(tour.agent, tour.tab));
    requestAnimationFrame(() => requestAnimationFrame(placePins));
  }
  const go = (s: Screen, sub?: string) => { timers.splice(0).forEach(clearTimeout); render(s, sub); };

  function countUp() {
    view.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const n = +el.dataset.count!; let k = 0;
      const step = () => { k++; el.textContent = String(Math.round((n * k) / 18)); if (k < 18) later(28, step); };
      later(250, step);
    });
  }
  function streamFeed() {
    const feed = view.querySelector<HTMLElement>('[data-feed="activity"]')!;
    ACTIVITY.forEach(([kind, text], i) => later(300 + i * 420, () => {
      const p = document.createElement('p');
      p.className = `sa-line is-${kind}`;
      p.textContent = text;
      feed.append(p);
      feed.scrollTop = feed.scrollHeight;
    }));
  }
  // the operator's packet counters tick while agents work
  function packets() {
    let sent = 0, rcvd = 0;
    const s = view.querySelector('[data-cnt="sent"]'), r = view.querySelector('[data-cnt="rcvd"]');
    const tick = () => {
      sent += 1 + Math.floor(Math.random() * 7); if (Math.random() < 0.3) rcvd += 1;
      if (s) s.textContent = String(sent); if (r) r.textContent = String(rcvd);
      later(sent < 200 ? 90 : 700, tick);
    };
    later(500, tick);
  }
  // the tool strip lights whichever tool the agents are driving right now
  function cycleTools() {
    const ts = [...view.querySelectorAll<HTMLElement>('[data-tool]')];
    let k = 0;
    const step = () => { ts.forEach((t, i) => t.classList.toggle('is-run', i === k % ts.length || i === (k + 2) % ts.length)); k++; later(1500, step); };
    step();
  }
  const say = (t: string) => { toast.textContent = t; toast.hidden = false; toast.classList.remove('is-on'); void toast.offsetWidth; toast.classList.add('is-on'); later(2600, () => { toast.hidden = true; }); };

  win.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-act="tip-close"]')) { hot(null); return; }
    const pin = t.closest<HTMLElement>('.sa-pin');
    if (pin) { if (!guided) openNote(+pin.dataset.k!); return; }
    if (t.closest('.sa-tip')) return;
    const nav = t.closest<HTMLElement>('[data-nav]'); if (nav) { go(nav.dataset.nav as Screen); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'new') { go('home'); return; }
    if (act === 'picker') { const m = view.querySelector<HTMLElement>('[data-menu]')!; m.hidden = !m.hidden; return; }
    if (act === 'rail') { railPinned = !appEl.classList.contains('is-rail'); appEl.classList.toggle('is-rail', railPinned); requestAnimationFrame(placePins); return; }
    if (act === 'approve-tool') {
      const b = t.closest<HTMLElement>('[data-act]')!;
      b.outerHTML = '<span class="sa-tool is-new is-run">feroxbuster</span>';
      say('Approved: feroxbuster installed for this run only and logged to the audit trail.');
      return;
    }
    if (act === 'send') { view.querySelector<HTMLElement>('.sa-replybox')!.hidden = true; say('Sent. The agents pick up the new parameter on their next step.'); return; }
    if (act === 'arch') { say('Drawing the architecture graph from this run…'); later(1100, () => go('explorer')); return; }
    const pick = t.closest<HTMLElement>('[data-pick]');
    if (pick) {
      pick.classList.toggle('is-sel');
      const sel = [...view.querySelectorAll<HTMLElement>('[data-pick].is-sel')].map((p) => p.dataset.pick!);
      view.querySelector('[data-pick-label]')!.innerHTML = sel.length ? `${sel[0]}${sel.length > 1 ? ` <em>+${sel.length - 1}</em>` : ''}` : 'Pick agents';
      view.querySelector('[data-pick-sub]')!.innerHTML = `${sel.length} agent${sel.length === 1 ? '' : 's'} selected · <em>review mode</em>`;
      return;
    }
    const roe = t.closest<HTMLElement>('[data-roe]'); if (roe) { roe.classList.toggle('is-on'); return; }
    const gn = t.closest<SVGElement>('[data-node]');
    if (gn) {
      view.querySelectorAll('[data-node]').forEach((n) => n.classList.toggle('is-sel', n === gn));
      const insp = view.querySelector<HTMLElement>('.sa-insp')!;
      insp.innerHTML = inspector(gn.dataset.node!);
      insp.classList.remove('is-swap'); void insp.offsetWidth; insp.classList.add('is-swap');
      return;
    }
    if (act === 'run') { say('Concept demo: a real run needs written authorization on file. Showing a run in progress.'); later(1300, () => go('live')); return; }
    if (act === 'reply') { const b = view.querySelector<HTMLElement>('.sa-replybox')!; b.hidden = !b.hidden; requestAnimationFrame(placePins); return; }
    if (act === 'open-report') { go('report'); return; }
    if (act === 'back-reports') { go('reports'); return; }
    if (act === 'close-modal') { view.querySelector('.sa-modal')?.remove(); requestAnimationFrame(placePins); return; }
    const tab = t.closest<HTMLElement>('[data-tab]');
    if (tab) {
      view.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-on', b === tab));
      view.querySelectorAll<HTMLElement>('[data-feed]').forEach((f) => { f.hidden = f.dataset.feed !== tab.dataset.tab; });
      return;
    }
    const mtab = t.closest<HTMLElement>('[data-mtab]');
    if (mtab) { const id = view.querySelector('.sa-modal')!.getAttribute('aria-label')!; view.querySelector('.sa-modal')!.outerHTML = agentModal(id, mtab.dataset.mtab); requestAnimationFrame(placePins); return; }
    const rtab = t.closest<HTMLElement>('[data-rtab]'); if (rtab) { go('report', rtab.dataset.rtab); return; }
    const area = t.closest<HTMLElement>('[data-area]'); if (area) { go('agents', area.dataset.area); return; }
    const card = t.closest<HTMLElement>('[data-agent]');
    if (card) { view.querySelector('.sa-modal')?.remove(); view.insertAdjacentHTML('beforeend', agentModal(card.dataset.agent!)); requestAnimationFrame(placePins); return; }
    if (t.classList.contains('sa-modal')) { t.remove(); requestAnimationFrame(placePins); return; }
  });

  // a slight tilt toward the pointer, so the window feels like an object, not a picture
  const tilt = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    scaleBox.style.setProperty('--rx', `${(-y * 2.2).toFixed(2)}deg`);
    scaleBox.style.setProperty('--ry', `${(x * 3).toFixed(2)}deg`);
  };
  if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) host.addEventListener('pointermove', tilt);

  render(tour.screen, tour.screen === 'report' ? 'report' : undefined);
  fit();
  scaleBox.classList.add('is-boot');

  return {
    destroy() { timers.forEach(clearTimeout); clearTimeout(offTimer); ro.disconnect(); host.removeEventListener('pointermove', tilt); window.removeEventListener('keydown', onKey, true); guide.remove(); host.innerHTML = ''; },
  };
}
