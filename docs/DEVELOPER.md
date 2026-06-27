# Developer Guide

## Getting Started

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Copy env files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Push database schema
npm run db:push

# Start dev servers (client + server)
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client & server concurrently |
| `npm run build` | Build all packages |
| `npm run lint` | Lint client & server |
| `npm run test` | Run tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Adding a New Feature

1. Define shared types in `shared/src/types/`
2. Add database models in `server/prisma/schema.prisma` if needed
3. Implement service logic in `server/src/services/`
4. Add API routes in `server/src/routes/`
5. Add socket handlers in `server/src/socket/` if real-time
6. Build client UI in `client/src/pages/` and `client/src/components/`
7. Add client state in `client/src/stores/` if needed

## Code Conventions

- Strict TypeScript everywhere
- Zod validation on all API inputs
- Server-authoritative game logic
- Feature-based folder organization
- Shared types in `@uno/shared` package
- No secrets in client code

## Testing

```bash
# Server tests
npm run test -w server

# Client tests
npm run test -w client
```

## Prisma Workflow

```bash
# After schema changes
npm run db:migrate    # Creates migration file
npm run db:generate   # Regenerates client

# Quick prototyping
npm run db:push       # Push without migration
```

## Socket.IO Debugging

Enable debug in browser console:
```javascript
localStorage.debug = 'socket.io-client:*';
```

## Phase Implementation Order

Follow the phase plan in README.md. Each phase must be fully functional before starting the next.
