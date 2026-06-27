import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { env, isProduction } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/auth';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import userRoutes from './routes/userRoutes';
import aiRoutes from './routes/aiRoutes';
import { setupSocketHandlers } from './socket/lobbyHandler';
import { setupGameHandlers } from './socket/gameHandler';
import { setupVoiceHandlers } from './socket/voiceHandler';
import type { ClientToServerEvents, ServerToClientEvents } from '@uno/shared';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts', code: 'RATE_LIMITED' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

setupSocketHandlers(io);
setupGameHandlers(io);
setupVoiceHandlers(io);

async function start() {
  try {
    await connectDatabase();
    httpServer.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
      if (!isProduction) {
        console.log(`Client URL: ${env.CLIENT_URL}`);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

start();

export { app, io };
