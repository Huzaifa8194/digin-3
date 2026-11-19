# /aegis-shield: design notes

## Brief
AEGIS-SHIELD (Digiinn360) is a Windows threat hunting and endpoint defence platform that ships
pre-installed on one palm-sized appliance, the Mi713 (11.4 × 10.6 × 4.3 cm, i7-13620H, NVMe,
2.5 GbE, up to 3 networks). Audience: security leads and IT owners deciding on a pilot.
Job: make them believe "a whole SIEM in one hand" and book a scoped pilot.
Structure studied from memoryquest.nl (Awwwards): one fixed 3D object carries the whole page;
the camera starts close, pulls back to a hero with giant flanking words, dives into the object's
screen, then walks through the features one per scroll beat with the object on the left, copy on
the right and a tab list along the bottom. The arcade cabinet becomes the Mi713.

## Concept card
Idea:        The whole hunt lives in a box the size of your palm. Open it, plug in a screen, hunt.
Metaphor:    An unboxing on a dark desk: lid, board, cable, monitor, console.
Signature:   The lid lifts off the Mi713 and the AEGIS shield rises out of the CPU on a column of
             light; then one cable crawls from the HDMI port to a monitor that rises from the desk
             and boots the console (one scroll-driven timeline in `src/aegis-shield/main.ts`).
Emotion:     A quiet, expensive object on a dark desk that is plainly awake (the sonar pulse).
Motion verb: Lift and settle. Parts rise on a slow ease and come to rest; nothing bounces.
Screenshot:  The open Mi713 seen from above, shield hovering over the board, labels pinned to parts.

## System
Palette:  ground #050608 · ink #e9eef3 · muted #8693a0 · line rgba(233,238,243,.12)
          accent #35d0f0 (the ATT&CK "lit cell" cyan from the product UI) · alarm #ff4d3d (Critical)
          amber #f6b21b (Medium) used only in evidence chips.
Type:     Archivo (variable, width 62 to 125) as one family: display at wdth 125 / 900, body at 100 / 400.
          JetBrains Mono for console labels, counts and evidence.
Grid:     12 columns, 24px gutter, 4vw margins. Copy panels sit on columns 1-5 or 8-12 so the object
          always owns the other side.
Shape:    radius 2px on chips and buttons, 0 elsewhere; the Mi713 is the only rounded thing.
Motion:   one GSAP timeline scrubbed by scroll; eases power2.inOut for camera, power3.out for copy.

## Sections
intro (top-down on the lid, sonar pulses) → hero (HUNT · CONTAIN flanking, h1) → open (lid lifts,
labels pin to CPU, memory, NVMe, fan, 2.5 GbE) → shield (rises from the CPU) → connect (HDMI and
network cables draw, monitor rises) → boot (console boot log) → eight modules on the monitor
(Triage, Hunt, Watch, Respond, Persistence, Trust, Fleet, ATT&CK; each pans to its evidence) →
problem (14 days vs minutes) → response (stop, quarantine, isolate) → appliance specs → pilot CTA.

## Decisions
- Dashboard screenshots are real product captures supplied by the developer; they are drawn onto
  the monitor and also present as <img> for the no-GL / reduced-motion path.
- Reduced motion: no smooth scroll, no scrub; the 3D stage renders one still hero frame and the
  chapters read as normal sections.
- Idle: sonar pulses, the fan, the status LED and the shield keep moving at rest.
- QA passes intentionally skipped for this first draft (owner's request).
