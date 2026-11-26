// Every line on /sysbastion/ lives here. Facts come from the SysBastion V1.4 engineering report
// (only items it marks PASS or that the product UI shows) and from the V1.4 promo film.

export type GroupId = 'uac' | 'hardening' | 'scripts' | 'powershell' | 'network' | 'readers' | 'tools';

/** Control groups. Each owns a generated pattern (card backs, crests, totems, balls). */
export const groups: Record<GroupId, { name: string }> = {
  uac: { name: 'User Account Control' },
  hardening: { name: 'System hardening' },
  scripts: { name: 'Script & execution' },
  powershell: { name: 'PowerShell' },
  network: { name: 'Network & firewall' },
  readers: { name: 'Document readers' },
  tools: { name: 'System tools' },
};

/** Hero spiral tiles: real panels of the V1.4 window, captured from the same HTML the page uses
 *  (public/sysbastion/ui/tile-*.webp). Tile 0 is the one that docks into the window. */
export const tiles: { id: string; group: GroupId }[] = [
  { id: 'hardening', group: 'hardening' }, { id: 'uac', group: 'uac' }, { id: 'types', group: 'scripts' },
  { id: 'outbound', group: 'network' }, { id: 'adobe', group: 'readers' }, { id: 'powershell', group: 'powershell' },
  { id: 'journal', group: 'tools' }, { id: 'shields', group: 'network' }, { id: 'scripts', group: 'scripts' },
  { id: 'office', group: 'readers' }, { id: 'uacAdmin', group: 'uac' }, { id: 'audit', group: 'tools' },
  { id: 'foxit', group: 'readers' }, { id: 'tools', group: 'tools' }, { id: 'psPolicy', group: 'powershell' },
];

export const hero = {
  title: 'Deny by default',
  tagline: 'A Windows hardening console. Close the ways in, keep a journal, put every value back.',
  cta: 'Request a demo',
};

export const problem = {
  label: 'The problem',
  chapter: 'Chapter 01',
  lines: [
    { t: 'Every attack', ml: '42.4vw' },
    { t: 'needs a way in.', ml: '25.1vw' },
    { t: 'Windows ships with', ml: '17vw' },
    { t: 'doors open.', ml: '42.4vw' },
  ],
  body: 'Scripts that run on a double-click. Macros that fire when a document opens. Tools like certutil and mshta that can reach the internet. None of it is a bug. It’s how Windows arrives, and it stays that way because changing it by hand is slow and hard to undo.',
};

export const applied = {
  label: 'One click',
  chapter: 'Chapter 02',
  head: [
    ['Setting', 'changed.'],
    ['Old', 'value', 'kept.'],
  ],
  lead: 'Every change is written to a journal first: the setting, the value it replaced, and the time to the second.',
  para: 'A ticked box is only an instruction. So after Apply, SysBastion reads the setting back from Windows and records what Windows actually accepted, not what the checkbox says.',
};

export const waysIn = {
  label: 'Ways in',
  chapter: 'Chapter 03',
  head: ['It starts with one', 'file.', 'It rarely stays that small.'],
  sub: 'No promise that nothing gets through. Just the ways in V1.4 closes, and what we saw when we tested them.',
  rowLabel: 'A way in',
  rows: [
    {
      way: 'A script you double-click.',
      desc: 'Fourteen risky file types, from .vbs and .js to .hta and .scr, open as plain text in Notepad. Reading one is safe. Running it takes a deliberate choice.',
      img: '/sysbastion/film-1.webp',
    },
    {
      way: 'A batch file run anyway.',
      desc: 'Typing the path into a console still meets the policy. Windows answers: this program is blocked by group policy.',
      img: '/sysbastion/film-2.webp',
    },
    {
      way: 'A PowerShell script.',
      desc: 'Script files are refused at the machine level, for every account on the PC, not just the one that clicked.',
      img: '/sysbastion/film-3.webp',
    },
    {
      way: 'A connection out.',
      desc: 'Thirty-five tools attackers lean on get outbound block rules in both Defender Firewall and the Filtering Platform. A blocked PowerShell connection stayed blocked after a restart.',
      img: '/sysbastion/film-4.webp',
    },
    {
      way: 'A connection in.',
      desc: 'Shields-Up drops unsolicited inbound traffic. A connection that worked before Apply timed out after it, and again after Windows restarted.',
      img: '/sysbastion/film-5.webp',
    },
  ],
};

export const restore = {
  label: 'Restore',
  chapter: 'Chapter 04',
  colL: ['Put', 'it all', 'back'],
  colR: ['Exactly', 'as it', 'was'],
  bodyL: 'Restore all applied walks the journal backwards and writes each original value back. If DCOM was enabled before, it’s enabled again. Not reset to a default, returned to what you had.',
  bodyR: 'A Windows restore point is offered before rules apply, as a second net. It’s separate from the journal, so you can undo SysBastion’s changes without rolling back anything else on the machine.',
  modal: {
    head: 'Restore all applied?',
    sub: 'Six changes, newest first',
    caption: 'Exact original. Not defaults.',
    pills: ['Cancel', 'Restore all'],
    rows: [
      { s: 'SMB2 client', o: 'Enabled', c: 'Disabled' },
      { s: 'NetBIOS over TCP/IP', o: 'Enabled', c: 'Disabled' },
      { s: 'AutoRun · AutoPlay', o: 'On', c: 'Off' },
      { s: 'DCOM', o: 'Enabled', c: 'Disabled' },
      { s: 'Windows Script Host', o: 'Enabled', c: 'Disabled' },
      { s: 'File extensions', o: 'Hidden', c: 'Visible' },
    ],
  },
};

export type ModuleShape = 'shield' | 'tower' | 'scroll' | 'prompt' | 'globe' | 'book';
export const modules = {
  label: 'Modules',
  chapter: 'Chapter 05',
  title: ['Six sections.', 'One console.'],
  pitch: 'Each section of the Harden menu owns one way in. Pick one to see what it locks, or take them all at once: Apply selected runs them together.',
  list: [
    { slug: 'uac', name: 'UAC', epithet: 'The gatekeeper', shape: 'shield' as ModuleShape, desc: 'Admin rights need a yes on the secure desktop, where other apps can’t click it for you.' },
    { slug: 'hardening', name: 'Hardening', epithet: 'The mason', shape: 'tower' as ModuleShape, desc: 'SMB1, NetBIOS, DCOM, AutoRun. Old doors bricked up in one pass.' },
    { slug: 'scripts', name: 'Scripts', epithet: 'The censor', shape: 'scroll' as ModuleShape, desc: 'Fourteen file types that run code now open as text.' },
    { slug: 'powershell', name: 'PowerShell', epithet: 'The warden', shape: 'prompt' as ModuleShape, desc: 'Script files refused machine-wide, for every account.' },
    { slug: 'network', name: 'Firewall', epithet: 'The wall', shape: 'globe' as ModuleShape, desc: 'Thirty-five tools cut off outbound. Nothing comes in uninvited.' },
    { slug: 'readers', name: 'Readers', epithet: 'The archivist', shape: 'book' as ModuleShape, desc: 'Office and Acrobat set by machine policy, Foxit staged before it’s installed.' },
  ],
};

export const evidence = {
  label: 'Evidence',
  chapter: 'Chapter 06',
  head: ['Every rule is', 'checked four ways.'],
  body: 'A policy value, a journal SysBastion owns, a readback of the effective policy, and a runtime test that tries the thing and gets refused. They’re different kinds of proof, and the engineering report keeps them apart. Click to drop a few in.',
  cols: [
    { key: 'POL', label: 'Policy value', group: 'readers' as GroupId, start: 20, fig: '30 / 30', note: 'Acrobat and Office values read back as set' },
    { key: 'JRN', label: 'Journal', group: 'hardening' as GroupId, start: 28, fig: '8 / 8', note: 'Acrobat and Office journals written' },
    { key: 'RBK', label: 'Readback', group: 'network' as GroupId, start: 24, fig: '2 / 2', note: 'Firewall journals still Applied after reboot' },
    { key: 'RUN', label: 'Runtime denial', group: 'uac' as GroupId, start: 16, fig: '6', note: 'Harmless test runs refused or blocked' },
  ],
};

export const tools = {
  label: 'System tools',
  chapter: 'Chapter 07',
  kicker: 'Sixteen tools. One tab.',
  head: ['Admin tools', 'one tab', 'away.'],
  lead: 'Check the change from the console you made it in.',
  body: 'Services, Registry Editor, Event Viewer, Windows Firewall, Windows Features and eleven more sit in the System tools tab. Open the right one, confirm what SysBastion changed, and come back without hunting through Control Panel.',
  list: [
    'System Restore', 'MSConfig', 'Registry Editor', 'UAC Settings', 'Windows Services', 'Windows Firewall',
    'Task Manager', 'Active Connections', 'Event Viewer', 'Windows Updates', 'System Information',
    'Command Prompt', 'Windows Features', 'PowerShell', 'Disk Cleanup', 'DCOM Config',
  ],
};

export const footer = {
  label: 'Get a demo',
  chapter: 'Chapter 08',
  lead: 'Deny by default. Reversible by design.',
  pitch: 'SysBastion V1.4 is in engineering validation now. Leave a work email and we’ll set up a walkthrough on a test machine.',
  placeholder: 'name@company.com',
  caption: 'Demo on a test VM · No card, no spam',
  made: 'Made by DigiInn360',
  tagline: 'Deny by default. Reversible by design.',
  mail: 'procurement@digiinn360.com',
};
