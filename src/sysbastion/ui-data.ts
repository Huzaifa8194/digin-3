// What the SysBastion V1.4 window shows on each page. Names and lines come from the app's own
// screens (the two V1.4 screenshots), the V1.4 film, and the control lists in the engineering
// report (outbound executables, the thirteen document-reader rules, PowerShell controls).

export type PageId = 'uac' | 'hardening' | 'scripts' | 'powershell' | 'assoc' | 'network' | 'readers' | 'tools' | 'journal' | 'audit';
export type Row = { t: string; d?: string; on?: boolean; badge?: { text: string; tone: 'warn' | 'muted' | 'ok' } };

export const nav: { harden: { id: PageId; label: string; icon: string }[]; manage: { id: PageId; label: string; icon: string }[] } = {
  harden: [
    { id: 'uac', label: 'User Account Control', icon: 'user' },
    { id: 'hardening', label: 'System hardening', icon: 'sliders' },
    { id: 'scripts', label: 'Script & execution', icon: 'code' },
    { id: 'powershell', label: 'PowerShell', icon: 'terminal' },
    { id: 'assoc', label: 'File associations', icon: 'file' },
    { id: 'network', label: 'Network & firewall', icon: 'globe' },
    { id: 'readers', label: 'Document readers', icon: 'doc' },
  ],
  manage: [
    { id: 'tools', label: 'System tools', icon: 'wrench' },
    { id: 'journal', label: 'Journal & restore', icon: 'history' },
    { id: 'audit', label: 'Audit log', icon: 'list' },
  ],
};

export const cards = {
  uac: {
    icon: 'user', title: 'User Account Control', meta: '5 controls',
    rows: [
      { t: 'Turn on User Account Control (UAC)', d: 'Require approval before apps make system changes', on: true },
      { t: 'Only elevate executables that are signed and validated', d: 'Unsigned binaries can’t request admin rights', on: false },
      { t: 'Force UAC prompts on the secure desktop', d: 'Prompts appear where other apps can’t interact', on: true },
      { t: 'Virtualize file and registry write failures', d: 'Redirect failed writes to per-user locations', on: false },
      { t: 'Detect application installations', d: 'Prompt for elevation when installers run', on: false },
    ] as Row[],
  },
  uacAdmin: {
    title: 'Elevation prompt · administrators', radios: [
      { t: 'Elevate without prompting', badge: { text: 'Not recommended', tone: 'warn' } },
      { t: 'Prompt for credentials on the secure desktop' },
      { t: 'Prompt for consent on the secure desktop' },
      { t: 'Prompt for credentials' },
      { t: 'Prompt for consent' },
      { t: 'Prompt for consent for non-Windows binaries', badge: { text: 'Windows default', tone: 'muted' }, on: true },
    ] as Row[],
  },
  uacStd: {
    title: 'Elevation prompt · standard users', radios: [
      { t: 'Deny elevation requests for standard user accounts' },
      { t: 'Prompt for credentials on the secure desktop', badge: { text: 'Default', tone: 'muted' }, on: true },
      { t: 'Prompt for credentials' },
    ] as Row[],
  },
  hardening: {
    icon: 'sliders', title: 'System hardening', meta: 'Deny by default',
    rows: [
      { t: 'SmartScreen', d: 'Check apps and files against reputation' },
      { t: 'Data Execution Prevention (DEP)', d: 'Stop code running from data-only memory' },
      { t: 'Turn off AutoRun & AutoPlay', d: 'Removable media can’t launch anything' },
      { t: 'Disable SMB1 & SMB2', d: 'Turn off file-sharing protocols the endpoint doesn’t need' },
      { t: 'Disable NetBIOS', d: 'Stop legacy name broadcasts on the network' },
      { t: 'Safe DLL search order', d: 'Load system libraries before local copies' },
      { t: 'Disable DCOM', d: 'Turn off remote COM activation' },
      { t: 'Show file extensions', d: 'Expose spoofed names like invoice.pdf.bat' },
    ] as Row[],
  },
  scripts: {
    icon: 'code', title: 'Script & execution', meta: '4 controls',
    rows: [
      { t: 'Open risky file types as text', d: '14 extensions open in Notepad instead of running', on: true },
      { t: 'Turn off Windows Script Host', d: 'VBScript and JScript files stop running', on: true },
      { t: 'Block BAT and CMD by policy', d: '“This program is blocked by group policy”', on: true },
      { t: 'Reconcile AppLocker script rules', d: 'Script collection covers .ps1 .bat .cmd .vbs .js', on: false },
    ] as Row[],
  },
  types: ['.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta', '.scr', '.pif', '.reg', '.jar', '.bat', '.cmd', '.ps1'],
  powershell: {
    icon: 'terminal', title: 'PowerShell App Control', meta: 'Machine-wide',
    actions: ['Prepare', 'Audit', 'Enforce', 'Status', 'Remove'],
    rows: [
      { t: 'Disable script file execution', d: 'Machine-level block on .ps1 files, every account', on: true },
      { t: 'Enable script block logging', d: 'Writes Event 4104 to the PowerShell log', on: true },
      { t: 'Disable the PowerShell 2.0 engine', d: 'Remove the old engine that skips logging', on: false },
    ] as Row[],
  },
  psPolicy: {
    title: 'Execution policy · current user', radios: [
      { t: 'Restricted', badge: { text: 'Windows default', tone: 'muted' } },
      { t: 'AllSigned · Authenticode signature required', on: true },
      { t: 'RemoteSigned' },
      { t: 'Unrestricted', badge: { text: 'Not recommended', tone: 'warn' } },
    ] as Row[],
  },
  outbound: {
    icon: 'globe', title: 'Outbound firewall', meta: '35 executables',
    rows: ['attrib.exe', 'bitsadmin.exe', 'certutil.exe', 'cscript.exe', 'hh.exe', 'mshta.exe', 'msiexec.exe', 'powershell.exe', 'regsvr32.exe', 'rundll32.exe', 'wmic.exe', 'wscript.exe'].map((x) => ({ t: `Block outbound connections for ${x}`, on: true })) as Row[],
  },
  shields: {
    icon: 'shield', title: 'Inbound · Shields-Up', meta: 'All profiles',
    rows: [
      { t: 'Block all unsolicited inbound connections', d: 'Drop traffic nothing on this PC asked for', on: true },
      { t: 'Apply to every firewall profile', d: 'Domain, Private and Public', on: true },
      { t: 'Persist across restarts', d: 'Still on after Windows restarts', on: true },
    ] as Row[],
  },
  adobe: {
    icon: 'doc', title: 'Adobe Acrobat Reader', meta: 'Installed',
    rows: [
      { t: 'Turn off JavaScript in Adobe Reader', on: true },
      { t: 'Turn on Protected View in Adobe Reader', on: true },
      { t: 'Turn off opening of non-PDF files', on: true },
      { t: 'Turn on Enhanced Security', on: true },
      { t: 'Turn on check for updates at startup', on: true },
    ] as Row[],
  },
  office: {
    icon: 'doc', title: 'Microsoft Office', meta: 'Machine policy',
    rows: [
      { t: 'Turn off macros in Microsoft Office', on: true },
      { t: 'Restrict DDE server launch and lookup', on: true },
      { t: 'Block untrusted ActiveX controls', on: true },
      { t: 'Restrict OLE package activation', on: true },
    ] as Row[],
  },
  foxit: {
    icon: 'doc', title: 'Foxit PDF Reader', meta: 'Not installed yet',
    rows: [
      { t: 'Turn off JavaScript actions', on: true },
      { t: 'Turn on Protected View for all files', on: true },
      { t: 'Turn on Safe Reading Mode', on: true },
      { t: 'Kingsoft WPS: macro security Very High', on: false, badge: { text: 'Not supported', tone: 'warn' } },
    ] as Row[],
  },
  restore: { title: 'System restore point', d: 'Offered before rules apply' },
};

/** Changes written by Apply in Chapter 02, then rolled back in Chapter 04. */
export const journal = [
  { s: 'SmartScreen', o: 'Off', c: 'On' },
  { s: 'Data Execution Prevention', o: 'OptIn', c: 'AlwaysOn' },
  { s: 'AutoRun · AutoPlay', o: 'On', c: 'Off' },
  { s: 'SMB1 · SMB2 client', o: 'Enabled', c: 'Disabled' },
  { s: 'NetBIOS over TCP/IP', o: 'Enabled', c: 'Disabled' },
  { s: 'Safe DLL search order', o: 'Default', c: 'Enforced' },
  { s: 'DCOM', o: 'Enabled', c: 'Disabled' },
  { s: 'File extensions', o: 'Hidden', c: 'Visible' },
];

export const audit = [
  { c: 'UAC enforcement', a: 'applied' },
  { c: 'Windows Script Host', a: 'disabled' },
  { c: 'PowerShell script files', a: 'blocked' },
  { c: 'Outbound firewall (35 apps)', a: 'enforced' },
  { c: 'Shields-Up inbound', a: 'enabled' },
  { c: 'Office macros (policy)', a: 'locked' },
  { c: 'System hardening, 8 controls', a: 'applied' },
];

export const toolsList = ['System Restore', 'MSConfig', 'Registry Editor', 'UAC Settings', 'Windows Services', 'Windows Firewall', 'Task Manager', 'Active Connections', 'Event Viewer', 'Windows Updates', 'System Information', 'Command Prompt', 'Windows Features', 'PowerShell', 'Disk Cleanup', 'DCOM Config'];
