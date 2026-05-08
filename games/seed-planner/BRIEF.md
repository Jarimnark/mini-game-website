# Seed Planner — Design Brief

## One-liner
Arrange crops on a tiny garden grid to trigger harvest combos and fill your basket before the season ends.

## Concept
The player is given a 5×5 garden grid and a hand of 4 randomized crop tiles (tomatoes, sunflowers, pumpkins, herbs, etc.). Placing matching crops adjacent to each other triggers a harvest combo that clears those tiles, scores bonus points, and refills the hand. The season ends after a fixed number of turns, rewarding thoughtful placement over speed. The whole experience feels like a cozy farm-planning puzzle — no timers, no pressure, just satisfying chain combos.

## Core Mechanic
Each turn the player places exactly one crop tile from their hand onto any empty grid cell. After placement, the board checks for groups of 3 or more orthogonally connected matching crops — any such group is harvested (removed), scoring points equal to group size squared (3=9, 4=16, 5=25, etc.). The freed cells become available again. The hand is refilled up to 4 tiles from a weighted-random bag. Turns countdown from 20.

## Game Loop
1. A 5×5 empty grid is shown with a hand of 4 crop tiles drawn from the bag.
2. The player clicks/taps a tile to select it, then clicks an empty cell to place it.
3. The board resolves combos (chain harvests possible if clearing one group creates another).
4. Harvested cells are animated away; score updates; hand is refilled.
5. This repeats for 20 turns.
6. End condition: when the 20th tile has been placed and all combos resolved, the season ends and the final score + star rating are shown.

## Win / Score Condition
Score = sum of all harvest combo scores (group_size²). Bonus: +50 points if no tiles are left unmatched on the board at season end (full clear). Star thresholds: 1 star = 100 pts, 2 stars = 250 pts, 3 stars = 500 pts. High score saved to `localStorage`.

## Visual Style
The grid sits on a warm parchment surface (#FFFDF8) with a soft beige border (#E8D5C4) between cells, evoking a garden plot drawn on paper. Each crop type has a distinct warm icon rendered as a simple emoji or inline SVG (tomato, sunflower, pumpkin, herb, berry). When a group harvests, the tiles bounce once with a scale-up then fade using a CSS keyframe, and a golden score popup (+16, +25, etc.) floats upward in Fredoka One amber (#E8813A). The hand of 4 tiles sits below the grid in a cream card row with a gentle amber selected-state outline. Season progress is a thin amber progress bar above the grid showing turns remaining. Background is warm cream (#FFF8F0) with a faint illustrated border of vines.

## Controls
- Desktop: click a hand tile to select it, then click an empty grid cell to place; press Escape or click the tile again to deselect
- Mobile: tap a hand tile to select, tap an empty cell to place; tap selected tile again to deselect

## Scope Constraints
- Must fit in a single `games/seed-planner/` folder
- No external API calls
- Estimated build time: Medium (4–8h)

## Stretch Goals (optional)
- Wild-card "rain" tile that matches any crop type
- Special "fertilizer" cell that doubles the score of any combo touching it
- Daily seed — a fixed daily random seed so all players share the same puzzle each day
- Undo last placement (limited to 1 undo per game)
- Soft background music loop (Web Audio API, self-hosted)
