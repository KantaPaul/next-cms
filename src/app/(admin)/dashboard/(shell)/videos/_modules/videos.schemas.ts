import { z } from 'zod';

export const listVideosSchema = z.object({
  search: z.string().optional(),
  playlistId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  provider: z.enum(['youtube', 'vimeo', 'direct']).optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
});

export const queryVideosSchema = z.object({
  playlistId: z.string().trim().max(150).nullish(),
  pageSize: z.coerce.number().int().min(1).max(48).nullish(),
  provider: z
    .union([
      z.enum(['youtube', 'vimeo', 'direct', 'all']),
      z.array(z.enum(['youtube', 'vimeo', 'direct'])),
    ])
    .nullish(),
  providers: z.array(z.enum(['youtube', 'vimeo', 'direct'])).nullish(),
  sources: z.array(z.enum(['youtube', 'vimeo', 'direct'])).nullish(),
});

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().min(1).max(150),
  description: z.string().optional(),
});

export const updatePlaylistSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(150).optional(),
  slug: z.string().trim().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
});

export const createVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  url: z.string().url(),
  playlistId: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const updateVideoSchema = z.object({
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

export const reorderVideosSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export const saveVideoProgressSchema = z.object({
  videoId: z.string().min(1).max(100),
  position: z
    .number()
    .min(0)
    .max(24 * 60 * 60)
    .default(0),
  duration: z.number().min(0).nullish(),
  completed: z.boolean().optional(),
});

export const listPlaylistsSchema = z.object({});

export const fetchVideoMetadataSchema = z.object({ url: z.string().url() });
