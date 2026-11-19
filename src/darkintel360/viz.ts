// The top of each briefing: a small piece of the product, drawn from what the film shows.
// Values marked "demo" are the demo data visible in the film; sensitive values stay masked, as in the product.
const ring = (n: number, tone: 'amber' | 'green', label: string, chip: string) => `
<div class="vz vz-score vz-score--${tone}">
  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle class="vz-score__arc" cx="60" cy="60" r="50" pathLength="100" style="--n:${n}"/></svg>
  <p class="vz-score__n">${n}<small>/100</small></p>
  <div><p class="vz-k">Credibility assessment</p><p class="vz-v">${label}</p><p class="vz-chip">${chip}</p></div>
</div>`;
const rows = (head: string[], body: string[][], hot = -1) => `
<div class="vz vz-table"><table><thead><tr>${head.map((h, i) => `<th${i === hot ? ' class="is-hot"' : ''}>${h}</th>`).join('')}</tr></thead>
<tbody>${body.map((r) => `<tr>${r.map((c, i) => `<td${i === hot ? ' class="is-hot"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kv = (pairs: [string, string][], label = '') => `
<div class="vz vz-kv">${label ? `<p class="vz-label">${label}</p>` : ''}<dl>${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
const mask = (n: number) => `<span class="vz-mask">${'•'.repeat(n)}</span>`;

export const VIZ: string[][] = [
  // 0 Live map
  [
    `<div class="vz vz-counters"><p class="vz-label">Live exposure counters · demo view</p><div><span><b>100</b>Countries</span><span><b>6.2K</b>Data leaks</span><span><b>13.2K</b>Forum posts</span></div></div>`,
    `<div class="vz vz-list"><p class="vz-label">Top affected countries · all dates</p><ol>${['Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia'].map((c) => `<li><span>${c}</span><i>View</i></li>`).join('')}</ol></div>`,
    `<div class="vz vz-mapmini"><p class="vz-label">Regional zoom</p><div class="vz-mapmini__grid"><b style="left:22%;top:38%"></b><b style="left:41%;top:58%"></b><b style="left:57%;top:30%"></b><b class="is-ok" style="left:70%;top:62%"></b><b style="left:83%;top:44%"></b></div><p class="vz-badge"><small>Phishing</small>6.3K</p></div>`,
  ],
  // 1 Forums
  [
    rows(['Channel', 'Date', 'Countries', 'Cred.'], [
      ['RansomFeedNews', '14 Nov 2026', 'DE · IT', '50%'],
      ['RansomFeedNews', '12 Nov 2026', 'US · IT', '50%'],
      ['RansomFeedNews', '12 Nov 2026', 'US · IT', '50%'],
    ], 3),
    `<div class="vz vz-quote"><p class="vz-label is-hot">Source report · translated</p><p class="vz-quote__id">ID 38639 · 14 November 2026, 02:32:50</p><p class="vz-quote__body">“${mask(9)} ${mask(14)} ${mask(6)} access, ${mask(11)} ${mask(4)} sample attached ${mask(8)}”</p><p class="vz-quote__link">ransomfeed.${mask(2)}/index.php?page=post…</p></div>`,
    ring(50, 'amber', 'Mixed supporting signals', 'Claim not independently verified'),
  ],
  // 2 Data leaks
  [
    `<div class="vz vz-claim"><p class="vz-label">Data leak intelligence</p><p class="vz-claim__t">Source incident claim: L33THacking · 2012-11 · 2.60K users</p><p class="vz-claim__d">In November 2012, the now-defunct hacking forum was breached; the listing has resurfaced.</p><p class="vz-tabs"><span class="is-on">Source details</span><span>Assessment</span></p></div>`,
    ring(86, 'green', 'Strong supporting signals', 'Source quality and available evidence'),
    kv([['Source', 'Updap'], ['Attacker', 'updap'], ['Reported', 'Nov 14, 2026, 10:36 AM'], ['Source status', 'Accessible'], ['Last checked', 'Nov 14, 2026, 07:44 PM'], ['Provenance', 'Source heading checked']]),
  ],
  // 3 Credentials
  [
    rows(['URL', 'Username', 'Password', 'Date'], [
      [`${mask(4)}.com/signup`, mask(9), mask(8), 'Oct 5, 2026'],
      [`${mask(6)}.com/account`, mask(7), mask(10), 'Oct 5, 2026'],
      [`signin.${mask(4)}.co.uk`, mask(8), mask(9), 'Oct 5, 2026'],
    ], 1),
    `<div class="vz vz-list vz-list--urls"><p class="vz-label">Login pages in the records</p><ol>${[`www.${mask(5)}.com/signup`, `${mask(7)}.com/account/signup`, `signin.${mask(4)}.co.uk/ws/…`, `id.${mask(6)}.co.nz/openam/…`, `android://${mask(10)}@com.${mask(4)}`].map((u) => `<li><span>${u}</span><i>↗</i></li>`).join('')}</ol></div>`,
    rows(['Country', 'Date'], [['United Kingdom', 'Oct 5, 2026, 10:13'], ['Argentina', 'Oct 5, 2026, 10:13'], ['—', 'Oct 5, 2026, 10:13']]),
  ],
  // 4 Botnet data
  [
    rows(['Country', 'Logins', 'Date'], [['Uruguay', mask(2), 'Oct 15, 2026, 11:58 PM'], ['Iran', mask(1), 'Oct 15, 2026, 02:47 PM'], ['United States', mask(3), 'Oct 14, 2026'], ['Colombia', '1000', 'Oct 13, 2026']], 1),
    `<div class="vz vz-host"><p class="vz-label">Botnet intelligence · host details</p><p class="vz-tabs"><span class="is-on">System overview</span><span>Saved logins <b>29</b></span><span>Browser evidence</span></p><dl><div><dt>Last recorded</dt><dd>Oct 15, 2026, 11:58 PM</dd></div><div><dt>Country</dt><dd>UY</dd></div></dl></div>`,
    kv([['Antivirus', 'Windows Defender'], ['Antivirus status', 'active'], ['Captured data', 'cookies']], 'Endpoint context · security and access'),
  ],
  // 5 Phishing
  [
    kv([['IP address', '31.43.161.6'], ['Organization', 'Framer B.V.'], ['ISP', 'Amazon.com, Inc.'], ['ASN', 'AS16509']], 'Hosting org · ISP · ASN'),
    `<div class="vz vz-compare"><div><p class="vz-k">Submitted</p><p class="vz-v">Nov 15, 2026</p><p class="vz-k">IP address</p><p class="vz-v">Not provided</p></div><div class="is-hot"><p class="vz-k">Submitted</p><p class="vz-v">Nov 15, 2026</p><p class="vz-k">IP address</p><p class="vz-v">31.43.161.6</p></div></div>`,
    kv([['Country', 'Netherlands'], ['Region', 'Noord-Holland'], ['Timezone', 'Europe/Amsterdam'], ['Hosting', 'Cloud']]),
  ],
  // 6 Websites hacked
  [
    rows(['Date', 'Attacker', 'Team'], [['Nov 15, 2026, 09:36', `Mr.S${mask(4)}`, `TESAL ${mask(5)} TEAM`], ['Nov 14, 2026, 11:15', `Matx${mask(4)}`, `XH4X ${mask(5)}`], ['Nov 14, 2026, 01:56', `Matx${mask(4)}`, `XH4X ${mask(5)}`]], 1),
    rows(['URL', 'OS', 'Mirror'], [[mask(14), 'Linux', '<i class="vz-btn">Open mirror</i>'], [mask(11), 'Linux', '<i class="vz-btn">Open mirror</i>'], [mask(16), 'Unknown', '<i class="vz-btn">Open mirror</i>']], 2),
    `<div class="vz vz-split"><p class="vz-label">Server OS · 10 rows, demo view</p><div class="vz-split__bar"><span style="flex:7">Linux 7</span><span style="flex:3">Unknown 3</span></div></div>`,
  ],
];
