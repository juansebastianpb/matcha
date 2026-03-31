# Matcha

A fast-paced puzzle game in the style of Panel de Pon / Tetris Attack, built with [Challenge](https://withchallenge.com) for real-money competitive matchmaking.

Matcha is a reference implementation showing how to integrate [Challenge](https://withchallenge.com) into a web-based game. Players swap blocks horizontally to form matches of 3+, earning points through combos and chains.

> This project is shared as a reference implementation. We don't accept pull requests.

## Game Modes

- **Solo** — 90-second timed rounds. Compete for high scores on the leaderboard.
- **Vs (Multiplayer)** — Two-player matches with garbage block exchange. Play online or against CPU opponents.
- **Challenge** — Skill-based matchmaking powered by [Challenge](https://withchallenge.com). Players wager and compete head-to-head with real-time score tracking and automated match settlement.

## How Challenge is Integrated

Matcha uses the [Challenge](https://withchallenge.com) SDK to add competitive matchmaking to the game:

- **`<challenge-button>`** — A custom element on the landing page that launches Challenge matchmaking with one click.
- **Challenge Widget** — Handles player authentication, wallet management, and match creation. Loaded via `src/services/challengeWidget.ts`.
- **Match Flow** — When Challenge finds a match, both players are routed to `/challenge` where a real-time Phaser game session starts over Supabase Realtime.
- **Settlement** — After a match ends, the server calls the Challenge API to settle the wager. See `server/index.ts` for the settlement endpoint.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Game Engine**: Phaser 3 (rendering at 60fps, game logic at 15fps)
- **State**: Zustand stores for UI state, deterministic engine with rollback support
- **Backend**: Express server for Challenge match settlement
- **Multiplayer**: Supabase Realtime for game state sync, seeded PRNG for deterministic block generation
- **Matchmaking**: [Challenge](https://withchallenge.com) for skill-based competitive matches

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (optional — the game works without it, but multiplayer/auth/leaderboard features are disabled)
- A [Challenge](https://withchallenge.com) game ID and API key (optional — needed for Challenge matchmaking mode)

### Setup

```bash
git clone https://github.com/juansebastianpb/matcha.git
cd matcha
npm install
```

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CHALLENGE_GAME_ID=your-challenge-game-id
VITE_CHALLENGE_API_KEY=your-challenge-api-key
```

### Run

```bash
# Frontend dev server
npm run dev

# Backend server (in a separate terminal)
cd server
npm install
cp .env.example .env  # then fill in CHALLENGE_API_KEY
npm run dev
```

### Build

```bash
npm run build
```

## Project Structure

```
src/
  game/
    engine/       # Deterministic game engine (adapted from panel-league, MIT)
    scenes/       # Phaser scenes (solo, vs, challenge)
  pages/          # React pages (Landing, Play, Vs, Challenge)
  services/       # Supabase auth, matchmaking, Challenge widget
  stores/         # Zustand state stores
server/           # Express server for Challenge settlement
supabase/         # Database migrations
```

## Credits

- Game engine adapted from [panel-league](https://github.com/jynnie/panel-league) (MIT License)
- Built with [Challenge](https://withchallenge.com)

## License

[MIT](LICENSE)
