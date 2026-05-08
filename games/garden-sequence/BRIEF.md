# Garden Sequence — Design Brief

## One-liner
Watch a cheerful garden gnome perform a growing sequence of actions, then repeat it perfectly to keep the garden growing.

## Concept
A little garden gnome stands in a sunny plot surrounded by four illustrated action stations: Water Can, Trowel, Seed Bag, and Sun Hat. Each round the gnome performs one more action in the sequence — walking to each station in order with a bouncy animation. The player then clicks the stations to replay the exact sequence. Successfully repeating advances the round; one mistake resets that round with a forgiving retry. The charm lives in the gnome's expressive animations and the garden growing more lush with each successful round.

## Core Mechanic
Four large illustrated action stations sit at the corners of the play area. The gnome animates to each station in the current sequence (with a distinct sound cue and brief glow on each station). After the playback finishes, the player must click the stations in the same order. A progress bar shows how many clicks remain. Correct clicks make the station briefly glow golden; an incorrect click triggers a gentle "oops" wobble on the gnome and replays the current sequence before letting the player try again (no score penalty, but a "retry" counter increments).

## Game Loop
1. Round 1: gnome visits 1 station; player repeats the 1-step sequence.
2. Each subsequent round adds 1 new station to the end of the sequence.
3. Playback speed gradually increases from round 5 onward (gnome walks faster).
4. A wrong click replays the full current sequence and lets the player retry.
5. After 3 failed retries on the same sequence, the game ends and score is shown.
6. End condition: 3 failed retries, or player voluntarily ends at any round.

## Win / Score Condition
Score = rounds completed successfully × 10. Bonus: +5 per round completed without any retries (clean streak). Example: 10 clean rounds = 150 pts. No hard ceiling — the game gets progressively harder. High score stored in `localStorage`. The garden background visually grows fuller (more flowers, a butterfly) as rounds increase, providing a satisfying progress sense beyond the score number.

## Visual Style
A bright daytime garden fills the screen with warm cream sky (#FFF8F0) and a soft green ground. The four stations sit at the corners: each is a large rounded card (~120×120 px) with a friendly hand-drawn-style icon (watering can, trowel, seed bag, sun hat) in amber and golden tones. The gnome is a small character sprite (CSS-drawn or a single inline SVG, ~60×80 px) that slides between stations using CSS transitions. Active stations glow with a warm amber halo (box-shadow pulse). The garden backdrop gains decorative elements — sunflowers, clover patches, a butterfly — as CSS-positioned elements that fade in at milestone rounds (5, 8, 12). Fredoka One for all labels; round number shown in a warm parchment banner at the top.

## Controls
- Desktop: click the station cards in sequence
- Mobile: tap the station cards in sequence

## Scope Constraints
- Must fit in a single `games/garden-sequence/` folder
- No external API calls
- Gnome and stations drawn in pure CSS or inline SVG (no image assets required)
- Estimated build time: Medium (4–8h)

## Stretch Goals (optional)
- Web Audio API tones: each station plays a distinct soft chime during playback
- A "garden journal" end screen listing the longest sequence reached
- Fifth station unlocked at round 10 for extra challenge
- Shareable result card (canvas snapshot of the final garden state)
