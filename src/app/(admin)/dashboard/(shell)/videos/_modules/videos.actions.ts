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
import {
  accessProcedure,
  permissionProcedure,
} from '@/server/procedures/permission.procedure';
import { adminSiteId } from '@/server/services/site-context';
import { parseVideoUrl } from '@/lib/video/parse';
import { fetchOEmbed } from '@/lib/video/oembed';
import {
  playlistService,
  videoLibraryService,
  videoService,
  videoLifecycle,
  type VideoItem,
  type PlaylistItem,
  type VideoListParams,
} from './videos.service';
import {
  listVideosSchema,
  queryVideosSchema,
  createPlaylistSchema,
  updatePlaylistSchema,
  createVideoSchema,
  updateVideoSchema,
  reorderVideosSchema,
  listPlaylistsSchema,
  fetchVideoMetadataSchema,
} from './videos.schemas';
import { idSchema } from '@/schemas/shared';

export type { VideoItem, PlaylistItem, VideoListParams };

/**
 * Public read of published videos for the VideoLibrary block / widget.
 * No rows are returned when the widget is disabled, in playlist-only mode
 * without a playlist, or when viewer access requires a signed-in session.
 */
export const queryVideos = async (input: z.infer<typeof queryVideosSchema>) => {
  const providers =
    input.providers ??
    input.sources ??
    (Array.isArray(input.provider)
      ? input.provider
      : input.provider && input.provider !== 'all'
        ? [input.provider]
        : undefined);
  const result = await videoLibraryService.listPublished({
    playlistId: input.playlistId ?? null,
    pageSize: input.pageSize ?? undefined,
    providers,
  });
  return result;
};

export const listPlaylists = accessProcedure
  .input(listPlaylistsSchema)
  .action(async () => {
    const siteId = await adminSiteId();
    return playlistService.list(siteId);
  });

export const listVideos = accessProcedure
  .input(listVideosSchema)
  .action(async ({ input }) => {
    return videoService.list(input as VideoListParams);
  });

export const createPlaylist = permissionProcedure(PERMISSIONS.VIDEOS_CREATE)
  .input(createPlaylistSchema)
  .action(async ({ input, ctx }) => {
    const row = await playlistService.create(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const updatePlaylist = permissionProcedure(PERMISSIONS.VIDEOS_EDIT)
  .input(updatePlaylistSchema)
  .action(async ({ input, ctx }) => {
    const row = await playlistService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const deletePlaylist = permissionProcedure(PERMISSIONS.VIDEOS_DELETE)
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    await playlistService.remove(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const createVideo = permissionProcedure(PERMISSIONS.VIDEOS_CREATE)
  .input(createVideoSchema)
  .action(async ({ input, ctx }) => {
    const row = await videoService.create(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const updateVideo = permissionProcedure(PERMISSIONS.VIDEOS_EDIT)
  .input(updateVideoSchema)
  .action(async ({ input, ctx }) => {
    const row = await videoService.update(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return row;
  });

export const publishVideo = permissionProcedure(PERMISSIONS.VIDEOS_PUBLISH)
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    await videoLifecycle.publish(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const unpublishVideo = permissionProcedure(PERMISSIONS.VIDEOS_PUBLISH)
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    await videoLifecycle.unpublish(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const deleteVideo = permissionProcedure(PERMISSIONS.VIDEOS_DELETE)
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    await videoLifecycle.softDelete(input.id, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
  });

export const reorderVideos = permissionProcedure(PERMISSIONS.VIDEOS_EDIT)
  .input(reorderVideosSchema)
  .action(async ({ input, ctx }) => {
    await videoLifecycle.reorder(input.ids, ctx.access);
    revalidatePath(PAGES.DASHBOARD.VIDEOS);
    return { ok: true };
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

export const fetchVideoMetadata = accessProcedure
  .input(fetchVideoMetadataSchema)
  .action(async ({ input }) => {
    const parsed = parseVideoUrl(input.url);
    if (!parsed) {
      return null;
    }
    let title = '';
    let thumbnailUrl = '';
    try {
      const oembed = await fetchOEmbed(parsed);
      if (oembed) {
        title = oembed.title || '';
        thumbnailUrl = oembed.thumbnailUrl || '';
      }
    } catch {
      // ignore
    }
    if (!thumbnailUrl && parsed.provider === 'youtube') {
      thumbnailUrl = `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;
    }
    return {
      provider: parsed.provider,
      id: parsed.id,
      title,
      thumbnailUrl,
    };
  });
