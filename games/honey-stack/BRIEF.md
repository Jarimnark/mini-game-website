# Honey Stack — Design Brief

## One-liner
Guide a number-carrying bee to the flower with the matching sum before time runs out and build the longest arithmetic streak you can.

## Concept
A bee buzzes onto the screen carrying a number. Three flowers below each display a value. The player taps the flower whose value equals the result of a simple arithmetic expression shown on the bee (e.g., "4 + 3 → ?", so the player picks the flower showing 7). Correct picks earn points and build a streak multiplier; wrong picks end the streak. The game runs for 60 seconds, keeping sessions quick and satisfying — a cozy number workout rather than a stressful drill.

## Core Mechanic
Each question: a bee flies in from the top carrying an expression (addition, subtraction, or multiplication by small numbers). Three flowers are arranged at the bottom, each showing a distinct number — one is the correct answer, two are plausible distractors. The player clicks/taps the correct flower. The bee "lands" on it with a bounce, honey drops appear, and the next bee flies in. An incorrect pick causes the bee to tumble sideways, the streak resets to ×1, and the correct flower briefly highlights before the next question loads. New question loads automatically ~0.5 s after any answer.

## Game Loop
1. A 60-second countdown starts. Current streak multiplier (×1 by default) is shown.
2. A bee carrying an expression flies in; three answer flowers are displayed.
3. Player picks a flower. Correct: +10 × multiplier points, streak +1, multiplier increases at streaks 3, 6, 10 (max ×4). Incorrect: no points, streak resets to ×1.
4. Questions cycle continuously until time runs out.
5. Difficulty ramps: first 20 s addition only; 20–40 s adds subtraction; 40–60 s adds ×2/×3 multiplication.
6. End condition: timer reaches 0. Final score and longest streak shown.

## Win / Score Condition
Score = sum of (10 × active multiplier) for each correct answer. Streak-multiplier tiers: ×1 (0–2 streak), ×2 (3–5), ×3 (6–9), ×4 (10+). Star thresholds: 1 star = 100 pts, 2 stars = 250 pts, 3 stars = 500 pts. Longest streak of the session is shown separately. High score and best streak saved to `localStorage`.

## Visual Style
A sunny meadow scene: warm cream sky (#FFF8F0) fading into a soft golden horizon. The bee is a small rounded character (~50 px) with amber-and-dark-brown stripes rendered in CSS/SVG, carrying a small chalkboard-style sign showing the expression in Fredoka One. The three flowers sit at the bottom, evenly spaced — large round petal shapes in golden (#F2C078) with a cream center circle showing the answer number in dark brown (#3D2C1E). On correct answer, the chosen flower pulses and honey droplets (small amber teardrop shapes) animate upward. On wrong answer, the bee tumbles with a CSS rotate + translate keyframe. The streak multiplier badge sits top-right in an amber pill shape that glows brighter at higher tiers. Timer is a thin amber progress bar along the top edge that pulses when under 10 seconds.

## Controls
- Desktop: click the flower card with the correct answer (keyboard 1/2/3 also maps to left/center/right flower)
- Mobile: tap the flower card

## Scope Constraints
- Must fit in a single `games/honey-stack/` folder
- No external API calls
- All arithmetic generated programmatically — no pre-written question list needed
- Estimated build time: Low (<4h)

## Stretch Goals (optional)
- "Golden flower" bonus: appears randomly every ~15 s and doubles points for that one question
- Post-game breakdown showing accuracy percentage and questions attempted
- Difficulty selector before game start (Easy = addition only, Medium = +/−, Hard = +/−/×)
- Ambient bee-buzz ambience toggle (Web Audio API oscillator, no file needed)
