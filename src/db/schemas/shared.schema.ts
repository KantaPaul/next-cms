import { pgEnum } from 'drizzle-orm/pg-core';
import type { ValueOf } from 'type-fest';
import { z } from 'zod';
import { generateEnumSelectOptions } from '@/db/db-utils';

export const USER_STATUS = ['Active', 'Inactive'] as const;
export const userStatusEnum = pgEnum('user_status', USER_STATUS);
export const UserStatus = z.enum(userStatusEnum.enumValues).enum;

export const PAGE_STATUS = ['draft', 'published', 'archived'] as const;
export const pageStatusEnum = pgEnum('status', PAGE_STATUS);
export const PageStatus = z.enum(pageStatusEnum.enumValues).enum;
export type PageStatusType = ValueOf<typeof PageStatus>;
export const pageStatusOptions = generateEnumSelectOptions(PAGE_STATUS);

export const VISIBILITY_STATUS = ['private', 'public'] as const;
export const visibilityStatusEnum = pgEnum('visibility', VISIBILITY_STATUS);
export const VisibilityStatus = z.enum(visibilityStatusEnum.enumValues).enum;
export type VisibilityStatusType = ValueOf<typeof VisibilityStatus>;
export const pageVisibilityStatusOptions =
  generateEnumSelectOptions(VISIBILITY_STATUS);