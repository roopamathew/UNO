# API Reference

Base URL: `http://localhost:3001` (development)

## Authentication

### POST /api/auth/register
```json
{ "email": "user@example.com", "username": "player1", "password": "securepass" }
```

### POST /api/auth/login
```json
{ "email": "user@example.com", "password": "securepass" }
```

### POST /api/auth/refresh
```json
{ "refreshToken": "..." }
```

### POST /api/auth/logout
```json
{ "refreshToken": "..." }
```

### POST /api/auth/forgot-password
```json
{ "email": "user@example.com" }
```

### POST /api/auth/reset-password
```json
{ "token": "...", "password": "newpassword" }
```

### GET /api/auth/me
Requires: `Authorization: Bearer <accessToken>`

## Rooms

### POST /api/rooms
Requires auth. Creates a new room.

### GET /api/rooms/code/:code
Get room by join code.

### GET /api/rooms/:id
Get room by ID.

### POST /api/rooms/join-by-code
```json
{ "code": "ABC123", "guestName": "Guest" }
```

### PATCH /api/rooms/:id/settings
Host only. Update room name, privacy, max players.

### PATCH /api/rooms/:id/house-rules
Host only. Update house rules.

### POST /api/rooms/:id/kick/:playerId
Host only. Kick a player.

## Users

### GET /api/users/stats
Requires auth. Returns player statistics.

### GET /api/users/settings
Requires auth. Returns user preferences.

### PATCH /api/users/settings
Requires auth. Update preferences.

### GET /api/users/leaderboard?period=all-time&limit=50
Public leaderboard.

## Socket.IO Events

See shared constants in `shared/src/constants.ts` for full event list.

### Client → Server
- `room:join` — Join a room lobby
- `room:leave` — Leave current room
- `player:ready` — Toggle ready status
- `chat:message` — Send chat message
- `game:start` — Host starts game
- `room:kick` — Host kicks player
- `house-rules:update` — Host updates rules

### Server → Client
- `room:update` — Full room state
- `room:error` — Error notification
- `chat:message` — New chat message
- `chat:history` — Chat history on join
- `game:starting` — Countdown before game
- `player:kicked` — Player was kicked
