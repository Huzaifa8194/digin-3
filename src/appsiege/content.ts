// Every word on /appsiege/. Facts come from the AppSiege deck, the AppSiege-3 film and the product UI.
// HotBite is the fictional demo app used in the film.

export const MEDIA = '/appsiege/media/';

export const headline = {
  lines: ['AGENTIC', 'MOBILE APP', 'PENTESTING'],
  column: [
    'AI-DRIVEN SECURITY ASSESSMENT\nFOR ANDROID & IOS',
    'THREE AGENTS TEST YOUR APK OR IPA:\nSTATIC, DYNAMIC AND AI-ASSISTED',
    'EVERY FINDING ARRIVES WITH EVIDENCE,\nA RISK RATING AND THE EXACT FIX',
  ],
};

export interface Card {
  id: string;
  title: string[];      // lines drawn in the card
  tag: string;          // small line above the title
  clip: string | null;  // video clip, or null for a still
  poster: string;
  tint: [number, number, number];
  body: string;
  points: string[];
  shot: string;         // what the drawn shot shows, for screen readers
}

export const cards: Card[] = [
  {
    id: 'upload', shot: 'Terminal runs AppSiege against the HotBite app; the app file uploads and the static, dynamic and AI-assisted agents start.', title: ['UPLOAD', 'THE APP'], tag: 'APK  /  IPA', clip: 'c1-target', poster: 'c1-target.webp', tint: [0.85, 0.2, 0.22],
    body: 'Ships Friday. Is it safe? Drop in the Android APK or the iOS IPA, up to 200 MB, and the agents take it from there.',
    points: ['Android APK and iOS IPA', 'One upload starts static and dynamic testing', 'Nothing to install on the device'],
  },
  {
    id: 'static', shot: 'The Static Analysis panel ticks through its eight checks one by one.', title: ['STATIC', 'ANALYSIS'], tag: 'AGENT 01', clip: null, poster: 'c2-static.webp', tint: [0.42, 0.5, 1.0],
    body: 'The static agent reads code, manifest, permissions and resources before the app ever runs.',
    points: ['Hardcoded secrets and API keys', 'Network security and cleartext traffic', 'Weak cryptography', 'Manifest and entitlement flags', 'Dangerous permissions and exported components', 'Binary and native string extraction', 'Tracker and anti-VM detection', 'Certificate analysis'],
  },
  {
    id: 'protections', shot: 'The agent gets past root, jailbreak and emulator checks, SSL pinning and Flutter obfuscation, five of five.', title: ['GETS PAST', 'PROTECTIONS'], tag: 'FIVE OF FIVE', clip: 'c3-bypass', poster: 'c3-bypass.webp', tint: [0.55, 0.62, 1.0],
    body: 'Apps defend themselves. The agent gets past every one of those defences on its own, so testing reaches the real traffic.',
    points: ['Root checks', 'Jailbreak checks', 'Emulator checks', 'SSL pinning', 'Flutter obfuscation'],
  },
  {
    id: 'dynamic', shot: 'The agent fills the HotBite sign-up form field by field while the live findings log records each step.', title: ['USES IT LIKE', 'A PERSON'], tag: 'AGENT 02', clip: 'c4-dynamic', poster: 'c4-dynamic.webp', tint: [0.25, 0.7, 0.62],
    body: 'The dynamic agent runs the app, fills each form field, verifies it and streams every step to a live findings log.',
    points: ['Runtime behaviour', 'Network traffic through the proxy', 'API interactions', 'Live findings log'],
  },
  {
    id: 'approval', shot: 'A risky replay of GET /orders/{id} as another user waits; the pointer moves from Hold to Approve.', title: ['ASKS YOU', 'FIRST'], tag: 'HUMAN APPROVAL', clip: 'c5-approval', poster: 'c5-approval.webp', tint: [0.9, 0.72, 0.3],
    body: 'Risky step? The AI-assisted agent stops and asks. Replaying another user\'s order waits until you choose Approve.',
    points: ['Hold or Approve on every risky action', 'Attack simulation stays under your control'],
  },
  {
    id: 'endpoints', shot: 'A grid of nine endpoints by seventeen test cases lights up as requests are sent.', title: ['EVERY', 'ENDPOINT'], tag: 'AGENT 03', clip: 'c6-endpoints', poster: 'c6-endpoints.webp', tint: [0.5, 0.45, 1.0],
    body: 'Every test case runs against every endpoint the agents found: login, register, orders, cart, profile, payments, addresses, coupons.',
    points: ['Test cases x endpoints, not a sample', 'Repeatable on the next build'],
  },
  {
    id: 'finding', shot: 'A reticle locks onto GET /orders/{id}: critical finding AS-01, broken object-level authorization.', title: ['CAUGHT', 'IN THE ACT'], tag: 'CRITICAL', clip: 'c7-caught', poster: 'c7-caught.webp', tint: [0.95, 0.2, 0.25],
    body: 'A critical finding locks on the request that proved it. In the demo: broken object-level authorization on GET /orders/{id}.',
    points: ['Proof captured with the finding', 'Risk rated on the spot'],
  },
  {
    id: 'report', shot: 'The HotBite security report: score 38 of 100, the critical finding with its evidence, impact, fix and retest.', title: ['THE EXACT', 'FIX'], tag: 'REPORT', clip: 'c8-report', poster: 'c8-report.webp', tint: [0.7, 0.55, 1.0],
    body: 'Evidence. Impact. The exact fix. Prioritized findings with a risk rating and remediation steps, ready to export as PDF.',
    points: ['Prioritized findings', 'Evidence for each one', 'Remediation steps', 'PDF export'],
  },
];

export const lab = {
  title: ['// THE', 'REPORT ->'],
  copy: 'PRIORITIZED FINDINGS WITH\nCLEAR EVIDENCE, RISK RATING\nAND REMEDIATION STEPS',
};

export const chat = {
  prompt: 'WHAT ARE YOU TESTING?',
  tagline: 'Find it before they do.',
  options: [
    { label: 'ANDROID APK', sub: 'Static + dynamic agents', card: 0, answer: 'Upload the APK. The static agent reads code, manifest and permissions; the dynamic agent runs it behind the proxy and drives it like a person would.' },
    { label: 'IOS IPA', sub: 'Entitlements, binaries, traffic', card: 1, answer: 'Upload the IPA. AppSiege checks entitlements, binaries and embedded strings, then tests runtime behaviour, traffic and APIs.' },
    { label: 'FLUTTER APPS', sub: 'Gets past obfuscation', card: 2, answer: 'Flutter apps ignore the system proxy and ship obfuscated. The agent gets past both, so their traffic is tested like any other app.' },
    { label: 'APP PROTECTIONS', sub: 'Root, jailbreak, SSL pinning', card: 2, answer: 'Root, jailbreak and emulator checks, SSL pinning and Flutter obfuscation. The agent gets past all five on its own.' },
    { label: 'RISKY STEPS', sub: 'Waits for your approval', card: 4, answer: 'Anything that could change real data waits for you. The agent asks; you choose Hold or Approve.' },
    { label: 'REPORTS', sub: 'Evidence, risk, the exact fix', card: 7, answer: 'Prioritized findings with evidence, a risk rating and remediation steps, exportable as PDF.' },
  ],
  fallback: 'Good question for a person. Call 051 2748690 or 0309 5624742 and the DigiInn360 team will scope it with you.',
  keywords: [
    { k: ['price', 'cost', 'quote', 'pay', 'pricing'], a: 'Pricing depends on the app and its scope. Call 051 2748690 or 0309 5624742 for a quote.' },
    { k: ['contact', 'call', 'phone', 'talk', 'demo', 'book'], a: 'Phone 051 2748690, mobile 0309 5624742. Or open CONTACT at the top right.' },
    { k: ['android', 'apk'], ref: 0 },
    { k: ['ios', 'ipa', 'iphone'], ref: 1 },
    { k: ['flutter'], ref: 2 },
    { k: ['root', 'jailbreak', 'emulator', 'pinning', 'ssl', 'bypass', 'protection'], ref: 3 },
    { k: ['approve', 'approval', 'risky', 'safe', 'permission', 'human'], ref: 4 },
    { k: ['report', 'pdf', 'fix', 'remediation', 'evidence'], ref: 5 },
    { k: ['static', 'secret', 'key', 'manifest', 'crypto'], a: 'The static agent covers secrets and API keys, cleartext traffic, weak crypto, manifest flags, exported components, native strings, trackers and certificates.' },
    { k: ['api', 'endpoint', 'traffic', 'burp', 'proxy'], a: 'The dynamic agent routes the emulator through a Burp proxy and runs every test case on every endpoint it finds.' },
  ] as { k: string[]; a?: string; ref?: number }[],
};

export const contact = {
  route: ['UPLOAD', 'TEST', 'FIX'],
  phone: { label: '051 2748690', href: 'tel:+92512748690' },
  mobile: { label: '0309 5624742', href: 'tel:+923095624742' },
  links: [
    { label: 'DIGIINN360', href: '/' },
    { label: 'ALL PRODUCTS', href: '/products/' },
    { label: 'CONTACT PAGE', href: '/contact/' },
  ],
};
