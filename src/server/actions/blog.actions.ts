'use server';
import { asc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { categories, tags } from '@/db/schema';
import { BLOG_SORTS, blogService } from '@/server/services/blog.service';

/**
 * Public reads of published posts. Called from block `resolveData` in the builder and
 * during public rendering, so they never expose drafts or private posts.
 */

const term = z.string().trim().max(150).nullish();

const blogQuerySchema = z.object({
  language: z.string().max(10).nullish(),
  q: term,
  category: term,
  tag: term,
  sort: z.enum(BLOG_SORTS).nullish().catch(null),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  size: z.coerce.number().int().min(1).max(48).catch(9),
});

export async function queryBlogPosts(input: z.input<typeof blogQuerySchema>) {
  return blogService.list(blogQuerySchema.parse(input));
}

const relatedSchema = z.object({
  postId: z.string().max(100),
  categoryIds: z.array(z.string().max(100)).max(20),
  language: z.string().max(10),
  limit: z.coerce.number().int().min(1).max(12).catch(3),
});

export async function getRelatedPosts(input: z.input<typeof relatedSchema>) {
  return blogService.related(relatedSchema.parse(input));
}

/** Categories and tags that appear on published posts, for public filter dropdowns. */
export async function getBlogFilterOptions(language?: string | null) {
  return blogService.taxonomy(
    typeof language === 'string' ? language.slice(0, 10) : null
  );
}

/** Every category and tag, for locking a BlogPosts block to one term in the builder. */
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
