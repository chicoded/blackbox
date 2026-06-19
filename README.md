# 🕳️ Black Box

A real-time multiplayer **story-guessing game platform**. Each "box" is a different
story mode (find the seed phrase, guess the breakup name, name the rugged coin...)
that plugs into one shared **round engine**: room → players join → clues drip in as
a timer ticks → everyone guesses → reveal → score.

Built for a hackathon. Add a new game = add one file in `server/modes/`.

## Stack
- **Server:** Node + Express + Socket.IO (authoritative game state)
- **Client:** React + Vite (plain CSS, dark theme)
- **No database** — everything lives in server memory.

## Project layout
```
black-box/
├── server/                 # Socket.IO authority
│   ├── index.js            # socket wiring
│   ├── RoomManager.js      # rooms, players, sanitized views
│   ├── RoundEngine.js      # phase state machine + timer + scoring
│   ├── ModeRegistry.js     # loads all modes
│   ├── modes/              # one file per game
│   └── util/               # mask + text helpers
├── client/                 # React UI
│   └── src/{screens,components,net}
└── shared/events.js        # protocol constants
```

## Run it
From the project root:
```bash
# 1. install (root tools + server + client)
npm install
npm run install:all

# 2. start server + client together
npm run dev
```
- Client: http://localhost:5173
- Server: http://localhost:3001

Open the client, **Create a Room**, share the 4-letter code. Others open the same
URL (on the same network, replace `localhost` with your machine's LAN IP) and **Join**.

## How a round works
1. Host picks a mode + timer + rounds in the **Lobby**, then starts.
2. A character "pops up" with an intro story (3-2-1 countdown).
3. The answer appears **masked** (e.g. `selfish` → `)@lf_+%`) and un-masks as time runs.
4. Clues drip in (4 pics → related word → hint).
5. Players guess. Fastest correct = most points. Reveal → next round.

## Game modes included
- **The Seed Phrase** — masked word, crypto-flavored clues
- **The One That Got Away** — guess the name (soft mask, typo-tolerant)
- **The Rug** — guess the rugged coin ticker

### Add your own
Create `server/modes/myMode.js` exporting `defineMode({ id, title, character, intro, maskStyle, matchMode, puzzles })`, then register it in `server/ModeRegistry.js`. That's it.

## Deploying (Vercel + Render)

This game has two parts that deploy separately:

| Part | Host | Why |
|------|------|-----|
| **Client** (Vite) | **Vercel** | static site, instant |
| **Server** (Socket.IO) | **Render** (or Railway/Fly) | needs persistent WebSocket connections — **Vercel serverless can't keep these alive** |

### 1. Deploy the server to Render
1. Go to [render.com](https://render.com) → **New +** → **Blueprint** → connect this repo.
2. Render reads `render.yaml` and creates `blackbox-server` (free, WebSocket-capable).
3. Copy the live URL, e.g. `https://blackbox-server.onrender.com`.

### 2. Deploy the client to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
2. Vercel reads `vercel.json` (builds `client/`, outputs `client/dist`).
3. In **Settings → Environment Variables**, add:
   ```
   VITE_SERVER_URL = https://blackbox-server.onrender.com
   ```
4. Deploy. The client connects to your Render server over WebSockets.

> Note: Render's free tier sleeps after inactivity, so the first connection may take ~30s to wake. Fine for a demo; upgrade for an always-on hackathon booth.
