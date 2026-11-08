import { z } from 'zod';
import { ROLE_NAMES } from '@/config/permissions';

export const setUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLE_NAMES),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(ROLE_NAMES).optional(),
});

export const approveUserActionSchema = z.object({ userId: z.string().min(1) });
