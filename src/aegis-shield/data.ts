// Content for /aegis-shield. Facts come from the AEGIS-SHIELD deck and from the developer's
// dashboard captures (public/aegis-shield/media). Rects are in source-image pixels: the console
// pans from the whole dashboard to the evidence rect while the module is on screen.

export type Module = {
  id: string;
  tab: string;
  title: string;
  lede: string;
  body: string;
  evidence: { k: string; v: string; tone?: 'crit' | 'high' | 'ok' }[];
  img: string;
  alt: string;
  w: number;
  h: number;
  focus: [number, number, number, number]; // x, y, w, h
};

export const MODULES: Module[] = [
  {
    id: 'triage', tab: 'Triage', title: 'Triage',
    lede: 'Start with the worst threat.',
    body: 'Detections arrive ranked by severity and tagged with their ATT&CK technique. A curated rule library keeps Critical rare, so when it shows up, someone acts on it.',
    evidence: [
      { k: 'WannaCry ransomware', v: 'Critical · 5 hits · T1210', tone: 'crit' },
      { k: 'Potential SMB relay', v: 'Critical · T1557.001', tone: 'crit' },
      { k: 'New Run key', v: 'High · T1547.001', tone: 'high' },
    ],
    img: 'triage.jpg', alt: 'Priority triage table listing detection rules by severity with hits, endpoints, ATT&CK techniques and tactics, above a detections over time chart', w: 1527, h: 849,
    focus: [0, 60, 1010, 330],
  },
  {
    id: 'hunt', tab: 'Hunt', title: 'Hunt',
    lede: 'Read the whole attack story on one screen.',
    body: 'Process trees, command lines, network, registry and file changes sit side by side. Here a keylogger gives itself away: DPBJ.exe, the Ardamax payload, mailing what it captured over SMTP.',
    evidence: [
      { k: 'DPBJ.exe', v: 'smtp-yahoo · port 587 · 228 connections', tone: 'crit' },
      { k: 'Timestomping', v: 'EID 2 · T1070.006 · back-dated to 2019', tone: 'high' },
    ],
    img: 'programs.jpg', alt: 'Most executed programs chart, a file timestamp changed table and a network connections table where DPBJ.exe connects to smtp-yahoo on port 587', w: 1530, h: 837,
    focus: [770, 450, 760, 387],
  },
  {
    id: 'watch', tab: 'Watch', title: 'Watch',
    lede: 'No silent blind spots.',
    body: 'Every sensor reports by event ID and by hour. A host that goes quiet, or a surge like the five thousand network connections in three hours, is raised before anyone has to ask.',
    evidence: [
      { k: 'Network connections', v: 'peak above 5,000 per 3 h', tone: 'high' },
      { k: 'Heatmap', v: '16 event IDs tracked per hour' },
    ],
    img: 'sensors.jpg', alt: 'Event ID activity heatmap and a sensor activity timeline of process executions and network connections', w: 1533, h: 841,
    focus: [0, 0, 1533, 400],
  },
  {
    id: 'respond', tab: 'Respond', title: 'Respond',
    lede: 'Contained in seconds, written down forever.',
    body: 'Active response fires the moment a rule confirms it: the Run key Jigsaw planted is removed, WannaCry\u2019s children are stopped as cmd.exe spawns them. Every action is scoped, logged and tied to a rule.',
    evidence: [
      { k: 'Rule 100010', v: 'AEGIS-AR trigger · 59 events', tone: 'crit' },
      { k: 'aegis-kill-process.exe', v: '153 runs on the fleet', tone: 'ok' },
      { k: 'Ransomware.exe → cmd.exe /c reg', v: 'EID 1 · T1059', tone: 'high' },
    ],
    img: 'sensors.jpg', alt: 'Active response table of fired mitigations by rule ID, next to process creations where a ransomware sample spawns cmd.exe', w: 1533, h: 841,
    focus: [0, 405, 1533, 436],
  },
  {
    id: 'persistence', tab: 'Persistence', title: 'Persist\u00adence',
    lede: 'Every foothold that survives a reboot.',
    body: 'Logon items, scheduled tasks, services, drivers, Winlogon, LSA and print providers, image hijacks. Each autostart location is read on every host and carries its ATT&CK persistence technique.',
    evidence: [
      { k: 'Drivers', v: '~980 unique entries' },
      { k: 'Scheduled tasks', v: '~490 unique entries' },
      { k: 'Active Setup', v: '17 logon autostarts', tone: 'high' },
    ],
    img: 'autostarts.jpg', alt: 'Autostarts by category and by publisher, with a chart of the registry locations where logon items autostart', w: 1528, h: 712,
    focus: [0, 375, 1528, 337],
  },
  {
    id: 'trust', tab: 'Trust', title: 'Trust',
    lede: 'Unsigned and unverified rise to the top.',
    body: 'Each entry is checked for a valid signature. Items in user-writable paths, or seen on a single host, stand out from the baseline, so a host can be cleared in minutes instead of days.',
    evidence: [
      { k: 'Evil', v: 'Logon · C:\\evil.exe · 11 sightings', tone: 'crit' },
      { k: 'DPBJ Agent', v: 'Logon · SysWOW64 · unsigned', tone: 'crit' },
    ],
    img: 'trust.jpg', alt: 'Trust posture by category, and an untrusted autostarts triage table listing Evil and DPBJ Agent logon entries', w: 1519, h: 779,
    focus: [0, 380, 900, 399],
  },
  {
    id: 'fleet', tab: 'Fleet', title: 'Fleet',
    lede: 'One baseline for every endpoint.',
    body: 'Thousands of autostarts across the fleet, split by endpoint, by user and by signature. When 98% is verified, the rest is a short list, not a haystack.',
    evidence: [
      { k: 'Unique autostarts', v: '3,288 across 6 endpoints' },
      { k: 'Verified', v: '98.21%', tone: 'ok' },
      { k: 'Unsigned', v: '1.37%', tone: 'high' },
    ],
    img: 'fleet.jpg', alt: 'Autostart overview: 3,288 unique entries, autostarts by endpoint IP, signature trust split and entries by user', w: 1528, h: 748,
    focus: [860, 0, 668, 405],
  },
  {
    id: 'attack', tab: 'ATT&CK', title: 'ATT&CK',
    lede: 'Every detection lands on the matrix.',
    body: 'The matrix slides out beside the investigation and follows every filter, so one host\u2019s attack path lights up cell by cell. Cells open into sub-techniques and link straight to the reference.',
    evidence: [
      { k: 'Detections', v: '235 on Windows' },
      { k: 'Techniques hit', v: '13 techniques · 13 sub-techniques', tone: 'high' },
      { k: 'Matrix', v: '21 of 179 cells lit', tone: 'ok' },
    ],
    img: 'attack-matrix.jpg', alt: 'MITRE ATT&CK Enterprise matrix for Windows with 21 of 179 cells lit, including Command and Scripting Interpreter and Boot or Logon Autostart Execution', w: 1600, h: 811,
    focus: [280, 100, 820, 420],
  },
];

export const PARTS = [
  { id: 'cpu', k: 'Intel Core i7-13620H', v: '10 cores' },
  { id: 'ram', k: 'Generous memory', v: 'room for heavy hunts' },
  { id: 'nvme', k: 'Large NVMe', v: 'fast local retention' },
  { id: 'fan', k: 'Near-silent cooling', v: 'desk or cabinet' },
  { id: 'net', k: '2.5 GbE', v: 'up to 3 networks' },
];

export const BOOT_LINES = [
  'aegis-shield 4.2 · Mi713 · i7-13620H',
  'net0  2.5GbE link up',
  'rules  Sigma signatures loaded, tuned as code',
  'attck  Enterprise v20 matrix loaded',
  'sensor 100.70.59.89    1,689 autostarts',
  'sensor 100.114.19.92   1,641 autostarts',
  'sensor 192.168.90.230  1,633 autostarts',
  'sensor 100.102.143.99  1,602 autostarts',
  'sensor 100.94.194.94   1,438 autostarts',
  'sensor 100.127.225.35  1,384 autostarts',
  'queue  235 detections · 3 critical',
];
