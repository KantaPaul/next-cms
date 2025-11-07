import { pgEnum } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const USER_STATUS = ['Active', 'Inactive'] as const;
export const userStatusEnum = pgEnum('user_status', USER_STATUS);
export const UserStatus = z.enum(userStatusEnum.enumValues).enum;

export const PAGE_STATUS = ['draft', 'published', 'archived'] as const;
export const pageStatusEnum = pgEnum('status', PAGE_STATUS);
export const PageStatus = z.enum(pageStatusEnum.enumValues).enum;