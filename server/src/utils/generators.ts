import { customAlphabet } from 'nanoid';
import { ROOM_CODE_LENGTH } from '@uno/shared';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = customAlphabet(alphabet, ROOM_CODE_LENGTH);

export function generateRoomCode(): string {
  return generateCode();
}

export function generateSecureToken(): string {
  return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 64)();
}
