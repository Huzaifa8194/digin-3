// Site-wide SEO for the Vite build (and the dev server).
//
// Each page keeps its own <title> and <meta name="description"> in its HTML file; that copy is
// the page's. Everything derivable is generated here, so it stays consistent across 12 pages:
//   - canonical, robots, Open Graph and Twitter tags, manifest link
//   - one JSON-LD @graph per page: Organization, WebSite, WebPage, BreadcrumbList and the
//     page's own entity (services catalogue, product list, team, software, video ...)
//   - sitemap.xml (with lastmod from git and image entries), robots.txt and llms.txt at build
//
// Method follows the open-source claude-seo skill (AgriciDaniel/claude-seo, MIT): titles about
// 30-60 characters, descriptions about 120-160, self-referencing canonicals, JSON-LD only with
// truthful data, no deprecated schema types, SEO tags in the served HTML (not injected by JS).
import { execFileSync } from 'node:child_process';
import type { Plugin } from 'vite';

export const ORIGIN = (process.env.SITE_ORIGIN || 'https://www.digiinn360.com').replace(/\/$/, '');
const abs = (path: string) => ORIGIN + path;

const ORG_ID = abs('/#organization');
const SITE_ID = abs('/#website');
const OFFICE_ID = abs('/#office');
const BRAND = 'Digiinn360';

// Add the company's real profile URLs here (LinkedIn, Facebook, X, YouTube, Crunchbase ...).
// They connect the Organization entity to its profiles for Google's knowledge panel and AI answers.
const SAME_AS: string[] = [];

const PHONE = '+92-51-2748690';
const MOBILE = '+92-309-5624742';
const EMAIL = 'procurement@digiinn360.com';
const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'House no 3, Street no 14, Sector F7',
  addressLocality: 'Islamabad',
  addressRegion: 'Islamabad Capital Territory',
  addressCountry: 'PK',
};
const GEO = { '@type': 'GeoCoordinates', latitude: 33.7215, longitude: 73.0433 };

type Img = { path: string; width: number; height: number; alt: string; type?: string };
type Crumb = { name: string; path: string };
type Node = Record<string, unknown>;

interface Page {
  path: string;                 // route, e.g. '/about/'
  file: string;                 // source HTML, for lastmod
  src?: string[];               // other paths whose git history counts for lastmod
  pageType: string;             // schema.org WebPage subtype
  ogTitle: string;              // social headline (can be warmer than the <title>)
  ogDescription: string;
  image: Img;
  crumbs: Crumb[];              // after Home
  priority: number;             // sitemap hint (ignored by Google, used by others)
  changefreq: 'weekly' | 'monthly';
  entities?: (page: Page, modified: string) => Node[];
  mainEntity?: string;          // @id the WebPage is about
  llms: string;                 // one line for llms.txt
}

const og = (path: string, alt: string, width = 1200, height = 630, type = 'image/jpeg'): Img => ({ path, width, height, alt, type });

// ---------------------------------------------------------------------------------------------
// The services catalogue (the 28 services on /services/, grouped by its five steps)
const SERVICE_GROUPS: { id: string; name: string; description: string; items: string[] }[] = [
  {
    id: 'offensive-security', name: 'Offensive Security Services',
    description: 'Find weaknesses before they become incidents: assessments of applications, APIs, networks and configurations so fixes can be prioritized.',
    items: ['Vulnerability Assessment & Penetration Testing (VAPT)', 'Web Application Penetration Testing', 'API Security Testing', 'Network Penetration Testing', 'Security Configuration Assessments'],
  },
  {
    id: 'grc', name: 'Governance, Risk & Compliance (GRC)',
    description: 'Understand where controls fall short and what to address first across the organization and its suppliers.',
    items: ['Cybersecurity Audits', 'Compliance & Regulatory Assessments', 'IT Security Risk Assessments', 'Security Gap Analysis', 'Third-Party & Vendor Risk Assessments', 'Security Policies & Compliance Consulting'],
  },
  {
    id: 'managed-security', name: 'Security Operations & Managed Security',
    description: 'Continuous visibility into security events and the support to investigate and respond.',
    items: ['Security Operations Center (SOC)', 'Security Information & Event Management (SIEM)', 'Continuous Security Monitoring', 'Incident Detection & Response', 'Threat Hunting & Malware Analysis', 'Malware Detection & Removal'],
  },
  {
    id: 'infrastructure-security', name: 'Network & Infrastructure Security',
    description: 'Reduce exposure across networks, endpoints and the access controls that keep a business running.',
    items: ['Network Security Assessments', 'Firewall Security & Configuration', 'Endpoint Security', 'Intrusion Detection & Prevention', 'Infrastructure Security Hardening', 'Identity & Access Management (IAM)'],
  },
  {
    id: 'data-application-security', name: 'Data & Application Security',
    description: 'Build protection into how data is stored, software is developed and applications are shipped.',
    items: ['Data Protection & Encryption', 'Application Security Assessments', 'DevSecOps Security Assessments', 'Software Supply Chain Security', 'Secure Configuration Reviews'],
  },
];

const TEAM: { name: string; role: string; photo: string }[] = [
  { name: 'Aiman Zulfiqar', role: 'Mobile AppSec Automation Engineer', photo: 'aiman-zulfiqar' },
  { name: 'Hafza Rehman', role: 'Malware Analyst & AppSec Engineer', photo: 'hafza-rehman' },
  { name: 'M. Huzaifa Imran', role: 'Secure Full Stack Developer', photo: 'huzaifa-imran' },
  { name: 'Ansab Farooq', role: 'Full Stack Penetration Tester & Detection Engineer', photo: 'ansab-farooq' },
  { name: 'Jalil Ahmed', role: 'Cyber Threat Intelligence Engineer', photo: 'jalil-ahmed' },
  { name: 'Khalid Khan', role: 'Offensive Security & Product Engineer', photo: 'khalid-khan' },
  { name: 'Hamza Jalil', role: 'Endpoint Security Product Engineer', photo: 'hamza-jalil' },
  { name: 'Muhammad Haseeb', role: 'Red Team Automation Engineer', photo: 'muhammad-haseeb' },
  { name: 'Zarlish Rafid', role: 'Cybersecurity Business Developer Lead', photo: 'zarlish-rafid' },
];

// ---------------------------------------------------------------------------------------------
// Products
interface Product {
  slug: string; name: string; type: 'SoftwareApplication' | 'Product'; tagline: string; description: string;
  category?: string; os?: string; version?: string; features: string[]; screenshots: string[];
}
const PRODUCTS: Product[] = [
  {
    slug: 'shadowad', name: 'shadowAD', type: 'SoftwareApplication', tagline: 'Autonomous security testing with a human in control',
    description: 'A control panel for authorized security testing: 52 specialist agents test networks and assets you own under written authorization, in review mode by default, stream every step to the operator and hand back an evidenced findings report.',
    category: 'SecurityApplication',
    features: ['52 specialist security-testing agents across 18 work areas', 'Scope enforcement: only declared targets are touched', 'Review mode by default for risky steps', 'Simulated exploitation graph of the attack surface', 'Detection engineering and hardening guidance', 'Client-ready report with compliance mapping', 'No persistence left behind'],
    screenshots: [],
  },
  {
    slug: 'sysbastion', name: 'SysBastion', type: 'SoftwareApplication', tagline: 'Windows 10 hardening console',
    description: 'Windows hardening console. Deny by default, reversible by design: it closes 14 risky file types, 35 outbound tools and Office macros, journals every change, and Restore all writes the exact original values back.',
    category: 'SecurityApplication', os: 'Windows 10', version: '1.4',
    features: ['One-click hardening of UAC, SmartScreen, DEP, SMB, scripts and PowerShell', 'Blocks 14 risky file types and 35 outbound tools', 'Office macro lockdown', 'Every change journaled', 'Restore all puts the exact original values back'],
    screenshots: ['/sysbastion/window-uac.webp', '/sysbastion/window-hardening.webp'],
  },
  {
    slug: 'aegis-shield', name: 'AEGIS-SHIELD', type: 'Product', tagline: 'A SIEM in a box that fits in one hand',
    description: 'Threat hunting and endpoint defence platform pre-installed on the Mi713, a palm-sized mini server 11.4 cm wide: Windows threat hunting, persistence hunting, MITRE ATT&CK mapped detections and automated containment.',
    category: 'Security appliance (SIEM)',
    features: ['Windows threat hunting', 'Persistence and autostart hunting', 'Detections mapped to MITRE ATT&CK', 'Automated containment of confirmed threats', 'Runs on the palm-sized Mi713 appliance'],
    screenshots: ['/aegis-shield/media/attack-matrix.jpg', '/aegis-shield/media/triage.jpg', '/aegis-shield/media/autostarts.jpg', '/aegis-shield/media/fleet.jpg'],
  },
  {
    slug: 'appsiege', name: 'AppSiege', type: 'SoftwareApplication', tagline: 'Agentic mobile app penetration testing',
    description: 'Agentic mobile app penetration testing for Android APK and iOS IPA files: static, dynamic and AI-assisted agents get past app protections, ask for approval before risky actions and report every finding with evidence, a risk rating and the exact fix.',
    category: 'SecurityApplication', os: 'Android, iOS',
    features: ['Static analysis of code, manifest, permissions and binaries', 'Gets past root, jailbreak and emulator checks, SSL pinning and Flutter obfuscation', 'Dynamic agent drives the app and tests its traffic and APIs', 'Human approval before risky steps', 'Every test case against every endpoint', 'Prioritized report with evidence and remediation, PDF export'],
    screenshots: ['/appsiege/media/report-still.webp'],
  },
  {
    slug: 'darkintel360', name: 'DarkIntel360', type: 'SoftwareApplication', tagline: 'Dark web threat intelligence',
    description: 'Dark web intelligence platform with seven modules: live map, forums, data leaks, credentials, botnet data, phishing and websites hacked, each claim carrying a credibility score.',
    category: 'SecurityApplication',
    features: ['Live threat map', 'Underground forum monitoring', 'Data leak tracking', 'Leaked credential monitoring', 'Botnet data', 'Phishing detection', 'Hacked website monitoring', 'Credibility score on every claim'],
    screenshots: ['/media/darkintel360/lm.jpg', '/media/darkintel360/dl.jpg', '/media/darkintel360/cr.jpg', '/media/darkintel360/fo.jpg'],
  },
  {
    slug: 'aeronexus', name: 'AeroNexus', type: 'SoftwareApplication', tagline: 'Android device management for fleets',
    description: 'Android mobile device management (MDM) panel: kiosk mode, app and hardware policy, geofences, remote screen, Lost Mode, remote wipe and an audit log of every action.',
    category: 'BusinessApplication', os: 'Android',
    features: ['Kiosk mode', 'App and hardware policy', 'Geofences and location', 'Remote screen and commands', 'Lost Mode messaging', 'Remote wipe', 'Audit log of every action'],
    screenshots: ['/aeronexus/media/p-dash.webp', '/aeronexus/media/p-kiosk.webp', '/aeronexus/media/p-remote.webp', '/aeronexus/media/p-audit.webp'],
  },
];
const productId = (slug: string) => abs(`/${slug}/#product`);

function productNode(p: Product, page: Page): Node {
  const node: Node = {
    '@type': p.type,
    '@id': productId(p.slug),
    name: p.name,
    url: abs(page.path),
    description: p.description,
    slogan: p.tagline,
    image: [abs(page.image.path), ...p.screenshots.map(abs)],
    brand: { '@type': 'Brand', name: BRAND },
  };
  if (p.type === 'SoftwareApplication') {
    Object.assign(node, {
      applicationCategory: p.category,
      operatingSystem: p.os,
      featureList: p.features,
      publisher: { '@id': ORG_ID },
      creator: { '@id': ORG_ID },
      inLanguage: 'en',
    });
    if (p.version) node.softwareVersion = p.version;
    if (p.screenshots.length) node.screenshot = p.screenshots.map(abs);
  } else {
    Object.assign(node, {
      category: p.category,
      manufacturer: { '@id': ORG_ID },
      additionalProperty: p.features.map((f) => ({ '@type': 'PropertyValue', name: 'Feature', value: f })),
    });
  }
  return node;
}

const productPage = (p: Product, o: Omit<Page, 'path' | 'file' | 'src' | 'pageType' | 'crumbs' | 'priority' | 'changefreq' | 'mainEntity' | 'entities'> & { extra?: Page['entities'] }): Page => ({
  path: `/${p.slug}/`,
  file: `${p.slug}/index.html`,
  src: [`src/${p.slug}`, `public/${p.slug}`],
  pageType: 'ItemPage',
  crumbs: [{ name: 'Products', path: '/products/' }, { name: p.name, path: `/${p.slug}/` }],
  priority: 0.8,
  changefreq: 'monthly',
  mainEntity: productId(p.slug),
  ogTitle: o.ogTitle,
  ogDescription: o.ogDescription,
  image: o.image,
  llms: o.llms,
  entities: (page, modified) => [productNode(p, page), ...(o.extra ? o.extra(page, modified) : [])],
});

const product = (slug: string) => PRODUCTS.find((p) => p.slug === slug)!;

// ---------------------------------------------------------------------------------------------
export const PAGES: Page[] = [
  {
    path: '/', file: 'index.html', src: ['src/main.ts', 'src/style.css'], pageType: 'WebPage', priority: 1, changefreq: 'weekly',
    ogTitle: 'Digiinn360: see risk from every angle',
    ogDescription: 'Penetration testing, compliance, managed security and six in-house security products, from a cybersecurity team in Islamabad, Pakistan.',
    image: og('/home-og.png', 'Digiinn360: see risk from every angle. Cybersecurity services and products from Islamabad.', 1200, 630, 'image/png'),
    crumbs: [],
    mainEntity: ORG_ID,
    entities: () => [officeNode()],
    llms: 'Home: what Digiinn360 does (testing, protection, monitoring, products, training) and how to get in touch.',
  },
  {
    path: '/services/', file: 'services/index.html', src: ['src/services'], pageType: 'CollectionPage', priority: 0.9, changefreq: 'monthly',
    ogTitle: 'Cybersecurity services | Digiinn360',
    ogDescription: '28 services in five steps, from testing your defences the way an attacker would to protecting your data and applications.',
    image: og('/services-og.png', 'Digiinn360 cybersecurity services: see the risk, stay ahead.', 1200, 630, 'image/png'),
    crumbs: [{ name: 'Services', path: '/services/' }],
    mainEntity: abs('/services/#catalog'),
    entities: () => servicesNodes(),
    llms: 'Services: 28 cybersecurity services in five groups: offensive security (VAPT, web, API and network pentesting), GRC, SOC and managed security, network and infrastructure security, data and application security.',
  },
  {
    path: '/products/', file: 'products/index.html', src: ['src/catalog-page.ts', 'src/catalog-page.css'], pageType: 'CollectionPage', priority: 0.9, changefreq: 'monthly',
    ogTitle: 'Our products | Digiinn360',
    ogDescription: 'Six security tools to test, defend, investigate and manage, each with its own website.',
    image: og('/products-og.png', 'The six Digiinn360 security products.', 1200, 630, 'image/png'),
    crumbs: [{ name: 'Products', path: '/products/' }],
    mainEntity: abs('/products/#list'),
    entities: () => [{
      '@type': 'ItemList', '@id': abs('/products/#list'), name: 'Digiinn360 security products', numberOfItems: PRODUCTS.length,
      itemListElement: PRODUCTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/${p.slug}/`), name: `${p.name}: ${p.tagline}` })),
    }],
    llms: 'Products: the six Digiinn360 products, each linking to its own site.',
  },
  {
    path: '/about/', file: 'about/index.html', src: ['src/about', 'public/team'], pageType: 'AboutPage', priority: 0.7, changefreq: 'monthly',
    ogTitle: 'About Digiinn360',
    ogDescription: 'Nine disciplines. One team. Engineers and analysts in Islamabad who build security software, protect systems and train teams.',
    image: og('/about-og.png', 'The Digiinn360 team in Islamabad, Pakistan.', 1200, 630, 'image/png'),
    crumbs: [{ name: 'About', path: '/about/' }],
    mainEntity: ORG_ID,
    entities: () => TEAM.map((m) => ({
      '@type': 'Person', '@id': abs(`/about/#${m.photo}`), name: m.name, jobTitle: m.role,
      image: abs(`/team/${m.photo}.webp`), worksFor: { '@id': ORG_ID },
    })),
    llms: 'About: the Digiinn360 team (penetration testers, malware analysts, threat intelligence, detection and product engineers) in Islamabad.',
  },
  {
    path: '/partners/', file: 'partners/index.html', src: ['src/partners'], pageType: 'WebPage', priority: 0.6, changefreq: 'monthly',
    ogTitle: 'Partner with Digiinn360',
    ogDescription: 'Bring Digiinn360 security products to your clients. Four ways to partner, one onboarding.',
    image: og('/partners-og.png', 'Digiinn360 partner program: resell, run, integrate or refer.', 1200, 630, 'image/png'),
    crumbs: [{ name: 'Partners', path: '/partners/' }],
    entities: () => [{
      '@type': 'Service', '@id': abs('/partners/#program'), name: 'Digiinn360 partner program', serviceType: 'Reseller and managed security partner program',
      description: 'Resell, run as a managed service, integrate or refer Digiinn360 cybersecurity products, with one onboarding.',
      provider: { '@id': ORG_ID }, areaServed: 'Worldwide', url: abs('/partners/'),
    }],
    mainEntity: abs('/partners/#program'),
    llms: 'Partners: reseller, managed service, integration and referral partnerships for Digiinn360 products.',
  },
  {
    path: '/contact/', file: 'contact/index.html', src: ['src/contact'], pageType: 'ContactPage', priority: 0.7, changefreq: 'monthly',
    ogTitle: 'Contact Digiinn360',
    ogDescription: 'Tell us what you need to secure, build or improve. A person in our Islamabad office reads every message.',
    image: og('/contact-og.png', 'Contact Digiinn360 in Islamabad, Pakistan.', 1200, 630, 'image/png'),
    crumbs: [{ name: 'Contact', path: '/contact/' }],
    mainEntity: OFFICE_ID,
    entities: () => [officeNode()],
    llms: 'Contact: email procurement@digiinn360.com, phone +92 51 2748690 or +92 309 5624742, office in Sector F7, Islamabad.',
  },
  productPage(product('shadowad'), {
    ogTitle: 'shadowAD | Autonomous security testing, with a human in control',
    ogDescription: 'Describe the engagement, watch it run, read the report. Authorized assets only, every step on screen.',
    image: og('/shadowad/og.jpg', 'shadowAD: autonomous security testing for assets you own, with a human in control.'),
    llms: 'shadowAD: autonomous, scope-enforced security testing with 52 specialist agents and a human in control.',
  }),
  productPage(product('sysbastion'), {
    ogTitle: 'SysBastion V1.4: Windows hardening console',
    ogDescription: 'A Windows hardening console that journals every change and puts the exact original back.',
    image: og('/sysbastion/og.jpg', 'SysBastion V1.4: Windows 10 hardening console with reversible changes.'),
    llms: 'SysBastion V1.4: Windows 10 hardening console, every change journaled and reversible.',
  }),
  productPage(product('aegis-shield'), {
    ogTitle: 'AEGIS-SHIELD | A SIEM in one hand',
    ogDescription: 'Open the box, plug in a screen, hunt. Threat hunting and endpoint defence on the Mi713 by Digiinn360.',
    image: og('/aegis-shield/og.jpg', 'AEGIS-SHIELD: a complete SIEM on a box that fits in one hand.'),
    llms: 'AEGIS-SHIELD: threat hunting and SIEM on the palm-sized Mi713 appliance, MITRE ATT&CK mapped.',
  }),
  productPage(product('appsiege'), {
    ogTitle: 'AppSiege: agentic mobile app pentesting',
    ogDescription: 'Static, dynamic and AI-assisted agents for Android and iOS apps, with human approval for risky steps.',
    image: og('/appsiege/og.jpg', 'AppSiege: agentic mobile app penetration testing for Android and iOS.'),
    llms: 'AppSiege: agentic penetration testing for Android APK and iOS IPA apps, with evidence and fixes.',
  }),
  productPage(product('darkintel360'), {
    ogTitle: 'DarkIntel360 | The mission briefing',
    ogDescription: 'Seven modules, one console. Find what the dark web says about you before anyone acts on it.',
    image: og('/darkintel360/og.jpg', 'DarkIntel360: dark web threat intelligence console.'),
    llms: 'DarkIntel360: dark web threat intelligence in seven modules, from leaked credentials to hacked websites.',
  }),
  productPage(product('aeronexus'), {
    ogTitle: 'AeroNexus: it leaves your hand, not your control',
    ogDescription: 'Android device management for fleets that leave the building.',
    image: og('/aeronexus/og.jpg', 'AeroNexus: Android device management for company fleets.'),
    llms: 'AeroNexus: Android MDM with kiosk mode, geofences, remote screen, Lost Mode, wipe and an audit log.',
    extra: (_page, modified) => [{
      '@type': 'VideoObject', '@id': abs('/aeronexus/#film'), name: 'AeroNexus: Android device management film',
      description: 'A 65-second film showing AeroNexus enrolling, locking down and tracking a company Android phone through a working day.',
      thumbnailUrl: [abs('/aeronexus/media/film-poster.webp')], contentUrl: abs('/aeronexus/media/film.mp4'),
      uploadDate: gitDate(['public/aeronexus/media/film.mp4']) || modified, duration: 'PT1M5S',
      publisher: { '@id': ORG_ID }, inLanguage: 'en',
    }],
  }),
];

// ---------------------------------------------------------------------------------------------
function organizationNode(page: Page): Node {
  const node: Node = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND,
    alternateName: ['DigiInn360', 'Digiinn 360'],
    slogan: 'Secure. Test. Defend.',
    url: abs('/'),
    logo: { '@type': 'ImageObject', '@id': abs('/#logo'), url: abs('/brand/digiinn360.png'), width: 764, height: 228, caption: BRAND },
    image: { '@id': abs('/#logo') },
    description: 'Cybersecurity company in Islamabad, Pakistan: penetration testing, governance, risk and compliance, managed security operations, infrastructure and application security, six in-house security products, and software and security training.',
    email: EMAIL,
    telephone: PHONE,
    address: ADDRESS,
    location: { '@id': OFFICE_ID },
    areaServed: 'Worldwide',
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'sales', telephone: PHONE, email: EMAIL, availableLanguage: ['English', 'Urdu'] },
      { '@type': 'ContactPoint', contactType: 'customer support', telephone: MOBILE, email: EMAIL, availableLanguage: ['English', 'Urdu'] },
    ],
    knowsAbout: ['Penetration testing', 'Vulnerability assessment', 'Web application security', 'API security', 'Mobile application security', 'Governance, risk and compliance', 'Security operations center', 'SIEM', 'Threat hunting', 'Malware analysis', 'Dark web monitoring', 'Threat intelligence', 'Endpoint hardening', 'Mobile device management', 'Active Directory security', 'DevSecOps', 'Cybersecurity training'],
    hasOfferCatalog: { '@id': abs('/services/#catalog') },
  };
  if (page.path === '/about/') node.employee = TEAM.map((m) => ({ '@id': abs(`/about/#${m.photo}`) }));
  if (SAME_AS.length) node.sameAs = SAME_AS;
  return node;
}

function officeNode(): Node {
  return {
    '@type': 'ProfessionalService',
    '@id': OFFICE_ID,
    name: `${BRAND} Islamabad office`,
    url: abs('/contact/'),
    image: abs('/home-og.png'),
    logo: abs('/brand/digiinn360.png'),
    telephone: PHONE,
    email: EMAIL,
    address: ADDRESS,
    geo: GEO,
    hasMap: `https://www.google.com/maps?q=${GEO.latitude},${GEO.longitude}`,
    parentOrganization: { '@id': ORG_ID },
    areaServed: [{ '@type': 'Country', name: 'Pakistan' }, 'Worldwide'],
  };
}

function servicesNodes(): Node[] {
  const catalog: Node = {
    '@type': 'OfferCatalog', '@id': abs('/services/#catalog'), name: `${BRAND} cybersecurity services`,
    numberOfItems: SERVICE_GROUPS.reduce((n, g) => n + g.items.length, 0),
    itemListElement: SERVICE_GROUPS.map((g) => ({ '@id': abs(`/services/#${g.id}`) })),
  };
  const groups = SERVICE_GROUPS.map((g) => ({
    '@type': 'Service', '@id': abs(`/services/#${g.id}`), name: g.name, serviceType: g.name, description: g.description,
    url: abs(`/services/#${g.id}`), provider: { '@id': ORG_ID }, areaServed: 'Worldwide',
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: g.name,
      itemListElement: g.items.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, provider: { '@id': ORG_ID } } })),
    },
  }));
  return [catalog, ...groups];
}

function gitDate(paths: string[]): string | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch { return null; }
}
const lastModified = (page: Page) => gitDate([page.file, ...(page.src || [])]) || new Date().toISOString();

function graphFor(page: Page, title: string, description: string): Node {
  const url = abs(page.path);
  const modified = lastModified(page);
  const crumbs = [{ name: 'Home', path: '/' }, ...page.crumbs];
  const webpage: Node = {
    '@type': page.pageType,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': SITE_ID },
    about: { '@id': page.mainEntity || ORG_ID },
    publisher: { '@id': ORG_ID },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(page.image.path), width: page.image.width, height: page.image.height, caption: page.image.alt },
    dateModified: modified,
  };
  if (page.mainEntity) webpage.mainEntity = { '@id': page.mainEntity };
  if (page.crumbs.length) webpage.breadcrumb = { '@id': `${url}#breadcrumb` };
  const nodes: Node[] = [
    organizationNode(page),
    { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: BRAND, alternateName: 'DigiInn360', description: 'Cybersecurity services and security products from Islamabad, Pakistan.', inLanguage: 'en', publisher: { '@id': ORG_ID } },
    webpage,
  ];
  if (page.crumbs.length) {
    nodes.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
    });
  }
  if (page.entities) nodes.push(...page.entities(page, modified));
  return { '@context': 'https://schema.org', '@graph': nodes };
}

// ---------------------------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// JSON inside <script>: never let a string close the tag.
const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

function headFor(page: Page, title: string, description: string): string {
  const url = abs(page.path);
  const img = page.image;
  return [
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta name="author" content="${BRAND}">`,
    `<link rel="manifest" href="/site.webmanifest">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${esc(page.ogTitle)}">`,
    `<meta property="og:description" content="${esc(page.ogDescription)}">`,
    `<meta property="og:image" content="${abs(img.path)}">`,
    `<meta property="og:image:type" content="${img.type || 'image/jpeg'}">`,
    `<meta property="og:image:width" content="${img.width}">`,
    `<meta property="og:image:height" content="${img.height}">`,
    `<meta property="og:image:alt" content="${esc(img.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.ogTitle)}">`,
    `<meta name="twitter:description" content="${esc(page.ogDescription)}">`,
    `<meta name="twitter:image" content="${abs(img.path)}">`,
    `<meta name="twitter:image:alt" content="${esc(img.alt)}">`,
    `<script type="application/ld+json">${jsonForScript(graphFor(page, title, description))}</script>`,
  ].join('\n');
}

const routeOf = (htmlPath: string) => ('/' + htmlPath.replace(/\\/g, '/').replace(/^\/+/, '')).replace(/index\.html$/, '');

/** Swap a page's hand-written SEO tags for the generated block. Exported for tests. */
export function applySeo(html: string, route: string): string {
  const page = PAGES.find((p) => p.path === route);
  if (!page) return html;
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '');
  const description = decode((html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '');
  if (!title || !description) throw new Error(`[seo] ${route} needs a <title> and a meta description in its HTML`);
  const cleaned = html
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/[ \t]*<link\s+rel="manifest"[^>]*>\s*/gi, '')
    .replace(/[ \t]*<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>\s*/gi, '')
    .replace(/[ \t]*<meta\s+name="(?:robots|author)"[^>]*>\s*/gi, '')
    .replace(/[ \t]*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
  return cleaned.replace(/(<meta\s+name="description"[^>]*>)/i, `$1\n${headFor(page, title, description)}\n`);
}

function sitemapXml(): string {
  const urls = PAGES.map((p) => {
    const images = [p.image.path, ...((PRODUCTS.find((x) => `/${x.slug}/` === p.path)?.screenshots) || [])];
    return `  <url>
    <loc>${abs(p.path)}</loc>
    <lastmod>${lastModified(p)}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
${images.map((i) => `    <image:image><image:loc>${abs(i)}</image:loc></image:image>`).join('\n')}
  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

function robotsTxt(): string {
  // Search engines and AI search/answer crawlers are welcome; /api/ is the form backend.
  // Blocking AI *training* crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) is a business
  // decision; it does not affect Google Search. Add a Disallow group here if you decide to.
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${abs('/sitemap.xml')}
`;
}

function llmsTxt(): string {
  // Community proposal (llmstxt.org). Google Search ignores it; kept as a cheap, accurate map
  // for other AI assistants and agents.
  const line = (p: Page) => `- [${p.path === '/' ? 'Home' : p.crumbs[p.crumbs.length - 1].name}](${abs(p.path)}): ${p.llms}`;
  const core = PAGES.filter((p) => !p.path.match(/^\/(shadowad|sysbastion|aegis-shield|appsiege|darkintel360|aeronexus)\/$/));
  const prods = PAGES.filter((p) => !core.includes(p));
  return `# ${BRAND}

> ${BRAND} is a cybersecurity company in Islamabad, Pakistan. It provides penetration testing, governance, risk and compliance, managed security operations (SOC/SIEM), network, infrastructure, data and application security, builds six security products, and trains developers and staff.

Contact: ${EMAIL}, ${PHONE.replace(/-/g, ' ')}, ${MOBILE.replace(/-/g, ' ')}. Office: ${ADDRESS.streetAddress}, Islamabad, Pakistan.

## Company

${core.map(line).join('\n')}

## Products

${prods.map(line).join('\n')}
`;
}

export function seo(): Plugin {
  return {
    name: 'digiinn360-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) { return applySeo(html, routeOf(ctx.path)); },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt() });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt() });
    },
    configureServer(server) {
      const files: Record<string, [string, () => string]> = {
        '/sitemap.xml': ['application/xml', sitemapXml], '/robots.txt': ['text/plain', robotsTxt], '/llms.txt': ['text/plain', llmsTxt],
      };
      server.middlewares.use((req, res, next) => {
        const hit = files[(req.url || '').split('?')[0]];
        if (!hit) return next();
        res.setHeader('Content-Type', `${hit[0]}; charset=utf-8`);
        res.end(hit[1]());
      });
    },
  };
}
