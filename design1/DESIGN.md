# /design1: "The cipher" (experimental landing page)

Built with `/awwwards`. An alternative homepage, independent of the radar homepage.

## Concepts

| | Idea | Anchor | O / F / Fe / P |
|---|---|---|---|
| A. The cipher | The page is a row of eight 3D cipher drums (a cryptex). On load they spin scrambled and lock left to right into SEE RISK; scrolling turns them to spell each chapter: TEST, PROTECT, WATCH, PRODUCTS, TRAIN, TALK | cryptography, the material of security | 5 / 4 / 4 / 3 |
| B. The inn | DigiInn as a 3D building orbited 360° | the name | 3 / 3 / 3 / 1 |
| C. Attack terrain | Fly over a 3D landscape of exposure | generic | 3 / 3 / 3 / 4 |

**Pick A**: the type is the 3D object, so the signature and the information are the same thing.

```
Idea:        Security, decoded: every chapter is a word the cipher locks into.
Metaphor:    a cryptex / rotor machine.
Signature:   eight Three.js drums; scramble-then-lock intro; scroll turns them to the next word.
Emotion:     the click of a mechanism locking; heavy, precise, a little dangerous.
Motion verb: lock. Spin fast, decelerate, overshoot a hair, click.
Screenshot:  SEE RISK locked across the drums, the red lock window, faces above and below fading.
```

## System

- Palette: graphite `#07080a`, steel `#14171c`, ink `#f2f3f5`, muted `#8b9099`, lock red `#ff2b3a`.
  No blue: this design is red and steel, unlike the radar homepage.
- Type: Manrope 800 on the drum faces and display; JetBrains Mono for labels.
- Structure: one pinned stage (hero + six chapters), then contact and FAQ.
- Drums: per-drum ring of 12 faces holding only the letters its words need plus filler glyphs, so
  the curvature stays visible. Hover nudges a drum; every lock flashes red.
- Reduced motion: drums jump to each word without spinning. No WebGL: the word is shown as type.
