# Services page: design record

Redesigned with the `/awwwards` skill. Kept from the previous page: the headline "See the risk.
Stay ahead.", every service category, description and list item (28 services), the wire
sculpture, the animated explainer diagrams (`src/service-artwork.ts`), the service loop videos,
the anchors other pages link to (`#offensive-security`, `#grc`, ...), the shared header and footer.

## Brief

- **Subject:** DigiInn360's cybersecurity services, five categories, 28 services.
- **Audience:** IT and security leads choosing where to start.
- **Job:** show the range clearly and send people to `/contact/`.
- **Constraint:** lives inside the DigiInn360 site: shared header (mega menu) and footer stay.

## Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. The headline is a spectrum | "See the risk." and "Stay ahead." are the two ends of one line. The five categories already run in that order: test (attacker's view), assess, monitor, secure, protect (defender's view). The page travels it: one driver value moves the sculpture's shape and colour from risk red to defence blue as you read | the brand's own headline and the real order of its services | the hero sculpture stays with you, pinned beside the five chapters, morphing per category while a rail marks where you are between the two ends | 4 / 5 / 4 / 2 |
| B. Scan report | The page is a findings report; each service answers a finding | security reports | a scan line reveals findings | 3 / 3 / 4 / 3 |
| C. Coverage map | Services as rooms on a building plan | infrastructure | rooms light as you scroll | 3 / 2 / 3 / 4 |

**Pick A.** It uses only true things (the headline, the order, the brand's red and navy) and keeps
the sculpture the owner already has, but makes it the spine of the page. **Steal from B** for the
index: every service in one scannable list.

```
Idea:        The headline is a spectrum: from seeing the risk to staying ahead, in five steps.
Metaphor:    red team to blue team.
Signature:   pinned sculpture that morphs and shifts red→blue across the five chapters (src/services/spectrum.ts).
Emotion:     an analyst's calm in a dark room: precise, lit by the work.
Motion verb: scan. Things resolve from a moving edge, then hold.
Screenshot:  chapter 03 with the sculpture half way between red and blue and the rail marker mid-way.
```

## System

- **Palette:** ground `#050a14` (navy night, from the footer `#001733`), surface `#0b1422`,
  ink `#eef3f9`, muted `#9aa8ba`, line `rgb(238 243 249 / 0.1)`, risk red `#ff3341` (brand red
  `#db000a` lifted for dark ground), defence blue `#5aa2ff`. Red and blue only ever mark the
  two ends of the spectrum.
- **Type:** Manrope (already the site face) 500 to 800, display at -0.06em. JetBrains Mono for
  numbers and labels that are data.
- **Grid:** 12 columns, gutter fluid, text hangs from col 1, the stage owns cols 7 to 12.
- **Sections:** hero (poster + scene) / statement / five sticky chapters (sticky narrative) /
  index of 28 (index list with cursor preview) / contact (finale) / shared footer.
- **Hover:** buttons flood from the pointer side; index rows slide their name and travel the arrow
  while the preview follows; nav keeps the site's underline.
- **Idle:** the sculpture keeps turning slowly and leans toward the pointer; it stops under
  reduced motion and redraws only when the chapter changes.
- **Genericness test:** a generic redo would be "dark hero + five icon cards". Changed: no cards,
  the chapters share one stage, and the colour shift carries meaning (attacker to defender).
