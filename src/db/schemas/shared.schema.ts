import { pgEnum } from 'drizzle-orm/pg-core';
import type { ValueOf } from 'type-fest';
import { z } from 'zod';
import { generateEnumSelectOptions } from '@/db/db-utils';

export const USER_STATUS = ['Active', 'Inactive'] as const;
export const userStatusEnum = pgEnum('user_status', USER_STATUS);
export const UserStatus = z.enum(userStatusEnum.enumValues).enum;

export const PAGE_STATUS = [
  'draft',
  'review',
  'scheduled',
  'published',
  'archived',
] as const;
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

export const EDITOR_TYPE = ['richtext', 'builder'] as const;
export const editorTypeEnum = pgEnum('editor_type', EDITOR_TYPE);
export const EditorType = z.enum(editorTypeEnum.enumValues).enum;
export type EditorTypeType = ValueOf<typeof EditorType>;

export const POST_LAYOUT = ['template', 'custom'] as const;
export const postLayoutEnum = pgEnum('post_layout', POST_LAYOUT);
export const PostLayout = z.enum(postLayoutEnum.enumValues).enum;
export type PostLayoutType = ValueOf<typeof PostLayout>;

export const CONTENT_KIND = ['draft', 'published'] as const;
export const contentKindEnum = pgEnum('content_kind', CONTENT_KIND);
export const ContentKind = z.enum(contentKindEnum.enumValues).enum;
export type ContentKindType = ValueOf<typeof ContentKind>;

export const REVISION_KIND = ['manual', 'autosave', 'published'] as const;
export const revisionKindEnum = pgEnum('revision_kind', REVISION_KIND);
export const RevisionKind = z.enum(revisionKindEnum.enumValues).enum;
export type RevisionKindType = ValueOf<typeof RevisionKind>;

export const PREVIEW_TOKEN_STATUS = ['active', 'revoked'] as const;
export const previewTokenStatusEnum = pgEnum(
  'preview_token_status',
  PREVIEW_TOKEN_STATUS
);

export const MENU_LOCATION = ['header', 'footer', 'sidebar'] as const;
export const menuLocationEnum = pgEnum('menu_location', MENU_LOCATION);
export type MenuLocationType = (typeof MENU_LOCATION)[number];

export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
] as const;
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.value) as string[];
