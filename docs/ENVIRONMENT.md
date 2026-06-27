# Environment Variables

## Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development`, `production`, `test` |
| `PORT` | No | Server port (default: 3001) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars, access token signing |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars, refresh token signing |
| `JWT_ACCESS_EXPIRES` | No | Access token TTL (default: 15m) |
| `JWT_REFRESH_EXPIRES` | No | Refresh token TTL (default: 7d) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: localhost:5173) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | OAuth callback URL |
| `OPENAI_API_KEY` | No | OpenAI API key (Phase 5, server-only) |

### Example DATABASE_URL (Docker)
```
postgresql://uno:uno_password@localhost:5432/uno_game?schema=public
```

### Example DATABASE_URL (Neon)
```
postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/uno_game?sslmode=require
```

## Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | API base URL (empty = same origin / proxy) |
| `VITE_SOCKET_URL` | No | Socket.IO server URL (default: localhost:3001) |

## Generating JWT Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice — once for access, once for refresh.
