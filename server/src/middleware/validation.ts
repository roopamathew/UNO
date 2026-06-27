import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isPrivate: z.boolean().optional(),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  houseRules: z.record(z.unknown()).optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(8),
  guestName: z.string().min(2).max(20).optional(),
});

export const joinRoomByIdSchema = z.object({
  guestName: z.string().min(2).max(20).optional(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(500),
});

export const houseRulesSchema = z.object({
  stackDrawTwo: z.boolean().optional(),
  stackWildDrawFour: z.boolean().optional(),
  jumpIn: z.boolean().optional(),
  sevenO: z.boolean().optional(),
  forcePlay: z.boolean().optional(),
  drawUntilPlayable: z.boolean().optional(),
  customScoreLimit: z.number().int().min(0).optional(),
  winningScore: z.number().int().min(100).max(10000).optional(),
  numberOfDecks: z.number().int().min(1).max(4).optional(),
  turnTimerSeconds: z.number().int().min(0).max(300).optional(),
  customRules: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        enabled: z.boolean(),
      }),
    )
    .optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: { body: unknown }, res: { status: (n: number) => { json: (o: object) => void } }, next: () => void) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (req as { body: T }).body = result.data;
    next();
  };
}
