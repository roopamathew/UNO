import { Router } from 'express';
import {
  createRoom,
  getRoomById,
  getRoomByCode,
  joinRoom,
  updateRoomSettings,
  updateHouseRules,
  kickPlayer,
} from '../services/roomService';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth';
import {
  validateBody,
  createRoomSchema,
  joinRoomSchema,
  joinRoomByIdSchema,
  houseRulesSchema,
} from '../middleware/validation';
import type { CreateRoomRequest, HouseRulesConfig, UpdateRoomSettingsRequest } from '@uno/shared';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.post('/', authenticate, validateBody(createRoomSchema), async (req: AuthRequest, res, next) => {
  try {
    const room = await createRoom(req.authUser!.userId, req.body as CreateRoomRequest);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.get('/code/:code', optionalAuth, async (req, res, next) => {
  try {
    const room = await getRoomByCode(paramId(req.params.code));
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const room = await getRoomById(paramId(req.params.id));
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', optionalAuth, validateBody(joinRoomByIdSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as { guestName?: string };
    const room = await joinRoom(paramId(req.params.id), req.authUser?.userId ?? null, body.guestName);
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.post('/join-by-code', optionalAuth, validateBody(joinRoomSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as { code: string; guestName?: string };
    const existing = await getRoomByCode(body.code);
    const room = await joinRoom(existing.id, req.authUser?.userId ?? null, body.guestName);
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await updateRoomSettings(
      paramId(req.params.id),
      req.authUser!.userId,
      req.body as UpdateRoomSettingsRequest,
    );
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/house-rules', authenticate, validateBody(houseRulesSchema), async (req: AuthRequest, res, next) => {
  try {
    const room = await updateHouseRules(
      paramId(req.params.id),
      req.authUser!.userId,
      req.body as Partial<HouseRulesConfig>,
    );
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/kick/:playerId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await kickPlayer(
      paramId(req.params.id),
      req.authUser!.userId,
      paramId(req.params.playerId),
    );
    res.json(room);
  } catch (err) {
    next(err);
  }
});

export default router;
