/* ===================================================================
   Seed Planner — game.js
   Vanilla JS, no frameworks, no console.log in production.
=================================================================== */

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────
  const GRID_SIZE   = 5;
  const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
  const MAX_TURNS   = 20;
  const HAND_SIZE   = 4;
  const LS_KEY      = 'seedplanner_hi';

  const CROPS = [
    { id: 'tomato',    emoji: '🍅', weight: 20 },
    { id: 'sunflower', emoji: '🌻', weight: 20 },
    { id: 'pumpkin',   emoji: '🎃', weight: 20 },
    { id: 'herb',      emoji: '🌿', weight: 20 },
    { id: 'berry',     emoji: '🫐', weight: 20 },
  ];

  // ── Mutable state (single object) ───────────────────────────────
  const game = {
    grid:        [],   // length 25, each entry: null | cropId string
    hand:        [],   // length up to HAND_SIZE, each: { id, emoji } | null
    selectedIdx: null, // index into hand of selected tile, or null
    score:       0,
    turns:       MAX_TURNS,
    over:        false,
    bag:         [],   // weighted draw bag
  };

  // ── DOM refs ────────────────────────────────────────────────────
  const gridContainer   = document.getElementById('grid-container');
  const handRow         = document.getElementById('hand-row');
  const scoreDisplay    = document.getElementById('score-display');
  const turnsDisplay    = document.getElementById('turns-display');
  const progressBar     = document.getElementById('progress-bar');
  const scorePopupsEl   = document.getElementById('score-popups');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const overlayEmoji    = document.getElementById('overlay-emoji');
  const overlayStars    = document.getElementById('overlay-stars');
  const overlayScore    = document.getElementById('overlay-score');
  const overlayHi       = document.getElementById('overlay-hi');
  const btnPlayAgain    = document.getElementById('btn-play-again');

  // ── Weighted-random bag ──────────────────────────────────────────
  function refillBag() {
    game.bag = [];
    CROPS.forEach(c => {
      for (let w = 0; w < c.weight; w++) {
        game.bag.push(c.id);
      }
    });
    shuffleArray(game.bag);
  }

  function drawFromBag() {
    if (game.bag.length === 0) refillBag();
    return game.bag.pop();
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function cropById(id) {
    return CROPS.find(c => c.id === id);
  }

  // ── Initialise ──────────────────────────────────────────────────
  function init() {
    game.grid        = new Array(TOTAL_CELLS).fill(null);
    game.hand        = [];
    game.selectedIdx = null;
    game.score       = 0;
    game.turns       = MAX_TURNS;
    game.over        = false;
    game.bag         = [];

    refillBag();

    // Fill hand
    for (let i = 0; i < HAND_SIZE; i++) {
      const id = drawFromBag();
      game.hand.push({ id, emoji: cropById(id).emoji });
    }

    buildGridDOM();
    renderAll();
    gameOverOverlay.hidden = true;
  }

  // ── Build grid DOM (once) ────────────────────────────────────────
  function buildGridDOM() {
    gridContainer.innerHTML = '';
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.idx = i;
      cell.setAttribute('role', 'gridcell');
      cell.addEventListener('click', () => onCellClick(i));
      gridContainer.appendChild(cell);
    }
  }

  // ── Render helpers ───────────────────────────────────────────────
  function renderAll() {
    renderGrid();
    renderHand();
    renderHUD();
  }

  function renderGrid() {
    const cells = gridContainer.querySelectorAll('.grid-cell');
    const hasSelection = game.selectedIdx !== null;

    cells.forEach((cell, i) => {
      const cropId = game.grid[i];

      // Reset classes (keep base + harvesting if animating)
      if (!cell.classList.contains('grid-cell--harvesting')) {
        cell.className = 'grid-cell';
      }

      if (cropId) {
        cell.classList.add('grid-cell--occupied');
        cell.textContent = cropById(cropId).emoji;
        cell.setAttribute('aria-label', cropById(cropId).id);
      } else {
        cell.textContent = '';
        cell.setAttribute('aria-label', 'empty');
        if (hasSelection) {
          cell.classList.add('grid-cell--target');
        }
      }
    });
  }

  function renderHand() {
    handRow.innerHTML = '';
    for (let i = 0; i < HAND_SIZE; i++) {
      const tile = game.hand[i];
      const el = document.createElement('div');

      if (!tile) {
        el.className = 'hand-tile hand-tile--empty';
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.className = 'hand-tile';
        el.textContent = tile.emoji;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `${tile.id} crop tile`);
        el.setAttribute('tabindex', '0');
        if (game.selectedIdx === i) {
          el.classList.add('hand-tile--selected');
        }
        el.addEventListener('click', () => onTileClick(i));
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTileClick(i);
          }
        });
      }
      handRow.appendChild(el);
    }
  }

  function renderHUD() {
    scoreDisplay.textContent = game.score;
    turnsDisplay.textContent = game.turns;
    const pct = (game.turns / MAX_TURNS) * 100;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', game.turns);
  }

  // ── Interaction handlers ─────────────────────────────────────────
  function onTileClick(idx) {
    if (game.over) return;
    if (game.hand[idx] === null) return;

    if (game.selectedIdx === idx) {
      // Deselect
      game.selectedIdx = null;
    } else {
      game.selectedIdx = idx;
    }
    renderAll();
  }

  function onCellClick(idx) {
    if (game.over) return;
    if (game.selectedIdx === null) return;
    if (game.grid[idx] !== null) return; // cell occupied

    // Place tile
    const tile = game.hand[game.selectedIdx];
    game.grid[idx] = tile.id;
    game.hand[game.selectedIdx] = null;
    game.selectedIdx = null;
    game.turns -= 1;

    renderHUD();
    renderGrid();
    renderHand();

    // Resolve harvests (may chain)
    resolveHarvests(() => {
      refillHand();

      if (game.turns === 0) {
        endGame();
      }
    });
  }

  // ── Escape key ───────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !game.over) {
      game.selectedIdx = null;
      renderAll();
    }
  });

  // ── Harvest logic ────────────────────────────────────────────────
  /**
   * Find all groups of 3+ orthogonally-connected same-crop cells.
   * Returns array of arrays of cell indices.
   */
  function findHarvestGroups() {
    const visited = new Array(TOTAL_CELLS).fill(false);
    const groups  = [];

    for (let start = 0; start < TOTAL_CELLS; start++) {
      if (visited[start] || game.grid[start] === null) continue;

      const cropId = game.grid[start];
      const group  = [];
      const queue  = [start];

      while (queue.length > 0) {
        const idx = queue.shift();
        if (visited[idx]) continue;
        if (game.grid[idx] !== cropId) continue;
        visited[idx] = true;
        group.push(idx);

        for (const nb of neighbors(idx)) {
          if (!visited[nb] && game.grid[nb] === cropId) {
            queue.push(nb);
          }
        }
      }

      if (group.length >= 3) {
        groups.push(group);
      }
    }

    return groups;
  }

  function neighbors(idx) {
    const row = Math.floor(idx / GRID_SIZE);
    const col = idx % GRID_SIZE;
    const nb  = [];
    if (row > 0)             nb.push(idx - GRID_SIZE);
    if (row < GRID_SIZE - 1) nb.push(idx + GRID_SIZE);
    if (col > 0)             nb.push(idx - 1);
    if (col < GRID_SIZE - 1) nb.push(idx + 1);
    return nb;
  }

  /**
   * resolveHarvests: animate then remove groups, chain if needed.
   * Calls `done` callback when fully resolved.
   */
  function resolveHarvests(done) {
    const groups = findHarvestGroups();

    if (groups.length === 0) {
      done();
      return;
    }

    const cellEls = gridContainer.querySelectorAll('.grid-cell');
    let pendingAnimations = 0;

    groups.forEach(group => {
      const groupScore = group.length * group.length;
      game.score += groupScore;

      // Score popup at centroid of group
      showScorePopup(group, groupScore);

      group.forEach(idx => {
        const el = cellEls[idx];
        el.classList.add('grid-cell--harvesting');
        pendingAnimations++;

        el.addEventListener('animationend', function handler() {
          el.removeEventListener('animationend', handler);
          el.classList.remove('grid-cell--harvesting');
          game.grid[idx] = null;
          el.className = 'grid-cell';
          el.textContent = '';

          pendingAnimations--;
          if (pendingAnimations === 0) {
            // Update displays mid-resolve
            renderHUD();
            renderGrid();

            // Chain: check for new groups created after clearing
            resolveHarvests(done);
          }
        }, { once: true });
      });
    });
  }

  // ── Score popup ──────────────────────────────────────────────────
  function showScorePopup(group, pts) {
    const popupsRect = scorePopupsEl.getBoundingClientRect();
    const cellEls    = gridContainer.querySelectorAll('.grid-cell');

    // Average position of group cells
    let totalX = 0;
    let totalY = 0;
    group.forEach(idx => {
      const r = cellEls[idx].getBoundingClientRect();
      totalX += r.left + r.width / 2;
      totalY += r.top  + r.height / 2;
    });
    const avgX = totalX / group.length;
    const avgY = totalY / group.length;

    const x = avgX - popupsRect.left;
    const y = avgY - popupsRect.top;

    const popup = document.createElement('div');
    popup.className  = 'score-popup';
    popup.textContent = '+' + pts;
    popup.style.left = x + 'px';
    popup.style.top  = y + 'px';
    scorePopupsEl.appendChild(popup);

    popup.addEventListener('animationend', () => popup.remove(), { once: true });
  }

  // ── Refill hand ──────────────────────────────────────────────────
  function refillHand() {
    for (let i = 0; i < HAND_SIZE; i++) {
      if (game.hand[i] === null) {
        const id = drawFromBag();
        game.hand[i] = { id, emoji: cropById(id).emoji };
      }
    }
    renderHand();
  }

  // ── Game over ────────────────────────────────────────────────────
  function endGame() {
    game.over = true;

    // Check full-clear bonus
    const hasTilesLeft = game.grid.some(c => c !== null);
    if (!hasTilesLeft) {
      game.score += 50;
    }

    // Star rating
    let stars = 0;
    if (game.score >= 500)      stars = 3;
    else if (game.score >= 250) stars = 2;
    else if (game.score >= 100) stars = 1;

    // High score
    let hi = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    if (game.score > hi) {
      hi = game.score;
      localStorage.setItem(LS_KEY, hi);
    }

    // Emoji for result
    const emojis = ['🌾', '🌾', '🌻', '🏆'];
    overlayEmoji.textContent  = emojis[stars];
    overlayStars.textContent  = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆';
    overlayScore.textContent  = game.score;
    overlayHi.textContent     = hi;

    // Apply star color to stars element
    overlayStars.style.color = stars > 0 ? 'var(--color-accent)' : 'var(--color-border)';

    renderHUD();
    gameOverOverlay.hidden = false;
  }

  // ── Play again button ────────────────────────────────────────────
  btnPlayAgain.addEventListener('click', () => {
    gameOverOverlay.hidden = true;
    init();
  });

  // ── Kick off ─────────────────────────────────────────────────────
  init();

})();
