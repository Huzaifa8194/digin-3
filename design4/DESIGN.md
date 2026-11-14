# /design4: "The trace"

Built with `/awwwards`, run once globally and once per section; each section uses a different
layout family from the skill's catalogue, and one red thread ties them together.

## Global concept

| | Idea | Anchor | O / F / Fe / P |
|---|---|---|---|
| A. The trace | Every attack leaves a trace. One red thread runs the length of the page and changes form in each section, like an investigator following a trace | tracing is what security teams do; red is the brand colour | 4 / 5 / 3 / 2 |
| B. The Inn's ledger | Hospitality and ledger rules from the name | the name | 3 / 2 / 4 / 2 |
| C. One grid | Everything set on one strict ledger grid | formal | 3 / 3 / 4 / 4 |

```
Idea:        Every attack leaves a trace. We follow it, from first contact to a signed-off fix.
Metaphor:    a red investigator's thread pinned across a case wall.
Signature:   the thread: a physics rope in the hero that becomes the attack path, plugs into the
             wall, beats as a pulse, stitches the services and signs the closing line.
Emotion:     curiosity, then control. Paper-clean and exact, with one hot line running through it.
Motion verb: pull taut. Things arrive with a small overshoot, like thread pulled tight.
Screenshot:  the hero: a red rope weaving over and under "See risk from every angle."
```

## Per-section passes

| Section | Options weighed (O/F/Fe/P) | Pick | Layout family |
|---|---|---|---|
| Hero | WebGL fluid type 3/3/3/4 · scramble decode 2/3/5/4 · threaded type + verlet rope 5/5/4/2 | threaded type | Poster |
| Test | index list 3/3/5/3 · sticky chapters 3/4/4/3 · pinned horizontal attack path 4/5/4/2 | attack path (a true sequence, so a horizontal pan is allowed) | Filmstrip / horizontal pan |
| Protect | before/after slider 3/4/4/3 · statement 2/3/5/4 · wall of switches 4/5/4/2 | wall of switches (SysBastion's real controls), scroll-scrubbed wave | Gallery wall |
| Watch | data numerals 2/3/5/4 · 3D globe 3/3/3/4 · full-bleed live pulse 4/5/4/2 | pulse (the thread as a heartbeat with labelled events) + the page's one velocity marquee | Full-bleed media |
| Build | asymmetric pair 2/3/5/4 · gallery 3/3/4/3 · index list with cursor preview 4/4/4/2 | index list; each preview is a stitch pattern drawn by the thread | Index list |
| Talk | marquee CTA 3/3/5/4 · split 2/4/5/4 · finale with signature 4/5/4/2 | the thread signs the headline, then the form and FAQ | Footer as finale |

## How the sections work together

- One thread: an SVG path in document space joins anchors at each section's entry and exit and is
  drawn as you scroll; inside each section the thread takes that section's form.
- One palette: paper `#f3f3ef`, ink `#0d0d0d`, muted `#5c5c58`, line `rgb(13 13 13 / 0.14)`,
  thread `#e10600`. Watch inverts to ink ground (the night shift).
- One type system: Cabinet Grotesk 800 for display (Fontshare), General Sans 400 to 600 for text,
  JetBrains Mono for labels.
- One motion verb and ease family (expo.out, back.out(1.4) for "taut"), one hover per role:
  buttons fill from the pointer side, index rows slide, nav letter roll.
- Four-corner frame nav with `mix-blend-mode: difference` so it reads on paper and on night.

Genericness test: a generic model would make "dark cyber hero, three cards, gradient". Changed:
light paper ground, one red line as the only colour, a different layout family per section, and
interactions that are the thread itself.
