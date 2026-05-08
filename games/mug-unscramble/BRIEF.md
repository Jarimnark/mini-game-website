# Mug Unscramble — Design Brief

## One-liner
Click scrambled letters on a cozy mug to spell out the hidden word before your tea goes cold.

## Concept
A warm mug sits center-screen with jumbled letters printed on it. The player clicks letters one at a time to build the correct word — a cozy vocabulary of drinks, baked goods, autumn things, and cottage-life words (CINNAMON, BLANKET, PUMPKIN, etc.). Each correct word earns points and reveals a new mug. The game runs for a fixed number of mugs per round, rewarding careful thinking over speed.

## Core Mechanic
Each round presents one scrambled word displayed as individual clickable letter tiles arranged on the mug's body. The player selects letters in the correct order by clicking them; each selected letter locks into a "answer tray" below the mug. If the built word is correct, the mug glows warm amber and the next mug slides in. If wrong, the tray shakes and resets — letters return to the mug for another attempt. Each word allows up to 3 attempts before the answer is revealed and a small score penalty applied.

## Game Loop
1. A new scrambled word appears on the mug (difficulty scales from 4-letter to 8-letter words over 10 rounds).
2. Player clicks letter tiles to build the word in the answer tray.
3. On completion, the game auto-checks; correct = mug glow + score + next mug; wrong = shake + retry (up to 3 tries).
4. A "Hint" button (2 per game) reveals one correctly-placed letter.
5. After 10 mugs, the round ends and final score is shown.
6. End condition: all 10 mugs have been attempted.

## Win / Score Condition
Score per word = 100 × (attempts remaining). Solving on first try = 300 pts; second try = 200 pts; third try = 100 pts; revealed answer = 0 pts. Max possible score = 3000. Star thresholds: 1 star = 800 pts, 2 stars = 1800 pts, 3 stars = 2600 pts. High score saved to `localStorage`.

## Visual Style
A large illustrated mug sits on a wooden coaster in the center of the warm cream (#FFF8F0) background. The mug body is a soft parchment white (#FFFDF8) with the scrambled letter tiles arranged in a loose arc across it — each tile is a small rounded amber (#E8813A) button in Fredoka One. The answer tray below the mug is a row of empty rounded slots outlined in golden (#F2C078). On a correct answer, the mug emits a rising steam animation (wavy CSS keyframes) and a warm amber pulse rings outward. Wrong answers produce a horizontal shake on the tray. Between rounds, the mug "slides out" left and a fresh mug slides in from the right with a brief easing transition. Background has a faint illustrated steam-curl watermark. Score and round counter sit in a parchment header bar.

## Controls
- Desktop: click letter tiles to add to tray; click a tray letter to remove it and return it to the mug
- Mobile: tap letter tiles; tap a tray letter to remove it

## Scope Constraints
- Must fit in a single `games/mug-unscramble/` folder
- No external API calls
- Word list is a hardcoded JS array (50–80 cozy words)
- Estimated build time: Low (<4h)

## Stretch Goals (optional)
- Animated steam that speeds up when on a streak
- "Daily Mug" mode: same 10-word sequence for all players that day (seeded by date)
- Difficulty selector: Easy (4–5 letters), Medium (5–7), Hard (7–9)
- A small "mug shelf" on the results screen showing all 10 mugs with colored stars
