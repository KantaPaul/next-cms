'use server';
import { asc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { categories, tags } from '@/db/schema';
import { blogService } from '@/server/services/blog.service';
import {
  termSchema,
  blogQuerySchema,
  relatedSchema,
  adjacentSchema,
  authorPostsSchema,
  postCommentsSchema,
} from './blog.schemas';

/**
 * Public reads of published posts. Called from block `resolveData` in the builder and
 * during public rendering, so they never expose drafts or private posts.
 */

export async function queryBlogPosts(input: z.input<typeof blogQuerySchema>) {
  return blogService.list(blogQuerySchema.parse(input));
}

export async function getRelatedPosts(input: z.input<typeof relatedSchema>) {
  return blogService.related(relatedSchema.parse(input));
}

/** Previous (older) and next (newer) published posts, for the Post Navigation block. */
export async function getAdjacentPosts(input: z.input<typeof adjacentSchema>) {
  return blogService.adjacent(adjacentSchema.parse(input));
}

/** An author's latest published posts, for the Author card block. */
export async function getAuthorPosts(input: z.input<typeof authorPostsSchema>) {
  return blogService.byAuthor(authorPostsSchema.parse(input));
}

/** Approved comments for the Comments block, and whether new ones are accepted site-wide. */
export async function getPostComments(
  input: z.input<typeof postCommentsSchema>
) {
  const { postId, targetKind, sort } = postCommentsSchema.parse(input);
  const [{ commentsService }, { siteSettingsService }] = await Promise.all([
    import('@/server/services/comments.service'),
    import('@/server/services/site-settings.service'),
  ]);
  const [result, settings] = await Promise.all([
    targetKind === 'entry'
      ? commentsService.forEntry(postId, sort)
      : commentsService.forPost(postId, sort),
    siteSettingsService.getPublic(),
  ]);
  return { ...result, open: settings.readingSettings?.comments !== false };
}

/** Categories and tags that appear on published posts, for public filter dropdowns. */
export async function getBlogFilterOptions(language?: string | null) {
  return blogService.taxonomy(
    typeof language === 'string' ? language.slice(0, 10) : null
  );
}

/** Every category and tag, for locking a BlogPosts block to one termSchema in the builder. */
export async function getAllTaxonomyOptions() {
  const [categoryRows, tagRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.name)),
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(tags)
      .where(isNull(tags.deletedAt))
      .orderBy(asc(tags.name)),
  ]);
  return { categories: categoryRows, tags: tagRows };
}
