# mini-gamo — Project Instructions

## Project Overview

**mini-gamo** is a cozy web platform hosting a collection of browser-based mini games. The aesthetic is warm, cozy, and welcoming — think soft creams, warm ambers, and gentle rounded UI.

## Goals

- Build a growing library of fun, lightweight mini games playable in the browser
- Each game should be completable in under 5 minutes
- No accounts, no installs — just click and play
- Visual identity: cozy, warm-light, inviting

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Games**: HTML Canvas or DOM-based — keep dependencies minimal
- **No build step required** — files should run directly in a browser

## Project Structure

```
mini-game-comp/
├── CLAUDE.md               ← You are here
├── agents/
│   ├── idea-agent.md       ← Instructions for the Idea Agent
│   ├── dev-agent.md        ← Instructions for the Dev Agent
│   └── test-agent.md       ← Instructions for the Test Agent
├── src/
│   ├── index.html          ← Homepage
│   ├── styles/
│   │   └── main.css
│   └── scripts/
│       └── main.js
└── games/
    └── <game-slug>/        ← One folder per game
        ├── index.html
        ├── game.js
        └── style.css
```

## Agent Workflow

Three specialized agents collaborate to ship each game:

```
Idea Agent  →  Dev Agent  →  Test Agent  →  Ship
```

1. **Idea Agent** (`agents/idea-agent.md`) — Generates game concepts and hands off a design brief
2. **Dev Agent** (`agents/dev-agent.md`) — Implements the game from the brief
3. **Test Agent** (`agents/test-agent.md`) — Validates playability, bugs, and UX

## Design System

| Token       | Value                        |
|-------------|------------------------------|
| Background  | `#FFF8F0` (warm cream)       |
| Surface     | `#FFFDF8` (light parchment)  |
| Primary     | `#E8813A` (warm amber)       |
| Secondary   | `#C9956B` (muted terracotta) |
| Text        | `#3D2C1E` (dark brown)       |
| Muted text  | `#8C6E5A` (warm gray-brown)  |
| Accent      | `#F2C078` (golden yellow)    |
| Border      | `#E8D5C4` (soft beige)       |
| Font        | `'Nunito'` (body), `'Fredoka One'` (display) |
| Border radius | `12px` (cards), `8px` (buttons) |
| Shadow      | `0 2px 12px rgba(180,120,60,0.10)` |

## Coding Standards

- No frameworks unless the Dev Agent has a strong reason — keep it vanilla
- Each game must be fully self-contained in its `games/<slug>/` folder
- Games must work offline (no CDN calls at runtime)
- CSS variables for all design tokens (inherit from `src/styles/main.css`)
- Mobile-first responsive layout
- Aim for < 200KB total per game (assets included)

## Adding a New Game

1. Idea Agent produces a brief in `games/<slug>/BRIEF.md`
2. Dev Agent implements the game in `games/<slug>/`
3. Test Agent writes a checklist to `games/<slug>/TEST_REPORT.md`
4. Add a card to `src/index.html` game grid pointing to `games/<slug>/index.html`
