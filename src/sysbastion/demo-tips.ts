// Tooltip copy for the interactive demo. `ev` is what the V1.4 engineering report recorded for that
// control, worded to match its own status (PASS, PARTIAL, PENDING, UNSUPPORTED, configuration only).

export type Ev = { tone: 'pass' | 'partial' | 'pending' | 'config' | 'no'; text: string };
export type Tip = { t: string; d: string; ev?: Ev };

const PASS = (text: string): Ev => ({ tone: 'pass', text });
const PART = (text: string): Ev => ({ tone: 'partial', text });
const PEND = (text: string): Ev => ({ tone: 'pending', text });
const CONF = (text: string): Ev => ({ tone: 'config', text });

export const tips: Record<string, Tip> = {
  // sidebar
  'nav:uac': { t: 'User Account Control', d: 'Who can make system changes, and how they’re asked first.' },
  'nav:hardening': { t: 'System hardening', d: 'Old Windows features attackers still lean on, switched off in one pass.' },
  'nav:scripts': { t: 'Script & execution', d: 'Script hosts and the file types that run code when opened.' },
  'nav:powershell': { t: 'PowerShell', d: 'Machine-wide script policy and logging for PowerShell.' },
  'nav:assoc': { t: 'File associations', d: 'Which program opens each risky file type. Here: Notepad.' },
  'nav:network': { t: 'Network & firewall', d: 'Outbound blocks for 35 tools, and inbound Shields-Up.' },
  'nav:readers': { t: 'Document readers', d: 'Office, Acrobat and Foxit locked down through official machine policy.' },
  'nav:tools': { t: 'System tools', d: 'Sixteen Windows admin tools, one click away from where you made the change.' },
  'nav:journal': { t: 'Journal & restore', d: 'Every change made in this demo, with the value it replaced. Restore puts them back.' },
  'nav:audit': { t: 'Audit log', d: 'What changed, when, and who ran it.' },
  rp: { t: 'System restore point', d: 'Before rules apply, SysBastion offers a Windows restore point as a second safety net, separate from its own journal.' },
  menus: { t: 'App menus', d: 'File, Tweaks, Tools and Help. This demo covers the Harden and Manage sections.' },
  close: { t: 'Close the demo', d: 'Back to the page. Esc works too.' },

  // bottom bar
  'btn:help': { t: 'Take the tour', d: 'Five steps: sections, selecting, applying, restoring, and the restore point.' },
  'btn:select': { t: 'Select all', d: 'Ticks every control on this page. Nothing changes until you apply.' },
  'btn:restore': { t: 'Restore all applied', d: 'Writes back the exact value SysBastion recorded before each change. Not Windows defaults: what you had.' },
  'btn:apply': { t: 'Apply selected', d: 'Applies every ticked control. Each change is written to the journal first, then read back from Windows.' },
  status: { t: 'Status', d: 'What SysBastion is doing, and what it last did.' },

  // User Account Control
  'uac:0': { t: 'Turn on User Account Control', d: 'Keeps admin rights behind a prompt. With UAC off, every program runs with your full rights.', ev: PART('Policy values and an elevation refusal were recorded. UAC still needs app control to stop non-admin malware.') },
  'uac:1': { t: 'Only elevate signed executables', d: 'Unsigned programs can’t ask for admin rights at all.', ev: PASS('An unsigned test executable was refused elevation.') },
  'uac:2': { t: 'Prompts on the secure desktop', d: 'The prompt appears on a separate desktop other programs can’t see or click, so malware can’t approve itself.' },
  'uac:3': { t: 'Virtualize write failures', d: 'Older programs that write to protected folders get a per-user copy instead of failing. Useful for legacy apps.' },
  'uac:4': { t: 'Detect application installations', d: 'Installers trigger an elevation prompt automatically, so a setup file can’t pass as an ordinary program.' },
  'uacAdmin:0': { t: 'Elevate without prompting', d: 'Admins get full rights silently. Anything you run can change the system. Avoid.' },
  'uacAdmin:1': { t: 'Credentials on the secure desktop', d: 'Admins type their password on the secure desktop. The strictest option.' },
  'uacAdmin:2': { t: 'Consent on the secure desktop', d: 'Admins click Yes on the secure desktop.' },
  'uacAdmin:3': { t: 'Prompt for credentials', d: 'Password prompt on the normal desktop.' },
  'uacAdmin:4': { t: 'Prompt for consent', d: 'Yes or No on the normal desktop, where other programs could interfere.' },
  'uacAdmin:5': { t: 'Consent for non-Windows binaries', d: 'Windows’ own default: prompts only for programs that aren’t part of Windows.' },
  'uacStd:0': { t: 'Deny elevation for standard users', d: 'Standard accounts can’t elevate at all; an admin has to sign in.' },
  'uacStd:1': { t: 'Credentials on the secure desktop', d: 'The default. Standard users enter admin credentials on the secure desktop.' },
  'uacStd:2': { t: 'Prompt for credentials', d: 'Admin credentials on the normal desktop.' },

  // System hardening
  'hardening:0': { t: 'SmartScreen', d: 'Checks downloaded apps and files against Microsoft’s reputation service before they run.' },
  'hardening:1': { t: 'Data Execution Prevention', d: 'Marks data memory as non-executable, so code injected into it can’t run. Set to AlwaysOn.' },
  'hardening:2': { t: 'AutoRun and AutoPlay off', d: 'USB drives and discs can’t start anything when they’re plugged in.' },
  'hardening:3': { t: 'Disable SMB1 and SMB2', d: 'Turns off old file-sharing protocols that worms have spread through. For endpoints that don’t share files.' },
  'hardening:4': { t: 'Disable NetBIOS', d: 'Stops legacy name broadcasts that attackers can answer to capture credentials.' },
  'hardening:5': { t: 'Safe DLL search order', d: 'Windows looks in system folders first, so a DLL planted next to a document isn’t loaded.' },
  'hardening:6': { t: 'Disable DCOM', d: 'Turns off remote COM activation, a common path for moving between machines.' },
  'hardening:7': { t: 'Show file extensions', d: 'Shows .exe and .bat endings, so invoice.pdf.bat can’t pass as a PDF.' },

  // Script & execution
  'scripts:0': { t: 'Open risky file types as text', d: 'Double-clicking any of the 14 types opens it in Notepad instead of running it.', ev: PART('The double-click path was tested. Running a host directly (for example mshta) needs the controls below.') },
  'scripts:1': { t: 'Turn off Windows Script Host', d: 'VBScript and JScript files can’t run, even when someone calls the host directly.', ev: PASS('A harmless test VBS was refused after the change.') },
  'scripts:2': { t: 'Block BAT and CMD by policy', d: 'Batch files are refused even when the path is typed into a console.', ev: PASS('Windows answered: this program is blocked by group policy.') },
  'scripts:3': { t: 'Reconcile AppLocker script rules', d: 'Keeps AppLocker’s script rules for .ps1 .bat .cmd .vbs and .js in step with your selections.' },
  'types:0': { t: 'Open in Notepad', d: 'The safe-open handler for all 14 types below. Reading a script is harmless; running it now takes a deliberate choice.' },

  // PowerShell
  'act:Prepare': { t: 'Prepare', d: 'Stages the machine-wide App Control policy without enforcing it.' },
  'act:Audit': { t: 'Audit', d: 'Runs the policy in audit mode: would-be blocks are logged, nothing is stopped yet.' },
  'act:Enforce': { t: 'Enforce', d: 'Turns the reviewed policy on for every account on the PC.' },
  'act:Status': { t: 'Status', d: 'Reads back what Windows is actually enforcing right now.' },
  'act:Remove': { t: 'Remove', d: 'Takes the policy off again.' },
  'powershell:0': { t: 'Disable script file execution', d: 'Machine-level block on .ps1 files for every account, not just the one signed in.', ev: PASS('The machine-level script-file restriction was tested.') },
  'powershell:1': { t: 'Script block logging', d: 'Records the PowerShell code that runs (Event 4104), so you can see afterwards what ran.' },
  'powershell:2': { t: 'Disable the PowerShell 2.0 engine', d: 'Removes the old engine, which skips modern logging and is used to dodge it.', ev: PEND('The 2.0 engine’s servicing lifecycle is still being validated.') },
  'psPolicy:0': { t: 'Restricted', d: 'No scripts run at all. The Windows default on client editions.' },
  'psPolicy:1': { t: 'AllSigned', d: 'Only scripts signed by a trusted publisher run.' },
  'psPolicy:2': { t: 'RemoteSigned', d: 'Local scripts run; downloaded ones need a signature.' },
  'psPolicy:3': { t: 'Unrestricted', d: 'Everything runs, with a warning for downloaded scripts.' },

  // Network
  'shields:0': { t: 'Block unsolicited inbound', d: 'Drops inbound connections that nothing on this PC asked for.', ev: PASS('A connection that worked before Apply timed out after it, and again after a restart.') },
  'shields:1': { t: 'Every firewall profile', d: 'Domain, Private and Public, so joining a different network doesn’t drop the protection.' },
  'shields:2': { t: 'Persist across restarts', d: 'The block is still there after Windows restarts.', ev: PASS('Still blocked after reboot in testing.') },

  // Readers
  'adobe:0': { t: 'JavaScript off in Acrobat Reader', d: 'PDF JavaScript is switched off and the setting is locked.', ev: PASS('Seen greyed out and off in Reader’s own preferences.') },
  'adobe:1': { t: 'Protected View on', d: 'Every PDF opens read-only in a sandbox first.', ev: PASS('Protected View set to All files and locked.') },
  'adobe:2': { t: 'No opening non-PDF attachments', d: 'Reader won’t launch files embedded in a PDF.', ev: PEND('Registry value set; attachment behaviour still to be tested.') },
  'adobe:3': { t: 'Enhanced Security on', d: 'Restricts what a PDF can reach on disk and on the network.', ev: PASS('Seen enabled and locked in Reader.') },
  'adobe:4': { t: 'Check for updates at startup', d: 'Reader looks for security updates each time it starts.', ev: PEND('Update behaviour still to be tested.') },
  'office:0': { t: 'Macros off in Office', d: 'Macros in Word, Excel and PowerPoint documents don’t run.', ev: CONF('All 14 Office registry values verified; Office itself not installed on the test machine yet.') },
  'office:1': { t: 'Restrict DDE', d: 'Stops documents launching other programs through Dynamic Data Exchange.', ev: CONF('Registry verified, app behaviour untested.') },
  'office:2': { t: 'Block untrusted ActiveX', d: 'Untrusted ActiveX controls embedded in documents don’t load.', ev: CONF('Registry verified, app behaviour untested.') },
  'office:3': { t: 'Restrict OLE packages', d: 'Embedded packages can’t run when someone clicks them in a document.', ev: CONF('Registry verified, app behaviour untested.') },
  'foxit:0': { t: 'JavaScript actions off in Foxit', d: 'PDF scripts don’t run in Foxit Reader.', ev: CONF('Official machine policy applied before install; in-app check pending.') },
  'foxit:1': { t: 'Protected View for all files', d: 'Every file opens read-only first.', ev: CONF('Policy applied; in-app check pending.') },
  'foxit:2': { t: 'Safe Reading Mode', d: 'Blocks external content and actions from PDFs.', ev: CONF('Policy applied; in-app check pending.') },
  'foxit:3': { t: 'Kingsoft WPS macro security', d: 'WPS shows its own Very High setting, but there’s no supported machine policy to enforce it.', ev: { tone: 'no', text: 'Unsupported: no validated enforcement for WPS.' } },
};

const outboundWhy: Record<string, string> = {
  'attrib.exe': 'used to hide files', 'bitsadmin.exe': 'used for quiet background downloads', 'certutil.exe': 'used to download and decode payloads',
  'cscript.exe': 'runs VBScript and JScript', 'hh.exe': 'opens compiled help files that can carry script', 'mshta.exe': 'runs HTML applications',
  'msiexec.exe': 'can install packages straight from a URL', 'powershell.exe': 'the attacker’s favourite shell', 'regsvr32.exe': 'can load remote scriptlets',
  'rundll32.exe': 'runs code from any DLL', 'wmic.exe': 'runs commands locally and remotely', 'wscript.exe': 'runs VBScript and JScript',
};
export function outboundTip(exe: string): Tip {
  return {
    t: `Outbound block: ${exe}`,
    d: `Stops ${exe} (${outboundWhy[exe] ?? 'a tool attackers misuse'}) reaching the internet, in both Defender Firewall and the Windows Filtering Platform.`,
    ev: exe === 'powershell.exe' ? PASS('A real PowerShell connection was blocked and stayed blocked after reboot.') : PART('Rules for all 35 tools were created; the full-set effective state is still being validated.'),
  };
}

const hosts: Record<string, string> = {
  '.vbs': 'Windows Script Host', '.vbe': 'Windows Script Host', '.js': 'Windows Script Host (JScript)', '.jse': 'Windows Script Host (JScript)',
  '.wsf': 'Windows Script Host', '.wsh': 'Windows Script Host', '.hta': 'mshta, the HTML application host', '.scr': 'itself: a screensaver is a program',
  '.pif': 'itself: a program shortcut that can run code', '.reg': 'Registry Editor, which imports it', '.jar': 'Java', '.bat': 'Command Prompt',
  '.cmd': 'Command Prompt', '.ps1': 'PowerShell',
};
export function typeTip(ext: string): Tip {
  return { t: `${ext} opens as text`, d: `Normally a double-click hands ${ext} to ${hosts[ext] ?? 'its host'}. With SysBastion it opens in Notepad.` };
}

const toolCmd: Record<string, string> = {
  'System Restore': 'rstrui', MSConfig: 'msconfig', 'Registry Editor': 'regedit', 'UAC Settings': 'UserAccountControlSettings', 'Windows Services': 'services.msc',
  'Windows Firewall': 'wf.msc', 'Task Manager': 'taskmgr', 'Event Viewer': 'eventvwr.msc', 'System Information': 'msinfo32', 'Command Prompt': 'cmd',
  'Windows Features': 'optionalfeatures', PowerShell: 'powershell', 'Disk Cleanup': 'cleanmgr', 'DCOM Config': 'dcomcnfg',
};
export function toolTip(name: string): Tip {
  const c = toolCmd[name];
  return { t: name, d: `Opens Windows’ ${name}${c ? ` (${c})` : ''}, so you can check a change from the console you made it in.` };
}
