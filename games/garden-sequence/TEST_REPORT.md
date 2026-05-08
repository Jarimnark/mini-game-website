# Test Report — Garden Sequence
**Date**: 2026-05-08
**Tester**: Test Agent
**Verdict**: PASS WITH NOTES

## Summary
Garden Sequence is functionally complete and matches the BRIEF on all core mechanics: sequence growth, playback, player input gating, retry counting, scoring, milestones, game-over screen, and Play Again reset. Two moderate issues exist — unguarded `setTimeout` handles that can cause stale-timer race conditions on quick Play Again, and two station emoji choices that don't match the BRIEF's described icons. Several minor code-hygiene issues round out the findings.

## Checklist Results
| Area | Result |
|------|--------|
| Launch & Setup | ✅ |
| Functional Correctness | ✅ |
| Edge Cases | ⚠️ |
| Visual & Design | ⚠️ |
| Code Quality | ⚠️ |
| Accessibility | ✅ |

---

## Bugs Found

### [BUG-001] Stale setTimeout fires after Play Again — P2
**Steps**: During playback, immediately after a wrong click while the 1-second replay delay is pending, click "Play Again" (reachable through the game-over flow or if a third wrong-click timer is still counting).
**Expected**: All pending timers are cancelled before `initGame()` resets state; no stale callback fires.
**Actual**: `setTimeout` return values are never stored, so there is no `clearTimeout()` call in `initGame()` or `startGame()`. A pending `setTimeout(() => playbackSequence(), 1000)` (wrong-click replay) or `setTimeout(startRound, 1200)` (round-complete advance) will fire against the freshly reset `game` object. In the worst case this calls `startRound()` a second time, pushing an extra entry into `game.sequence` at the start of the new game, breaking round-1 as a 2-step sequence.

---

### [BUG-002] Wrong emoji for "Water Can" station — P3
**Steps**: Launch the game and look at station 0 (top-left).
**Expected**: A watering-can icon as specified in the BRIEF ("watering can, trowel, seed bag, sun hat").
**Actual**: The icon is 🚿 (shower head / shower emoji), not a watering can. The watering-can emoji is 🪣 or the dedicated 🚿 is widely rendered as a shower nozzle.

---

### [BUG-003] Wrong emoji for "Trowel" station — P3
**Steps**: Launch the game and look at station 1 (top-right).
**Expected**: A trowel icon as specified in the BRIEF.
**Actual**: The icon is 🪴 (potted plant emoji). There is no dedicated Unicode trowel emoji, but 🌿, ⛏️ or a text label would be less misleading than a potted plant. The label still reads "Trowel" which creates an icon/label mismatch.

---

### [BUG-004] `game.retriesUsed` declared but never used — P4
**Steps**: Code review of `game.js` lines 21 and the full file.
**Expected**: Either `retriesUsed` is incremented on wrong clicks and used for some purpose, or it is absent.
**Actual**: `retriesUsed: 0` is declared in the `game` object but is never incremented or read anywhere in the codebase. Dead state field.

---

### [BUG-005] Game-over shows "Rounds Reached: 0" when failing Round 1 — P3
**Steps**: Start the game. Click a wrong station three times in Round 1.
**Expected**: Game-over screen shows "Rounds Reached: 1" (the player attempted round 1).
**Actual**: `showGameOver()` computes `roundsReached = game.round - 1`. Because `game.round` is still `1` when the player fails (it only advances in `onRoundComplete()`), `roundsReached` equals `0`. Showing 0 rounds reached is confusing and feels like a bug to the player.

---

### [BUG-006] Hardcoded `rgba()` literals and two hex values in CSS — P4
**Steps**: Code review of `style.css`.
**Expected**: All colour values use `var(--...)` tokens as implied by the project's design system.
**Actual**: Multiple raw `rgba()` values appear in CSS rules and variable definitions: overlay backdrop (`rgba(61, 44, 30, 0.55)`), `--glow-playback` shadow (`rgba(242,192,120,0.55)`), `--glow-correct` (`rgba(232,129,58,0.50)`), `--glow-wrong` (`rgba(192,57,43,0.40)`), drop-shadow on gnome, `box-shadow` on overlay-card, and `box-shadow` on `.retry-pip--active`. Additionally `--gnome-skin: #F4C89A` and `--color-danger: #C0392B` are raw hex literals in `:root` (though defined as variables, they are not sourced from `main.css` tokens).

---

## Recommendations

- **Fix stale timers (BUG-001)**: Store every `setTimeout` return value in `game` (e.g. `game._replayTimer`, `game._roundTimer`) and call `clearTimeout()` on both at the top of `initGame()`. This is the highest-priority fix.

- **Fix "Rounds Reached" display (BUG-005)**: Change `showGameOver` to use `game.round` (not `game.round - 1`) when game over occurs mid-round, since the player did reach that round. A simple fix: `const roundsReached = game.round;` — the round number at time of failure is the round the player reached.

- **Replace station emojis (BUG-002 / BUG-003)**: Consider 🪣 (bucket, closest to watering can) or 🌊 for Water Can; ⛏️ or 🔧 for Trowel (no dedicated Unicode trowel exists). Alternatively keep 🚿 but relabel it "Hose" and 🪴 relabeled "Pot" to eliminate the icon/label mismatch.

- **Remove `retriesUsed` (BUG-004)**: Delete the dead field from the `game` object, or wire it up if there was an intent to gate the clean-round bonus differently.

- **Tokenise remaining rgba() values (BUG-006)**: Extract the raw colour components into `:root` CSS variables (e.g. `--color-danger-rgb: 192, 57, 43`) so shadows can be written as `rgba(var(--color-danger-rgb), 0.40)`, keeping the design system consistent.

- **Sun Hat emoji**: 🎩 is a top hat, not a sun hat; consider 👒 which is explicitly a wide-brim sun hat. Minor but improves thematic consistency.
