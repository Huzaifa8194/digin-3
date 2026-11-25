# DiggiIn / Signal

Vite site plus a small Django backend (`backend/`) for the contact/demo forms, a MySQL database and a 2FA-protected admin. Deploys to cPanel like the previous Digiinn360 site.

## Deploy package (cPanel)

```sh
npm run package
```

Creates `release/digiinn360-website.zip` (backend + built site, no secrets). Hand it over with `backend/INSTALL.md`, which is also inside the zip.

Local backend: `cd backend && py -3.12 -m venv .venv && .venv\Scripts\pip install -r requirements.txt`, then `DJANGO_DEBUG=true .venv/Scripts/python manage.py migrate` and `runserver 127.0.0.1:8765`. `npm run dev` proxies `/api` there. Tests: `DJANGO_DEBUG=true .venv/Scripts/python manage.py test`. Dependencies: edit `backend/requirements.in`, then `pip-compile --generate-hashes --allow-unsafe --strip-extras -o requirements.txt requirements.in` (checksum-pinned). Hosting security checklist: `backend/SECURITY.md`.

## SEO

Method: the open-source [claude-seo](https://github.com/AgriciDaniel/claude-seo) skill (MIT): on-page checks, schema rules, technical and AI-crawler guidance.

- Each page owns its `<title>` (30-60 chars) and `<meta name="description">` (120-160 chars) in its HTML file.
- `tools/seo.ts` (a Vite plugin) generates everything else into the served HTML: canonical, robots, Open Graph and Twitter tags with image size and alt, the manifest link, and one JSON-LD `@graph` per page (Organization, WebSite, WebPage, BreadcrumbList, plus the services catalogue, product list, team, software/product and the AeroNexus film). At build it also writes `sitemap.xml` (git `lastmod`, image entries), `robots.txt` and `llms.txt`. Add a page there when you add one to `vite.config.ts`.
- Add the company's social profile URLs to `SAME_AS` in `tools/seo.ts`.
- `/appsiege/` copy is baked into its HTML at build (`src/appsiege/doc.ts`), so it is readable without JavaScript.
- Product share images: `npm run build`, `npx vite preview --port 5211`, then `npm run og` re-renders `public/<product>/og.jpg` from the live pages.
- `npm run build && npm run test:seo` checks every page: lengths, uniqueness, one H1, canonical, social tags, image files, JSON-LD references, noindex on design and 404 pages, sitemap and robots.

## Start

```sh
npm install
npm run dev
```

Open the local URL Vite prints. `npm run build` typechecks and produces `dist/`; `npm run preview` serves that production build.

## Foundation

Vite + TypeScript, direct Three.js, GSAP ScrollTrigger. Vite 6 supports the installed Node 20.18 runtime. This concept does not need React or a server framework; we can add a component framework when UI complexity warrants it.

`src/main.ts` owns the renderer and scroll progress. `src/style.css` owns layout and visual tokens. `index.html` contains accessible story content. The animation interpolates the same points between a scattered sphere, a focused sphere, and a ring. Change those target geometries to extend the story. Native scrolling stays intact.

Performance: one point-cloud draw call, 6,500 points on initial mobile loads / 14,500 desktop, pixel ratio capped at 1.5, no textures or model downloads. Pause stops idle rotation; reduced-motion suppresses idle rotation and pointer movement while retaining scroll-controlled chapter poses. Hidden tabs skip rendering. WebGL failure displays CSS artwork. Manrope currently loads from Google Fonts with an Arial fallback.

## Reference study

- https://pentestai.xyz — content moves from local operation through coverage, verification, evidence, and integrations; animation has a pause control. Useful principle: give each stage a clear explanatory job.
- https://dark-moon.org — prominent typography, a product visual, an orbital-map entry point, and indexed platform chapters. Useful principle: keep navigation legible through a long narrative.
- After the user reloaded Darkmoon, the fully loaded hero showed a textured moon filling the viewport, a luminous blue atmospheric rim, a star field, and large white type over the surface. Earlier white-background captures were incomplete and are not the visual reference. Further scrolling produced blank frames in this environment, so the full transition remains unverified. PentestAI browser navigation timed out; its study is limited to retrieved page content. These notes do not assert either site's libraries.

Our direction uses an original blue particle sculpture and three conceptual beats: discovery → connection → perspective. Copy is exploratory, not a claim about a finished business. Next: agree on the actual subject and audience, map real story beats, then replace the abstract target geometries with meaningful forms.

Documentation: https://vite.dev/guide/ and https://gsap.com/docs/v3/Plugins/ScrollTrigger/.

## Digiinn360 content pass

The story now spans seven chapters: introduction, software development, security testing, protection, monitoring, training, and contact. Content is adapted from https://www.digiinn360.com/ (reviewed November 3, 2026). Counters and testimonials were not carried over. Contact uses the published email and main phone number. Service wording is concise concept copy, subject to your editorial review.

The particle poses now follow chapter offsets: scattered points → sphere → scan slices → expanded shell → orbital paths → six connected-looking clusters → open ring. These are visual metaphors, not live security telemetry. Add future chapters in index.html and corresponding geometry arrays in src/main.ts.

## Service presentation and transitions

Service chapters now use explicit offer headings, readable descriptions, service lists, and email inquiry links with service-specific subjects. There are no named product packages yet; those require actual product details.

Each chapter uses a sticky reading stage. GSAP scrubs a perspective entrance, staggered content assembly, and a receding exit. Desktop compositions alternate sides; Three.js shot targets coordinate horizontal position, depth, scale, and tilt with each geometry. Motion holds during the opening portion of each chapter for reading. Native section anchors remain intact. Reduced-motion mode restores normal section flow and disables content transitions.

Validation: production build and TypeScript passed; browser DOM confirmed the development chapter is visible at its anchor with its inquiry link. Browser screenshot capture returned blank images, so full visual and mobile QA remains outstanding.

## Distinct service metaphors

Chapter 01 now assembles three rectangular software modules into a layered application. Chapter 03 surrounds a compact particle core with a six-edge shield boundary; its two sides close around the asset as you scroll. Both hold a near-frontal orientation so their silhouettes stay readable. Their assembly reverses with scroll and remains visible as a completed pose in reduced-motion mode when the scroll settles. This replaces the formerly similar development sphere and expanded protection sphere.

## Inspection and monitoring revision

Fixed an orientation discontinuity: idle rotation previously changed from accumulated time to a bounded wobble at chapter boundaries. It now blends bounded amplitudes with the same phase across every transition.

Security testing opens the particle body into separated octants, scans across it, and highlights three illustrative weak points. Monitoring is now a face-on radar with concentric rings, crosshairs, a sweep, and signals that brighten after the sweep passes. These are conceptual illustrations rather than actual findings or live telemetry. Extra geometries and materials are disposed on page exit.

## Business content revamp

Removed only the moving inspection line; the approved particle geometry and other visual elements are retained. Service content now explains each offer, its scope, the business situation it fits, and a specific inquiry action. Header navigation provides direct access to services and business solutions.

Sources reviewed November 3, 2026: /services/, /projects/, /projects/file-sharing-website/, and /projects/leave-management-application/ on www.digiinn360.com. The two published projects are presented as selected solution examples, with feature summaries and links to their source pages. No prices, licenses, or immediate availability are asserted. Retrieved project HTML is retained in docs/research/ for editorial traceability.

Reading stages now have approximately 1.45 additional viewport heights of scroll space, with content exits moved later. Stages measure content height after fonts load and on resize so taller content is not forced into a short frame. Named section navigation explicitly scrolls to section starts.

The static inquiry form prepares a mailto draft using the chosen service and brief. Visitors review and send it in their email app; no information is submitted to a backend or stored. Contact uses the homepage phone and published email; only the city is used because published street addresses differ between pages.

Validation: TypeScript and production build pass. Browser accessibility checks verified service descriptions, offer details, project summaries, and inquiry actions. Screenshot capture still returns blank output, limiting visual verification.

## Positive Technologies visual study and responsive rebuild

Reference: https://positechglobal.com/en/ (opened in viewer, November 3, 2026). Reviewed the hero, product/service catalog, button treatment, and computed typography/color styles. The reference uses a black canvas, charcoal cards, bright white headings, red accents, and modest rounded controls. We retain original Digiinn content and particle forms while adopting that palette and a compact catalog hierarchy. No reference logos, product names, media, or claims were copied.

The orb geometry and shot positions are retained; particle color is neutral white, the canvas black, and monitoring/highlight accents red. The content panels occupy the opposite half of the desktop composition. CSS was replaced rather than extended with more conflicting overrides.

Responsive stages now depend on actual content fit: only desktop sections whose complete panel fits between the header/footer use sticky reading holds and entrance/exit motion. Other sections use natural flow with fully visible content. Mobile adds visual breathing space below each panel and stacks solution cards. Forms never have a forced viewport-height container.

QA: at 1296 x 662, development panel top 105 / bottom 591 and CTA bottom 567 sit above footer top 616; horizontal overflow false. A mobile check at actual browser viewport 480 x 844 confirms all seven chapters use natural flow, panels/cards fit the width, and horizontal overflow is false. Browser viewport overrides have a device scaling/minimum-size discrepancy, so requested dimensions were checked against actual innerWidth/innerHeight. Screenshots for the local site remain unreliable; layout measurements and visible accessibility state were used.

## Chapter scroll controller

`src/chapter-scroll.ts` owns wheel, touch, keyboard and link navigation. `src/scroll-policy.ts` classifies gestures. Run `npm test` for 12 regression tests.

One gesture now advances exactly one stop. Sustained scrolling never requests an extra chapter, and there is no transition queue. All same-direction input during a transition is consumed. A new wheel gesture requires 420ms of input silence; repeated and delayed momentum bursts stay in the original gesture. Reversal can return to the previous stop. Escape cancels immediately. Held-key repeats do not advance additional sections.

Transitions last 2.2–3.2 seconds based on distance. Long content has intermediate reading stops. Forms, nested scrolling, zoom, reduced motion, direct navigation, and the Chapters / Free scroll toggle retain their own behavior. Device-specific touch and trackpad feel still needs physical hardware testing.

API guidance: https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event and https://gsap.com/docs/v3/Plugins/ScrollTrigger/.


### Reverse-motion correction

Content now has one reversible GSAP timeline per panel, combining entrance, readable hold, and exit. Previously two independent scrubs could compete over the same opacity/transform properties during upward navigation. Orb and content now follow the same scroll position without separate smoothing delays. Navigation uses a sine ease over 2.2–3.2 seconds; opposite-direction intent requires 48 normalized pixels, so small trackpad direction noise cannot reverse a transition. Added a reversal-noise regression test.

### Native ending

Chapter-controlled input ends at the start of Business Solutions (#solutions). The catalog and final contact section use native wheel, touch, and keyboard scrolling without reading stops or automatic transitions. Guided navigation can land at the catalog boundary but cannot advance beyond it. Scrolling upward back into the story restores chapter input. Direct contact links remain ordinary section navigation.

## Standalone security orbit

The final #ecosystem section follows the contact form and stays beyond the #solutions native-scroll boundary. It is a DOM/CSS orbit, separate from the approved Three.js story. Three rings carry twelve original SVG security-area icons around a Digiinn360 text mark. Counter-rotation keeps labels upright. Selection updates an accessible detail panel; hover/focus, an explicit pause control, reduced-motion preference, and offscreen visibility pause orbit motion.

The security areas explain a conceptual digital environment; they do not claim integrations, certified coverage, or live telemetry. Styling uses the established black/charcoal/red palette. Browser checks confirmed three lanes, twelve selectable nodes, a working Monitoring detail update, no horizontal page overflow, and #ecosystem as the final section. Build and TypeScript pass.
