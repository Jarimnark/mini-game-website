# Test Report — Firefly Catch

**Date**: 2026-05-08
**Tester**: Test Agent
**Verdict**: PASS WITH NOTES

## Summary
Firefly Catch is functionally complete and faithfully implements all core mechanics described in the BRIEF: the rising→lit→fading→dead firefly lifecycle, the 5-pip lantern, 20-second waves with increasing difficulty, a 2-second inter-wave pause, and a correct star-rating / high-score end screen. No P0 or P1 bugs were found. Two P2 issues (an `aria-valuenow` attribute that is never updated dynamically, and a minor pips underflow edge case that does not affect gameplay outcome) and two P3 cosmetic/accessibility notes are recorded below.

## Checklist Results
| Area | Result |
|------|--------|
| Launch & Setup | ✅ |
| Functional Correctness | ✅ |
| Edge Cases | ⚠️ |
| Visual & Design | ✅ |
| Code Quality | ✅ |
| Accessibility | ⚠️ |

## Bugs Found

### [BUG-001] `aria-valuenow` on pip meter never updated — P2
**Steps**: Open the game with a screen reader active. Lose several pips during play; observe the announced value of the lantern meter.
**Expected**: `aria-valuenow` on `#pips-row` updates to reflect the current pip count whenever `updatePips()` is called.
**Actual**: The attribute is set to `"5"` in static HTML and is never modified by JavaScript. `updatePips()` only toggles `pip--empty` CSS classes; it does not update `aria-valuenow`, `aria-valuenow` on the parent `<div role="meter">`, so screen readers always report 5 pips.
**Fix**: Add `game.els.pipsRow.setAttribute('aria-valuenow', game.pips);` at the end of `updatePips()`.

---

### [BUG-002] Pips can decrement below 0 before `endGame()` fires — P2
**Steps**: In a late wave when many fireflies are on-screen simultaneously, two or more fireflies that finish their `lit` phase in the same rAF tick (dt covers both timers expiring) will each call `missFirefly()`. If only 1 pip remains, the first call sets `game.pips` to 0 and schedules `endGame()` via `setTimeout`; the second call (same synchronous loop iteration) sets `game.pips` to -1.
**Expected**: `game.pips` should floor at 0; no negative values.
**Actual**: `game.pips` can reach -1 or lower. The `updatePips()` call still renders all pips as empty (because `i < game.pips` is false for all when `game.pips <= 0`), and `endGame()` still fires correctly due to the `if (game.running)` guard inside the `setTimeout`, so the game outcome is unaffected. However the internal state is semantically incorrect.
**Fix**: Guard in `missFirefly()`: `if (game.pips <= 0) return;` before decrementing, or `game.pips = Math.max(0, game.pips - 1)`.

---

### [BUG-003] Fireflies have no keyboard interaction — P3
**Steps**: Navigate the page using Tab / Enter only.
**Expected**: Players using keyboard-only input can interact with at least some fireflies, or the game surfaces a note about pointer/touch requirement.
**Actual**: Firefly `<div>` elements have `cursor: pointer` and a `pointerdown` listener but no `tabindex`, `keydown`, or `focus` handling. They are unreachable via keyboard.
**Note**: This is a known constraint for twitch-timing games, but it falls below WCAG 2.1 SC 2.1.1 (keyboard accessibility). Acceptable as a known limitation; no BRIEF requirement was violated.

---

### [BUG-004] Inter-wave screen announces next wave number but not a countdown — P3
**Steps**: Complete wave 1; observe the 2-second interlude screen.
**Expected** (BRIEF): "A brief breather (2 s pause)" — a countdown timer or progress indicator would reinforce this.
**Actual**: The inter-wave screen shows static text ("Wave 2 incoming… The meadow grows busier. Stay sharp!") with no visual countdown. The screen disappears after 2 seconds as expected, but there is no feedback about how long the pause lasts. Minor UX friction only.

## Recommendations
- Apply the `aria-valuenow` fix in `updatePips()` (see BUG-001) — one-line change.
- Add a `Math.max(0, …)` floor in `missFirefly()` (see BUG-002) — one-line change.
- Consider adding a simple 2-second CSS progress bar on the inter-wave screen to communicate the breather duration (BUG-004).
- The `main.css` shared stylesheet contains `color: #fff` inside `.btn--primary` (line 93). This is outside this game's direct scope but is a minor deviation from the project-wide "no hardcoded hex in rules" convention; worth flagging for the project's next CSS audit.
- Keyboard accessibility for fireflies is fundamentally at odds with the real-time tap mechanic; documenting this as an explicit known limitation in the BRIEF would close out BUG-003 cleanly.
