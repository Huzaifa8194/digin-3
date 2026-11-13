# SysBastion landing page: design record

Built with the `/awwwards` skill (juliobsz/skills). Planning artifacts live here so later passes
stay consistent. The previous `/sysbastion/` page was deleted and nothing from it was reused.

## Phase 0: Brief

- **Subject:** SysBastion V1.4, a Windows endpoint hardening console by DigiInn360.
- **Audience:** IT administrators, security leads and MSPs who look after Windows fleets.
- **Job:** explain what SysBastion closes, prove it is reversible, and send people to
  "Request a demo" (`/contact/` on the DigiInn360 site).
- **Assets:** `Digin-Promotional/SysBastion/SysBastion_V1.4_Promo_PlanB_NewUI.mp4` (58.6 s,
  1080p). Studied frame by frame. Its chapters, in order:
  `00:00` Every attack needs a way in. A script. A macro. A connection out. /
  `00:05` SysBastion, deny by default / `00:08` one-click hardening (9 controls) /
  `00:13` 14 risky file types, opened as text, blocked by policy /
  `00:20` PowerShell locked at the machine level / `00:24` 35 tools, no internet, enforced twice /
  `00:32` Shields-Up, nothing gets in uninvited, still on after restart /
  `00:36` document readers hardened before they're installed / `00:40` Restore All, exact
  original not defaults / `00:46` audit log, what when who / `00:50` 16 admin tools one tab away /
  `00:54` Deny by default. Reversible by design.
- **Facts used:** only the eight selling points from the owner plus what the film shows on
  screen (setting names, the 14 extensions, the 16 tool names, journal and audit columns).
- **Assumptions:** the CTA goes to the existing DigiInn360 contact page. The demo journal on the
  page uses typical starting values (Enabled, On, Hidden) taken from the film's own journal; the
  page says plainly that nothing on the visitor's computer changes.

## Phase 1: Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. Material: the change journal | The page is a machine being hardened. Each section is a real SysBastion control group; as you read it, the page applies it and posts a journal entry with the value it replaced. A bar that mirrors the app's own bottom bar counts what is applied, and "Restore all applied" rewinds the whole page to the exact originals | SysBastion journals every change and restores exact originals ("Reversible by design") | Restore all applied: every toggle, struck extension and journal row flips back in reverse order while the counter runs down | 4 / 5 / 4 / 1 |
| B. Name: the bastion | A star fort plan: each feature is a bastion angle on a fortification drawing | the word bastion | the plan draws itself as you scroll | 3 / 3 / 3 / 4 |
| C. Process: ways in | The hero lists the ways in (a script, a macro, a connection out) as open lines from an endpoint; each section cuts one | the film's opening line | lines from endpoint to internet are cut one by one | 3 / 4 / 4 / 3 |

**Pick A.** It is the only one built on what makes SysBastion different (the journal and exact
restore), it makes "deny by default, reversible by design" something the visitor does rather
than reads, and it cannot be moved to another product. **Steal from C** for the hero statement
and for the outbound firewall diagram (endpoint, two walls, internet), both straight from the film.

## Concept card

```
Idea:        This page hardens itself as you read it, keeps a journal, and can put every value back.
Metaphor:    SysBastion's own console: control groups, toggles, a change journal, a bottom action bar.
Signature:   "Restore all applied" rewinds the page (journal driver module, src/sysbastion/motion/journal.ts).
Emotion:     calm control. Dark, precise, nothing loud until something is blocked.
Motion verb: switch and lock. Short travel, then a firm settle (expo.out), like a toggle thumb.
Screenshot:  the 14 extensions struck through in red beside the journal bar reading "Applied 2 of 6".
```

## Phase 2: System

**Palette** (sampled from the film and the app UI; dark because the product and the film are dark,
not as a default):

| Role | Hex | Source |
|---|---|---|
| ground | `#07090c` | film background |
| surface | `#0e131a` | app panels |
| ink | `#eef1f5` | film headline white |
| muted | `#8d97a5` | app secondary text (AA on ground) |
| line | `rgb(238 241 245 / 0.1)` | app hairlines |
| accent | `#2f7bff` / text `#5c97ff` | the app's Apply button and the WFP wall |
| blocked | `#ff4d5e` | "Blocked by policy", the Defender wall |
| without | `#f2b84b` | "Without SysBastion, script runs" |

Red and amber only ever mean blocked and unprotected. Blue only ever means applied or actionable.

**Type:** Switzer (Fontshare, 400 to 700) for everything, set tight like the film's headlines
(-0.045em at display size). JetBrains Mono 400 for data that is data: extensions, timestamps,
journal values, tool names. Self-hosted woff2 in `public/sysbastion/fonts`.

**Grid:** 12 columns, fluid gutter, content capped at 1600 px. Hang lines: col 1, col 6, col 8.
Section rhythm alternates tight (hardening list), airy (statements), full viewport (Shields-Up).

**Shape:** 6 px radius on panels and buttons; toggles and chips are pills (they are controls).

**Motion language:** engine eases only (`expo.out` entrances, `power3.out` UI). Reveals are line
masks on headings and one clip reveal per media frame. Applying a group: toggles switch with a
40 ms stagger, extensions get struck, the status chip flips to "Applied", a journal row posts.

**Sections (each a different layout family):**
```
hero        statement + poster wordmark ................. Poster
film        16:9 player | chapter index ................. Full-bleed media + index list
intro       large paragraph across 9 cols ............... Statement
01 harden   clip 7 cols | toggle list 5 cols ............ Asymmetric pair
02 scripts  14 extension chips | without/with ........... Typographic grid
03 shell    statement left | clip right ................. Split
04 outbound 35 + tool names | endpoint/walls/internet ... Data/facts + diagram
05 shields  full-bleed clip, type over a scrim .......... Full-bleed media
06 readers  rows per app with policies ................. Index list
07 restore  sticky copy | live journal table ............ Sticky narrative
08 audit    "What. When. Who." across the width + log ... Poster
tools       16 names in a tight grid .................... Gallery wall (type)
cta/footer  final composition ........................... Footer as finale
```

**Hover treatments (one per role):** primary buttons flood from the pointer's side; nav links
draw an underline; film chapters slide a marker and travel their arrow; inline links keep an
underline at rest. Native cursor always.

**Idle state:** the film plays muted in the hero (pause control provided), the outbound diagram
keeps sending packets that stop at the two walls, the journal caret blinks. All stop under
reduced motion.

**No loader, no WebGL, no page transition:** a product landing page inside an existing site earns
the craft in type, layout and the signature, not theatre. Links leave to other DigiInn360 pages.

**Genericness test:** a generic model would land on "dark security SaaS: hero, three feature
cards, gradient glow, pricing". Changed: no cards row (each group has its own layout), no glow,
no pricing, the feature list is an interactive journal that the visitor can undo, and the copy
uses the film's own lines and the app's real setting names.

## QA record (production build, skill scripts)

- Pass 1: fixed white-on-blue contrast (accent deepened to `#2563eb`), brand link name mismatch,
  a 18 px tap target, hero statement alignment, and moved the hero intro to CSS (`.rise`) so the
  LCP text paints without waiting for JS.
- Pass 2: phone scroll was 22 fps under 4x throttle; the film no longer autoplays on phones and
  the fixed bars dropped `backdrop-filter`. Now 108 fps.
- Independent critic (screenshots only) scored 7.1 and read the idea correctly. Its fix list
  was applied: flood hovers on Journal and film controls, an inline-link band on the byline,
  a solid top bar, the light DigiInn360 logo in the footer, clips cropped to the UI panel,
  mobile spacing and table chip fixes.
- Final: 0 audit FAILs, 0 axe violations, no color-only or dead hovers, no overflow,
  desktop LCP 0.38 s, throttled phone LCP 1.8 s, CLS 0, idle motion present,
  reduced motion complete. Restore cycle verified headless: 6 applied, 0 after Restore All,
  6 after Apply all, no console errors.

## Stack

Existing project: Vite multi-page + TypeScript + GSAP. Added Lenis. The page is a Vite entry at
`sysbastion/index.html`, with code in `src/sysbastion/`. The engine is a trimmed port of the
skill's `engine.md` (scroll, reveals, page lifecycle; no loader, GL or transitions).
