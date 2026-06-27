import { Router } from 'express';
import {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  AuthError,
} from '../services/authService';
import { authenticate, type AuthRequest } from '../middleware/auth';
import type { LoginRequest, RegisterRequest } from '@uno/shared';
import {
  validateBody,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validation';
import googleAuthRoutes from './googleAuthRoutes';

const router = Router();
router.use(googleAuthRoutes);

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await register(req.body as RegisterRequest);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body as LoginRequest);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AuthError('Refresh token required', 400, 'TOKEN_REQUIRED');
    }
    const result = await refreshTokens(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await logout(refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const body = req.body as { email: string };
    const result = await forgotPassword(body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const body = req.body as { token: string; password: string };
    await resetPassword(body.token, body.password);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await getMe(req.authUser!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
