# /sysbastion-2/: design record

A one-to-one rebuild of the motion system of grail-app.com (Awwwards, studied from its shipped
source and ~300 captured frames), carrying SysBastion V1.4 content. Look and transitions come from
the reference; facts come only from the V1.4 engineering report and the V1.4 promo film.

## Brief

- **Subject:** SysBastion V1.4, DigiInn360's Windows hardening console.
- **Audience:** IT leads, security engineers, MSPs looking after Windows fleets.
- **Job:** show what V1.4 closes, how it was checked, that every change can be put back, and get
  a demo request.
- **Sources:** `DigiInn360_SysBastion_V1.4_Security_Engineering_Progress_Report.docx` (statuses
  PASS / PARTIAL / PENDING are respected: the page never claims a PENDING item), the
  `SysBastion_V1.4_Promo_PlanB.mp4` film (stills used as row images), two app screenshots
  (cropped to the window, used as the "device" the rule card lands in).

## How the reference works (and what this page copies)

One Lenis scroll value `p = scroll / viewport height` is read once per frame. It is turned into
~25 CSS custom properties on the page root with smoothstep windows, and CSS does every transform
with `calc()` on those variables. WebGL scenes (card spiral, ink spread, forge, rays) render only
while their input changed in the last ~0.45 s, then sleep. Pinned stretches are `position:sticky`
inside tall wrappers with negative margins so chapters overlap.

| p (viewports) | Reference beat | Here |
|---|---|---|
| loader | book cover on pink opens, its page becomes a hole onto the site | a shield badge on ice blue opens the same way |
| 0 to 0.72 | spiral of bent WebGL quest cards collapses into a deck | spiral of SysBastion rule cards, pattern backs per control group |
| 0.2 to 1.5 | "Everyone's out living..." staggered lines | Chapter 01, the problem |
| 1.18 to 1.7 | deck to one card | one rule card: "Disable SMB1 and SMB2" |
| 1.9 to 2.6 | ink blot spreads from centre, card does a row-staggered 360 flip, lands in the phone, live clock behind | ink spreads, card flips and lands in the SysBastion window, live journal clock behind |
| 3.0 to 4.9 | white sheet rotates in (7 deg, 0.84 scale), rows slide in from both sides, photo clip opens, photos follow the cursor | Chapter 03, five ways in, film stills |
| 4.9 to 6.3 | sheet rotates out, two-column headline, dark modal in the phone slides away | Chapter 04, the change journal and Restore all |
| 6.3 to 6.6 | ink collapses to a dot, forge shader (torch follows cursor) | same |
| 6.6 to 9.1 | 3D totems, arrow cursor, click left or right, pills | six gold modules built in three.js |
| 8.6 to 9.9 | physics balls drop into four columns, counters climb | four evidence layers from the report |
| 9.7 to 11.3 | white sheet rotates in, crest wheel spins with scroll speed, bulges to the cursor, title morphs letter by letter | sixteen system tools |
| 11.3 to end | footer slides up behind, light rays from a tile follow the cursor, talking email bubble | demo request |

## System

- **Palette:** ground `#000`, ink `#c9daf8` (pink in the reference, moved to SysBastion blue),
  ink text `#1d3461`, sheet `#f6f6f6`, forge gold `#c79650`, accent `#cfe0ff`.
- **Type:** Playfair (variable, 300, high optical size) uppercase for display at line-height 0.88,
  standing in for the reference's PP Pangaia; Switzer for UI and body.
- **Motion:** ease `cubic-bezier(0.22, 1, 0.36, 1)` for every timed reveal; scroll-driven values
  use smoothstep. One clock (gsap.ticker) runs Lenis and every scene.
- **Reduced motion / no WebGL:** no Lenis, no GL, all copy visible, stills instead of scenes.

## Phones, fallbacks, QA (production build)

- **Phones** follow the reference's own phone layout (captured at 390 x 844 with `?forceMobile=1`):
  the spiral stops before the flip and fades (`--deckout`), Chapter 02 is a static block with the
  window image, Chapter 06 is a 2 x 2 grid of pattern tiles that fill and count up (no physics),
  modules show a still crest instead of the 3D stage.
- **No WebGL / software GL / reduced motion:** a rendered still of the spiral
  (`public/sysbastion-2/deck-hero.webp`, made from this page's own scene), a CSS ink disc driven by
  `--inkfill`, a CSS forge gradient, crest stills for modules. `?nogl=1` forces this path.
- **Display font** is Playfair subset to caps, digits and punctuation (107 KB to 31 KB); every
  display line is uppercase.
- **Measured:** desktop LCP 0.46 to 0.50 s, phone LCP 2.44 to 2.68 s (throttled), CLS 0, axe 0
  serious, every keyboard stop visibly focused, no colour-only hovers, no console errors. Scroll
  frame rate in the same software-rendered browser: 19 fps here against 17 fps for the reference.
- **Kept on purpose:** the floating demo pill is hidden at the very top (the nav carries the same
  button there), as in the reference.

## Pass 2: the app window carries the story

- **The window is HTML now** (`src/sysbastion-2/ui.ts`, `ui-data.ts`, `ui.css`), rebuilt at 1066 x 716
  from the V1.4 screenshots (Inter, sampled colours). Pages: Harden (UAC, System hardening),
  Script & execution, PowerShell, Network & firewall, Document readers, System tools, Journal &
  restore, Audit log. Control names come from the screenshots, the film and the report's lists.
- **Hero spiral tiles** are real panels of that window, captured from the same HTML by the dev-only
  page `/sysbastion-2/ui-lab/` (not in the build) into `public/sysbastion-2/ui/tile-*.webp`. The
  deck always ends on System hardening, which flips and **docks into its own slot** in the window
  (`S.dock` gives the spiral the slot's screen rect); the HTML card takes over once it lands.
- **Chapter 02** plays inside the window on scroll: the eight controls are selected, Apply is
  pressed, and each change is written to the live change journal (Was / Now / Time) before the
  status bar confirms the readback. The chapter got 60vh more scroll so this can play out.
- **Chapter 04** is the Journal & restore page: the "Restore all applied?" dialog drops away as the
  sheet clears, then the rows return to their originals one by one, newest first.
- **Ways-in rows** show the matching panels; **modules** show the section's panel beside the gold
  object; the **tools wheel** is the sixteen tool buttons.
- **Typography:** the display face now uses its optical-size axis at real size (no forced 1200,
  which made hairlines vanish at mid sizes), tighter tracking on large lines, balanced breaks;
  reading copy at 1.45 to 1.55 leading with brighter greys.
- Regenerate tiles after UI edits: run the dev server, then capture `.sbw-card` from
  `/sysbastion-2/ui-lab/?tile=<id>` at 2x (and `?win=apply&active=hardening&sel=8&done=8`,
  `?win=journal&restored=8&dlg=0` at 1.5x for the phone stills).
