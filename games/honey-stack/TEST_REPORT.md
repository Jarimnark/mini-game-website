# Test Report — Honey Stack
**Date**: 2026-05-08
**Tester**: Test Agent
**Verdict**: PASS WITH NOTES

## Summary
Honey Stack is well-implemented and covers the vast majority of BRIEF.md requirements: rAF timer, progressive difficulty, multiplier tiers, distractor generation, keyboard shortcuts, game-over overlay with high-score persistence, and visual bee/flower design all work correctly. Three minor-to-moderate issues were found: (1) a subtle double-answer window caused by keyboard input not re-checking `game.answering` before the flag is fully set, (2) multiplication factors are always ≥ 2 (never 1), which slightly constrains the range against the brief wording "×2/×3", and (3) a tiny fallback path in distractor generation can produce distractors equal to `correct + 1` or `correct + 2` without verifying they are not equal to each other when `correct + 1` already exists in the pool, though this is exceedingly rare in practice.

## Checklist Results
| Area | Result |
|------|--------|
| Launch & Setup | ✅ |
| Functional Correctness | ⚠️ |
| Edge Cases | ⚠️ |
| Visual & Design | ✅ |
| Code Quality | ✅ |
| Accessibility | ⚠️ |

---

## Detailed Findings

### 1. Launch & Setup — ✅
- `<!DOCTYPE html>` present on line 1.
- `<html lang="en">` present.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` present.
- Back link: `<a class="back-link" href="../../src/index.html">` — correct path.
- Global stylesheet: `<link rel="stylesheet" href="../../src/styles/main.css">` — correct path.
- Game stylesheet: `<link rel="stylesheet" href="style.css">` — present.
- `<script src="game.js">` at end of `<body>` — correct placement.
- No obvious JS or CSS syntax errors detected on manual review.

### 2. Functional Correctness — ⚠️

**Timer (60-second countdown via rAF)**: Implemented correctly. `startTimer()` uses `requestAnimationFrame` with delta-time accumulation (`timestamp - game.lastTimestamp`). `Math.max(0, game.timeLeft - delta)` prevents going negative. Timer cancelled via `cancelAnimationFrame` in `stopTimer()`.

**Progressive difficulty**:
- `elapsed = GAME_DURATION - game.timeLeft` correctly measures time since start.
- 0–20 s: addition only. ✅
- ≥20 s: subtraction added. ✅
- ≥40 s: multiplication added. ✅

**Number range constraints**:
- Addition: retry loop ensures `a + b <= 20`. ✅
- Subtraction: `b = randInt(1, a)` so result `a - b >= 0`. ✅
- Multiplication: `a = randInt(2, 5)`, `b = randInt(2, 5)` — factors are 2–5, never 1. The BRIEF says "×2/×3 multiplication" implying small factors; this is acceptable but slightly narrower than needed (minimum product is 4). ⚠️ (see BUG-003)

**3 flowers, 1 correct + 2 distinct distractors**:
- `buildAnswers` uses a `Set` to collect 2 distinct values that are not equal to `correct` and `>= 0`.
- Shuffled via Fisher-Yates, correct index tracked via `positions.indexOf(correct)`. ✅
- Distractors are never equal to the correct answer (guarded by `candidate !== correct`). ✅

**Distractor uniqueness**: The `Set` ensures pool entries are distinct from each other. However the fallback path (lines 145–148) adds `correct + 1` unconditionally, then `correct + 2` if pool size is still < 2. If the pool already contains `correct + 1` from a previous iteration (rare — the pool would need to be size 1 with that exact value), `correct + 2` is added, resulting in 2 unique values. This is actually safe because `Set.add` is idempotent. The fallback is correct. ✅

**Scoring and streak multiplier**:
- Correct: `+10 * mult`, `streak++`, `longestStreak` updated. ✅
- Multiplier tiers: `MULT_TIERS` checked in descending order; ×1 at 0+, ×2 at 3+, ×3 at 6+, ×4 at 10+. ✅
- Wrong: `streak = 0`, no points. ✅
- Multiplier updates immediately in `renderHUD()` after both correct and wrong answers. ✅

**New question ~500 ms after answer**:
- Correct: `setTimeout(loadQuestion, 500)`. ✅
- Wrong: `setTimeout(loadQuestion, 600)` (500 + 100). Slightly longer for wrong, reasonable. ✅

**Keyboard 1/2/3**:
- `keydown` listener maps `e.key === '1'` to index 0, `'2'` to 1, `'3'` to 2. ✅
- Guard `if (game.over || game.answering) return` prevents double-trigger. ✅

**Timer bar pulses under 10 seconds**:
- `timer-bar--urgent` class added when `game.timeLeft <= 10`. ✅
- CSS `@keyframes timer-pulse` with 0.7 s infinite animation applies. ✅

**Multiplier badge updates at each tier**:
- `renderHUD()` called after every answer, sets `data-tier` attribute correctly. ✅
- CSS rules for `data-tier="3"` and `data-tier="4"` apply glow effects. ✅

**Game-over screen**:
- Score, longest streak, stars (1/2/3 based on 100/250/500), high score shown. ✅
- High score and best streak saved to `localStorage`. ✅
- Play Again button calls `init()` which calls `stopTimer()` (cancels any lingering rAF) then restarts. ✅

### 3. Edge Cases — ⚠️

**Double-scoring via rapid clicks**: When a flower button is clicked, `onFlowerClick` sets `game.answering = true` and immediately calls `flowerBtns.forEach(btn => { btn.disabled = true; })`. This prevents subsequent clicks. Keyboard handler also guards on `game.answering`. No double-scoring path found for mouse clicks. ✅

**Keyboard + click race condition (P3)**: There is a narrow one-frame window where a keyboard keydown event fires and `game.answering` is `false`, but between the keydown handler returning and the synchronous `game.answering = true` being set, a click event could also fire on a flower. In practice this is not exploitable because both events would have to fire in the same JS microtask turn and click handlers are macrotasks. Effectively safe. ✅

**rAF drift past 60 seconds**: `Math.max(0, game.timeLeft - delta)` clamps at 0. `endGame()` is called when `game.timeLeft <= 0`. However, the check occurs after the decrement, so the timer will tick to exactly 0 and stop — it cannot drift negative. ✅

**Subtraction distractors going negative**: `buildAnswers` has `candidate >= 0` guard — no negative distractors are possible. ✅

**Multiplier at exact boundary (streak = 3, 6, 10)**: `getMultiplier()` iterates `MULT_TIERS` in descending minStreak order. At streak = 3: `3 >= 3` → returns ×2 immediately after `streak++` in `handleCorrect`. The multiplier is applied to the *next* question (points are awarded before the streak is incremented on the current correct answer, but `renderHUD()` is called after `game.streak += 1`, so the badge shows the updated tier immediately). ✅ — **Note**: Points for the answer that *reaches* the new tier are calculated using `getMultiplier()` called *before* `game.streak += 1`. This means the bonus answer itself earns the old tier's multiplier, and the new tier kicks in from the next question. This is a design choice, not a bug, but it deviates slightly from a literal reading of the BRIEF ("multiplier increases at streaks 3, 6, 10"). See BUG-002.

**rAF cancelled on game end and Play Again**: `endGame()` calls `stopTimer()` → `cancelAnimationFrame`. `init()` also calls `stopTimer()` before restarting. No rAF leak possible. ✅

**Flowers disabled between questions**: `game.answering = true` is set and all buttons are disabled in `onFlowerClick` immediately. `loadQuestion()` sets `game.answering = false` and re-enables buttons. ✅

### 4. Visual & Design — ✅

**All CSS uses `var(--...)` — no hardcoded hex**:
- `:root` block defines local tokens that map to `var(--color-accent)`, `var(--color-text)`, etc. ✅
- All color properties in rules use `var(--...)`. ✅
- `rgba(...)` values appear in `box-shadow` and `--color-overlay` definitions — these are acceptable as shadow/overlay utilities, not fill/stroke colors. No raw hex in CSS rules outside the `:root` custom property declarations. ✅

**Bee character**: Full SVG bee with body ellipses, stripe ellipses, head circle, eyes, antennae, wings, stinger — rendered entirely via `var(--bee-amber)`, `var(--bee-dark)`, `var(--bee-wing)`. ✅

**Flowers with petal structure**: 8-petal radial pattern via `::before`/`::after` box-shadows; center circle with `flower__number`. ✅

**Timer bar pulses urgently**: `timer-pulse` keyframe fades between opacity 1 and 0.45 at 0.7 s interval; color shifts to `--color-primary`. ✅

**Multiplier badge glows at ×3/×4**: `data-tier="3"` applies `var(--multiplier-glow-3)`; `data-tier="4"` applies `var(--multiplier-glow-4)`. ✅

### 5. Code Quality — ✅

**Single `const game = {}`**: All mutable state is in a single `game` object on lines 29–41. ✅

**No `console.log`**: No `console.log`, `console.warn`, or `console.error` statements found. ✅

**rAF properly cancelled**: `stopTimer()` cancels via `cancelAnimationFrame(game.rafId)` and nulls `game.rafId`. Called in `endGame()` and at start of `init()`. ✅

**Flower buttons disabled between questions**: Handled correctly as noted above. ✅

**IIFE wrapping**: Entire script is wrapped in `(function() { 'use strict'; ... })()` — no global namespace pollution. ✅

### 6. Accessibility — ⚠️

**Flower buttons have labels**: `aria-label="Flower 1/2/3"` on each button. ✅

**Keyboard shortcuts work**: 1/2/3 via `keydown` listener. ✅

**Keyboard hint visible**: `.flower__key-hint` span shows "1", "2", "3" below each flower with `aria-hidden="true"`. ✅

**Timer bar ARIA**: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` present. `aria-valuenow` updated in `updateTimerUI()`. ✅

**Expression live region**: `<section aria-live="polite" aria-label="Current arithmetic expression">` wraps the bee+sign. ✅

**Game-over overlay focus**: When the overlay appears, focus is not programmatically moved to the overlay card or Play Again button. A screen reader user could miss the overlay entirely until they navigate to it. See BUG-004. ⚠️

---

## Bugs Found

### [BUG-001] Multiplier for streak-crossing answer uses old tier — P3
**Steps**: Build a streak of 2 correct answers (×1 tier). Give the 3rd correct answer.
**Expected**: The BRIEF states multiplier advances at streak 3; the answer that achieves streak 3 should arguably award ×2 points.
**Actual**: `getMultiplier()` is called before `game.streak += 1`, so the 3rd answer earns 10 × ×1 = 10 pts. The ×2 tier applies only from the 4th correct answer onward. Same off-by-one applies at streaks 6 and 10.
**Impact**: Minor scoring discrepancy vs. brief wording. The badge updates correctly after the answer; only the point award for that single transitional answer is affected.

### [BUG-002] Multiplication operands always ≥ 2; never generates "×2 of a single-digit" style easy multiplications — P4
**Steps**: Play for 40+ seconds and observe multiplication questions.
**Expected**: BRIEF says "×2/×3 multiplication" and "factors ≤ 5" — implies lower bound could be 1 or 2.
**Actual**: `a = randInt(2, 5)`, `b = randInt(2, 5)` means smallest product is 4 and both operands are always ≥ 2. Products range 4–25. This is fine for difficulty but 25 exceeds what might be considered "friendly" and is inconsistent with the spirit of the brief (which emphasises cozy difficulty).
**Recommendation**: Consider `a = randInt(2, 3)`, `b = randInt(1, 5)` to keep one factor small and cap products at 15.

### [BUG-003] Game-over overlay does not receive keyboard focus — P2
**Steps**: Let timer expire (or reach 0). Use keyboard-only navigation.
**Expected**: Focus moves to the overlay card or Play Again button so keyboard/screen-reader users can immediately restart.
**Actual**: `gameOverOverlay.hidden = false` is set but no `focus()` call is made. A keyboard user must tab to reach the Play Again button; a screen reader may not announce the overlay automatically despite it being a fixed overlay.
**Fix**: Add `btnPlayAgain.focus()` after `gameOverOverlay.hidden = false` in `endGame()`. Also restore focus to the game area after Play Again is clicked.

### [BUG-004] `aria-label` on flower buttons is static ("Flower 1/2/3") — P3
**Steps**: Use a screen reader to navigate the flowers after a new question loads.
**Expected**: Button label should communicate the answer value, e.g. "Flower 1: 7" or at least the number shown.
**Actual**: Labels remain "Flower 1", "Flower 2", "Flower 3" regardless of the displayed number, so a screen reader user cannot identify the answer values without reading the `flower__number` span (which is inside the button and will be read as button content — so this is actually readable as button text). This is acceptable but the static `aria-label` overrides the natural button text content, meaning screen readers will announce "Flower 1" instead of the number.
**Fix**: Either remove the static `aria-label` to let the button's text content (the number) be announced, or update it dynamically in `loadQuestion()` to `"Flower 1: <value>"`.

---

## Recommendations

- **BUG-003 (P2 — accessibility)**: Add `btnPlayAgain.focus()` at the end of `endGame()`. This is a one-line fix with meaningful accessibility benefit.
- **BUG-004 (P3 — accessibility)**: In `loadQuestion()`, after updating `flowerNums`, add `flowerBtns[i].setAttribute('aria-label', 'Flower ' + (i+1) + ': ' + answers[i])` for each flower — or simply remove the static `aria-label` and let the visible number text serve as the accessible label.
- **BUG-001 (P3 — scoring)**: Move `game.streak += 1` before `getMultiplier()` in `handleCorrect()` so the answer that reaches the new tier earns the new tier's multiplier. This also means updating `longestStreak` after the increment.
- **BUG-002 (P4 — design)**: Constrain multiplication so at least one factor is ≤ 3 (e.g., `a = randInt(2, 3)`, `b = randInt(1, 5)`), keeping with the "friendly numbers" brief goal.
- **General**: The BRIEF mentions a "best streak" shown on the overlay — this is implemented via `overlayStreak` displaying `longestStreak`, but the `overlayHi` element shows only the high *score*, not the best ever streak from localStorage. The overlay shows the best score from localStorage correctly; the best streak is only the current session's longest streak and not compared against `hiStreak` in the display. Consider showing `hiStreak` as well or replacing `longestStreak` with `Math.max(game.longestStreak, hiStreak)`.
