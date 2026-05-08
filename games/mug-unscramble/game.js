/* ─── Mug Unscramble — game.js ──────────────────────────────────
   Vanilla JS, no frameworks, no CDN imports at runtime.
   All mutable state lives inside the `game` object.
─────────────────────────────────────────────────────────────── */

// ─── Word list (50+ cozy words, 4–8 letters) ──────────────────
const WORD_LIST = [
  'CINNAMON', 'BLANKET', 'PUMPKIN', 'SCONE', 'COCOA', 'HONEY',
  'CANDLE', 'COZY', 'BISCUIT', 'LATTE', 'MUFFIN', 'GINGER',
  'ACORN', 'MAPLE', 'TOAST', 'CLOVER', 'HARVEST', 'AUTUMN',
  'AMBER', 'BREEZE', 'LANTERN', 'CABIN', 'HEARTH', 'EMBERS',
  'WOOLEN', 'KNIT', 'QUILT', 'PILLOW', 'KETTLE', 'PANTRY',
  'RUSTIC', 'MEADOW', 'FERN', 'HOLLY', 'WALNUT', 'HAZEL',
  'PLUM', 'JUNIPER', 'CUSTARD', 'COBBLER', 'BEESWAX', 'TALLOW',
  'YARROW', 'ROSEMARY', 'THYME', 'LAVENDER', 'CHAMOMILE', 'APRICOT',
  'YARNS', 'TRUFFLE', 'CARAMEL', 'OATMEAL', 'NUTMEG', 'VELVET',
];

const TOTAL_ROUNDS = 10;
const LS_KEY = 'mugUnscramble_hi';

// ─── Mutable game state ────────────────────────────────────────
const game = {
  words: [],           // shuffled word list for current session
  roundIndex: 0,       // 0–9
  score: 0,
  hintsLeft: 2,
  currentWord: '',     // the answer
  scrambled: [],       // array of {letter, id, used} objects
  tray: [],            // array of {letter, tileId} or null (hint slot)
  attempt: 1,          // 1, 2, or 3
  checking: false,     // lock while animating
  hintSlots: [],       // indices in tray already revealed by hint
};

// ─── DOM refs ─────────────────────────────────────────────────
const dom = {
  scoreVal:      document.getElementById('score-val'),
  roundVal:      document.getElementById('round-val'),
  hintsLeft:     document.getElementById('hints-left'),
  hintBtn:       document.getElementById('hint-btn'),
  attemptDots:   document.getElementById('attempt-dots'),
  mugContainer:  document.getElementById('mug-container'),
  mugLetters:    document.getElementById('mug-letters'),
  answerTray:    document.getElementById('answer-tray'),
  feedbackLabel: document.getElementById('feedback-label'),
  gameMain:      document.getElementById('game-main'),
  gameOver:      document.getElementById('game-over'),
  goScore:       document.getElementById('go-score'),
  goStars:       document.getElementById('go-stars'),
  goHi:          document.getElementById('go-hi'),
  playAgainBtn:  document.getElementById('play-again-btn'),
};

// ─── Utilities ─────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  let letters = word.split('');
  // keep re-shuffling until the result differs from the original
  let result;
  let tries = 0;
  do {
    result = shuffle(letters);
    tries++;
  } while (result.join('') === word && tries < 20);
  return result;
}

function getHighScore() {
  return parseInt(localStorage.getItem(LS_KEY) || '0', 10);
}

function setHighScore(val) {
  const current = getHighScore();
  if (val > current) localStorage.setItem(LS_KEY, String(val));
}

function calcStars(score) {
  if (score >= 2600) return 3;
  if (score >= 1800) return 2;
  if (score >= 800)  return 1;
  return 0;
}

function starsDisplay(n) {
  const filled = '★'.repeat(n);
  const empty  = '☆'.repeat(3 - n);
  return filled + empty;
}

// ─── Build the word pool for a session ─────────────────────────
// Pick 2 words from each length bucket (4–8 letters), then sort by
// length so difficulty scales gently over 10 rounds. Shuffling each
// bucket first ensures different words appear every session.
function buildWordPool() {
  // Group words into length buckets, each shuffled randomly
  const byLen = {};
  for (const w of shuffle(WORD_LIST)) {
    (byLen[w.length] = byLen[w.length] || []).push(w);
  }

  const pool = [];
  // 2 words per length tier: 4, 5, 6, 7, 8 letters = 10 rounds
  [4, 5, 6, 7, 8].forEach(len => {
    const bucket = byLen[len] || [];
    pool.push(...bucket.slice(0, 2));
  });

  // Safety: if any bucket was thin, top up from leftover words
  if (pool.length < TOTAL_ROUNDS) {
    const used = new Set(pool);
    for (const w of shuffle(WORD_LIST)) {
      if (!used.has(w)) { pool.push(w); used.add(w); }
      if (pool.length >= TOTAL_ROUNDS) break;
    }
  }

  // Sort ascending by length for the difficulty curve
  return pool.slice(0, TOTAL_ROUNDS).sort((a, b) => a.length - b.length);
}

// ─── Render attempt dots ────────────────────────────────────────
function renderAttemptDots() {
  dom.attemptDots.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'attempt-dot' + (i < game.attempt ? ' attempt-dot--used' : '');
    dom.attemptDots.appendChild(dot);
  }
}

// ─── Render score bar ───────────────────────────────────────────
function renderScoreBar() {
  dom.scoreVal.textContent = game.score;
  dom.roundVal.textContent = `${game.roundIndex + 1}/${TOTAL_ROUNDS}`;
  dom.hintsLeft.textContent = game.hintsLeft;
  dom.hintBtn.disabled = game.hintsLeft === 0;
}

// ─── Render the answer tray ────────────────────────────────────
function renderTray() {
  dom.answerTray.innerHTML = '';
  for (let i = 0; i < game.currentWord.length; i++) {
    const slot = document.createElement('div');
    const entry = game.tray[i];
    const isHint = game.hintSlots.includes(i);

    slot.className = 'tray-slot';
    if (isHint) slot.classList.add('tray-slot--hint-placed');
    else if (entry) slot.classList.add('tray-slot--filled');

    if (entry || isHint) {
      const letter = isHint ? game.currentWord[i] : entry.letter;
      const tile = document.createElement('button');
      tile.className = 'letter-tile';
      tile.textContent = letter;
      tile.dataset.trayIndex = i;

      if (isHint) {
        tile.classList.add('letter-tile--hint');
        tile.disabled = true;
      } else {
        tile.addEventListener('click', onTrayTileClick);
      }
      slot.appendChild(tile);
    }

    dom.answerTray.appendChild(slot);
  }
}

// ─── Build letter tiles on the mug ─────────────────────────────
function buildMugLetters() {
  dom.mugLetters.innerHTML = '';
  for (const item of game.scrambled) {
    const tile = document.createElement('button');
    tile.className = 'letter-tile' + (item.used ? ' letter-tile--used' : '');
    tile.textContent = item.letter;
    tile.dataset.tileId = item.id;
    if (!item.used) tile.addEventListener('click', onMugTileClick);
    dom.mugLetters.appendChild(tile);
  }
}

// ─── Clicking a mug tile → put it in tray ─────────────────────
function onMugTileClick(e) {
  if (game.checking) return;
  const id = parseInt(e.currentTarget.dataset.tileId, 10);
  const item = game.scrambled.find(s => s.id === id);
  if (!item || item.used) return;

  // Find first empty non-hint slot in tray
  let placed = false;
  for (let i = 0; i < game.tray.length; i++) {
    if (!game.hintSlots.includes(i) && game.tray[i] === null) {
      game.tray[i] = { letter: item.letter, tileId: id };
      item.used = true;
      placed = true;
      break;
    }
  }
  if (!placed) return;

  renderTray();
  buildMugLetters();
  checkAutoComplete();
}

// ─── Clicking a tray tile → return to mug ─────────────────────
function onTrayTileClick(e) {
  if (game.checking) return;
  const idx = parseInt(e.currentTarget.dataset.trayIndex, 10);
  if (game.hintSlots.includes(idx)) return;
  const entry = game.tray[idx];
  if (!entry) return;

  // Un-use the mug tile
  const item = game.scrambled.find(s => s.id === entry.tileId);
  if (item) item.used = false;

  game.tray[idx] = null;
  renderTray();
  buildMugLetters();
}

// ─── Auto-check when tray is full ──────────────────────────────
function checkAutoComplete() {
  const allFilled = game.tray.every((slot, i) => game.hintSlots.includes(i) || slot !== null);
  if (allFilled) evaluateAnswer();
}

function buildAnswerFromTray() {
  return game.tray.map((slot, i) => {
    if (game.hintSlots.includes(i)) return game.currentWord[i];
    return slot ? slot.letter : '';
  }).join('');
}

// ─── Evaluate answer ───────────────────────────────────────────
function evaluateAnswer() {
  if (game.checking) return;
  game.checking = true;

  const answer = buildAnswerFromTray();
  if (answer === game.currentWord) {
    onCorrect();
  } else {
    onWrong();
  }
}

function onCorrect() {
  const pts = (4 - game.attempt) * 100; // 300/200/100
  game.score += pts;
  renderScoreBar();

  dom.feedbackLabel.textContent = pts > 0 ? `+${pts} pts!` : 'Got it!';
  dom.feedbackLabel.className = 'feedback-label feedback-label--correct';

  // Mug glow + steam burst
  dom.mugContainer.classList.add('mug--correct');

  setTimeout(() => {
    dom.mugContainer.classList.remove('mug--correct');
    dom.feedbackLabel.textContent = '';
    dom.feedbackLabel.className = 'feedback-label';
    game.checking = false;
    advanceRound();
  }, 1400);
}

function onWrong() {
  // Shake tray
  dom.answerTray.classList.add('shake');
  dom.feedbackLabel.textContent = 'Not quite — try again!';
  dom.feedbackLabel.className = 'feedback-label feedback-label--wrong';

  setTimeout(() => {
    dom.answerTray.classList.remove('shake');
    resetTrayToMug();
    game.attempt++;
    renderAttemptDots();

    if (game.attempt > 3) {
      revealAnswer();
    } else {
      dom.feedbackLabel.textContent = `Attempt ${game.attempt} of 3`;
      dom.feedbackLabel.className = 'feedback-label';
      game.checking = false;
    }
  }, 550);
}

function resetTrayToMug() {
  // Return all non-hint tray letters back to mug
  for (let i = 0; i < game.tray.length; i++) {
    if (game.hintSlots.includes(i)) continue;
    const entry = game.tray[i];
    if (entry) {
      const item = game.scrambled.find(s => s.id === entry.tileId);
      if (item) item.used = false;
      game.tray[i] = null;
    }
  }
  renderTray();
  buildMugLetters();
}

function revealAnswer() {
  // 0 pts — reveal the word
  dom.feedbackLabel.textContent = `Answer: ${game.currentWord}`;
  dom.feedbackLabel.className = 'feedback-label feedback-label--reveal';

  setTimeout(() => {
    dom.feedbackLabel.textContent = '';
    dom.feedbackLabel.className = 'feedback-label';
    game.checking = false;
    advanceRound();
  }, 2000);
}

// ─── Hint logic ────────────────────────────────────────────────
function useHint() {
  if (game.hintsLeft <= 0 || game.checking) return;

  // Find first non-hinted index where tray is empty or wrong
  // Prefer positions not yet placed, earliest first
  let targetIdx = -1;
  for (let i = 0; i < game.currentWord.length; i++) {
    if (game.hintSlots.includes(i)) continue;
    // if this slot has the wrong letter or is empty — pick it
    const entry = game.tray[i];
    if (!entry || entry.letter !== game.currentWord[i]) {
      targetIdx = i;
      break;
    }
  }

  if (targetIdx === -1) return; // all positions already correct

  // If there's a tile in this slot that's wrong, return it to mug
  if (game.tray[targetIdx]) {
    const entry = game.tray[targetIdx];
    const item = game.scrambled.find(s => s.id === entry.tileId);
    if (item) item.used = false;
    game.tray[targetIdx] = null;
  }

  // Mark this slot as a hint slot (correct letter revealed)
  game.hintSlots.push(targetIdx);

  // Also mark the corresponding scrambled tile as used so it can't be re-placed
  const targetLetter = game.currentWord[targetIdx];
  // find an unused mug tile with this letter
  const mugTile = game.scrambled.find(s => !s.used && s.letter === targetLetter);
  if (mugTile) mugTile.used = true;

  game.hintsLeft--;
  renderScoreBar();
  renderTray();
  buildMugLetters();

  // Check if tray is now complete
  checkAutoComplete();
}

// ─── Advance to next round ─────────────────────────────────────
function advanceRound() {
  game.roundIndex++;
  if (game.roundIndex >= TOTAL_ROUNDS) {
    showGameOver();
    return;
  }

  // Slide old mug out, slide new one in
  dom.mugContainer.classList.add('slide-out-left');
  setTimeout(() => {
    dom.mugContainer.classList.remove('slide-out-left');
    dom.mugContainer.classList.add('slide-in-right');
    loadRound();
    // Force reflow
    dom.mugContainer.getBoundingClientRect();
    dom.mugContainer.classList.remove('slide-in-right');
    dom.mugContainer.classList.add('slide-to-center');
    setTimeout(() => dom.mugContainer.classList.remove('slide-to-center'), 500);
  }, 350);
}

// ─── Load a round ──────────────────────────────────────────────
function loadRound() {
  game.currentWord = game.words[game.roundIndex];
  game.attempt = 1;
  game.hintSlots = [];

  const letters = scrambleWord(game.currentWord);
  game.scrambled = letters.map((letter, i) => ({ letter, id: i, used: false }));
  game.tray = new Array(game.currentWord.length).fill(null);

  renderScoreBar();
  renderAttemptDots();
  renderTray();
  buildMugLetters();
  dom.feedbackLabel.textContent = '';
  dom.feedbackLabel.className = 'feedback-label';
}

// ─── Game Over screen ──────────────────────────────────────────
function showGameOver() {
  setHighScore(game.score);
  const hi = getHighScore();
  const stars = calcStars(game.score);

  dom.goScore.textContent = game.score;
  dom.goStars.textContent = starsDisplay(stars);
  dom.goHi.textContent = `Best: ${hi} pts`;

  dom.gameMain.style.display = 'none';
  dom.gameOver.classList.add('visible');
}

// ─── Play Again ────────────────────────────────────────────────
function playAgain() {
  game.words = buildWordPool();
  game.roundIndex = 0;
  game.score = 0;
  game.hintsLeft = 2;
  game.hintSlots = [];
  game.checking = false;

  dom.gameOver.classList.remove('visible');
  dom.gameMain.style.display = '';
  loadRound();
}

// ─── Event listeners ───────────────────────────────────────────
dom.hintBtn.addEventListener('click', useHint);
dom.playAgainBtn.addEventListener('click', playAgain);

// ─── Initialise ────────────────────────────────────────────────
function init() {
  game.words = buildWordPool();
  game.roundIndex = 0;
  game.score = 0;
  game.hintsLeft = 2;
  game.checking = false;
  loadRound();
}

init();
