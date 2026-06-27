# UNO Arena

A production-ready multiplayer UNO game built with React, Node.js, PostgreSQL, and Socket.IO.

## Architecture

```
UNO/
├── client/          # React + Vite frontend
├── server/          # Express + Socket.IO backend
├── shared/          # Shared TypeScript types, game engine & constants
├── docs/            # Architecture & deployment docs
└── docker-compose.yml
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Vite | Fast dev, type-safe, modern tooling |
| Styling | TailwindCSS + Framer Motion | Rapid UI + premium animations |
| State | Zustand + React Query | Lightweight client state + server cache |
| Backend | Node.js + Express + TypeScript | Mature, scalable API layer |
| Database | PostgreSQL + Prisma ORM | Relational integrity, migrations |
| Real-time | Socket.IO | Reliable bidirectional sync |
| Auth | JWT + Google OAuth | Stateless sessions + social login |
| AI | OpenAI API (server-side) | Intelligent bot opponent |
| Voice | WebRTC + Socket.IO signaling | Low-latency peer voice chat |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- npm 10+

### 1. Clone & Install

```bash
npm install
```

### 2. Start Database

```bash
docker compose up -d
```

### 3. Configure Environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your database URL, JWT secrets, and optional OpenAI/Google keys.

### 4. Run Migrations

```bash
npm run db:push
```

### 5. Start Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

## Development Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | ✅ Complete | Project setup, Auth, Lobby, Database |
| 2 | ✅ Complete | Multiplayer socket synchronization |
| 3 | ✅ Complete | Complete UNO game engine |
| 4 | ✅ Complete | WebRTC voice chat |
| 5 | ✅ Complete | OpenAI AI opponent |
| 6 | ✅ Complete | Leaderboards & statistics |
| 7 | ✅ Complete | Animations & sound |
| 8 | ✅ Complete | Testing |
| 9 | ✅ Complete | Deployment readiness |

## Features

- **Multiplayer**: Create/join rooms, real-time sync, host controls, house rules
- **Game Engine**: Full UNO rules, server-authoritative validation, anti-cheat
- **Voice Chat**: Push-to-talk, mute, deafen, WebRTC peer connections
- **AI Bot**: OpenAI-powered opponent with heuristic fallback
- **Statistics**: Personal stats, all-time/weekly/monthly leaderboards
- **UI**: Dark mode, glassmorphism, animated cards, responsive design

## Environment Variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the full list.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Developer Guide](docs/DEVELOPER.md)

## Testing

```bash
npm run test
npm run build
```

## License

MIT
