# Light-mode frontend study

Reviewed November 4, 2026. This is a design and implementation plan; the copied frontend has not been restyled yet.

## Existing architecture

- Vite and TypeScript with direct DOM content in `index.html`; no React or backend.
- `src/style.css` contains all layout, responsive rules, dark colors, and the independent security orbit styling. Many colors are hard-coded rather than shared tokens.
- `src/main.ts` owns Three.js particles, seven chapter poses, GSAP content transitions, section measurements, pause behavior, and the email inquiry form.
- `src/chapter-scroll.ts` and `src/scroll-policy.ts` own guided wheel/touch/keyboard navigation. Guided input stops at Business solutions; subsequent content scrolls naturally.
- `src/security-orbit.ts` creates the final three CSS orbital lanes and twelve selectable security areas. This is separate from the Three.js scene.

The seven particle poses are a scattered sphere, software modules, separated inspection octants, shield, radar, six clusters, and an open ring. Preserve their geometry, assembly, shot placement, scroll interpolation, pointer response, and pause/reduced-motion behavior.

## Recommended visual direction

A clean white technical canvas with charcoal particle sculptures and the existing red identity. Let the moving sculpture be the distinctive visual; keep surrounding surfaces quiet. Retain Manrope and the current alternating text/visual composition for the initial theme pass.

| Role | Proposed value | Use |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Page and renderer background |
| Soft surface | `#F4F5F7` | Catalog, grouped offers, secondary controls |
| Ink | `#17191D` | Headings, main text, particle direction |
| Secondary text | `#555C66` | Descriptions, labels, supporting information |
| Border | `#D8DDE3` | Fields, cards, dividers, orbital tracks |
| Accent | `#D60027` | Primary actions, selected states, radar findings |

Verify actual text/background contrast before shipping, including small labels and all interactive states. Particle shades are an art-direction range, not text colors.

## Opaque surfaces

- Header and open service menu: solid white. Remove header backdrop blur.
- Service and contact panels: solid white with a subtle neutral border and restrained shadow. Particles must never reduce text readability.
- Desktop hero: keep open white space if the sculpture stays clear of copy; use an opaque panel at widths where they overlap.
- Mobile/tablet: opaque copy panels, retaining the reserved space below for particle artwork.
- Catalog: opaque soft-gray section with white project cards.
- Inputs and select options: explicit light native color scheme, white background, dark text, readable placeholder, border and focus states.
- Security ecosystem: opaque light background, white center and icon discs, dark labels, neutral tracks, red selected state, opaque detail panel.
- Remove the black vignette; only introduce a white edge fade if visual QA demonstrates a need.

Opacity still belongs in particle materials and deliberate content entrance/exit animations. Making surfaces opaque does not require removing those animations.

## Dark particles on white

The current renderer clears to opaque black, particles use grayscale values from `.55` to `1`, and the material uses `THREE.AdditiveBlending` at `.85` opacity. Additive rendering brightens the background; black contributes no visible color. A color inversion alone will fail.

1. Clear the renderer to white, matching the CSS canvas, or use a transparent clear with an explicitly white host. Prefer a white clear for the initial pass.
2. Switch the point material to `THREE.NormalBlending` with `depthWrite: false` initially retained.
3. Use dark charcoal vertex colors with restrained variation instead of luminous white. Start with approximately `#17191D` through `#626B77`; inspect density before choosing final opacity.
4. Review existing `.85` opacity and point sizes on actual desktop/mobile views. Keep the geometry and particle counts initially; avoid changing density and rendering simultaneously.
5. Darken radar crosshairs and use the deeper red accent for findings/signals. Inspect the translucent radar wedge on white separately.
6. Replace the fallback orb with a light-background charcoal sculpture treatment so WebGL failure remains coherent.

Pure black is viable, but near-black with a little tonal variation should better preserve depth in dense particle regions. Normal blending can make overlapping points visually heavier; tune against the software layers and shield as well as the hero sphere.

## Complete theme coverage

Rewrite the existing theme rules rather than append a second cascade of overrides. Introduce shared tokens for canvas, panels, text, borders, accent, hover, focus, and shadows. Cover the following explicit dark overrides:

- Root canvas, header, vignette, menu, controls, pressed chapter-scroll mode.
- Main copy, hero variants at 999px and 700px, entry links, offer rows, secondary CTAs.
- Catalog, cards, expanded details, all muted labels and links.
- Form labels, controls, placeholder, notes, address.
- Orb fallback, ecosystem gradient, center mark, track rings, icon discs, selected nodes, detail/help text.
- HTML `theme-color` (currently an older dark-blue value) and `color-scheme: light`.

Do not change navigation or content while establishing the light theme. Text or font-size changes can alter which sections fit a sticky stage and therefore affect scroll landing positions.

## Lighter rendering and presentation

Opaque surfaces remove the need for backdrop blur and simplify compositing. Reduce broad dark shadows and decorative gradients. Existing strengths include one point-cloud draw call, capped pixel ratio, lower initial mobile particle count, offscreen CSS-orbit pause, hidden-tab render skipping, and reduced-motion support.

Changing background color alone does not reduce GPU work. A separate performance pass could stop the scene loop when fully hidden behind the final ecosystem, replace per-frame particle color-space conversions with setup-time calculations, and evaluate an adaptive particle budget if measured frame timing warrants it. Preserve the current visual quality before reducing particles. The initial mobile particle count is chosen at startup, not recomputed on resize.

## Validation for the implementation pass

Build/typecheck and run the existing scroll-policy tests. Review all seven poses in both scroll directions, not just the hero. Check desktop, short desktop, tablet, 390px mobile, and narrow mobile; menu open, details expanded, form focus, chapter/free-scroll toggles, orbit selection, pause/resume, reduced motion, and static fallback. Confirm no horizontal overflow, no particles obscuring text, readable secondary text, no dark surfaces left in responsive rules, and consistent white through chapter transitions. Recheck stage sizing after fonts settle.

## Copy verification

All 2,739 source files were copied, including hidden Git data, dependencies, and build output. A recursive file-presence and byte-length comparison reported zero missing or differently sized files. The source directory was not modified. This comparison is not a cryptographic content verification.
