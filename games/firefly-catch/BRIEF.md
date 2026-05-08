# Firefly Catch — Design Brief

## One-liner
Tap glowing fireflies before they fade away to keep your meadow lantern burning bright.

## Concept
A warm summer-night meadow fills with fireflies that blink on briefly and then fade. The player taps or clicks each firefly while it glows to collect its light. Miss too many and the lantern in the corner dims — keep it full to survive each wave. The pacing starts gentle and slowly quickens, making each round feel like a cozy challenge rather than a frantic twitch test.

## Core Mechanic
A firefly spawns at a random position, pulses to full brightness over ~0.4 s, stays lit for a window of 0.8–1.8 s (shrinking as waves progress), then fades and disappears. Clicking/tapping a lit firefly scores a point and triggers a tiny sparkle burst. Missing a firefly (it fades unclicked) drains the lantern meter by one pip.

## Game Loop
1. The lantern starts with 5 pips of light.
2. Each wave lasts 20 seconds; fireflies spawn at increasing frequency.
3. Tapping a lit firefly adds +1 score and a small golden flash.
4. A firefly that fades unclicked removes 1 pip from the lantern.
5. After each wave, the player earns a brief breather (2 s pause) and wave difficulty ticks up.
6. End condition: the lantern reaches 0 pips — the meadow goes dark and the final score is shown.

## Win / Score Condition
Score = total fireflies caught. A star rating (1–3 stars) is awarded at game-over based on score thresholds (e.g., 15 / 30 / 50). High score is stored in `localStorage` and shown on the end screen.

## Visual Style
Dark-but-warm background (#2A1F14, deep dusk brown) contrasted against the standard warm-cream UI chrome at the top. Fireflies are small amber-golden circles (#F2C078 to #FFE8A0) with a soft radial glow achieved via CSS `box-shadow` or a small Canvas radial gradient. When caught, they burst into 6–8 tiny golden sparks (CSS keyframe or canvas particle). The lantern meter in the top-right is a row of warm amber flame icons that desaturate as pips are lost. Wave number and score sit in a parchment-toned (#FFFDF8) header bar in Fredoka One. Gentle parallax of faint star dots in the background adds depth without distraction.

## Controls
- Desktop: mouse click on any glowing firefly
- Mobile: tap on any glowing firefly (touch targets are generously sized at ~44 px minimum)

## Scope Constraints
- Must fit in a single `games/firefly-catch/` folder
- No external API calls
- Estimated build time: Low (<4h)

## Stretch Goals (optional)
- Combo multiplier: catch 5 in a row without a miss for 2× points
- Seasonal skin: replace fireflies with snowflakes or cherry-blossom petals
- Ambient cricket/night-sounds toggle (Web Audio API, self-hosted .ogg)
- Gentle wind animation that slowly drifts firefly spawn positions
