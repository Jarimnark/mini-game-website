# Test Report — Mug Unscramble
**Date**: 2026-05-08
**Tester**: Test Agent
**Verdict**: PASS WITH NOTES

## Summary
The game is structurally sound and implements the core loop correctly: letter tiles, tray mechanics, auto-check, scoring, hints, and the game-over screen all work as specified. However, a critical logic flaw in `buildWordPool()` means the session always draws from the 10 shortest words in the list, making it impossible for 6–8 letter words to ever appear and eliminating the intended difficulty curve entirely. Two minor issues also exist: a hardcoded rgba colour value and a duplicate Google Fonts load.

## Checklist Results
| Area | Result |
|------|--------|
| Launch & Setup | ✅ |
| Functional Correctness | ⚠️ |
| Edge Cases | ✅ |
| Visual & Design | ⚠️ |
| Code Quality | ✅ |
| Accessibility | ✅ |

---

## Bugs Found

### [BUG-001] buildWordPool always picks the 10 shortest words — P1
**Steps**: Start a new game or press Play Again; observe which words appear across 10 rounds; repeat multiple sessions.
**Expected**: 10 words drawn per session span 4–8 letter lengths, scaling in difficulty across rounds (as specified in the BRIEF).
**Actual**: `buildWordPool()` shuffles the full list then immediately re-sorts it by ascending length (`allSorted.sort((a, b) => a.length - b.length)`). Because the word list contains at least 13 words of 4–5 letters (COZY, FERN, KNIT, PLUM, ACORN, AMBER, CABIN, COCOA, HAZEL, HOLLY, HONEY, LATTE, MAPLE, SCONE, THYME, TOAST …), `slice(0, 10)` always returns only 4–5 letter words. Words of 6–8 letters (CINNAMON, BLANKET, LAVENDER, CHAMOMILE, ROSEMARY, etc.) are never played. The shuffle result is discarded by the deterministic sort.

**Root cause** (`game.js` lines 101–116):
```js
const allSorted = shuffle(WORD_LIST);   // ← shuffle happens here
allSorted.sort((a, b) => a.length - b.length); // ← immediately overwritten
return allSorted.slice(0, TOTAL_ROUNDS); // always the 10 shortest
```

**Fix**: Build a pool that deliberately spans multiple length buckets, or group words by length and pick proportionally — for example, 2 words from each of the five length bands (4, 5, 6, 7, 8) then shuffle the 10.

---

### [BUG-002] Play Again can produce the same 10 words every session — P2
**Steps**: Complete a game, press Play Again, note the words; repeat.
**Expected**: Each new session draws a fresh random sample; previous session's words should not all repeat.
**Actual**: Because `buildWordPool()` always draws from the same ~13 shortest words (see BUG-001), the pool of candidates never changes. On Play Again, the same 10 words will appear again (only their internal scramble order varies). Even if BUG-001 is fixed, no exclusion list is maintained across sessions.

**Fix**: After BUG-001 is resolved, store the previous session's 10 words in a variable and exclude them when building the next pool, or rotate through all 54 words before repeating.

---

### [BUG-003] Google Fonts loaded twice — P3
**Steps**: Open the page and inspect network requests or the `<head>`.
**Expected**: Fonts loaded once.
**Actual**: `index.html` contains a `<link>` tag for the Google Fonts stylesheet (line 9), and `style.css` line 5 also contains an `@import` for the same URL. This results in two HTTP requests for the same font definition.

**Fix**: Remove the `@import` from `style.css` (the HTML `<link>` tag is preferred because it loads earlier) or remove the HTML `<link>` tags and keep only the CSS import.

---

### [BUG-004] Hardcoded rgba colour in box-shadow — P3
**Steps**: Inspect `.letter-tile` rule in `style.css` (line 257).
**Expected**: All colour values use CSS custom properties (`var(--...)`), per the visual style requirements.
**Actual**: `box-shadow: 0 2px 6px rgba(180,120,60,0.25)` uses a hardcoded amber colour value instead of a design-token variable.

**Fix**: Add a `--shadow-tile` custom property (e.g. `rgba(180,120,60,0.25)`) to the root variable block in `main.css` and reference it here, or use `color-mix()` / a semi-transparent version of `--color-primary`.

---

### [BUG-005] Slide-in transition may not animate in all browsers — P3
**Steps**: Observe the mug slide-in animation when advancing to the next round.
**Expected**: New mug smoothly slides in from the right.
**Actual**: In `advanceRound()` (game.js lines 373–382), `slide-in-right` and `slide-to-center` are added/removed in the same synchronous microtask tick (only `getBoundingClientRect()` between them). While this forces a reflow in V8/Blink, it is not guaranteed to produce a CSS transition in all browsers or under heavy CPU load. The mug may appear to snap rather than slide.

**Fix**: Replace the class-swap technique with a `requestAnimationFrame` callback (or two nested rAFs) to ensure the browser has painted the start state before the transition class is applied.

---

## Recommendations
- Fix BUG-001 first — it is the most impactful issue and also resolves BUG-002 partially. A simple approach is to partition the 54 words into five length buckets (4, 5, 6, 7, 8 letters), shuffle each bucket, then interleave by picking 2 from each bucket to produce a 10-word ascending-difficulty sequence.
- Consider adding a light per-session deduplication mechanism (store last session's words in `localStorage` alongside the high score) so repeat plays feel varied.
- The hint mechanic currently awards full points even when hints are used; consider documenting this as a design decision or subtracting a small penalty per hint to add strategic depth.
- The slide transition fix (BUG-005) is low-risk and improves perceived polish on mid-range mobile devices where reflow timing is less predictable.
