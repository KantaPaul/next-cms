'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { videoProgress, videos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clampProgress } from '@/lib/video/progress';
import { validateSession } from '@/lib/auth';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { accessProcedure, permissionProcedure } from '@/server/procedures/permission.procedure';
import { adminSiteId } from '@/server/services/site-context';
import {
  playlistService,
  videoLibraryService,
  videoService,
  videoLifecycle,
  type VideoItem,
  type PlaylistItem,
  type VideoListParams,
} from './videos.service';

export type { VideoItem, PlaylistItem, VideoListParams };

const listSchema = z.object({
  search: z.string().optional(),
  playlistId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

const queryVideosSchema = z.object({
  playlistId: z.string().trim().max(150).nullish(),
  pageSize: z.coerce.number().int().min(1).max(48).nullish(),
});

/**
 * Public read of published videos for the VideoLibrary block / widget.
 * No rows are returned when the widget is disabled, in playlist-only mode
 * without a playlist, or when viewer access requires a signed-in session.
 */
export const queryVideos = async (input: z.infer<typeof queryVideosSchema>) => {
  const result = await videoLibraryService.listPublished({
    playlistId: input.playlistId ?? null,
    pageSize: input.pageSize ?? undefined,
  });
  return result;
};

export const listPlaylists = accessProcedure
  .input(z.object({}))
  .action(async () => {
    const siteId = await adminSiteId();
    return playlistService.list(siteId);
  });

export const listVideos = accessProcedure
  .input(listSchema)
  .action(async ({ input }) => {
    return videoService.list(input as VideoListParams);
  });

const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().min(1).max(150),
  description: z.string().optional(),
});

export const createPlaylist = permissionProcedure(
  PERMISSIONS.VIDEOS_CREATE
)
  .input(createPlaylistSchema)
  .action(async ({ input, ctx }) => {
    const row = await playlistService.create(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

const updatePlaylistSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(150).optional(),
  slug: z.string().trim().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
});

export const updatePlaylist = permissionProcedure(
  PERMISSIONS.VIDEOS_EDIT
)
  .input(updatePlaylistSchema)
  .action(async ({ input, ctx }) => {
    const row = await playlistService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const deletePlaylist = permissionProcedure(
  PERMISSIONS.VIDEOS_DELETE
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    await playlistService.remove(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

const createVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  url: z.string().url(),
  playlistId: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const createVideo = permissionProcedure(
  PERMISSIONS.VIDEOS_CREATE
)
  .input(createVideoSchema)
  .action(async ({ input, ctx }) => {
    const row = await videoService.create(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

const updateVideoSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  url: z.string().url().optional(),
  playlistId: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
});

export const updateVideo = permissionProcedure(
  PERMISSIONS.VIDEOS_EDIT
)
  .input(updateVideoSchema)
  .action(async ({ input, ctx }) => {
    const row = await videoService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const publishVideo = permissionProcedure(
  PERMISSIONS.VIDEOS_PUBLISH
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    await videoLifecycle.publish(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const unpublishVideo = permissionProcedure(
  PERMISSIONS.VIDEOS_PUBLISH
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    await videoLifecycle.unpublish(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const deleteVideo = permissionProcedure(
  PERMISSIONS.VIDEOS_DELETE
)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    await videoLifecycle.softDelete(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

const reorderVideosSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export const reorderVideos = permissionProcedure(
  PERMISSIONS.VIDEOS_EDIT
)
  .input(reorderVideosSchema)
  .action(async ({ input, ctx }) => {
    await videoLifecycle.reorder(input.ids, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

const saveVideoProgressSchema = z.object({
  videoId: z.string().min(1).max(100),
  position: z.number().min(0).max(24 * 60 * 60).default(0),
  duration: z.number().min(0).nullish(),
  completed: z.boolean().optional(),
});

/**
 * Public progress save for the video widget. Reads the CMS session directly so
 * anonymous visitors are a no-op instead of an auth redirect. Progress is clamped
 * on the server and only saved while the video library progress setting is on.
 */
export const saveVideoProgress = async (input: {
  videoId: string;
  position: number;
  duration?: number | null;
  completed?: boolean;
}) => {
  const session = await validateSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return { ok: false, saved: false };
  }

  const settings = await siteSettingsService.getPublic();
  const videoSettings = settings.videoSettings;
  if (!videoSettings || videoSettings.progress !== true) {
    return { ok: false, saved: false };
  }

  const video = await db
    .select({ id: videos.id, status: videos.status })
    .from(videos)
    .where(eq(videos.id, input.videoId))
    .limit(1);

  if (!video[0] || video[0].status !== 'published') {
    return { ok: false, saved: false };
  }

  const clamped = clampProgress(
    input.position,
    input.duration ?? null,
    undefined,
    { completionPercent: videoSettings.completionPercent }
  );

  const [row] = await db
    .insert(videoProgress)
    .values({
      videoId: input.videoId,
      userId,
      position: clamped.position,
      duration: clamped.duration,
      completed: clamped.completed,
    })
    .onConflictDoUpdate({
      target: [videoProgress.videoId, videoProgress.userId],
      set: {
        position: clamped.position,
        duration: clamped.duration,
        completed: clamped.completed,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    ok: true as const,
    saved: true,
    position: clamped.position,
    duration: clamped.duration,
    completed: clamped.completed,
  };
};
