# /shadowad — design notes

> **Now the shadowAD site** (source: shadowAD Concept & Responsible-Use Overview, DigiInn360).
> Copy stays at product and governance level: what it is, how a run works, the fleet by work area,
> the six controls, responsible use. No attack techniques or tooling are described on the site.
>
> | Chapter | shadowAD meaning |
> |---|---|
> | Bastion (dusk, amber inside) | your domain; blocks part as it is mapped, the dashed amber trail is the audit trail (AUTH → scope → review → evidence → findings → report); resealing = "No persistence: test, prove, leave" |
> | Crystals | the fleet: 01 Simulated exploitation graph, 02 War room, 03 Agents inventory review, 04 Control plane, 05 Detection engineering, 06 Reporting & compliance |
> | Rings | the six controls pinned to the wall; the shadowAD cube glows at the core |
> | Finale | how a run works: particles form the prompt, the live map, the report; CTA "Request a demo"; Responsible use panel |
> Palette: ground #0e0f12, amber #f5a524, ink #f4f4f5, muted #9a9ca3. Type: Inter + JetBrains Mono.
> Seams: amber flash into the lit domain and through the portal, near-black between fleet and controls.
>
> **Fleet icons** (`gl/icons3d.ts`): clean "clay icon" models built in code from bevelled extrusions,
> rounded boxes, tori, capsules and spheres. Smooth normals, no surface maps, no noise; a few KB of code,
> nothing to download. reticle · terminal `>_` · agent tree · slider panel · shield with a pulse trace ·
> report with a signed-off badge. Two shared materials: glazed ceramic (satin base + sharp clear coat +
> faint amber sheen) and solid shadowAD amber for the part that does the work. No transmission, so no
> extra scene pass. They sway (never edge-on); hairline triangles sit in a shell behind, never across.
> (Replaced the MarchingCubes "carved ice": it read as noisy and low quality.)
> **Open affordance**: amber targeting frame snaps to the icon in focus (tightens + "OPEN" on hover),
> "● Open module ↵" prompt, Enter opens. No ping rings.
> **Opened panel** is exactly one screen (100dvh): the console scales to fit both ways, the brief
> column scrolls on its own.
> **The console inside** (`app/app.ts`, `app/tours.ts`): opening a crystal boots an HTML replica of
> the shadowAD app (from the product screenshots), fixed 1180×720 scaled to fit (min ½ size, sideways
> scroll on phones). Six working screens (Home, Dashboard, Explorer, Live, Agents + modal, Reports →
> report/artifacts). Each crystal opens its screen with numbered pins mirrored in a legend.
> **Hover to explain**: hovering a numbered region, its pin or its legend line dims the console, frames the
> region in amber (several frames when a region has several parts) and shows what it does.
> **Fleet 04 graph** (was Fleet 01; swapped with Control plane so a visitor declares a run before seeing its graph) (from the product screenshot): operator → perimeter/firewall → domain subnet, assets on
> attack paths lit, quiet assets grey, side card with properties, finding, evidence and live agent activity.
> The sidebar folds to an icon rail on that screen. **War room**: tool strip (runtime installs need approval),
> subagents in parallel, short Activity vs full Terminal (view-only), steer box, architecture graph + report.
> **Control plane**: pick agents, scope, rules of engagement, goals, run.
>
> **Finale: "Declare your scope"** (replaced the generic describe/watch/report carousel, which retold
> the fleet chapter and asked nothing of the visitor).
> ```
> Idea:        The site ends the way every shadowAD run begins: you declare a scope. Pick your estate
>              and its size; the particles on the pedestal assemble into it, tier-0 lit amber, and the
>              demo request carries that scope.
> Metaphor:    the scope declaration (AUTH + scope + rules) that opens every engagement
> Signature:   particles re-forming into the visitor's own estate: a domain forest, a cloud tenant on
>              orbits, or both joined by an amber sync link
> Emotion:     "that's us": recognition, then a short, specific next step
> Motion verb: "settle into place": burst, then each particle lands on its node
> Screenshot:  a hybrid estate on the lit pedestal, forest and tenant joined by the amber link
> ```
> Concepts weighed: A (chosen) · B "test, prove, leave": particles exit through the halo, empty
> pedestal (kept as one line of copy) · C "the engagement letter", a seal (too portable).
> Particle meaning: grey = assets in scope, amber = tier-0 (domain controllers, the tenant's identity
> core, the hybrid sync link): what a run proves paths to first, same colour logic as the Fleet 04 graph.
> Purpose: a qualified lead. The CTA becomes a pre-filled mailto with estate + size; nothing is sent
> anywhere by the page itself.

> Everything below documents the original igloo.inc study and still applies to structure and rendering.

Study target: igloo.inc (Awwwards SOTD, Jul 2024, abeto + Bureaux). The brief is to replicate that
site's frontend structure, 3D progression and UI language as closely as allowed, while every
asset (geometry, textures, copy, brand) is our own and procedural. Content is SysBastion.

## Concept card
Idea:        A Windows machine as a shelter in the cold. SysBastion builds the walls block by block, keeps each control frozen in ice where you can inspect it, and keeps a key to every block it set.
Metaphor:    An ice bastion on a snow ridge (the reference's igloo, re-cast as the product's "bastion").
Signature:   The exploded bastion: numbered blocks hover apart and scroll locks them back into a sealed dome, seams glowing, then the camera dives through the door.
Emotion:     Cold, quiet, precise. A lab on a glacier.
Motion verb: "settle like stone": things drift weightless, then lock into place with a short, heavy ease.
Screenshot:  The dome at eye level, blocks hovering a hand's width apart, light leaking from every seam, block numbers strung on hairlines.

## Chapters (one scroll driver, p = 0..1)
| p          | Chapter      | Reference equivalent                     |
|------------|--------------|------------------------------------------|
| loader     | ASCII bar    | `===+++===-` loader on grey              |
| intro      | time based   | wire outline + cage, terrain fills, camera swings from top-down |
| 0.00–0.19  | Bastion      | exploded numbered blocks reassemble      |
| 0.19–0.25  | Dive         | push into the door, whiteout + chroma    |
| 0.25–0.62  | Crystals     | descend past six ice crystals (modules), dot grid, blurred text; click opens a module |
| 0.62–0.81  | Rings        | shattered ring logo assembles, glows, opens into a portal |
| 0.81–1.00  | Finale       | ringed pedestal, ceiling halo, particle volume morphing between link shapes |

## System
- Palette: ground `#a3a7b3` (fog grey), haze `#c8ccd6`, ink `#ffffff`, title `#3c3c54`, muted `#a1aab7`, project-ink `#67707e`, night `#151b27` (module overlay).
- Type: IBM Plex Mono 400/500 for every UI string (the reference uses Plex Mono MSDF); Unbounded 800 for the wordmark only.
- Grid: 12 columns, outer margin `clamp(20px, 3.5vw, 56px)`. Corner UI only: wordmark + copyright top-left, manifesto top-right (narrow, right-aligned), scroll hint + sound bottom-left.
- UI text 11–12 px, uppercase only where the reference uses it (labels), leading 1.25.
- Motion: one ease family (expo/power3). Text never fades in plainly: it decodes from random glyphs left to right.
- Radius: 0 everywhere. Brackets (corner ticks) frame interactive targets.

## Decisions
- All 3D is generated in code (no downloaded models): heightfield terrain, rounded-box blocks, convex-hull crystals with transmission, extruded ring segments, sampled particle volumes.
- UI is real DOM text (accessible, crawlable) laid over the canvas, not MSDF in GL.
- Reduced motion / no WebGL: the same sections render as a static, readable page on the fog-grey ground.
- Sound is off by default and synthesized (wind + drone + UI ticks); no audio files.
- White 11–12 px UI on fog grey follows the reference and sits below AA contrast; the post pass darkens the corners to help. Revisit when content is final.
- Dev only: `window.__sb.seek({ intro, p })` and `__sb.at(chapter, local)` render an exact frame for visual QA.

## Rendering technique (why it looks smooth and runs fast)
The reference ships baked colour maps (ground_color, mountain_color, igloo_color, ground_glow…) made in
Houdini/Blender and draws them nearly unlit, with real normal + roughness maps only on the ice. We do the
same procedurally at load time on the GPU (`gl/bake.ts`):
- Terrain: eroded-fbm height (half float) → lit colour with micro detail, 8-way horizon AO, soft sun
  self-shadow, snow/rock split, the dome's contact shade, and a glow mask in alpha. Three levels:
  inner ±14 u @2048, near ±46 u @2048, far ±250 u @1024. The terrain shader is unlit: height and light
  both come from the bakes; fog stays live.
- Blocks, ice, stone: tileable tangent-space normal maps (mipmapped, anisotropic) replace runtime
  `bumpMap`, whose screen-space derivatives caused the grainy shimmer. Blocks pick a per-instance quarter
  of the bake so neighbours never repeat.
- No shadow maps, Lambert for the lit blocks, one hemisphere + one sun light.
- Post: scene → half-float target at an adaptive render scale → bright pass ¼ → dual-Kawase ⅛, 1/16 →
  one final pass (ACES, sRGB, bloom, chroma, whiteout, grain). Replaced UnrealBloom + OutputPass.
- Scroll lands on fixed stops (hero, sealed, six crystals, restore, next); directional snap, keyboard
  steps. Every stop shows text.
Measured on Intel UHD (1440×900): 28–39 ms/frame before; now 114–171 fps uncapped at every stop,
60 fps vsynced idle and during snaps. Load: 4.0 s first visit, 2.2 s repeat (shader cache).

## Status (first pass)
Built: loader, intro, all four chapters, labels/leader lines, module view, finale carousel, sound, static fallback, phone layout.
Next: real content pass, crystal objects refinement, rings→finale portal timing, Lighthouse/axe pass on a production build.
