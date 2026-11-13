// Content for the page's demo journal. Setting names, journal columns and audit actions are the
// ones SysBastion V1.4 shows in its own Journal & restore and Audit log screens (see the film).
// Original values are typical starting values; on a real machine SysBastion records what it finds.

export type Entry = { setting: string; from: string; to: string };
export type Group = {
  id: string;
  name: string;
  entries: Entry[];
  audit: { change: string; action: string };
};

export const groups: Group[] = [
  {
    id: 'hardening',
    name: 'System hardening',
    entries: [
      { setting: 'SMB1 and SMB2 client', from: 'Enabled', to: 'Disabled' },
      { setting: 'NetBIOS over TCP/IP', from: 'Enabled', to: 'Disabled' },
      { setting: 'AutoRun and AutoPlay', from: 'On', to: 'Off' },
      { setting: 'DCOM', from: 'Enabled', to: 'Disabled' },
      { setting: 'File extensions', from: 'Hidden', to: 'Visible' },
    ],
    audit: { change: 'System hardening, 9 controls', action: 'applied' },
  },
  {
    id: 'scripts',
    name: 'Script and execution control',
    entries: [
      { setting: 'Windows Script Host', from: 'Enabled', to: 'Disabled' },
      { setting: '14 risky file types', from: 'Run on open', to: 'Open in Notepad' },
      { setting: 'AppLocker execution control', from: 'Off', to: 'Enforced' },
    ],
    audit: { change: 'Script and execution control', action: 'enforced' },
  },
  {
    id: 'powershell',
    name: 'PowerShell hardening',
    entries: [
      { setting: 'PowerShell execution policy', from: 'Not enforced', to: 'Enforced' },
      { setting: 'PowerShell script files', from: 'Allowed', to: 'Blocked' },
    ],
    audit: { change: 'PowerShell script files', action: 'blocked' },
  },
  {
    id: 'outbound',
    name: 'Outbound firewall',
    entries: [{ setting: 'Outbound firewall (35 apps)', from: 'Allowed', to: 'Blocked' }],
    audit: { change: 'Outbound firewall (35 apps)', action: 'enforced' },
  },
  {
    id: 'shields',
    name: 'Inbound Shields-Up',
    entries: [{ setting: 'Inbound Shields-Up', from: 'Off', to: 'On' }],
    audit: { change: 'Inbound Shields-Up', action: 'enabled' },
  },
  {
    id: 'readers',
    name: 'Document-reader hardening',
    entries: [
      { setting: 'Office macros, DDE, ActiveX, OLE', from: 'Allowed', to: 'Disabled' },
      { setting: 'Acrobat Reader JavaScript', from: 'On', to: 'Off' },
      { setting: 'Foxit Reader machine policy', from: 'None', to: 'Staged' },
    ],
    audit: { change: 'Document-reader policies', action: 'applied' },
  },
];
