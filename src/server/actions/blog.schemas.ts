import { z } from 'zod';
import { BLOG_SORTS } from '@/server/services/blog.service';

export const termSchema = z.string().trim().max(150).nullish();

export const blogQuerySchema = z.object({
  language: z.string().max(10).nullish(),
  q: termSchema,
  category: termSchema,
  tag: termSchema,
  sort: z.enum(BLOG_SORTS).nullish().catch(null),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  size: z.coerce.number().int().min(1).max(48).catch(9),
});

export const relatedSchema = z.object({
  postId: z.string().max(100),
  categoryIds: z.array(z.string().max(100)).max(20),
  language: z.string().max(10),
  limit: z.coerce.number().int().min(1).max(12).catch(3),
});

export const adjacentSchema = z.object({
  postId: z.string().max(100),
  language: z.string().max(10),
  publishedAt: z.coerce.date(),
  categoryId: z.string().max(100).optional(),
});

export const authorPostsSchema = z.object({
  authorId: z.string().max(100),
  excludeId: z.string().max(100).optional(),
  language: z.string().max(10),
  limit: z.coerce.number().int().min(1).max(5),
});

export const postCommentsSchema = z.object({
  postId: z.string().max(100),
  sort: z.enum(['oldest', 'newest']).default('oldest'),
});
