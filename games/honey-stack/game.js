/* ===================================================================
   Honey Stack — game.js
   Vanilla JS, no frameworks, no console.log in production.
   Single-state object: const game = { ... }
   Timer via requestAnimationFrame (cancelled on game end).
=================================================================== */

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────
  const GAME_DURATION   = 60;       // seconds
  const NEXT_Q_DELAY    = 500;      // ms before next question loads
  const LS_KEY_SCORE    = 'honeystack_hi_score';
  const LS_KEY_STREAK   = 'honeystack_hi_streak';
  const STAR_1          = 100;
  const STAR_2          = 250;
  const STAR_3          = 500;

  /** Multiplier tiers: [minStreak, multiplier] */
  const MULT_TIERS = [
    { minStreak: 10, mult: 4 },
    { minStreak: 6,  mult: 3 },
    { minStreak: 3,  mult: 2 },
    { minStreak: 0,  mult: 1 },
  ];

  // ── Mutable state (single object) ───────────────────────────────
  const game = {
    score:         0,
    streak:        0,
    longestStreak: 0,
    timeLeft:      GAME_DURATION,
    over:          false,
    answering:     false,       // locked while animating / waiting for next Q
    rafId:         null,        // requestAnimationFrame id
    lastTimestamp: null,        // for rAF delta timing
    answers:       [],          // [answer0, answer1, answer2]
    correctIdx:    0,           // which flower index holds the correct answer
    expression:    '',          // e.g. "4 + 3"
  };

  // ── DOM refs ────────────────────────────────────────────────────
  const timerBar        = document.getElementById('timer-bar');
  const timerDisplay    = document.getElementById('timer-display');
  const scoreDisplay    = document.getElementById('score-display');
  const streakDisplay   = document.getElementById('streak-display');
  const multiplierBadge = document.getElementById('multiplier-badge');
  const multiplierValue = document.getElementById('multiplier-value');
  const expressionText  = document.getElementById('expression-text');
  const bee             = document.getElementById('bee');
  const flowerBtns      = [
    document.getElementById('flower-0'),
    document.getElementById('flower-1'),
    document.getElementById('flower-2'),
  ];
  const flowerNums      = [
    document.getElementById('flower-num-0'),
    document.getElementById('flower-num-1'),
    document.getElementById('flower-num-2'),
  ];
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const overlayEmoji    = document.getElementById('overlay-emoji');
  const overlayStars    = document.getElementById('overlay-stars');
  const overlayScore    = document.getElementById('overlay-score');
  const overlayStreak   = document.getElementById('overlay-streak');
  const overlayHi       = document.getElementById('overlay-hi');
  const btnPlayAgain    = document.getElementById('btn-play-again');

  // ── Utility helpers ──────────────────────────────────────────────
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ── Question generation ──────────────────────────────────────────
  /**
   * Returns { expression, answer } for the current difficulty phase.
   *   0–20 s  → addition only
   *  20–40 s  → addition + subtraction
   *  40–60 s  → addition + subtraction + ×2/×3 multiplication
   */
  function generateQuestion() {
    const elapsed = GAME_DURATION - game.timeLeft;
    const opPool  = ['add'];

    if (elapsed >= 20) opPool.push('sub');
    if (elapsed >= 40) opPool.push('mul');

    const op = opPool[randInt(0, opPool.length - 1)];
    let a, b, answer, expression;

    if (op === 'add') {
      a = randInt(1, 10);
      b = randInt(1, 10);
      // Keep sum ≤ 20
      while (a + b > 20) { a = randInt(1, 9); b = randInt(1, 9); }
      answer = a + b;
      expression = a + ' + ' + b;

    } else if (op === 'sub') {
      a = randInt(2, 15);
      b = randInt(1, a);   // b ≤ a so result ≥ 0
      answer = a - b;
      expression = a + ' − ' + b;

    } else {
      // mul: factors ≤ 5, at least one is 2 or 3
      a = randInt(2, 5);
      b = randInt(2, 5);
      answer = a * b;
      expression = a + ' × ' + b;
    }

    return { expression, answer };
  }

  /**
   * Build three distinct distractor values around `correct`.
   * Distractors are ±1–3 of correct but never equal to it or each other.
   * Returns [val0, val1, val2] where one random position holds correct.
   */
  function buildAnswers(correct) {
    const pool = new Set();
    const attempts = ['add', 'sub'];
    let tries = 0;

    while (pool.size < 2 && tries < 40) {
      tries++;
      const direction = attempts[tries % 2];
      const delta = randInt(1, 3);
      const candidate = direction === 'add' ? correct + delta : correct - delta;
      if (candidate !== correct && candidate >= 0 && !pool.has(candidate)) {
        pool.add(candidate);
      }
    }

    // Fallback: if we couldn't get 2 distinct distractors, use +1 and +2 or -1
    if (pool.size < 2) {
      pool.add(correct + 1);
      if (pool.size < 2) pool.add(correct + 2);
    }

    const distractors = Array.from(pool).slice(0, 2);
    const positions = [correct, distractors[0], distractors[1]];
    shuffleArray(positions);

    const correctIdx = positions.indexOf(correct);
    return { answers: positions, correctIdx };
  }

  // ── Load next question ───────────────────────────────────────────
  function loadQuestion() {
    if (game.over) return;

    const { expression, answer } = generateQuestion();
    const { answers, correctIdx } = buildAnswers(answer);

    game.expression  = expression;
    game.answers     = answers;
    game.correctIdx  = correctIdx;
    game.answering   = false;

    // Update UI
    expressionText.textContent = expression;
    flowerNums.forEach((el, i) => { el.textContent = answers[i]; });

    // Clear any result classes on flowers
    flowerBtns.forEach(btn => {
      btn.disabled = false;
      btn.className = 'flower';
    });

    // Bee fly-in animation
    triggerBeeAnimation('flying-in');
  }

  // ── Answer handling ──────────────────────────────────────────────
  function onFlowerClick(idx) {
    if (game.over || game.answering) return;
    game.answering = true;

    // Disable all flowers immediately
    flowerBtns.forEach(btn => { btn.disabled = true; });

    if (idx === game.correctIdx) {
      handleCorrect(idx);
    } else {
      handleWrong(idx);
    }
  }

  function handleCorrect(idx) {
    // Increment streak first so the tier-crossing answer earns the new multiplier
    game.streak += 1;
    if (game.streak > game.longestStreak) {
      game.longestStreak = game.streak;
    }
    const mult = getMultiplier();
    game.score  += 10 * mult;

    renderHUD();

    // Visual feedback
    flowerBtns[idx].classList.add('flower--correct');
    triggerBeeAnimation('landing');
    spawnHoneyDrops();

    setTimeout(loadQuestion, NEXT_Q_DELAY);
  }

  function handleWrong(idx) {
    game.streak = 0;
    renderHUD();

    // Show wrong on clicked flower
    flowerBtns[idx].classList.add('flower--wrong');
    // Briefly highlight correct answer
    flowerBtns[game.correctIdx].classList.add('flower--reveal');
    triggerBeeAnimation('tumbling');

    setTimeout(loadQuestion, NEXT_Q_DELAY + 100);
  }

  // ── Multiplier ───────────────────────────────────────────────────
  function getMultiplier() {
    for (const tier of MULT_TIERS) {
      if (game.streak >= tier.minStreak) return tier.mult;
    }
    return 1;
  }

  // ── Bee animation helper ─────────────────────────────────────────
  function triggerBeeAnimation(type) {
    // Remove all bee state classes
    bee.classList.remove('bee--flying-in', 'bee--landing', 'bee--tumbling');
    // Force reflow so animation restarts
    void bee.offsetWidth;
    bee.classList.add('bee--' + type);

    bee.addEventListener('animationend', function handler() {
      bee.removeEventListener('animationend', handler);
      bee.classList.remove('bee--' + type);
    }, { once: true });
  }

  // ── Honey drop particles ─────────────────────────────────────────
  function spawnHoneyDrops() {
    const beeStage = document.getElementById('bee-stage');
    const beeRect  = bee.getBoundingClientRect();
    const stageRect = beeStage.getBoundingClientRect();

    for (let i = 0; i < 5; i++) {
      const drop = document.createElement('div');
      drop.className = 'honey-drop';
      const x = (beeRect.left - stageRect.left) + randInt(10, beeRect.width - 10);
      const y = (beeRect.top  - stageRect.top)  + randInt(30, beeRect.height);
      drop.style.left = x + 'px';
      drop.style.top  = y + 'px';
      drop.style.animationDelay = (i * 80) + 'ms';
      beeStage.style.position = 'relative';
      beeStage.appendChild(drop);
      drop.addEventListener('animationend', () => drop.remove(), { once: true });
    }
  }

  // ── Render HUD ───────────────────────────────────────────────────
  function renderHUD() {
    scoreDisplay.textContent  = game.score;
    streakDisplay.textContent = game.streak;

    const mult = getMultiplier();
    multiplierValue.textContent = mult;

    // Tier badge
    let tier = 1;
    if (mult === 4) tier = 4;
    else if (mult === 3) tier = 3;
    else if (mult === 2) tier = 2;
    multiplierBadge.setAttribute('data-tier', tier);
  }

  // ── rAF Timer ────────────────────────────────────────────────────
  function startTimer() {
    game.lastTimestamp = null;

    function tick(timestamp) {
      if (game.over) return;

      if (game.lastTimestamp === null) {
        game.lastTimestamp = timestamp;
      }

      const delta = (timestamp - game.lastTimestamp) / 1000;
      game.lastTimestamp = timestamp;

      game.timeLeft = Math.max(0, game.timeLeft - delta);

      updateTimerUI();

      if (game.timeLeft <= 0) {
        endGame();
        return;
      }

      game.rafId = requestAnimationFrame(tick);
    }

    game.rafId = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (game.rafId !== null) {
      cancelAnimationFrame(game.rafId);
      game.rafId = null;
    }
  }

  function updateTimerUI() {
    const pct     = (game.timeLeft / GAME_DURATION) * 100;
    const seconds = Math.ceil(game.timeLeft);

    timerBar.style.width = pct + '%';
    timerBar.setAttribute('aria-valuenow', seconds);
    timerDisplay.textContent = seconds;

    // Pulse when ≤ 10 seconds
    if (game.timeLeft <= 10) {
      timerBar.classList.add('timer-bar--urgent');
    } else {
      timerBar.classList.remove('timer-bar--urgent');
    }
  }

  // ── Game over ────────────────────────────────────────────────────
  function endGame() {
    game.over = true;
    stopTimer();

    // Disable flowers
    flowerBtns.forEach(btn => { btn.disabled = true; });

    // Stars
    let stars = 0;
    if (game.score >= STAR_3)      stars = 3;
    else if (game.score >= STAR_2) stars = 2;
    else if (game.score >= STAR_1) stars = 1;

    // High score / streak via localStorage
    let hiScore  = parseInt(localStorage.getItem(LS_KEY_SCORE)  || '0', 10);
    let hiStreak = parseInt(localStorage.getItem(LS_KEY_STREAK) || '0', 10);

    if (game.score > hiScore) {
      hiScore = game.score;
      localStorage.setItem(LS_KEY_SCORE, hiScore);
    }
    if (game.longestStreak > hiStreak) {
      hiStreak = game.longestStreak;
      localStorage.setItem(LS_KEY_STREAK, hiStreak);
    }

    // Emoji per star level
    const emojis = ['🐝', '🌼', '🍯', '🏆'];
    overlayEmoji.textContent = emojis[stars];

    // Stars display
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    overlayStars.textContent = starStr;
    if (stars > 0) {
      overlayStars.classList.add('overlay-stars--earned');
    } else {
      overlayStars.classList.remove('overlay-stars--earned');
    }

    overlayScore.textContent  = game.score;
    overlayStreak.textContent = game.longestStreak;
    overlayHi.textContent     = hiScore;

    gameOverOverlay.hidden = false;
    btnPlayAgain.focus();
  }

  // ── Keyboard shortcuts (1/2/3) ───────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (game.over || game.answering) return;
    if (e.key === '1') onFlowerClick(0);
    else if (e.key === '2') onFlowerClick(1);
    else if (e.key === '3') onFlowerClick(2);
  });

  // ── Flower click listeners ───────────────────────────────────────
  flowerBtns.forEach(function (btn, idx) {
    btn.addEventListener('click', function () { onFlowerClick(idx); });
  });

  // ── Play Again ───────────────────────────────────────────────────
  btnPlayAgain.addEventListener('click', function () {
    gameOverOverlay.hidden = true;
    init();
  });

  // ── Initialise ──────────────────────────────────────────────────
  function init() {
    stopTimer();

    game.score         = 0;
    game.streak        = 0;
    game.longestStreak = 0;
    game.timeLeft      = GAME_DURATION;
    game.over          = false;
    game.answering     = false;
    game.rafId         = null;
    game.lastTimestamp = null;

    // Reset timer bar
    timerBar.style.width = '100%';
    timerBar.classList.remove('timer-bar--urgent');
    timerDisplay.textContent = GAME_DURATION;

    renderHUD();
    loadQuestion();
    startTimer();
  }

  // ── Kick off ─────────────────────────────────────────────────────
  init();

})();
