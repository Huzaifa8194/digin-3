# Contact and Partners: design record

Built with the `/awwwards` workflow inside the existing dark system (`body.dk`, `src/tokens.css`,
`src/site-dark.css`): Manrope 800 display, JetBrains Mono for data, night ground, risk red to
ahead blue. The home page concept is a 360° sweep that ends at "Talk"; these two pages are where
that sweep lands.

## Brief

- **Contact:** business and IT leads who already decided to write. Job: send an inquiry in under
  a minute, or find the email, phone and office.
- **Partners:** resellers, managed service providers, integrators and referrers who want to
  offer DigiInn360 products. Job: understand the four ways to partner and apply.

## Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. The secure channel | Writing to us opens a verified channel to Islamabad, and the page shows the real handshake | the browser really solves a proof-of-work puzzle (ALTCHA) before a message is accepted; the office's coordinates | a live line from You to ISB: red noise with the real hash count while verifying, locks blue, a pulse carries the message | 5 / 5 / 5 / 1 |
| B. Map pin | Islamabad on a dotted world map | the office address | a pin pulses | 2 / 3 / 4 / 5 |
| C. Ticket printer | The form prints a receipt | none specific to a security firm | receipt slides out | 3 / 2 / 4 / 4 |

**Pick A.** Nothing about it is decoration: the work it draws is the anti-bot check that actually
runs, so the page shows the company's craft (security) at the exact moment a visitor trusts it.

```
Idea:        Writing to DigiInn360 opens a verified channel to Islamabad, and you watch it happen.
Metaphor:    a secure comms line between two endpoints.
Signature:   src/channel.ts: real proof-of-work progress drawn as a line; scramble-then-lock labels.
Emotion:     calm, exact, trustworthy.
Motion verb: lock. Values scramble, then resolve and hold.
Screenshot:  contact hero: "Let's talk about your project." beside the form, the channel locked blue.
```

**Partners** reuses the site's bearings: onboarding is one full turn. 090° Apply, 180° Review,
270° Enable, 360° Launch. A ring draws as the visitor scrolls the four stages (sticky on desktop,
a compact strip on phones). The same channel strip sits on the application form.

## System

- Palette and type: unchanged site tokens. Red means unverified/pending, blue means verified/done,
  in both the channel and the onboarding ring.
- Grid: 12 columns. Contact hero 6/6 (copy, form panel); partners stages 7/5 (stages, ring).
- Hover: rows flood red from the pointer (shared with About); buttons flood (shared).
- Idle: the channel carrier breathes; the onboarding ring's sweep dot drifts. Both stop off
  screen and under reduced motion.
- Reduced motion / no JS: static line per state, full ring, all content visible; forms fall back
  to an email draft if the backend is unreachable.

## Sections

```
Contact                                   Partners
[kicker + coords        ][ channel     ]  [ title mega, lede, 2 CTAs              ]
[ H1 mega               ][ form        ]  [ stage 090 ...        ][ sticky ring   ]
[ lede, email/phone/office][           ]  [ stage 180 ...        ][  0 → 360°     ]
[ After you press send: 120° 240° 360° ]  [ ways to partner: 4 rows, flood, preselect ]
[ doors: partner / services (flood)    ]  [ products index with bearings          ]
[ footer                               ]  [ apply: intro | channel + form         ]
```

Assumptions for the client to confirm are listed in the handover message (onboarding stage
contents, reply by email).

## Products (redesign 2)

```
Idea:        Five tools, five websites. Each card IS that product's hero, rebuilt in code.
Signature:   hover replays the real hero's opening (src/products/heroes.ts, one driver per product,
             specs taken from each product page's source); a click opens the card into that
             product's own loading screen, so the jump lands inside the real loader.
Motion verb: each card keeps its product's own verb (scramble, spin, swing, arrive, flicker).
Rest:        the finished frame each hero shows right after its loader hands off.
Touch:       the opening plays as the card scrolls into view.
```

No screenshots: every visual is drawn with canvas, CSS 3D or the product's own assets
(SysBastion panel tiles and its generated patterns).
