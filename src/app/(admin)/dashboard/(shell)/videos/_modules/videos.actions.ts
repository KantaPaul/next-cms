'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { accessProcedure, permissionProcedure } from '@/server/procedures/permission.procedure';
import { adminSiteId } from '@/server/services/site-context';
import {
  playlistService,
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
