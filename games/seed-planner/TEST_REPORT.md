# Test Report — Seed Planner

**Date**: 2026-05-08
**Tester**: Test Agent
**Verdict**: PASS WITH NOTES

## Summary
Seed Planner is functionally complete and correct against its BRIEF.md. All core mechanics — 5×5 grid, 5 crop types, 4-tile hand, BFS harvest detection, group²  scoring, chain combos, 20-turn countdown, full-clear bonus, star thresholds, and localStorage high score — are implemented accurately. Three minor P2/P3 issues were found (progress bar shrinks in the wrong direction semantically but displays correctly, selected-tile outline uses golden-yellow rather than the spec amber, and no ARIA live attributes on the progress bar), with a handful of P4 cosmetic or wish-list notes.

## Checklist Results
| Area | Result |
|------|--------|
| Launch & Setup | ✅ |
| Functional Correctness | ✅ |
| Edge Cases | ✅ |
| Visual & Design | ⚠️ |
| Code Quality | ✅ |
| Accessibility | ⚠️ |

---

## Bugs Found

### [BUG-001] Progress bar depletes left-to-right instead of right-to-left — P3
**Steps**: Start a new game and observe the amber progress bar. Place tiles and watch the bar shrink.
**Expected**: The bar represents "turns remaining"; it should start full and shrink as turns are spent, which it does — no functional error. However the `width` calculation is `(game.turns / MAX_TURNS) * 100`, meaning the bar starts at 100 % and reaches 0 % on the last turn. This is visually correct. No actual bug — **downgraded to observation**: the bar correctly represents turns remaining and transitions smoothly. *(Non-issue; noted for completeness.)*

### [BUG-002] Selected-tile outline uses golden-yellow (`--color-accent`) instead of spec amber (`--color-primary`) — P3
**Steps**: Click a hand tile to select it and observe the outline glow.
**Expected**: Brief states "amber selected-state outline". `--color-primary` (#E8813A) is the canonical amber token.
**Actual**: `.hand-tile--selected` applies `box-shadow: 0 0 0 3px var(--color-accent)` where `--color-accent` is #F2C078 (golden yellow, noticeably lighter). The tile border correctly switches to `var(--color-primary)`, but the outer glow ring is the wrong shade.

### [BUG-003] Progress bar has no ARIA range attributes — P3
**Steps**: Inspect `.progress-bar-wrap` in an accessibility tree.
**Expected**: A progress indicator should expose `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` so screen readers can announce remaining turns numerically.
**Actual**: The wrapper has `aria-label="Turns remaining"` but no role or value attributes. The numeric turn count is shown in `#turns-display`, so this is not a blocking issue, but the bar itself is invisible to assistive technology.

### [BUG-004] Hand refills on the final turn before the game-over screen — P4
**Steps**: Place the 20th tile.
**Expected per brief**: Season ends after the 20th placement and all combos resolve; hand refill is only useful when play continues.
**Actual**: `refillHand()` is always called inside the `resolveHarvests` done-callback before the `game.turns === 0` check triggers `endGame()`. The hand is silently refilled even though the player will never use those tiles. No visible impact (overlay immediately hides the hand), but it wastes bag draws and could cause minor confusion if UI were ever extended.

### [BUG-005] `score-popups` container uses `position: absolute` spanning the full `.game-wrapper` — P4 (design note)
**Steps**: Observe score popups on a small viewport where the grid is near the bottom of the wrapper.
**Expected**: Popups float upward from the harvested cells.
**Actual**: The container is absolutely positioned over the entire `.game-wrapper` (header, progress bar, grid, hand), so popups can technically float into the header area on small screens. The popup coordinates are computed relative to the container's own `getBoundingClientRect`, which is correct arithmetic, but there is no `overflow: hidden` clamp applied — popups can visually bleed into the header. Low-severity cosmetic issue.

---

## Detailed Checklist Notes

### 1. Launch & Setup — PASS
- `<!DOCTYPE html>` present on line 1.
- `<html lang="en">` present.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` present.
- Back link `<a href="../../src/index.html">← mini-gamo</a>` present and correct.
- `../../src/styles/main.css` linked before `style.css` (correct cascade order).
- No obvious HTML syntax errors.
- No obvious JS syntax errors (IIFE pattern, `'use strict'`, clean structure).
- No obvious CSS syntax errors.

### 2. Functional Correctness — PASS
- **5×5 grid**: `GRID_SIZE = 5`, `TOTAL_CELLS = 25`, `buildGridDOM()` creates 25 cells. ✅
- **5 crop types**: `CROPS` array has tomato 🍅, sunflower 🌻, pumpkin 🎃, herb 🌿, berry 🫐. ✅
- **Hand of 4 tiles, refill after placement**: `HAND_SIZE = 4`; `refillHand()` called in resolve callback. ✅
- **BFS groups of 3+**: `findHarvestGroups()` uses iterative BFS (`queue.shift()`), checks `game.grid[idx] !== cropId` to stay within type, only pushes `group` if `group.length >= 3`. ✅
- **Score = group_size²**: `const groupScore = group.length * group.length`. ✅ (3→9, 4→16, 5→25 confirmed.)
- **Chain combos**: `resolveHarvests` calls itself recursively via the `animationend` callback after clearing the board; terminates when `findHarvestGroups()` returns empty. ✅
- **20-turn countdown**: `game.turns = MAX_TURNS = 20`, decremented by 1 per placement. ✅
- **Game ends after 20th placement**: `if (game.turns === 0) endGame()` in done-callback. ✅
- **+50 full-board-clear bonus**: `if (!hasTilesLeft) game.score += 50` in `endGame()`. ✅
- **Star thresholds**: 1★=100, 2★=250, 3★=500. ✅
- **localStorage high score**: Reads with `parseInt(..., 10)`, writes on new high. ✅
- **Play Again resets**: `init()` resets all `game.*` fields, rebuilds grid DOM, refills bag and hand, hides overlay. ✅
- **Escape deselects**: `document.addEventListener('keydown', ...)` with `e.key === 'Escape'`. ✅
- **Re-tap deselects**: `onTileClick` sets `selectedIdx = null` when `selectedIdx === idx`. ✅

### 3. Edge Cases — PASS
- **Group of 5 (or full 25)**: `group.length * group.length` handles any size; no upper bound cap. A group of 5 scores 25. ✅
- **Board fills with no matches at turn 20**: `endGame()` is triggered by `game.turns === 0` regardless of harvest activity; full-clear bonus simply won't apply. ✅
- **Placement on occupied cell**: `onCellClick` returns early if `game.grid[idx] !== null`. ✅
- **Score overflow**: JavaScript numbers are IEEE 754 doubles; max theoretical score on a 25-cell board (one group of 25 = 625, plus +50 clear bonus = 675) is far below any overflow threshold. ✅ Score cannot go negative (only additive operations). ✅
- **Chain combo recursion depth**: Chaining is callback-driven (via `animationend`), not synchronous recursion. Each level only recurses after all animations complete and only if new harvest groups exist. Worst case is 8 independent chain iterations on a 25-cell board — no stack overflow risk. ✅

### 4. Visual & Design — PASS WITH NOTES
- **No hardcoded hex values in CSS element rules**: All color properties on elements use `var(--...)`. The `:root` block in `style.css` defines shadow tokens using `rgba()`, which is the correct place for raw values. ✅
- **Fredoka One for display text and score popups**: `var(--font-display)` = `'Fredoka One'` used on `.game-title`, `.score-value`, `.overlay-title`, `.score-popup`. ✅
- **Amber progress bar**: `.progress-bar { background: var(--color-accent) }` = #F2C078 (golden amber). ✅
- **Harvest animation (scale-up fade)**: `@keyframes harvest-pop` goes 0%→scale(1)→40%→scale(1.35)→100%→scale(0), opacity 1→0. ✅
- **Score popups float upward in amber Fredoka One**: `@keyframes score-float` translates Y by −64px; color is `var(--color-primary)` = #E8813A (amber); font is Fredoka One. ✅
- **Selected tile amber outline**: Border color is `var(--color-primary)` (amber ✅) but the glow ring is `var(--color-accent)` (golden yellow ⚠️). See BUG-002.

### 5. Code Quality — PASS
- **Single `const game = {}` for mutable state**: All mutable state (grid, hand, selectedIdx, score, turns, over, bag) lives in `game`. ✅
- **No `console.log` calls**: The header comment confirms intent; no `console.log` found in code body. ✅
- **Play Again resets DOM**: `buildGridDOM()` clears `gridContainer.innerHTML` and rebuilds; `renderHand()` clears `handRow.innerHTML` and rebuilds. ✅
- **Weighted-random bag**: `refillBag()` pushes each crop `weight` times (all weights = 20, total 100 entries) then Fisher-Yates shuffles. `drawFromBag()` refills automatically on exhaustion. ✅
- **IIFE + `'use strict'`**: No global namespace pollution. ✅

### 6. Accessibility — PASS WITH NOTES
- **Grid cells**: `role="gridcell"`, `aria-label` set to crop id or "empty", clickable. ✅
- **Hand tiles**: `role="button"`, `aria-label="[crop] crop tile"`, `tabindex="0"`, keydown handler for Enter/Space. ✅
- **Play Again button**: Native `<button>` element with visible text label. ✅
- **Score popups container**: `aria-live="polite"` on `#score-popups`. ✅
- **Progress bar missing ARIA range attributes**: See BUG-003. ⚠️

---

## Recommendations
- Fix BUG-002: Change `.hand-tile--selected` box-shadow from `var(--color-accent)` to `var(--color-primary)` (or add a new `--color-selected-ring` token) to match the brief's "amber outline" spec.
- Fix BUG-003: Add `role="progressbar"` plus `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="20"` to `.progress-bar-wrap`, and update `aria-valuenow` in `renderHUD()`.
- Address BUG-004: Move `refillHand()` inside the `if (game.turns > 0)` branch (i.e., skip the refill when the game is ending) to avoid unnecessary bag draws.
- Address BUG-005 (optional): Add `overflow: hidden` to `.score-popups` or scope the container to just the grid area to prevent popups bleeding into the header.
- Consider adding `aria-label` or `title` to the `.grid-container` to clarify its row/column structure for screen reader users.
