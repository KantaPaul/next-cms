/**
 * The user guide as blog posts: one post per guide topic, filed under a
 * "User guide" category tree.
 */
import { db } from '@/db';
import * as schema from '@/db/schema';
import { GUIDE_GROUP_TITLES, GUIDE_TOPICS, topicBodyHtml } from '@/content/user-guide';
import type { GuideTopic } from '@/content/user-guide';

type Ctx = { siteId: string; authorId: string; templateId: string; tagIds: string[] };

const CHILD_CATEGORIES: Record<GuideTopic['group'], { name: string; slug: string } | null> = {
  overview: null,
  dashboard: { name: 'Dashboard guide', slug: 'dashboard-guide' },
  site: { name: 'Public site guide', slug: 'public-site-guide' },
  components: { name: 'Builder components', slug: 'builder-components' },
};

export async function seedGuidePosts(ctx: Ctx) {
  const [parent] = await db
    .insert(schema.categories)
    .values({
      siteId: ctx.siteId,
      name: 'User guide',
      slug: 'user-guide',
      description: 'How to use every screen and block in Next CMS.',
      language: 'en',
      createdBy: ctx.authorId,
    })
    .returning();

  const childIds = new Map<GuideTopic['group'], string>();
  for (const [group, child] of Object.entries(CHILD_CATEGORIES) as [GuideTopic['group'], { name: string; slug: string } | null][]) {
    if (!child) continue;
    const [row] = await db
      .insert(schema.categories)
      .values({
        siteId: ctx.siteId,
        name: child.name,
        slug: child.slug,
        description: `${GUIDE_GROUP_TITLES[group]} articles of the user guide.`,
        parentId: parent.id,
        language: 'en',
        createdBy: ctx.authorId,
      })
      .returning();
    childIds.set(group, row.id);
  }

  // Publish dates step back one hour per topic so the guide lists in reading order.
  const start = Date.now();
  const posts: { id: string; title: string; slug: string }[] = [];
  for (const [index, topic] of GUIDE_TOPICS.entries()) {
    const body = topicBodyHtml(topic);
    const publishedAt = new Date(start - index * 60 * 60 * 1000);
    const [post] = await db
      .insert(schema.posts)
      .values({
        siteId: ctx.siteId,
        title: topic.title,
        slug: topic.slug,
        excerpt: topic.summary,
        status: 'published',
        visibility: 'public',
        layout: 'template',
        templateId: ctx.templateId,
        language: 'en',
        publishedAt,
        createdBy: ctx.authorId,
      })
      .returning();

    await db.insert(schema.postContents).values({ postId: post.id, kind: 'published', body, canvas: null });
    await db.insert(schema.postContents).values({ postId: post.id, kind: 'draft', body, canvas: null });
    await db.insert(schema.postSeo).values({
      postId: post.id,
      title: `${topic.title} | Next CMS user guide`,
      description: topic.summary,
      noIndex: false,
    });
    await db.insert(schema.postCategories).values({ postId: post.id, categoryId: parent.id });
    const child = childIds.get(topic.group);
    if (child) await db.insert(schema.postCategories).values({ postId: post.id, categoryId: child });
    for (const tagId of ctx.tagIds) {
      await db.insert(schema.postTags).values({ postId: post.id, tagId });
    }
    posts.push({ id: post.id, title: topic.title, slug: topic.slug });
  }

  return { categoryId: parent.id, posts };
}
