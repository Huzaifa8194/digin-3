# Homepage: design record

Built with the full `/awwwards` workflow. Kept from the previous homepage: the line "See risk from
every angle.", the three service chapters (test, protect, watch) with their services and
products, the services list, training, the inquiry form (`src/inquiry.ts`, drafts an email), the
FAQ, the shared header and footer. SysBastion copy corrected to match its product site.

## Brief

- **Subject:** DigiInn360, a cybersecurity and software company in Islamabad: five services,
  five products, training.
- **Audience:** business and IT leads deciding who to trust with their security.
- **Job:** make the first three seconds unforgettable, then route people to services, products
  and the inquiry form.

## Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. Every angle | One scroll is one full turn. A WebGL radar sweeps from 000° to 360°; every chapter sits at its own bearing. Where the beam passes, hidden risks flare red, then cool to blue; the pointer is a lens that shows every risk at once | the name (360) and the existing line "See risk from every angle." | loader ring opens into the radar with one boot sweep; the scroll turns the beam; the counter becomes the bearing readout | 5 / 5 / 4 / 1 |
| B. Attack surface city | The page is a city of exposed nodes being secured | generic imagery | nodes light as you scroll | 3 / 3 / 3 / 4 |
| C. The engagement | The page is an engagement timeline | how they work | a timeline that fills | 3 / 4 / 4 / 3 |

**Pick A.** It is built on the company's own name and its own line, it gives every section a
reason to exist (a bearing), and it ends where a full turn ends: 360°, talk to us.
**Steal from C** for the chapter labels (Test, Protect, Watch, Train, Talk).

```
Idea:        See risk from every angle: the page is one 360° sweep of your organisation.
Metaphor:    a radar / scanning lens.
Signature:   WebGL radar driven by scroll (bearing), idle ghost sweep, pointer lens (src/home/radar.ts).
Emotion:     the first frame of a mission control screen: dark, exact, alive.
Motion verb: sweep. Things reveal along an angle (conic masks), then lock.
Screenshot:  hero: "See risk from every angle." beside the radar mid-sweep, a red risk flaring under the beam.
```

## System

- **Palette:** night `#03070f`, surface `#0b1422`, ink `#eef3f9`, muted `#9aa8ba`, risk red
  `#ff3341` (brand red `#db000a` for buttons), cooled blue `#5aa2ff`, beam white-cyan `#cfe6ff`.
- **Type:** Manrope 800 for display at -0.07em, JetBrains Mono for bearings, labels and data.
- **Grid:** 12 columns; content on columns 1 to 7, the radar owns the right side; on phones the
  radar sits behind the top of the screen at lower opacity.
- **Loader:** real progress (fonts, GL program), 1.1 to 2.6 s on first visit, 0.6 s after.
  Counter 000° → 360°, ring draws with it; exit: ring opens to the radar's radius, boot sweep,
  counter flies to the bearing readout.
- **Hover:** buttons flood from the pointer side; service links rotate their arrow like a dial
  (45° → 0°); product cards fast-forward their loop.
- **Idle:** a ghost beam keeps sweeping and the pointer lens drifts; off under reduced motion.
- **Reduced motion / no WebGL:** no loader theatre, a static CSS radar, all content visible.

## 3D layer: the 360 core (experiment)

Per the skill's 3D rule (only when the concept is spatial; lazy Three.js; own canvas; render only
while visible; never block the loader), a procedural geodesic shield floats at the radar's centre
(`src/home/core3d.ts`, no model file). It turns with the page's bearing, so the visitor literally
sees it from every angle, and it changes state per chapter: gaps with red risks (See), a red scan
plane (Test), gaps fly in and lock blue (Protect), orbit rings with sensors (Watch), exploded view
(Build), whole and calm (Talk). Drag empty space to look around it. Three is fetched in parallel
with the loader but built and rendered only after the handoff; off under reduced motion; on phones
it dims behind text outside the hero.
