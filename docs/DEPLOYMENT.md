# Deployment Guide

## Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   - `VITE_API_URL` = your backend URL
   - `VITE_SOCKET_URL` = your backend URL

## Backend (Railway)

1. Create a new Railway project
2. Add PostgreSQL plugin (or connect Neon)
3. Set root directory to `server`
4. Build command: `npm run build`
5. Start command: `npm start`
6. Environment variables: see [ENVIRONMENT.md](ENVIRONMENT.md)

### Railway Deploy Steps

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway add --plugin postgresql
railway up
```

## Database (Neon)

1. Create project at https://neon.tech
2. Copy connection string to `DATABASE_URL`
3. Run migrations:
   ```bash
   cd server && npx prisma migrate deploy
   ```

## Post-Deploy Checklist

- [ ] JWT secrets are unique production values
- [ ] `CLIENT_URL` matches Vercel domain
- [ ] CORS configured for production domain
- [ ] Database migrations applied
- [ ] Health check responds: `GET /health`
- [ ] Socket.IO connects over WSS
- [ ] Rate limiting enabled
- [ ] `OPENAI_API_KEY` set (when AI phase is deployed)

## Render Alternative

Same as Railway — set build/start commands, add PostgreSQL, configure env vars.
