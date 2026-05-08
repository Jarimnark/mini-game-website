'use strict';

/* ═══════════════════════════════════════════════════════════════
   Garden Sequence — Game Logic
   All mutable state lives in the `game` object below.
═══════════════════════════════════════════════════════════════ */

const game = {
  /* Config */
  BASE_DELAY:    900,   // ms between station highlights in rounds 1-4
  FAST_DELAY:    550,   // ms from round 5 onward
  SHOW_DURATION: 600,   // ms a station stays highlighted during playback
  MAX_RETRIES:   3,     // failed attempts before game over

  /* Live state */
  sequence:       [],   // full sequence array of station indices
  playerPos:      0,    // how many steps the player has entered this round
  round:          1,    // 1-indexed current round
  score:          0,
  retriesLeft:    3,
  cleanRound:     true, // no retries on this round yet
  isPlayback:     false,
  isGameOver:     false,
  highScore:      0,
  pendingTimeout: null, // stored setTimeout ID to prevent stale callbacks
};

/* ─── DOM refs ───────────────────────────────────────────────── */
const elRound      = document.getElementById('round-number');
const elScore      = document.getElementById('score-display');
const elHiScore    = document.getElementById('hi-score-display');
const elStatus     = document.getElementById('status-text');
const elProgressWrap = document.getElementById('progress-wrap');
const elProgressFill = document.getElementById('progress-fill');
const elProgressLbl  = document.getElementById('progress-label');
const elGnome      = document.getElementById('gnome');
const elStartOverlay  = document.getElementById('start-overlay');
const elGameoverOverlay = document.getElementById('gameover-overlay');
const elBtnStart   = document.getElementById('btn-start');
const elBtnPlayAgain = document.getElementById('btn-play-again');
const elGoScore    = document.getElementById('go-score');
const elGoRounds   = document.getElementById('go-rounds');
const elGoHi       = document.getElementById('go-hi');
const elGoStars    = document.getElementById('go-stars');
const elGoEmoji    = document.getElementById('go-emoji');
const pips         = [
  document.getElementById('pip-0'),
  document.getElementById('pip-1'),
  document.getElementById('pip-2'),
];
const stations = Array.from({ length: 4 }, (_, i) =>
  document.getElementById('station-' + i)
);

/* ─── Station gnome positions (% of play-area, as CSS top/left) */
/* Stations are at corners in a 2×2 grid.
   The gnome is absolutely positioned inside .play-area.
   These values (top%, left%) aim the gnome at each station center. */
const GNOME_POSITIONS = [
  { top: 20, left: 25 },  // station-0 TL
  { top: 20, left: 75 },  // station-1 TR
  { top: 75, left: 25 },  // station-2 BL
  { top: 75, left: 75 },  // station-3 BR
];
const GNOME_CENTER = { top: 50, left: 50 };

/* ─── Helpers ────────────────────────────────────────────────── */
function setStatus(msg) {
  elStatus.textContent = msg;
}

function setGnomePosition(pos) {
  elGnome.style.top  = pos.top  + '%';
  elGnome.style.left = pos.left + '%';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateScoreUI() {
  elScore.textContent   = game.score;
  elHiScore.textContent = game.highScore;
  elRound.textContent   = game.round;
}

function updatePips() {
  for (let i = 0; i < pips.length; i++) {
    pips[i].classList.remove('retry-pip--active', 'retry-pip--lost');
    if (i < game.retriesLeft) {
      pips[i].classList.add('retry-pip--active');
    } else {
      pips[i].classList.add('retry-pip--lost');
    }
  }
}

function setStationsDisabled(disabled) {
  stations.forEach(s => {
    s.disabled = disabled;
  });
}

function clearStationClasses() {
  stations.forEach(s => {
    s.classList.remove(
      'station--active-playback',
      'station--correct',
      'station--wrong'
    );
  });
}

function updateProgress() {
  const total = game.sequence.length;
  const done  = game.playerPos;
  const pct   = total ? (done / total) * 100 : 0;
  elProgressFill.style.width = pct + '%';
  elProgressLbl.textContent  = done + ' / ' + total;
}

function showProgress(visible) {
  elProgressWrap.hidden = !visible;
  if (visible) updateProgress();
}

/* ─── Garden decoration milestones ──────────────────────────── */
const MILESTONES = {
  5:  ['deco--sunflower-1', 'deco--sunflower-2'],
  8:  ['deco--clover', 'deco--butterfly'],
  12: ['deco--mushroom'],
};

function updateGardenDecorations() {
  const round = game.round;
  Object.entries(MILESTONES).forEach(([milestone, classes]) => {
    if (round >= Number(milestone)) {
      classes.forEach(cls => {
        const el = document.querySelector('.' + cls);
        if (el) el.classList.add('deco--visible');
      });
    }
  });
}

/* ─── High score persistence ─────────────────────────────────── */
function loadHighScore() {
  const saved = localStorage.getItem('gardenSequence_highScore');
  game.highScore = saved ? parseInt(saved, 10) : 0;
  elHiScore.textContent = game.highScore;
}

function saveHighScore() {
  if (game.score > game.highScore) {
    game.highScore = game.score;
    localStorage.setItem('gardenSequence_highScore', game.highScore);
  }
  elHiScore.textContent = game.highScore;
}

/* ─── Star rating ────────────────────────────────────────────── */
function starsForScore(score) {
  if (score >= 150) return 3;
  if (score >= 100) return 2;
  if (score >= 50)  return 1;
  return 0;
}

/* ─── Gnome animation helpers ────────────────────────────────── */
function gnomeBounce() {
  elGnome.classList.remove('gnome--bounce', 'gnome--oops');
  void elGnome.offsetWidth; // reflow
  elGnome.classList.add('gnome--bounce');
}

function gnomeOops() {
  elGnome.classList.remove('gnome--bounce', 'gnome--oops');
  void elGnome.offsetWidth;
  elGnome.classList.add('gnome--oops');
}

/* ─── Core: playback sequence ────────────────────────────────── */
async function playbackSequence() {
  game.isPlayback = true;
  setStationsDisabled(true);
  showProgress(false);
  clearStationClasses();
  setGnomePosition(GNOME_CENTER);
  setStatus('Watch carefully…');

  const stepDelay = game.round >= 5 ? game.FAST_DELAY : game.BASE_DELAY;

  // Brief pause before starting
  await delay(400);

  for (let i = 0; i < game.sequence.length; i++) {
    const idx = game.sequence[i];

    // Move gnome to station
    setGnomePosition(GNOME_POSITIONS[idx]);
    gnomeBounce();

    // Highlight station
    clearStationClasses();
    stations[idx].classList.add('station--active-playback');

    await delay(game.SHOW_DURATION);

    // Clear highlight
    stations[idx].classList.remove('station--active-playback');

    await delay(stepDelay);
  }

  // Return gnome to center
  setGnomePosition(GNOME_CENTER);
  clearStationClasses();

  await delay(300);

  // Hand over to player
  game.isPlayback = false;
  game.playerPos  = 0;
  setStationsDisabled(false);
  showProgress(true);
  setStatus('Your turn! Repeat the sequence.');
}

/* ─── Core: begin a round ────────────────────────────────────── */
function startRound() {
  // Add one new random step to the sequence
  const next = Math.floor(Math.random() * 4);
  game.sequence.push(next);

  game.playerPos  = 0;
  game.cleanRound = true;

  updateScoreUI();
  updateGardenDecorations();
  updatePips();

  playbackSequence();
}

/* ─── Core: handle a player station click ────────────────────── */
function handleStationClick(idx) {
  if (game.isPlayback || game.isGameOver) return;

  const expected = game.sequence[game.playerPos];

  if (idx === expected) {
    /* ── Correct ── */
    stations[idx].classList.add('station--correct');
    setTimeout(() => stations[idx].classList.remove('station--correct'), 500);

    game.playerPos++;
    updateProgress();

    if (game.playerPos === game.sequence.length) {
      /* Completed the full sequence */
      onRoundComplete();
    }
  } else {
    /* ── Wrong ── */
    stations[idx].classList.add('station--wrong');
    setTimeout(() => stations[idx].classList.remove('station--wrong'), 500);

    gnomeOops();
    game.cleanRound = false;
    game.retriesLeft--;
    updatePips();

    if (game.retriesLeft <= 0) {
      // Game over after delay
      setStationsDisabled(true);
      setStatus('Oh no! Game over!');
      game.pendingTimeout = setTimeout(showGameOver, 900);
    } else {
      // Replay after brief pause
      const retriesMsg = game.retriesLeft === 1
        ? '1 retry left — watch again!'
        : game.retriesLeft + ' retries left — watch again!';
      setStationsDisabled(true);
      setStatus('Oops! ' + retriesMsg);
      game.pendingTimeout = setTimeout(() => playbackSequence(), 1000);
    }
  }
}

/* ─── Core: round completed ──────────────────────────────────── */
function onRoundComplete() {
  setStationsDisabled(true);
  showProgress(false);

  // Calculate score for this round
  let roundScore = 10;
  if (game.cleanRound) roundScore += 5; // bonus

  game.score += roundScore;
  saveHighScore();
  updateScoreUI();

  const bonusMsg = game.cleanRound ? ' +5 bonus!' : '';
  setStatus('Round ' + game.round + ' done! +' + roundScore + bonusMsg);

  // Advance
  game.round++;
  game.retriesLeft = game.MAX_RETRIES;
  game.cleanRound  = true;

  game.pendingTimeout = setTimeout(startRound, 1200);
}

/* ─── Game Over ──────────────────────────────────────────────── */
function showGameOver() {
  game.isGameOver = true;
  setStationsDisabled(true);
  setGnomePosition(GNOME_CENTER);
  clearStationClasses();

  const roundsReached = game.round;
  const stars = starsForScore(game.score);
  const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  elGoScore.textContent  = game.score;
  elGoRounds.textContent = roundsReached;
  elGoHi.textContent     = game.highScore;
  elGoStars.textContent  = starStr;

  if (stars === 3)      elGoEmoji.textContent = '🏆';
  else if (stars === 2) elGoEmoji.textContent = '🌟';
  else if (stars === 1) elGoEmoji.textContent = '🌸';
  else                  elGoEmoji.textContent = '🌾';

  elGameoverOverlay.hidden = false;
}

/* ─── Init / Reset ───────────────────────────────────────────── */
function initGame() {
  // Cancel any pending delayed callbacks from the previous game
  if (game.pendingTimeout !== null) {
    clearTimeout(game.pendingTimeout);
    game.pendingTimeout = null;
  }

  game.sequence    = [];
  game.playerPos   = 0;
  game.round       = 1;
  game.score       = 0;
  game.retriesLeft = game.MAX_RETRIES;
  game.cleanRound  = true;
  game.isPlayback  = false;
  game.isGameOver  = false;

  // Reset decorations
  document.querySelectorAll('.deco').forEach(el => {
    el.classList.remove('deco--visible');
  });

  clearStationClasses();
  setGnomePosition(GNOME_CENTER);
  showProgress(false);
  updateScoreUI();
  updatePips();
  setStatus('');
}

function startGame() {
  elStartOverlay.hidden    = true;
  elGameoverOverlay.hidden = true;
  initGame();
  startRound();
}

/* ─── Event listeners ────────────────────────────────────────── */
stations.forEach((station, idx) => {
  station.addEventListener('click', () => handleStationClick(idx));
  // Prevent double-tap zoom on mobile
  station.addEventListener('touchend', e => e.preventDefault(), { passive: false });
});

elBtnStart.addEventListener('click', startGame);
elBtnPlayAgain.addEventListener('click', startGame);

/* ─── Boot ───────────────────────────────────────────────────── */
loadHighScore();
// Start overlay is visible by default (no hidden attr)
