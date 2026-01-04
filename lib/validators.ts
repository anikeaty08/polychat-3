import { z } from 'zod';

export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const displayNameSchema = z
  .string()
  .max(50, 'Display name must be at most 50 characters')
  .optional();

export const statusSchema = z
  .string()
  .max(150, 'Status must be at most 150 characters')
  .optional();

export const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  conversationId: z.string().uuid(),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
  replyToId: z.string().uuid().optional(),
  disappearingTimer: z.number().int().positive().optional(),
});

export const createProfileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  status: statusSchema,
});



