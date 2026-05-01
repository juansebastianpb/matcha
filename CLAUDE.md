# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Matcha

Matcha is a puzzle game (Panel de Pon / Tetris Attack style) built with React, Phaser 3, and Supabase. Players swap blocks horizontally to form matches of 3+ same-colored blocks, earning points through combos and chains within a timed round.

## Commands

- `npm run dev` — Start Vite dev server (frontend only)
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `cd server && npm run dev` — Start Express dev server (port 3001, uses tsx watch)

No test framework is currently configured.

## Architecture

### Frontend (React + Phaser)

The app has two game modes, each with its own Phaser instance:

- **Solo mode** (`/play`): `PhaserGame.tsx` → `BootScene` → `GameScene` → `GameOverScene`. 90-second timed rounds.
- **Vs mode** (`/vs`): `VsPhaserGame.tsx` → `VsBootScene` → `VsGameScene`. Two boards (local + remote/CPU) with garbage block exchange. Supports online multiplayer and CPU opponents.

Phaser canvases are embedded in React pages. React handles UI overlays (score, timer, game-over screens) while Phaser runs the game loop and rendering.

### Game Engine (`src/game/engine/`)

Deterministic engine adapted from panel-league (MIT). Core design:

- `GameEngine` manages state with time-indexed caching and event replay (rollback-capable)
- `ScoringStepper` (in `stepper.ts`) wraps basic step logic with scoring
- `basic.ts` — core block physics: gravity, swapping, match detection, flash/float timers
- `garbage.ts` / `garbageRouting.ts` — garbage block creation and chain-to-garbage conversion for vs mode
- `jkiss.ts` — seeded PRNG for deterministic block generation across networked games
- State is JSON-serialized for caching; `postProcess` restores non-serializable properties

Engine runs at its own tick rate (`ENGINE_FPS` = 15 in `constants.ts`), independent of Phaser's 60fps render loop. State snapshots are cached every 4 ticks (not every tick) to reduce serialization overhead. Old events, cache entries, and the effects deduplication set are pruned automatically.

### State Management (Zustand)

- `gameStore` — single-player UI state (score, time, chain, countdown, hype events)
- `matchStore` — multiplayer match lifecycle (mode FSM: idle → searching → creating/joining → countdown → playing → finished)
- `authStore` — Supabase auth session

### Multiplayer (`src/services/`)

- `matchmaking.ts` — room creation/joining via Supabase Realtime broadcast channels. Auto-match uses a shared `matchmaking:queue` channel with UUID-based deterministic host selection.
- `matchChannel.ts` — typed wrapper around a Supabase RealtimeChannel for game events (input relay, garbage, game_over, ready, match_start, disconnect)
- Seed exchange ensures both players generate identical block sequences

### Backend

- `server/` — local-dev Express server on port 3847. Health check + Challenge webhook receiver. Not deployed to Vercel.
- `api/` — Vercel serverless functions (deployed). `api/challenge/settle.ts` is the production settlement endpoint.
- `supabase/migrations/` — DB schema: `profiles` (auto-created on signup), `scores`, `leaderboard` view. RLS enabled.

### Challenge Integration (real-money matches)

Matcha is registered as a Challenge game (Swingi). The integration uses **versus mode** with **platform matchmaking** (Path B in Challenge's docs).

- **Settlement happens server-side** via `api/challenge/settle.ts` (Vercel serverless). The Challenge `sk_live_` API key is server-only — read from `process.env.CHALLENGE_API_KEY`. **Never** add `VITE_CHALLENGE_API_KEY` or pass `apiKey` to `Challenge.init()` — that would expose the live key in the client bundle.
- After the game ends, both clients call `settleMatch(matchId, winnerId, gameData)` from `services/challengeWidget.ts`, which POSTs to `/api/challenge/settle` with the user's Challenge JWT (Authorization header). The serverless function verifies the JWT and forwards to Challenge's `/api/matches/settle` with the X-API-Key.
- Settlement is idempotent — if both clients race, the first wins and the second receives `alreadySettled: true`. After settlement, the Challenge backend emits a `match.settled` WebSocket event that the widget auto-renders. Clients also call `Challenge.showWin/showLose/showDraw` as a fallback in case WS is delayed.
- Trust-the-caller: the serverless function does not currently verify that the JWT-holder is actually a participant in the match it's settling, nor that they actually won. A losing player's tab could call `settleMatch(matchId, self)` and steal the pot. Mitigating this requires server-side authoritative game state — listed as future work.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. Global styles in `src/index.css`.

## Environment

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app works without Supabase (multiplayer/auth/leaderboard features are disabled).

## Key Conventions

- Game constants are split: `src/game/constants.ts` (solo) and `src/game/vs-constants.ts` (vs mode layouts/dimensions)
- Phaser scenes communicate with React via Zustand stores (direct `useGameStore.getState()` calls from scene code)
- Block colors in the engine use string names (`red`, `blue`, `green`, `violet`, `yellow`, `navy`) mapped to sprite indices in scene files

## Multiplayer Invariants (MUST follow when modifying vs/multiplayer code)

### Listener Lifecycle
- `matchChannel.resetCallbacks()` clears the JS callback arrays. The underlying Supabase `.on()` listeners remain but are gated by a `destroyed` flag and empty arrays.
- `GameEngine.removeAllListeners()` must be called on scene shutdown to prevent listener accumulation across rematches.
- Network callbacks in `VsPhaserGame.wireNetworkToScene()` guard against `!scene.scene.isActive()` to avoid calling methods on destroyed scenes.

### Match State Machine
- `matchStore.mode` is a strict FSM. Valid transitions:
  - `idle → searching | creating | joining | countdown` (CPU)
  - `searching → creating | joining | idle`
  - `creating → waiting | idle`
  - `waiting → countdown`
  - `joining → countdown | idle`
  - `countdown → playing`
  - `playing → finished`
  - `finished → ready_check | countdown` (rematch)
  - `ready_check → countdown`
- `requestRematch()` is guarded: only callable from `finished`.
- `setFinished()` is guarded: won't overwrite if already `finished`. This prevents the delayed-call race where a 2000ms death animation delay could overwrite a disconnect-triggered win.

### Scene Cleanup
- VsGameScene `shutdown` handler must clean up: engine listeners, delayed calls (`this.time.removeAllEvents()`), and input listeners.
- VsPhaserGame cleans up polling intervals and timeouts on unmount.
- VsGameOverOverlay prevents double-click on rematch/menu buttons via `actionTaken` flag.

### Network Timeouts
- All Supabase channel subscriptions use `subscribeWithTimeout()` (5s timeout) in `matchmaking.ts`. If adding new channel subscriptions, use this helper.

### Error Boundaries
- `ErrorBoundary` component at `src/components/ui/ErrorBoundary.tsx` wraps all page routes in `App.tsx`. Catches React render errors and shows retry/home buttons.

### Pre-flight Checklist (before modifying multiplayer code)
1. Does the change register any new callbacks/listeners? If yes, ensure they are cleaned up on shutdown/destroy/unmount.
2. Does the change call `setFinished()`? If yes, verify the `mode === 'finished'` guard won't block it incorrectly.
3. Does the change add a `time.delayedCall()`? If yes, confirm it won't fire after scene shutdown (shutdown handler calls `removeAllEvents`).
4. Does the change modify matchStore state transitions? If yes, verify against the FSM above.
5. Does the change access scene methods from callbacks? If yes, guard with `scene.scene.isActive()`.
6. Does the change subscribe to a Supabase channel? If yes, use `subscribeWithTimeout()` — never raw `channel.subscribe()`.
7. Are all React hooks called before any early returns? (Rules of Hooks)
