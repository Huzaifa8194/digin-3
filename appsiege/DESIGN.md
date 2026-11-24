# /appsiege/ — AppSiege on the Active Theory structure

Brief from the user: replicate https://activetheory.net/ one for one (scroll studied frame by frame), then
carry AppSiege content (deck "Agentic Mobile App Pentest", AppSiege-3.mp4, two product UI screenshots).

## Reference map (captured 2026-11-24, 1440x900, 336 frames every 60 px of scroll)

The reference is one WebGL canvas over a virtual scroll track of six segments (vh):
`420 | 105 | 1050 | 210 | 126 | 420`. Max scroll 20079 px at 900 px tall.

| Ref px | What happens | Here (u = viewport heights) |
|---|---|---|
| loader | hatched circle fills bottom-up with a `/NN` counter, then `>>>` and a ring of tendrils | same |
| 0–1380 | chrome logo ring on a figure-8 ribbon, dust, teal corner glow; group turns on Y to edge-on | 0–1.53 |
| 1440–2900 | the showreel arrives as a bokeh particle cloud behind the ring; ring shows its back | 1.6–3.2 |
| 2950–3700 | slanted wipe: hero recedes upward, dark world below | 3.28–4.1 |
| 3000–4600 | 3-line display headline + small side column; huge glass ring turns edge-on to face-on and refracts the type | 3.3–5.1 |
| 3960–4500 | first glass card rises; "what are you looking for?" chat fades in bottom left | 4.4–5.0 |
| 4500–13500 | cards ride a helix around a crystal spine: next card right/low, past card left/high; titles glitch until centred | 5.0–10.5 (8 cards, same pace per card) |
| 13500–14100 | slanted wipe into the lab cage | 10.5–11.17 |
| 14100–15400 | cage with cables, particle logo inside, colour cycles, camera sinks | 11.17–12.6 |
| 15400–16600 | camera goes under the water; curved hex-mesh panel "// THE LAB ->" | 12.6–13.9 |
| 16600–17050 | slanted wipe back to the hero, now upside down | 13.9–14.44 |
| 17050–20079 | inverted hero; reel particles fade; ends on ring + ribbon | 14.44–17.81 |

UI: pill nav top right `WORK —— CONTACT` (glow + rain lines under it), sub-pill music player,
`SCROLL DOWN` hint over the ring when idle, chat panel bottom left, contact overlay
(`✦ CONTACT US ✦`, giant `LAX -> NYC -> AMS`, links left, email centre, QR right, pill shows `CLOSE-X`),
WORK jumps to the carousel through a melt transition.

## Swaps (structure kept, content replaced)

| Reference | AppSiege |
|---|---|
| "a" mark in the ring | AppSiege mark (phone + shield + lock) |
| reel.mp4 | AppSiege-3.mp4 film (user's own) |
| CREATIVE / DIGITAL / EXPERIENCES + "Founded in 2012" column | AGENTIC / MOBILE APP / PENTESTING + deck copy |
| 14 project cards | 8 cards: upload, static agent, protections, dynamic agent, approval, endpoints, finding, report |
| WORK | AGENTS |
| chat: websites, installations… | what are you testing: APK, IPA, Flutter, protections, risky steps, reports (local answers, no AI call) |
| THE LAB panel | THE REPORT panel (hex mesh over the report frame) |
| LAX -> NYC -> AMS | UPLOAD -> TEST -> FIX, phones from the deck, QR dials the mobile |
| NB Architekt (licensed) | Geist Mono 300/400 (closest free match) |

Not copied: Active Theory's fonts, logo, reel, project media or copy.

## Data safety
Screenshot 1 (findings log) holds a real-looking name, email, phone and CNIC: not used.
Screenshot 2 is used only as a crop of the Static Analysis panel with the proxy IP blurred.
HotBite (in the film) is a fictional demo app.

## Motion
One clock (gsap.ticker), Lenis smooth scroll, one driver: scroll u → every world.
Reduced motion or no WebGL: no GL, no smooth scroll, the content renders as a plain dark page.

## Performance notes (2026-11-24)
- No video at runtime. The eight shots are code-drawn scenes (`src/appsiege/scenes.ts`), baked by
  `node tools/bake-appsiege-scenes.mjs` into `public/appsiege/scenes/` (final frame, first frame, time map).
  Cards replay them in the shader, so nothing is uploaded per frame. Re-run the bake after editing a scene.
- Every world and state renders once behind the loader (`Stage.warm`), so no shader compile lands mid-scroll.
- The lab keeps its fog on and changes only near/far, so going under water never recompiles materials.
- Wipes render each world only on its side of the edge (scissor).
- Render targets: 8-bit sRGB with 4x MSAA (pixel-identical to half-float after tone mapping, about half the bandwidth).
- Measure in real Chrome (`channel: 'chrome'`), not Playwright's headless shell, which lacks GPU canvas
  raster and video paths and shows stalls real visitors never see.
