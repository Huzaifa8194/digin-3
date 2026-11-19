// What the DarkIntel360 product screens show, module by module, taken from the product itself.
// Aggregate numbers are the product's own demo numbers. Anything that identifies a person or a victim
// (emails, passwords, hostnames, user accounts, victim domains, submitters) is masked, as the film masks it.

/** Mask all but `keep` leading characters (and keep separators so the shape still reads). */
export const m = (s: string, keep = 2) => s.split('').map((c, i) => (i < keep || /[\s.:/@_-]/.test(c) ? c : '•')).join('');

export type Tip = { t: string; d: string };
export type Donut = { kind: 'donut'; eyebrow: string; title: string; total: string; totalLabel: string; items: [string, number][]; foot: string; tip: Tip; sub?: string };
export type Bars = { kind: 'bars'; eyebrow: string; title: string; sub?: string; items: [string, string, number][]; foot: string; tip: Tip; other?: number };
export type Split = { kind: 'split'; eyebrow: string; title: string; pct: string; lead: string; leadSub: string; items: [string, number, string][]; foot: string; tip: Tip };
export type Columns = { kind: 'columns'; eyebrow: string; title: string; items: [string, number][]; foot: string; tip: Tip };
export type Stat = Donut | Bars | Split | Columns;
export type Col = { key: string; label: string; w?: string; tip?: Tip; cls?: string };
export type Row = Record<string, string> & { _drawer?: string; _country?: string };
export type Drawer = { kicker: string; title: string; meta: string; tabs: { id: string; label: string; badge?: string; html: string }[]; actions?: string[] };
export type Stop = { sel: string; tips: string[]; open?: string; tab?: string; globe?: boolean; modal?: string };
export type Page = {
  nav: string; eyebrow: string; title: string; sub: string;
  stats: Stat[];
  filters: { label: string; kind: 'text' | 'date' | 'select'; ph?: string; opts?: string[]; filter?: string }[];
  table?: { title: string; count: string; cols: Col[]; rows: Row[]; date?: boolean };
  drawers?: Record<string, Drawer>;
  stops: Stop[]; // one per signal, in signal order
};

// ISO alpha-2 for flags
export const FLAG: Record<string, string> = {
  Afghanistan: 'af', Albania: 'al', Algeria: 'dz', Argentina: 'ar', Armenia: 'am', Australia: 'au', Austria: 'at', Azerbaijan: 'az', Bahrain: 'bh', Bangladesh: 'bd',
  Italy: 'it', 'United States': 'us', Pakistan: 'pk', France: 'fr', India: 'in', Germany: 'de', Indonesia: 'id', China: 'cn', Uruguay: 'uy', Brazil: 'br',
  Spain: 'es', 'United Kingdom': 'gb', Iran: 'ir', Vietnam: 'vn', 'South Africa': 'za', Gabon: 'ga', Colombia: 'co', Philippines: 'ph', Japan: 'jp', Netherlands: 'nl', Singapore: 'sg',
};

const cred = (n: number, tone = 'amber') => `<span class="pq-cred pq-cred--${tone}">${n}%<i>⌄</i></span>`;
const ring = (n: number, tone: 'amber' | 'green', label: string) => `
<div class="pq-assess" data-tip-id="assess">
  <div class="pq-ring pq-ring--${tone}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50"/><circle class="pq-ring__arc" cx="60" cy="60" r="50" pathLength="100" style="--n:${n}"/></svg><p><b>${n}</b><small>/ 100</small></p></div>
  <div><p class="pq-eyebrow">Credibility assessment</p><p class="pq-assess__t">${label}</p><p class="pq-muted">Source quality and available evidence</p><span class="pq-chip">Claim not independently verified</span></div>
</div>`;
const kv = (rows: [string, string][]) => `<dl class="pq-kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const panel = (title: string, body: string, tipId = '') => `<section class="pq-panel"${tipId ? ` data-tip-id="${tipId}"` : ''}><h4>${title}</h4>${body}</section>`;

export const TIPS: Record<string, Tip> = {
  // shared
  nav: { t: 'One sidebar, every source', d: 'Each module is one view of the same collection. Click any of them here to fly to that module.' },
  filters: { t: 'Analysis filters', d: 'Narrow everything on the page at once: keyword, date range, country and the module’s own dimension. Try typing in the keyword box.' },
  perpage: { t: 'Page size', d: 'Analysts page through thousands of records; the counts above always reflect the current filter.' },
  sort: { t: 'Newest first', d: 'Records sort by date so fresh exposure is always on top. Click to flip the order.' },
  dark: { t: 'Dark theme', d: 'Night shifts in a SOC are long. The whole workspace has a dark theme; flip it here.' },
  assess: { t: 'Credibility assessment', d: 'Every claim is scored from 0 to 100 using source quality and the evidence around it, so a rumour and a confirmed sale never look alike.' },
  drawerTabs: { t: 'Report, assessment, source', d: 'Open any record for the full story: what was posted, how it was scored, and where it came from, with the original link kept as evidence.' },
  open: { t: 'Open the source', d: 'Jump to the original post or listing. DarkIntel360 keeps the link even after the post disappears.' },
  // live map
  counters: { t: 'Live exposure counters', d: 'Running totals across every source, updating as new reports land: countries affected, data leaks, forum posts, botnet hosts and phishing sites.' },
  mapView: { t: 'The world, by exposure', d: 'Every country with activity is pinned. Hover a country to see its count; zoom in to see a region up close.' },
  globe: { t: '2D or 3D', d: 'Switch to the 3D globe and drag it round. Same data, easier to read across oceans.' },
  topCountries: { t: 'Top affected countries', d: 'Ranked by exposure volume across all sources. Pick a country to find it on the map.' },
  dates: { t: 'Any date range', d: 'Narrow the whole map to a day, a week or a campaign window.' },
  // forums
  fTopics: { t: 'What the boards are talking about', d: 'Posts grouped by topic: breaches, ransomware, malware, vulnerabilities, security and conflict reporting.' },
  fCountries: { t: 'Where posts come from', d: 'Volume of posts per source country, ranked, for the current filter.' },
  fChannel: { t: 'Channel', d: 'The forum or channel the post came from. Each source is collected continuously.' },
  fSummary: { t: 'Post summary, translated', d: 'Posts arrive in English with a topic label, whatever language they were written in.' },
  fCountriesCol: { t: 'Countries named', d: 'The countries a post mentions, so you can filter to the ones you care about.' },
  fCred: { t: 'Credibility on every row', d: 'Mixed signals sit at 50%. Strong evidence pushes the score up; weak sources pull it down.' },
  fFiles: { t: 'Attachments kept', d: 'Images and files attached to a post are collected with it, for evidence.' },
  fReport: { t: 'Source report', d: 'The post exactly as collected, with its ID, the channel, the date and the original links.' },
  // data leaks
  lActors: { t: 'Top threat actors', d: 'Who is posting the most leak claims in the current selection.' },
  lRegions: { t: 'Most targeted regions', d: 'Where the claimed victims are, ranked by report count.' },
  lSources: { t: 'Primary sources', d: 'Which leak forums and onion sites the claims come from.' },
  lTitle: { t: 'Claim, as posted', d: 'The listing title and description, with a check that the heading matches the source.' },
  lStatus: { t: 'Is the source still up?', d: 'Each listing is re-checked; “Accessible” means the original post is still online.' },
  lDetails: { t: 'Source details', d: 'Source, attacker, when it was reported, its current status and when it was last checked: everything your incident file needs.' },
  // credentials
  cCountries: { t: 'Most affected countries', d: 'Where exposed logins belong, for the current selection.' },
  cGov: { t: 'Government domains', d: 'Exposed logins for government services are pulled out on their own, because they matter most.' },
  cMail: { t: 'Mail and webmail accounts', d: 'Mailbox logins are the keys to everything else, so they are counted separately.' },
  cPlatform: { t: 'Website or app', d: 'Whether the login was saved for a website or an Android app.' },
  cUrl: { t: 'Where the login works', d: 'The sign-in page each record belongs to, from webmail to app stores.' },
  cValues: { t: 'Original values', d: 'In the product, analysts with access see the original username and password. They are masked on this page.' },
  cDate: { t: 'Country and date', d: 'When and where each login surfaced, so you know what is fresh.' },
  // botnet
  bCountries: { t: 'Infected hosts by country', d: 'Machines found in stealer logs, counted by country.' },
  bLogins: { t: 'Top computers by logins', d: 'A single infected machine can hold a thousand saved logins. These are the worst.' },
  bAdmin: { t: 'Admin systems', d: 'Whether the infected account had admin rights, the difference between a nuisance and a breach.' },
  bHost: { t: 'One row per machine', d: 'Computer name, user, hardware ID, country, IP, how many logins it held and when it was seen.' },
  bDetails: { t: 'Host details', d: 'System overview, every saved login and the browser evidence behind them, for your response team.' },
  bSecurity: { t: 'Security and access', d: 'Which antivirus the machine ran and whether it was active, so you can see how the infection got past it.' },
  // phishing
  pOrg: { t: 'Who hosts the lures', d: 'Top hosting organisations behind reported phishing sites.' },
  pCountry: { t: 'Hosting countries', d: 'Where the lures are served from, by report count.' },
  pMix: { t: 'Hosting mix', d: 'Cloud hosting, ISP networks or private ranges: it decides who you send the takedown to.' },
  pIps: { t: 'Top IPs', d: 'The addresses serving the most lures right now.' },
  pCapture: { t: 'Website capture', d: 'A screenshot of the lure as it looked when it was reported. Enlarge it to compare with your real page.' },
  pTrail: { t: 'Hosting trail', d: 'IP address, organisation, ISP and ASN behind the page: exactly whose desk the takedown goes to.' },
  pPlace: { t: 'Country, region, timezone', d: 'Where the page is served from, so you know whose jurisdiction you are dealing with.' },
  // websites hacked
  wAttacker: { t: 'Attacker and team', d: 'The handle and the crew behind each defacement. Follow one attacker across targets.' },
  wUrl: { t: 'Defaced page', d: 'The page that was hit. Victim addresses are masked on this page.' },
  wOs: { t: 'Server OS', d: 'The operating system of the defaced server: a hint at how it was reached.' },
  wMirror: { t: 'Open mirror', d: 'A copy of the page exactly as it was defaced, kept after the owner cleans up. Try one.' },
};

const SESSION = 'Session secured';

export const PAGES: Page[] = [
  // ---------------- 0 Live map ----------------
  {
    nav: 'Live Map', eyebrow: 'Live map', title: 'Live Map', sub: 'Showing world view',
    stats: [], filters: [],
    stops: [
      { sel: '[data-tip-id="counters"]', tips: ['counters', 'mapView'] },
      { sel: '[data-tip-id="topCountries"]', tips: ['topCountries', 'dates'] },
      { sel: '[data-tip-id="globe"]', tips: ['globe', 'mapView'], globe: true },
    ],
  },
  // ---------------- 1 Forums ----------------
  {
    nav: 'Forums', eyebrow: 'Intelligence workspace', title: 'Forums', sub: 'Explore source reports, assess supporting signals, and review the evidence behind each post.',
    stats: [
      { kind: 'donut', eyebrow: 'Breakdown', title: 'Top 5 report topics', sub: 'Share of posts by category in the current filter.', total: '9,983', totalLabel: 'category matches', items: [['Data Breach', 4503], ['Ransomware', 3382], ['Malware', 744], ['Security & conflict reporting', 713], ['Vulnerability', 641]], foot: 'Topics represented in this selection.', tip: TIPS.fTopics },
      { kind: 'bars', eyebrow: 'Ranking', title: 'Top 5 source countries', sub: 'Volume of posts originating per country, ranked.', items: [['it', 'Italy', 1849], ['us', 'United States', 1642], ['pk', 'Pakistan', 709], ['fr', 'France', 591], ['in', 'India', 563]], foot: 'Reports by country, ranked.', tip: TIPS.fCountries },
    ],
    filters: [{ label: 'Keyword search', kind: 'text', ph: 'Search posts, channels, countries, or URLs' }, { label: 'From date', kind: 'date' }, { label: 'To date', kind: 'date' }, { label: 'Country', kind: 'select', opts: ['All countries', 'Germany', 'Italy', 'United States'], filter: 'countries' }, { label: 'Channel', kind: 'select', opts: ['All channels', 'RansomFeedNews'], filter: 'channel' }],
    table: {
      title: 'Forum reports', count: '13248 records', date: true,
      cols: [{ key: 'n', label: '#', w: '40px' }, { key: 'channel', label: 'Channel', tip: TIPS.fChannel }, { key: 'summary', label: 'Post summary', w: '34%', tip: TIPS.fSummary }, { key: 'id', label: 'Message ID', cls: 'pq-num' }, { key: 'date', label: 'Date ↓' }, { key: 'countries', label: 'Countries', tip: TIPS.fCountriesCol }, { key: 'views', label: 'Views', cls: 'pq-num' }, { key: 'cred', label: 'Credibility', tip: TIPS.fCred }, { key: 'files', label: 'Files', tip: TIPS.fFiles }, { key: 'act', label: 'Actions' }],
      rows: [
        { n: '1', channel: 'RansomFeedNews', summary: '<span class="pq-tag">Ransomware</span>Always, 14 November 2026 02:32:50 G star.', id: '17222', date: 'Nov 14, 2026, 06:30 PM', countries: 'flag:de:Germany|flag:it:Italy', views: '36', cred: cred(50), files: '—', act: 'actions', _drawer: 'f1' },
        { n: '2', channel: 'RansomFeedNews', summary: '<span class="pq-tag">Ransomware</span>7, 12 November 2026 18:11:50 G star.', id: '17221', date: 'Nov 14, 2026, 06:15 PM', countries: 'flag:us:United States|flag:it:Italy', views: '39', cred: cred(50), files: '—', act: 'actions', _drawer: 'f1' },
        { n: '3', channel: 'RansomFeedNews', summary: '<span class="pq-tag">Ransomware</span>7, 12 November 2026 18:12:27 G star.', id: '17220', date: 'Nov 14, 2026, 06:15 PM', countries: 'flag:us:United States|flag:it:Italy', views: '39', cred: cred(50), files: '—', act: 'actions', _drawer: 'f1' },
        { n: '4', channel: 'RansomFeedNews', summary: '<span class="pq-tag">Ransomware</span>7, 12 November 2026 18:13:04 G star.', id: '17219', date: 'Nov 14, 2026, 06:15 PM', countries: 'flag:us:United States|flag:it:Italy', views: '38', cred: cred(50), files: '—', act: 'actions', _drawer: 'f1' },
        { n: '5', channel: 'RansomFeedNews', summary: '<span class="pq-tag">Ransomware</span>7, 12 November 2026 18:13:41 G star.', id: '17218', date: 'Nov 14, 2026, 06:00 PM', countries: 'flag:us:United States|flag:it:Italy', views: '41', cred: cred(50), files: '<span class="pq-file">Phot….jpg</span>', act: 'actions', _drawer: 'f1' },
      ],
    },
    drawers: {
      f1: {
        kicker: 'Forum intelligence', title: 'ID: 38639 Always, 14 November 2026 02:32:50 G star. Distance. Grondbaulabor Trier H, Germany.', meta: 'RansomFeedNews / Nov 14, 2026, 06:30 PM', actions: ['Open source ↗', 'Close'],
        tabs: [
          { id: 'report', label: 'Report', html: `${ring(50, 'amber', 'Mixed supporting signals')}<span class="pq-tag pq-tag--red">Ransomware</span>${panel('Source report', `<div class="pq-id"><span>ID</span><b>38639</b></div><p>Always, 14 November 2026 02:32:50 G star.<br>Distance.<br>Grondbaulabor Trier H, Germany.</p><p class="pq-muted">Source links</p><p class="pq-link">http://www.ransomfeed.it/index.php?page=post</p><p class="pq-link">https://www.ransomfeed.it/?page=post_details&amp;id_post=38639</p><p class="pq-muted pq-small">Translated to English</p>`, 'fReport')}` },
          { id: 'assess', label: 'Assessment', html: `${ring(50, 'amber', 'Mixed supporting signals')}${panel('Why 50', kv([['Source quality', 'Known aggregator, reposts'], ['Evidence', 'Victim named, no sample'], ['Corroboration', 'Not independently verified'], ['Recommendation', 'Watch, do not escalate yet']]))}` },
          { id: 'source', label: 'Source details', html: panel('Source details', kv([['Channel', 'RansomFeedNews'], ['Message ID', '17222'], ['Collected', 'Nov 14, 2026, 06:30 PM'], ['Countries', 'Germany, Italy'], ['Views', '36']])) },
        ],
      },
    },
    stops: [
      { sel: '.pq-table', tips: ['fChannel', 'fSummary', 'fCred'] },
      { sel: '[data-tip-id="fReport"]', tips: ['fReport', 'drawerTabs', 'open'], open: 'f1', tab: 'report' },
      { sel: '[data-tip-id="assess"]', tips: ['assess', 'fCred'], open: 'f1', tab: 'report' },
    ],
  },
  // ---------------- 2 Data leaks ----------------
  {
    nav: 'Data Leaks', eyebrow: 'Intelligence workspace', title: 'Data Leaks', sub: 'Data leak reports, source context, and credibility signals.',
    stats: [
      { kind: 'donut', eyebrow: 'Activity', title: 'Top threat actors', total: '917', totalLabel: 'posts · top 5', items: [['Guest', 324], ['updap', 212], ['DBHunter', 162], ['SUB-ZER0', 149], ['Ashescloud', 70]], foot: 'Leading actors in the current selection.', tip: TIPS.lActors },
      { kind: 'bars', eyebrow: 'Geography', title: 'Most targeted regions', items: [['us', 'United States', 289], ['id', 'Indonesia', 115], ['cn', 'China', 86], ['in', 'India', 68], ['ar', 'Argentina', 67]], foot: 'Report counts, ranked by region.', tip: TIPS.lRegions },
      { kind: 'split', eyebrow: 'Distribution', title: 'Primary sources', pct: '66.0', lead: 'darkforums.ru', leadSub: 'of top 5 source posts', items: [['darkforums.ru', 3965, '66.0%'], ['.onion (Tor Sites)', 821, '13.7%'], ['bf.st', 615, '10.2%'], ['darknetarmy.st', 371, '6.2%'], ['raidforums.im', 238, '4.0%']], foot: 'Where the claims are posted.', tip: TIPS.lSources },
    ],
    filters: [{ label: 'Keyword search', kind: 'text', ph: 'Search titles, actors, or source URLs…' }, { label: 'From date', kind: 'date' }, { label: 'To date', kind: 'date' }, { label: 'Country', kind: 'select', opts: ['All countries', 'Uruguay'], filter: 'country' }, { label: 'Actor', kind: 'select', opts: ['All actors', 'updap', 'fromheaven', 'OscarElMasCapito', 'Hannibal_Lecter'], filter: 'actor' }],
    table: {
      title: 'Data leak records', count: '6232 records', date: true,
      cols: [{ key: 'n', label: '#', w: '40px' }, { key: 'title', label: 'Title', w: '40%', tip: TIPS.lTitle }, { key: 'actor', label: 'Attacker' }, { key: 'country', label: 'Country' }, { key: 'date', label: 'Date' }, { key: 'cred', label: 'Credibility', tip: TIPS.fCred }, { key: 'src', label: 'Source', tip: TIPS.lStatus }],
      rows: [
        { n: '1', title: `Source discussion: ${m('176app.com', 2)} (Repost)<small>Source heading checked</small>`, actor: 'fromheaven', country: '—', date: 'Nov 14, 2026, 12:28 PM', cred: cred(62), src: 'source' },
        { n: '2', title: `Reported dataset listing: ${m('Gobierno DE Montevideo', 3)} Databased<small>Source heading checked</small>`, actor: 'OscarElMasCapito', country: 'flag:uy:Uruguay', date: 'Nov 14, 2026, 11:37 AM', cred: cred(62), src: 'source' },
        { n: '3', title: `Source discussion: [FR] ${m('afib-bancassurance.fr', 2)} - 3.8K<small>Source heading checked</small>`, actor: 'updap', country: '—', date: 'Nov 14, 2026, 10:36 AM', cred: cred(64), src: 'source' },
        { n: '4', title: 'Source incident claim: L33THacking | l33thacking.net | 2012-11 | 2.60K users — Description: in November 2012, the now-defunct hacking forum L33tHacking (<small>Source heading checked</small>', actor: 'updap', country: '—', date: 'Nov 14, 2026, 10:36 AM', cred: cred(86, 'green'), src: 'source', _drawer: 'l1' },
        { n: '5', title: `Service listing: ${m('BP Bioenergy', 2)} | Hacked | Extract data 4.5 GB<small>Source heading checked</small>`, actor: 'Hannibal_Lecter', country: '—', date: 'Nov 14, 2026, 10:31 AM', cred: cred(62), src: 'source' },
      ],
    },
    drawers: {
      l1: {
        kicker: 'Data leak intelligence', title: 'Source incident claim: L33THacking | l33thacking.net | 2012-11 | 2.60K users — Description: in November 2012, the now-defunct hacking forum L33tHacking (', meta: 'Updap / updap', actions: ['Open source ↗', 'Close'],
        tabs: [
          { id: 'details', label: 'Source details', html: `${ring(86, 'green', 'Strong supporting signals')}<div data-tip-id="lDetails">${panel('', kv([['Source', 'Updap'], ['Attacker', 'updap'], ['Reported', 'Nov 14, 2026, 10:36 AM'], ['Source status', 'Accessible'], ['Last checked', 'Nov 14, 2026, 07:44 PM'], ['Heading provenance', 'Source heading checked']]))}</div>` },
          { id: 'assess', label: 'Assessment', html: `${ring(86, 'green', 'Strong supporting signals')}${panel('Why 86', kv([['Sample data', 'Matches the claimed breach'], ['Seller history', 'Consistent prior listings'], ['Timeline', 'Holds: forum defunct since 2012'], ['Recommendation', 'Treat as confirmed, notify owners']]))}` },
        ],
      },
    },
    stops: [
      { sel: '.pq-table tbody tr:nth-child(4)', tips: ['lTitle', 'fCred', 'lStatus'] },
      { sel: '[data-tip-id="assess"]', tips: ['assess'], open: 'l1', tab: 'details' },
      { sel: '[data-tip-id="lDetails"]', tips: ['lDetails', 'open'], open: 'l1', tab: 'details' },
    ],
  },
  // ---------------- 3 Credentials ----------------
  {
    nav: 'Credentials', eyebrow: 'Intelligence workspace', title: 'Credentials', sub: 'Review collected credential records with their original values and source URLs.',
    stats: [
      { kind: 'bars', eyebrow: 'Geography', title: 'Top 5 most affected countries', items: [['in', 'India', 199], ['br', 'Brazil', 83], ['fr', 'France', 59], ['es', 'Spain', 50], ['it', 'Italy', 45]], foot: 'Top countries in this selection.', tip: TIPS.cCountries },
      { kind: 'columns', eyebrow: 'Domains', title: 'Top 5 government domains', items: [[m('lsg-land-owner.land.gov.bd', 3), 5], [m('services.nidw.gov.bd', 3), 5], [m('unifiedportal-mem.epfindia.gov.in', 3), 5], [m('beta.smartservices.icp.gov.ae', 3), 4], [m('portal2.passportindia.gov.in', 3), 3]], foot: 'Leading government domains by record count.', tip: TIPS.cGov },
      { kind: 'donut', eyebrow: 'Accounts', title: 'Mail / webmail accounts', total: '2,718', totalLabel: 'accounts', items: [['Webmail accounts', 2185], ['Mail accounts', 533]], foot: 'Mail and webmail account counts.', tip: TIPS.cMail },
      { kind: 'split', eyebrow: 'Platforms', title: 'Platform', pct: '91.0', lead: 'Website', leadSub: 'of shown records', items: [['Website', 4828, '91.0%'], ['Android app', 475, '9.0%']], foot: 'Distribution across the displayed platforms.', tip: TIPS.cPlatform },
    ],
    filters: [{ label: 'Search', kind: 'text', ph: 'Search all credential fields…' }, { label: 'Country', kind: 'select', opts: ['All Countries', 'United Kingdom', 'Argentina'], filter: 'country' }],
    table: {
      title: 'Credential records', count: '5716 records', date: true,
      cols: [{ key: 'n', label: '#', w: '40px' }, { key: 'url', label: 'URL', w: '30%', tip: TIPS.cUrl }, { key: 'user', label: 'Username', tip: TIPS.cValues, cls: 'pq-mono' }, { key: 'pass', label: 'Password', cls: 'pq-mono' }, { key: 'country', label: 'Country', tip: TIPS.cDate }, { key: 'date', label: 'Date ↓' }],
      rows: [
        { n: '1', url: 'https://www.canva.com/signup ↗', user: m('pathides5@gmail.com', 2), pass: m('#Misspat1$', 0), country: '—', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '2', url: 'https://realpython.com/account/signup/ ↗', user: m('jonathanb89@hotmail.com', 2), pass: m('9HcW.Bg2@*WHM96', 0), country: '—', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '3', url: `android://${m('BnX9M66KmaqmzgqWgQxmbrJB', 3)}@com.discord/`, user: m('mirikuruart@gmail.com', 2), pass: m('Spaghetti!26', 0), country: '—', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '4', url: `https://${m('rajabandotdamai8.com', 2)}/ ↗`, user: m('mladass07', 2), pass: m('LaBu2022', 0), country: '—', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '5', url: 'https://signin.ebay.co.uk/ws/ebayisapi.dll ↗', user: m('blackwolf89@outlook.fr', 2), pass: m('leloupnoirdu89140cuy', 0), country: 'flag:gb:United Kingdom', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '6', url: 'https://idpsesion.telecom.com.ar/openam/xui/ ↗', user: m('djossen2001@hotmail.com', 2), pass: m('425115', 0), country: 'flag:ar:Argentina', date: 'Oct 5, 2026, 10:13 AM' },
        { n: '7', url: 'https://www.gollo.com/customer/account/create/ ↗', user: m('francoto98@hotmail.com', 2), pass: m('@bXPDcyWL29gD7S', 0), country: '—', date: 'Oct 5, 2026, 10:13 AM' },
      ],
    },
    stops: [
      { sel: '.pq-table', tips: ['cUrl', 'cValues'] },
      { sel: '[data-tip-id="cGov"]', tips: ['cGov', 'cMail', 'cPlatform'] },
      { sel: '.pq-table', tips: ['cDate', 'cCountries', 'filters'] },
    ],
  },
  // ---------------- 4 Botnet ----------------
  {
    nav: 'Botnet data', eyebrow: 'Intelligence workspace', title: 'Botnet data', sub: 'Review endpoint context, saved logins and available browser evidence.',
    stats: [
      { kind: 'bars', eyebrow: 'Geography', title: 'Top 5 countries', items: [['', 'Unknown', 406], ['in', 'India', 398], ['bd', 'Bangladesh', 53], ['br', 'Brazil', 45], ['ph', 'Philippines', 42]], other: 502, foot: 'Host counts by country.', tip: TIPS.bCountries },
      { kind: 'donut', eyebrow: 'Credentials', title: 'Top computers by logins', total: '117.5K', totalLabel: 'logins', items: [[m('@CartelJohnDoe', 1), 29716], [m('DESKTOP-K7M2PQX', 8), 1000], [m('DESKTOP-8FJATE1', 8), 1000], [m('CORREA', 1), 1000], ['Unknown', 1000], ['Other', 83775]], foot: 'Login counts grouped by computer.', tip: TIPS.bLogins },
      { kind: 'split', eyebrow: 'Access', title: 'Admin systems', pct: '94.3', lead: 'Unknown', leadSub: 'of shown hosts', items: [['Unknown', 1363, '94.3%'], ['Admin', 59, '4.1%'], ['Not admin', 24, '1.7%']], foot: 'Administrative access across the shown hosts.', tip: TIPS.bAdmin },
    ],
    filters: [{ label: 'Keyword search', kind: 'text', ph: 'Search login, url, host, software…' }, { label: 'From date', kind: 'date' }, { label: 'To date', kind: 'date' }, { label: 'Country', kind: 'select', opts: ['All countries', 'Uruguay', 'Iran', 'United States', 'Colombia', 'India'], filter: 'country' }, { label: 'Category', kind: 'select', opts: ['All categories', 'cookies', 'passwords'] }],
    table: {
      title: '', count: '', date: true,
      cols: [{ key: 'n', label: '#', w: '40px' }, { key: 'host', label: 'Computer-name', tip: TIPS.bHost, cls: 'pq-mono' }, { key: 'user', label: 'User-name', cls: 'pq-mono' }, { key: 'hwid', label: 'HWID' }, { key: 'country', label: 'Country' }, { key: 'ip', label: 'IP' }, { key: 'logins', label: 'Logins', cls: 'pq-num', tip: TIPS.bLogins }, { key: 'date', label: 'Date ↓' }, { key: 'det', label: 'Details' }],
      rows: [
        { n: '1', host: m('T141T2026032246', 4), user: m('vHVkgY', 1), hwid: '—', country: 'flag:uy:Uruguay', ip: '—', logins: '29', date: 'Oct 15, 2026, 11:58 PM', det: 'details', _drawer: 'b1' },
        { n: '2', host: m('KAZUH4', 2), user: m('R5Xz8F', 1), hwid: '—', country: 'flag:ir:Iran', ip: '—', logins: '5', date: 'Oct 15, 2026, 02:47 PM', det: 'details', _drawer: 'b1' },
        { n: '3', host: m('SEENLISA', 2), user: m('PK3jML', 1), hwid: '—', country: 'flag:us:United States', ip: '—', logins: '317', date: 'Oct 14, 2026, 06:45 AM', det: 'details', _drawer: 'b1' },
        { n: '4', host: m('DESKTOP-2ERFR-2', 8), user: m('ASUS', 1), hwid: '—', country: 'flag:vn:Vietnam', ip: '—', logins: '147', date: 'Oct 14, 2026, 04:46 AM', det: 'details', _drawer: 'b1' },
        { n: '5', host: m('LAPTOP-9208PDP9', 7), user: m('Y29Mc5', 1), hwid: '—', country: 'flag:cn:China', ip: '—', logins: '20', date: 'Oct 14, 2026, 02:05 AM', det: 'details', _drawer: 'b1' },
        { n: '6', host: m('NDUDUZO-KHUMALO', 2), user: m('TrRDcG', 1), hwid: '—', country: 'flag:za:South Africa', ip: '—', logins: '617', date: 'Oct 13, 2026, 08:24 PM', det: 'details', _drawer: 'b1' },
        { n: '7', host: m('DESKTOP-35DO7IS', 8), user: m('hp', 1), hwid: '—', country: 'flag:ga:Gabon', ip: '—', logins: '14', date: 'Oct 12, 2026, 05:02 PM', det: 'details', _drawer: 'b1' },
        { n: '8', host: m('DESKTOP-K7M2PQX', 8), user: m('Michael', 1), hwid: '—', country: 'flag:co:Colombia', ip: '—', logins: '1000', date: 'Oct 10, 2026, 09:18 PM', det: 'details', _drawer: 'b1' },
        { n: '9', host: m('AJAY-XD', 2), user: m('2HKsFg', 1), hwid: '—', country: 'flag:in:India', ip: '—', logins: '445', date: 'Oct 10, 2026, 06:13 PM', det: 'details', _drawer: 'b1' },
      ],
    },
    drawers: {
      b1: {
        kicker: 'Botnet intelligence / host details', title: m('T141T2026032246', 4), meta: 'System profile, saved logins and available browser evidence.', actions: ['Close'],
        tabs: [
          { id: 'sys', label: 'System overview', html: `<div data-tip-id="bDetails">${panel('', `<div class="pq-grid2"><div><p class="pq-eyebrow">User account</p><p class="pq-strong">${m('vHVkgY', 1)}</p></div><div><p class="pq-eyebrow">Country</p><p class="pq-strong">UY</p></div><div><p class="pq-eyebrow">Last recorded</p><p class="pq-strong">Oct 15, 2026, 11:58 PM</p></div></div>`)}</div><div data-tip-id="bSecurity">${panel('Security &amp; access', kv([['Antivirus', 'Windows Defender'], ['Antivirus status', 'active']]))}</div>${panel('Captured data', kv([['Detected categories', 'cookies'], ['Cookies', '2 files']]))}${panel('Installed software <span class="pq-count">18</span>', '<p class="pq-muted">Software list collected from the host. Hidden on this page.</p>')}` },
          { id: 'logins', label: 'Saved logins', badge: '29', html: panel('Saved logins', `<table class="pq-mini"><thead><tr><th>URL</th><th>Username</th><th>Password</th></tr></thead><tbody>${Array.from({ length: 5 }, (_, k) => `<tr><td>${['accounts.•••••.com', 'mail.•••••.com', 'login.•••••.net', 'www.•••••.org/signin', 'app.•••••.io'][k]}</td><td>••••••••</td><td>••••••••••</td></tr>`).join('')}</tbody></table><p class="pq-muted pq-small">29 saved logins on this host. Values are masked on this page.</p>`) },
          { id: 'browser', label: 'Browser evidence', html: panel('Browser evidence', kv([['Browsers', 'Chromium-based'], ['Cookies', '2 files'], ['Autofill', 'Not captured'], ['History', 'Not captured']])) },
        ],
      },
    },
    stops: [
      { sel: '.pq-table', tips: ['bHost', 'bLogins'] },
      { sel: '[data-tip-id="bDetails"]', tips: ['bDetails', 'drawerTabs'], open: 'b1', tab: 'sys' },
      { sel: '[data-tip-id="bSecurity"]', tips: ['bSecurity', 'bAdmin'], open: 'b1', tab: 'sys' },
    ],
  },
  // ---------------- 5 Phishing ----------------
  {
    nav: 'Phishing', eyebrow: 'Intelligence workspace', title: 'Phishing', sub: 'Inspect reported websites, hosting context and captured screenshots.',
    stats: [
      { kind: 'donut', eyebrow: 'Infrastructure', title: 'Top 5 hosting org', total: '2,445', totalLabel: 'reports', items: [['Cloudflare, Inc.', 1702], ['Vercel, Inc', 230], ['Google LLC', 229], ['MICFO-CA', 165], ['Weebly, Inc.', 119]], foot: 'Top hosting organizations in this selection.', tip: TIPS.pOrg },
      { kind: 'bars', eyebrow: 'Geography', title: 'Top 5 hosting country', items: [['us', 'United States', 2591], ['de', 'Germany', 328], ['jp', 'Japan', 183], ['nl', 'Netherlands', 133], ['sg', 'Singapore', 109]], foot: 'Hosting countries by report count.', tip: TIPS.pCountry },
      { kind: 'split', eyebrow: 'Hosting mix', title: 'Top 5 hosting type', pct: '69.2', lead: 'HOSTING/CLOUD', leadSub: 'of shown reports', items: [['HOSTING/CLOUD', 2647, '69.2%'], ['ISP/NETWORK', 1174, '30.7%'], ['PRIVATE/RESERVED', 3, '0.1%']], foot: 'Shares across the displayed hosting types.', tip: TIPS.pMix },
      { kind: 'columns', eyebrow: 'IP ranking', title: 'Top 5 IPs', items: [['188.114.96.6', 93], ['188.114.97.6', 92], ['34.117.33.233', 80], ['188.114.96.0', 69], ['45.74.61.10', 61]], foot: 'Leading IP addresses by report count.', tip: TIPS.pIps },
    ],
    filters: [{ label: 'Keyword search', kind: 'text', ph: 'Search domains, organisations, IPs…', filter: 'cards' }, { label: 'From date', kind: 'date' }, { label: 'To date', kind: 'date' }, { label: 'Country', kind: 'select', opts: ['All countries', 'Netherlands'] }, { label: 'Hosting type', kind: 'select', opts: ['All types', 'HOSTING/CLOUD'] }],
    stops: [
      { sel: '[data-tip-id="pTrail"]', tips: ['pTrail', 'pOrg'] },
      { sel: '.pq-pcards', tips: ['pCapture', 'pTrail'] },
      { sel: '[data-tip-id="pPlace"]', tips: ['pPlace', 'pCountry', 'pMix'] },
    ],
  },
  // ---------------- 6 Websites hacked ----------------
  {
    nav: 'Websites Hacked', eyebrow: 'Intelligence workspace', title: 'Websites Hacked', sub: 'Defacements with the attacker, the team, the server OS and a mirror of the page as it was.',
    stats: [],
    filters: [{ label: 'Keyword search', kind: 'text', ph: 'Search attackers, teams, URLs…' }, { label: 'From date', kind: 'date' }, { label: 'To date', kind: 'date' }, { label: 'Team', kind: 'select', opts: ['All teams', 'XH4X CYB3R', 'TEGAL CYBER TEAM', 'AKUDAMA SYNDICATE TEAM'], filter: 'team' }, { label: 'OS', kind: 'select', opts: ['All OS', 'Linux', 'Unknown'], filter: 'os' }],
    table: {
      title: '', count: '', date: true,
      cols: [{ key: 'n', label: '#', w: '40px' }, { key: 'date', label: 'Date ↓' }, { key: 'attacker', label: 'Attacker', tip: TIPS.wAttacker }, { key: 'team', label: 'Team' }, { key: 'url', label: 'URL', w: '30%', tip: TIPS.wUrl }, { key: 'os', label: 'OS', tip: TIPS.wOs }, { key: 'mirror', label: 'Mirror', tip: TIPS.wMirror }],
      rows: [
        ['Nov 15, 2026, 09:36 AM', 'Mr.SonicX', 'TEGAL CYBER TEAM', 'royalcoaches.com/', 'Linux'],
        ['Nov 14, 2026, 11:15 AM', 'Matx1337', 'XH4X CYB3R', 'crm.finsmart.uk/crot.php', 'Linux'],
        ['Nov 14, 2026, 11:15 AM', 'Matx1337', 'XH4X CYB3R', 'cumbriacomms.cc01.co.uk/crot.php', 'Linux'],
        ['Nov 14, 2026, 11:15 AM', 'Matx1337', 'XH4X CYB3R', 'icodicerp.com/crot.php', 'Linux'],
        ['Nov 14, 2026, 01:56 AM', 'Matx1337', 'XH4X CYB3R', 'staging.wisepestsolution.com/pwn.php', 'Unknown'],
        ['Nov 14, 2026, 01:56 AM', 'Matx1337', 'XH4X CYB3R', 'digitaltemplateshq.com/pwn.php', 'Unknown'],
        ['Nov 13, 2026, 06:07 PM', 'Matx1337', 'XH4X CYB3R', 'www.dropesy.com/f•••.php', 'Linux'],
        ['Nov 13, 2026, 06:07 PM', 'Matx1337', 'XH4X CYB3R', 'correlate.com/f•••.php', 'Linux'],
        ['Nov 13, 2026, 06:07 PM', 'Matx1337', 'XH4X CYB3R', 'pentosec.com/f•••.php', 'Unknown'],
        ['Nov 05, 2026, 07:17 PM', 'MR RYUZAKI EXCLUSV', 'AKUDAMA SYNDICATE TEAM', 'www.bekasikab.go.id/?page=list-news', 'Linux'],
      ].map(([date, attacker, team, url, os], k) => ({ n: String(k + 1), date, attacker, team, url: `<span class="pq-urlchip">https://${m(url.split('/')[0], 3)}/${url.split('/').slice(1).join('/')}</span>`, os, mirror: 'mirror' })),
    },
    stops: [
      { sel: '.pq-table', tips: ['wAttacker', 'wUrl'] },
      { sel: '.pq-table', tips: ['wMirror'], modal: 'mirror' },
      { sel: '.pq-table', tips: ['wOs', 'filters'] },
    ],
  },
];

export const PHISH_CARDS = [
  { site: m('contactiibk2026pe.one', 3), url: `https://${m('contactiibk2026pe.one', 3)}/`, submitted: 'Nov 15, 2026, 10:07 PM', submitter: m('titus', 1), trail: ['Not provided', 'Not provided', 'Not provided', 'Not provided'], place: ['—', 'Not provided', 'Not provided', 'Not provided'], hosting: 'Not provided', look: 'bank' },
  { site: m('vene2026personal.xyz', 3), url: `https://${m('vene2026personal.xyz', 3)}/`, submitted: 'Nov 15, 2026, 10:01 PM', submitter: m('titus', 1), trail: ['Not provided', 'Not provided', 'Not provided', 'Not provided'], place: ['—', 'Not provided', 'Not provided', 'Not provided'], hosting: 'Not provided', look: 'app' },
  { site: m('startio-trexoru.framer.website', 3), url: `https://${m('startio-trexoru', 3)}.framer.website/`, submitted: 'Nov 15, 2026, 09:54 PM', submitter: m('titus', 1), trail: ['31.43.161.6', 'Framer B.V.', 'Amazon.com, Inc.', 'AS16509'], place: ['flag:nl:Netherlands', 'Provincie Noord-Holland', 'Amsterdam', 'Europe/Amsterdam'], hosting: 'HOSTING/CLOUD', look: 'doc' },
];

export const LIVE = {
  counters: [['Countries', '100'], ['Data leaks', '6.2K'], ['Forums', '13.2K'], ['Botnet', '0'], ['Phishing', '6.3K']] as [string, string][],
  top: [['Afghanistan', 97], ['Albania', 1], ['Algeria', 10], ['Argentina', 203], ['Armenia', 11], ['Australia', 117], ['Austria', 23], ['Azerbaijan', 3], ['Bahrain', 3], ['Bangladesh', 98]] as [string, number][],
};
export const NAV = ['Live Map', 'Global search', 'Forums', 'Data Leaks', 'Credentials', 'Botnet data', 'Phishing', 'Websites Hacked', 'Monitoring', 'OSINT'];
export const NAV_MODULE: Record<string, number> = { 'Live Map': 0, Forums: 1, 'Data Leaks': 2, Credentials: 3, 'Botnet data': 4, Phishing: 5, 'Websites Hacked': 6 };
export const NAV_EXTRA: Record<string, string> = {
  'Global search': 'Search every source at once: one query across forums, leaks, credentials, botnet logs, phishing and defacements.',
  Monitoring: 'Watch your own domains, brands and keywords. New matches raise an alert the moment they are collected.',
  OSINT: 'Open-source investigation tools for analysts: pivot from a name, a domain or an address to everything linked to it.',
};
export { SESSION };
