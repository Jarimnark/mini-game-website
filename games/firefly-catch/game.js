'use strict';

/* ════════════════════════════════════════════════════════════════
   Firefly Catch — game.js
   Single const game object holds all mutable state.
   rAF loop drives the tick; cancelled on game end.
   ════════════════════════════════════════════════════════════════ */

const game = {
  /* ── State ──────────────────────────────────────────────────── */
  running:      false,
  paused:       false,
  rafId:        null,

  score:        0,
  pips:         5,
  wave:         1,
  highScore:    0,

  waveTimeLeft: 20000,   // ms remaining in current wave
  waveActive:   false,
  interlude:    false,
  interludeTimer: 0,

  lastTs:       0,       // previous rAF timestamp

  fireflies:    [],      // active firefly objects

  /* ── Difficulty params (scale per wave) ─────────────────────── */
  spawnInterval:   1800, // ms between spawns
  spawnTimer:      0,
  litWindowMin:    800,  // ms min lit window
  litWindowMax:    1800, // ms max lit window
  riseTime:        400,  // ms to pulse in
  fadeTime:        400,  // ms to fade out

  /* ── DOM refs (populated on init) ──────────────────────────── */
  els: {
    meadow:       null,
    starLayer:    null,
    scoreVal:     null,
    waveVal:      null,
    pipsRow:      null,
    timerBar:     null,
    startScreen:  null,
    interScreen:  null,
    overScreen:   null,
    interWave:    null,
    finalScore:   null,
    highScoreEl:  null,
    starsDisplay: null,
    playAgainBtn: null,
    startBtn:     null,
  },
};

/* ════════════════════════════════════════════════════════════════
   Bootstrap
   ════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);

function init() {
  /* Cache DOM */
  game.els.meadow       = document.getElementById('meadow');
  game.els.starLayer    = document.getElementById('star-layer');
  game.els.scoreVal     = document.getElementById('score-val');
  game.els.waveVal      = document.getElementById('wave-val');
  game.els.pipsRow      = document.getElementById('pips-row');
  game.els.timerBar     = document.getElementById('timer-bar');
  game.els.startScreen  = document.getElementById('screen-start');
  game.els.interScreen  = document.getElementById('screen-inter');
  game.els.overScreen   = document.getElementById('screen-over');
  game.els.interWave    = document.getElementById('inter-wave-num');
  game.els.finalScore   = document.getElementById('final-score');
  game.els.highScoreEl  = document.getElementById('high-score-val');
  game.els.starsDisplay = document.getElementById('stars-display');
  game.els.playAgainBtn = document.getElementById('btn-play-again');
  game.els.startBtn     = document.getElementById('btn-start');

  /* Load high score */
  game.highScore = parseInt(localStorage.getItem('firefly-catch-hs') || '0', 10);

  /* Build static star field */
  buildStars(60);

  /* Build pip UI */
  buildPips();

  /* Button listeners */
  game.els.startBtn.addEventListener('click', startGame);
  game.els.playAgainBtn.addEventListener('click', startGame);

  /* Tab visibility pause */
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* Show start screen */
  showScreen(game.els.startScreen);
}

/* ════════════════════════════════════════════════════════════════
   Star field
   ════════════════════════════════════════════════════════════════ */
function buildStars(count) {
  const layer = game.els.starLayer;
  layer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = rand(1, 3);
    s.style.width  = size + 'px';
    s.style.height = size + 'px';
    s.style.left   = rand(0, 100) + '%';
    s.style.top    = rand(0, 100) + '%';
    s.style.setProperty('--star-duration', rand(2, 5).toFixed(1) + 's');
    s.style.setProperty('--star-delay',    rand(0, 4).toFixed(1) + 's');
    layer.appendChild(s);
  }
}

/* ════════════════════════════════════════════════════════════════
   Pip UI
   ════════════════════════════════════════════════════════════════ */
function buildPips() {
  const row = game.els.pipsRow;
  row.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip';
    pip.dataset.idx = i;
    row.appendChild(pip);
  }
}

function updatePips() {
  const pips = game.els.pipsRow.querySelectorAll('.pip');
  pips.forEach((pip, i) => {
    if (i < game.pips) {
      pip.classList.remove('pip--empty');
    } else {
      pip.classList.add('pip--empty');
    }
  });
  game.els.pipsRow.setAttribute('aria-valuenow', Math.max(0, game.pips));
}

function shakePip() {
  const pips = game.els.pipsRow.querySelectorAll('.pip');
  /* Shake the pip that was just lost */
  const idx = game.pips; // already decremented, so this is the newly lost one
  if (pips[idx]) {
    pips[idx].classList.remove('pip--shake');
    /* Force reflow so animation restarts */
    void pips[idx].offsetWidth;
    pips[idx].classList.add('pip--shake');
  }
}

/* ════════════════════════════════════════════════════════════════
   Game flow
   ════════════════════════════════════════════════════════════════ */
function startGame() {
  /* Reset state */
  game.score        = 0;
  game.pips         = 5;
  game.wave         = 1;
  game.waveTimeLeft = 20000;
  game.waveActive   = true;
  game.interlude    = false;
  game.interludeTimer = 0;
  game.spawnInterval  = 1800;
  game.spawnTimer     = 0;
  game.litWindowMin   = 800;
  game.litWindowMax   = 1800;
  game.riseTime       = 400;
  game.fadeTime       = 400;
  game.lastTs         = 0;
  game.running        = true;
  game.paused         = false;

  /* Clear any leftover fireflies */
  clearFireflies();

  /* Refresh UI */
  updateScore();
  updateWave();
  updatePips();
  updateTimerBar(1);

  /* Hide all screens */
  hideAllScreens();

  /* Start loop */
  if (game.rafId) cancelAnimationFrame(game.rafId);
  game.rafId = requestAnimationFrame(tick);
}

function endGame() {
  game.running    = false;
  game.waveActive = false;

  /* Cancel loop */
  if (game.rafId) {
    cancelAnimationFrame(game.rafId);
    game.rafId = null;
  }

  /* Clear remaining fireflies without penalty */
  clearFireflies();

  /* Save high score */
  if (game.score > game.highScore) {
    game.highScore = game.score;
    localStorage.setItem('firefly-catch-hs', game.highScore);
  }

  /* Populate game-over screen */
  game.els.finalScore.textContent  = game.score;
  game.els.highScoreEl.textContent = game.highScore;
  game.els.starsDisplay.innerHTML  = buildStarHTML(game.score);

  showScreen(game.els.overScreen);
}

function advanceWave() {
  game.waveActive   = false;
  game.interlude    = true;
  game.interludeTimer = 2000;

  /* Show inter-wave screen */
  game.els.interWave.textContent = game.wave + 1;
  showScreen(game.els.interScreen);
}

function beginNextWave() {
  game.wave++;
  game.waveTimeLeft = 20000;
  game.waveActive   = true;
  game.interlude    = false;
  game.spawnTimer   = 0;

  /* Tighten difficulty */
  game.spawnInterval = Math.max(600,  game.spawnInterval - 150);
  game.litWindowMin  = Math.max(350,  game.litWindowMin  - 50);
  game.litWindowMax  = Math.max(700,  game.litWindowMax  - 100);
  game.riseTime      = Math.max(200,  game.riseTime      - 20);
  game.fadeTime      = Math.max(200,  game.fadeTime       - 20);

  updateWave();
  updateTimerBar(1);
  hideAllScreens();
}

/* ════════════════════════════════════════════════════════════════
   Main rAF tick
   ════════════════════════════════════════════════════════════════ */
function tick(ts) {
  if (!game.running) return;
  if (game.paused) {
    game.rafId = requestAnimationFrame(tick);
    return;
  }

  const dt = game.lastTs ? ts - game.lastTs : 16;
  game.lastTs = ts;

  if (game.interlude) {
    /* Countdown to next wave */
    game.interludeTimer -= dt;
    if (game.interludeTimer <= 0) {
      beginNextWave();
    }
  } else if (game.waveActive) {
    /* Update wave timer */
    game.waveTimeLeft -= dt;
    updateTimerBar(game.waveTimeLeft / 20000);

    /* Spawn new fireflies */
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnFirefly();
      game.spawnTimer = game.spawnInterval + rand(-200, 200);
    }

    /* Tick all fireflies */
    tickFireflies(dt);

    /* Wave complete? */
    if (game.waveTimeLeft <= 0) {
      advanceWave();
    }
  }

  game.rafId = requestAnimationFrame(tick);
}

/* ════════════════════════════════════════════════════════════════
   Firefly lifecycle
   ════════════════════════════════════════════════════════════════ */
function spawnFirefly() {
  const meadow = game.els.meadow;
  const mw = meadow.clientWidth;
  const mh = meadow.clientHeight;

  /* Keep away from edges for better playability */
  const margin = 44;
  const x = rand(margin, mw - margin);
  const y = rand(margin, mh - margin);

  const litWindow = rand(game.litWindowMin, game.litWindowMax);

  const ff = {
    id:      Math.random().toString(36).slice(2),
    x, y,
    phase:   'rising',      // rising | lit | fading | dead
    timer:   game.riseTime,
    litTime: litWindow,
    el:      null,
    dotEl:   null,
  };

  /* Build element */
  const el = document.createElement('div');
  el.className = 'firefly firefly--rising';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.setProperty('--ff-rise', game.riseTime + 'ms');
  el.style.setProperty('--ff-fade', game.fadeTime + 'ms');

  const dot = document.createElement('div');
  dot.className = 'firefly__dot';
  el.appendChild(dot);

  /* Click / tap handler */
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    catchFirefly(ff);
  });

  meadow.appendChild(el);
  ff.el    = el;
  ff.dotEl = dot;

  game.fireflies.push(ff);
}

function tickFireflies(dt) {
  for (let i = game.fireflies.length - 1; i >= 0; i--) {
    const ff = game.fireflies[i];
    if (ff.phase === 'dead') {
      game.fireflies.splice(i, 1);
      continue;
    }

    ff.timer -= dt;

    if (ff.phase === 'rising' && ff.timer <= 0) {
      /* Transition to lit */
      ff.phase = 'lit';
      ff.timer = ff.litTime;
      setFireflyPhase(ff, 'lit');
    } else if (ff.phase === 'lit' && ff.timer <= 0) {
      /* Missed — fade and drain pip */
      ff.phase = 'fading';
      ff.timer = game.fadeTime;
      setFireflyPhase(ff, 'fading');
      missFirefly(ff);
    } else if (ff.phase === 'fading' && ff.timer <= 0) {
      /* Remove from DOM */
      ff.phase = 'dead';
      if (ff.el && ff.el.parentNode) {
        ff.el.parentNode.removeChild(ff.el);
      }
      game.fireflies.splice(i, 1);
    }
  }
}

function setFireflyPhase(ff, phase) {
  if (!ff.el) return;
  ff.el.classList.remove('firefly--rising', 'firefly--lit', 'firefly--fading');
  ff.el.classList.add('firefly--' + phase);
  /* Restart CSS animation on the dot */
  const dot = ff.dotEl;
  dot.style.animation = 'none';
  void dot.offsetWidth;
  dot.style.animation = '';
}

function catchFirefly(ff) {
  if (ff.phase !== 'rising' && ff.phase !== 'lit') return;
  if (ff.phase === 'dead') return;

  ff.phase = 'dead';

  /* Remove element */
  if (ff.el && ff.el.parentNode) {
    ff.el.parentNode.removeChild(ff.el);
  }

  /* Score */
  game.score++;
  updateScore();

  /* Sparkle burst */
  spawnSparks(ff.x, ff.y);
  spawnScorePop(ff.x, ff.y);
}

function missFirefly(ff) {
  if (!game.running) return;
  if (game.pips <= 0) return; // already at zero, endGame already scheduled
  game.pips--;
  shakePip();
  updatePips();

  if (game.pips <= 0) {
    setTimeout(() => {
      if (game.running) endGame();
    }, game.fadeTime + 50);
  }
}

function clearFireflies() {
  game.fireflies.forEach(ff => {
    if (ff.el && ff.el.parentNode) {
      ff.el.parentNode.removeChild(ff.el);
    }
    ff.phase = 'dead';
  });
  game.fireflies = [];
}

/* ════════════════════════════════════════════════════════════════
   Sparkle particles
   ════════════════════════════════════════════════════════════════ */
function spawnSparks(x, y) {
  const meadow   = game.els.meadow;
  const count    = randInt(6, 8);
  const container = document.createElement('div');
  container.className = 'spark-container';
  container.style.left = x + 'px';
  container.style.top  = y + 'px';

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const dist  = rand(22, 45);
    const tx    = Math.cos(angle) * dist;
    const ty    = Math.sin(angle) * dist;
    const dur   = rand(0.40, 0.65).toFixed(2);
    const size  = rand(4, 8).toFixed(0);

    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.style.width  = size + 'px';
    spark.style.height = size + 'px';
    spark.style.setProperty('--spark-tx', tx.toFixed(0) + 'px');
    spark.style.setProperty('--spark-ty', ty.toFixed(0) + 'px');
    spark.style.setProperty('--spark-dur', dur + 's');
    spark.style.animationDelay = rand(0, 0.08).toFixed(3) + 's';
    container.appendChild(spark);
  }

  meadow.appendChild(container);

  /* Self-clean after longest animation */
  setTimeout(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  }, 800);
}

function spawnScorePop(x, y) {
  const meadow = game.els.meadow;
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = '+1';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  meadow.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 800);
}

/* ════════════════════════════════════════════════════════════════
   HUD updates
   ════════════════════════════════════════════════════════════════ */
function updateScore() {
  game.els.scoreVal.textContent = game.score;
}

function updateWave() {
  game.els.waveVal.textContent = game.wave;
}

function updateTimerBar(fraction) {
  game.els.timerBar.style.width = (Math.max(0, fraction) * 100) + '%';
}

/* ════════════════════════════════════════════════════════════════
   Screen management
   ════════════════════════════════════════════════════════════════ */
function showScreen(el) {
  hideAllScreens();
  el.classList.add('screen--visible');
}

function hideAllScreens() {
  [game.els.startScreen, game.els.interScreen, game.els.overScreen].forEach(s => {
    s.classList.remove('screen--visible');
  });
}

/* ════════════════════════════════════════════════════════════════
   Star rating
   ════════════════════════════════════════════════════════════════ */
function buildStarHTML(score) {
  const earned = score >= 50 ? 3 : score >= 30 ? 2 : score >= 15 ? 1 : 0;
  let html = '';
  for (let i = 1; i <= 3; i++) {
    html += `<span class="${i <= earned ? '' : 'star--empty'}">★</span>`;
  }
  return html;
}

/* ════════════════════════════════════════════════════════════════
   Visibility / pause
   ════════════════════════════════════════════════════════════════ */
function onVisibilityChange() {
  if (!game.running) return;
  if (document.hidden) {
    game.paused = true;
  } else {
    /* Reset lastTs so dt doesn't spike after returning */
    game.lastTs = 0;
    game.paused = false;
  }
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
