# Website 3 component adaptation

Source reviewed: `D:\Diggin Website 3\digiinn360`, including App, styles, navigation, spatial showcase, bento grid, and FAQ components.

Adapted into this Vite/TypeScript site without React, Framer Motion, Radix, Tailwind, or Lucide dependencies:

- Tubelight navigation: rounded grouped links, active light indicator, scroll-tracked selection. Existing service menu remains available on smaller screens.
- Spatial showcase: icon-led service panels, softer surfaces, checklist rows, rounded inquiry actions.
- Bento/spotlight cards: pointer-following light, illustrated calendar and ZIP-sharing project previews. Illustrations describe workflows rather than live products or telemetry.
- FAQ: split heading and native keyboard-operable details with concise answers matching the existing services.
- Footer: oversized Digiinn360 wordmark and contact/back-to-top navigation, recolored for the light theme.

Kept current chapter IDs, orb shapes and motion, native-scroll boundary, pause controls, and email inquiry behavior. Team and testimonial claims were not imported. The FAQ is implemented with native details rather than copied Corsair/Radix source. The source project's attribution record is retained as `website-3-component-sources.md`.

Validation: TypeScript, production build, and all 12 scroll-policy tests passed. Local preview responds HTTP 200. Browser inspection could not complete because the browser-control connector returned `browser.user is unavailable`; responsive visual QA remains outstanding.


## Full chapter component pass

The repeated outer panel has now been removed from development, assessment, protection, monitoring, training and contact. The reference's actual bento/team CSS is retained in `src/reference-components.css`, with light-theme and responsive adaptations in `src/chapter-compositions.css`.

- Development: spatial illustration and functional Web/Mobile/Desktop switcher.
- Assessment: complete four-card security bento, including radar, three bar-chart rows, code window, fingerprint/lock illustration and network diagram. Charts are illustrative, not live security measurements.
- Protection: fingerprint/data card, connected network diagram and expandable protection layers.
- Monitoring: larger radar/activity dashboard with Detect/Understand/Respond selection.
- Training: three-slide circular capability carousel using the same three Unsplash image sources as the reference; images are illustrative stock photography.
- Contact: split editorial contact details and inquiry form composition.
- Know the team: four expandable panels with the names, roles, initials, and descriptions from the provided reference. This supersedes the earlier decision not to import the team.

Existing light-blue particle shapes and scroll poses are preserved. Orb chapter mapping now reads actual scroll position so the added footer and sections cannot distort the chapter-offset calculation. New components are mounted before chapter sizing and anchor binding. No new packages were added.
