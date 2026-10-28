import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { users } from '@/db/schemas/auth.schema';
import {
  PageStatus,
  pageStatusEnum,
  VisibilityStatus,
  visibilityStatusEnum,
} from '@/db/schemas/shared.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

export type VideoProvider = 'youtube' | 'vimeo' | 'direct';

export type VideoSettings = {
  enabled: boolean;
  title: string;
  description: string;
  layout: 'sidebar' | 'stacked';
  defaultPlaylistId: string | null;
  thumbnails: boolean;
  descriptions: boolean;
  pageSize: number;
  providers: Record<VideoProvider, boolean>;
  directHostAllowlist: string[];
  progress: boolean;
  resume: boolean;
  mutedAutoplay: boolean;
  nativePlaybackSpeed: boolean;
  completionPercent: number;
  nativeSeekRestriction: boolean;
  catalogMode: 'all-published' | 'playlist-only';
  viewerAccess: 'public' | 'authenticated';
  preferCaptions: boolean;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  enabled: true,
  title: 'Videos',
  description: '',
  layout: 'sidebar',
  defaultPlaylistId: null,
  thumbnails: true,
  descriptions: true,
  pageSize: 12,
  providers: { youtube: true, vimeo: true, direct: true },
  directHostAllowlist: [],
  progress: true,
  resume: true,
  mutedAutoplay: false,
  nativePlaybackSpeed: true,
  completionPercent: 90,
  nativeSeekRestriction: false,
  catalogMode: 'all-published',
  viewerAccess: 'public',
  preferCaptions: false,
};

/** A playlist of videos. */
export const videoPlaylists = pgTable(
  'video_playlists',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 150 }).notNull(),
    description: text('description'),
    position: integer('position').default(0).notNull(),
    createdBy: text('created_by').references(() => users.id, setNull),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('video_playlists_site_slug_unique')
      .on(t.siteId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('video_playlists_site_id_index').on(t.siteId),
    index('video_playlists_deleted_at_index').on(t.deletedAt),
  ]
);

/** A URL-only video record: YouTube, Vimeo, or direct MP4/WebM. */
export const videos = pgTable(
  'videos',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    playlistId: text('playlist_id').references(
      () => videoPlaylists.id,
      setNull
    ),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    url: text('url').notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    providerId: text('provider_id').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    duration: integer('duration'),
    status: pageStatusEnum().default(PageStatus.draft).notNull(),
    visibility: visibilityStatusEnum()
      .default(VisibilityStatus.public)
      .notNull(),
    position: integer('position').default(0).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id, setNull),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('videos_site_slug_unique')
      .on(t.siteId, t.slug)
      .where(sql`${t.deletedAt} is null`),
    index('videos_site_id_index').on(t.siteId),
    index('videos_playlist_index').on(t.playlistId),
    index('videos_status_index').on(t.status),
    index('videos_deleted_at_index').on(t.deletedAt),
  ]
);

/** Per-viewer resume progress for a video (signed-in viewers only). */
export const videoProgress = pgTable(
  'video_progress',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    videoId: text('video_id')
      .references(() => videos.id, cascade)
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, cascade)
      .notNull(),
    position: integer('position').notNull().default(0),
    duration: integer('duration'),
    completed: boolean('completed').default(false).notNull(),
    createdAt: baseColumns.createdAt,
    updatedAt: baseColumns.updatedAt,
  },
  t => [
    uniqueIndex('video_progress_video_user_unique').on(t.videoId, t.userId),
    index('video_progress_user_index').on(t.userId),
    index('video_progress_video_index').on(t.videoId),
  ]
);

export const videoPlaylistsRelations = relations(
  videoPlaylists,
  ({ many }) => ({
    videos: many(videos),
  })
);

export const videosRelations = relations(videos, ({ one, many }) => ({
  playlist: one(videoPlaylists, {
    fields: [videos.playlistId],
    references: [videoPlaylists.id],
  }),
  progress: many(videoProgress),
}));

export const videoProgressRelations = relations(videoProgress, ({ one }) => ({
  video: one(videos, {
    fields: [videoProgress.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [videoProgress.userId],
    references: [users.id],
  }),
}));
