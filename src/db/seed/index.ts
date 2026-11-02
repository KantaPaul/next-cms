/**
 * Full demo-site seed.
 *
 * Truncates every application table (except drizzle's `ledgerly_migrations`)
 * and seeds the default site with content for every route: pages that use
 * every builder block, header/footer/search/archive templates, a contact
 * form, the blog, and the user guide as blog posts (see src/content/user-guide).
 *
 * Wipes and reseeds: safe to re-run with `pnpm db:seed`.
 *
 * Seed accounts (password `Test1234!` for all):
 *   admin@nextcms.test   - Admin
 *   editor@nextcms.test  - Editor
 *   author@nextcms.test  - Author
 *   viewer@nextcms.test  - Viewer
 */
import { eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '@/lib/auth/password';
import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  DEFAULT_SITE_ID,
  DEFAULT_SITE_LOCALES,
} from '@/db/schemas/sites.schema';
import {
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
} from '@/config/permissions';
import { STARTER_TEMPLATES, STARTER_GLOBAL_BLOCKS } from './starter-content';
import { DEFAULT_THEME_TOKENS } from '@/db/schemas/pages.schema';
import { DEFAULT_VIDEO_SETTINGS } from '@/db/schemas/video.schema';
import { GUIDE_PDF_PATH } from '@/content/user-guide';
import { assertValid, block, page } from './builder-nodes';
import { SEED_IMAGES, seedPageDefs } from './sections/pages';
import { seedGuidePosts } from './sections/posts';
import { seedSiteTemplates } from './sections/templates';
import { searchIndex } from '@/server/services/search.service';

const TEST_PASSWORD = 'Test1234!';

type RoleRef = { id: string; name: string };
type UserRef = { id: string; email: string; roleId: string };

type SiteCtx = {
  siteId: string;
  name: string;
  admin: UserRef;
  editor: UserRef | null;
  author: UserRef | null;
  viewer: UserRef | null;
};

/** Every application table that must be cleaned. `ledgerly_migrations` is
 *  drizzle's own meta table and is intentionally left alone. */
const TABLES = [
  'webhook_deliveries',
  'webhook_subscriptions',
  'video_progress',
  'videos',
  'video_playlists',
  'personalized_section',
  'personalization',
  'account',
  'session',
  'audit_logs',
  'login_tokens',
  'search_documents',
  'redirects',
  'form_submissions',
  'api_rate_windows',
  'api_keys',
  'editor_locks',
  'page_views',
  'page_experiments',
  'analytics_dashboards',
  'post_tags',
  'post_categories',
  'post_seo',
  'post_revisions',
  'post_contents',
  'post_templates',
  'posts',
  'page_tags',
  'page_categories',
  'seo_meta',
  'page_revisions',
  'page_contents',
  'preview_tokens',
  'pages',
  'menu_items',
  'menus',
  'global_blocks',
  'page_templates',
  'media',
  'collection_entries',
  'collection_fields',
  'collections',
  'tags',
  'categories',
  'site_memberships',
  'site_settings',
  'users',
  'roles',
  'sites',
] as const;

async function truncateAll() {
  const identifiers = TABLES.map(t => sql.identifier(t));
  await db.execute(
    sql`TRUNCATE ${sql.join(identifiers, sql`, `)} RESTART IDENTITY CASCADE`
  );
}

async function main() {
  console.info('Cleaning database...');
  await truncateAll();
  console.info('All tables truncated.');

  // ─── Roles & permissions ─────────────────────────────────────────────
  const roleByName = new Map<string, RoleRef>();
  for (const name of ROLE_NAMES) {
    let inserted = await db
      .insert(schema.roles)
      .values({ name, description: ROLE_DESCRIPTIONS[name] })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) {
      const [existing] = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.name, name));
      inserted = [existing];
    }
    const roleRef = inserted[0];
    roleByName.set(name, roleRef);

    const rows = PERMISSION_MATRIX.filter(p => p.roles[name]).map(p => {
      const [resource, action] = p.key.split('.');
      return { roleId: roleRef.id, resource, action, allowed: true };
    });
    if (rows.length) {
      await db.insert(schema.permissions).values(rows).onConflictDoNothing();
    }
  }
  const adminRole = roleByName.get('Admin')!;
  const editorRole = roleByName.get('Editor')!;
  const authorRole = roleByName.get('Author')!;
  const viewerRole = roleByName.get('Viewer')!;
  console.info(`Roles: ${Array.from(roleByName.keys()).join(', ')}`);

  const passwordHash = await hashPassword(TEST_PASSWORD);

  const createUser = async (
    email: string,
    name: string,
    roleId: string,
    status: 'Active' | 'Inactive' = 'Active'
  ): Promise<UserRef> => {
    const id = createId();
    await db.insert(schema.users).values({
      id,
      name,
      email,
      passwordHash,
      status,
      roleId,
      emailVerified: true,
    });
    return { id, email, roleId };
  };

  const adminUser = await createUser(
    'admin@nextcms.test',
    'Admin User',
    adminRole.id
  );
  const editorUser = await createUser(
    'editor@nextcms.test',
    'Editor User',
    editorRole.id
  );
  const authorUser = await createUser(
    'author@nextcms.test',
    'Author User',
    authorRole.id
  );
  const viewerUser = await createUser(
    'viewer@nextcms.test',
    'Viewer User',
    viewerRole.id
  );

  // ─── Site ────────────────────────────────────────────────────────────
  const siteConfigs = [
    {
      id: DEFAULT_SITE_ID,
      name: 'Next CMS',
      slug: 'main',
      primaryHost: null,
      locales: DEFAULT_SITE_LOCALES,
    },
  ];

  const siteCtxById = new Map<string, SiteCtx>();

  for (const cfg of siteConfigs) {
    await db.insert(schema.sites).values({
      id: cfg.id,
      name: cfg.name,
      slug: cfg.slug,
      primaryHost: cfg.primaryHost,
      extraDomains: [],
      defaultLocale: cfg.locales[0].code,
      locales: cfg.locales,
    });

    const memberships = [
      { userId: adminUser.id, siteId: cfg.id, roleId: adminRole.id },
      { userId: editorUser.id, siteId: cfg.id, roleId: editorRole.id },
      { userId: authorUser.id, siteId: cfg.id, roleId: authorRole.id },
      { userId: viewerUser.id, siteId: cfg.id, roleId: viewerRole.id },
    ];

    for (const m of memberships) {
      await db.insert(schema.siteMemberships).values(m);
    }

    siteCtxById.set(cfg.id, {
      siteId: cfg.id,
      name: cfg.name,
      admin: adminUser,
      editor: editorUser,
      author: authorUser,
      viewer: viewerUser,
    });
  }
  console.info(`Sites: ${siteConfigs.length}`);

  // ─── Site settings (one per site) ────────────────────────────────────
  for (const ctx of siteCtxById.values()) {
    await db.insert(schema.siteSettings).values({
      id: `site-settings-${ctx.siteId}`,
      siteId: ctx.siteId,
      siteName: ctx.name,
      siteDescription: 'Headless CMS & Visual Page Builder — demo site',
      seoTitle: `${ctx.name} — Visual page builder and blog`,
      seoDescription: 'A demo site with every builder block and the complete user guide.',
      siteUrl: 'http://localhost:3001',
      defaultOgImage: SEED_IMAGES.office,
      themeTokens: DEFAULT_THEME_TOKENS,
      videoSettings: DEFAULT_VIDEO_SETTINGS,
    });
  }
  console.info(`Site settings: ${siteCtxById.size}`);

  const nowDate = () => new Date();

  // ─── Menus & menu items (per site) ───────────────────────────────────
  let totalMenus = 0;
  let totalMenuItems = 0;
  for (const ctx of siteCtxById.values()) {
    const [header] = await db
      .insert(schema.menus)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        title: 'Main Navigation',
        location: 'header',
        language: 'en',
      })
      .returning();
    const [footer] = await db
      .insert(schema.menus)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        title: 'Footer Navigation',
        location: 'footer',
        language: 'en',
      })
      .returning();

    const headerMenuId = header.id;
    const footerMenuId = footer.id;

    const headerItems = [
      { label: 'Home', url: '/', order: 0 },
      { label: 'About', url: '/about', order: 1 },
      { label: 'Pricing', url: '/pricing', order: 2 },
      { label: 'Blog', url: '/blog', order: 3 },
      { label: 'Components', url: '/components', order: 4 },
      { label: 'User guide', url: '/user-guide', order: 5 },
      { label: 'Contact', url: '/contact', order: 6 },
    ];
    const footerItems = [
      { label: 'Privacy', url: '/privacy', order: 0 },
      { label: 'Terms', url: '/terms', order: 1 },
      { label: 'Search', url: '/search', order: 2 },
      { label: 'User guide (PDF)', url: GUIDE_PDF_PATH, order: 3 },
    ];

    for (const [menuId, items] of [
      [headerMenuId, headerItems],
      [footerMenuId, footerItems],
    ] as const) {
      for (const item of items) {
        await db.insert(schema.menuItems).values({
          id: createId(),
          menuId,
          parentId: null,
          label: item.label,
          url: item.url,
          target: '_self',
          order: item.order,
        });
        totalMenuItems++;
      }
    }

    await db
      .update(schema.siteSettings)
      .set({ headerMenuId, footerMenuId })
      .where(eq(schema.siteSettings.id, `site-settings-${ctx.siteId}`));

    totalMenus += 2;
  }
  console.info(`Menus: ${totalMenus}, menu items: ${totalMenuItems}`);

  // ─── Categories & tags (per site) ────────────────────────────────────
  let totalCategories = 0;
  let totalTags = 0;
  const categoryBySite = new Map<string, { id: string; name: string }[]>();
  const tagBySite = new Map<string, { id: string; name: string }[]>();
  for (const ctx of siteCtxById.values()) {
    const cats = [
      { name: 'Design', slug: 'design' },
      { name: 'Engineering', slug: 'engineering' },
      { name: 'Marketing', slug: 'marketing' },
    ];
    const insertedCats: { id: string; name: string }[] = [];
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const [row] = await db
        .insert(schema.categories)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          name: cat.name,
          slug: cat.slug,
          description: `${cat.name} category`,
          parentId: i === 0 ? null : insertedCats[0].id,
          language: 'en',
          createdBy: ctx.admin.id,
        })
        .returning();
      insertedCats.push({ id: row.id, name: cat.name });
      totalCategories++;
    }
    categoryBySite.set(ctx.siteId, insertedCats);

    const tags = [
      { name: 'Featured', slug: 'featured', color: '#ef4444' },
      { name: 'Tutorial', slug: 'tutorial', color: '#3b82f6' },
      { name: 'News', slug: 'news', color: '#10b981' },
    ];
    const insertedTags: { id: string; name: string }[] = [];
    for (const tag of tags) {
      const [row] = await db
        .insert(schema.tags)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          language: 'en',
          createdBy: ctx.admin.id,
        })
        .returning();
      insertedTags.push({ id: row.id, name: tag.name });
      totalTags++;
    }
    tagBySite.set(ctx.siteId, insertedTags);
  }
  console.info(`Categories: ${totalCategories}, tags: ${totalTags}`);

  // ─── Pages (per site) ────────────────────────────────────────────────
  const pageBySite = new Map<string, { id: string; title: string; slug: string }[]>();
  let totalPages = 0;
  let totalPageContents = 0;
  let totalPageRevisions = 0;
  let totalSeo = 0;
  let totalPreviewTokens = 0;
  let totalPageViews = 0;
  let totalEditorLocks = 0;
  let totalSearchDocuments = 0;

  const templatesBySite = new Map<string, Awaited<ReturnType<typeof seedSiteTemplates>>>();
  let totalGlobalBlocks = 0;
  for (const ctx of siteCtxById.values()) {
    // Site templates, contact form, and post templates come first: pages
    // and posts point at them.
    const siteTemplates = await seedSiteTemplates({
      siteId: ctx.siteId,
      adminId: ctx.admin.id,
      settingsId: `site-settings-${ctx.siteId}`,
    });
    templatesBySite.set(ctx.siteId, siteTemplates);
    totalGlobalBlocks += 9;

    const globalIds = new Map<string, string>();
    for (const starter of STARTER_GLOBAL_BLOCKS) {
      assertValid(starter.name, starter.content);
      const [row] = await db
        .insert(schema.globalBlocks)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          name: starter.name,
          category: starter.category,
          content: starter.content,
          publishedContent: starter.content,
          publishedAt: nowDate(),
          createdBy: ctx.admin.id,
        })
        .returning();
      globalIds.set(starter.name, row.id);
      totalGlobalBlocks++;
    }

    const baseSlugs = seedPageDefs({
      contactFormId: siteTemplates.contactFormId,
      ctaGlobalId: globalIds.get('Standard CTA banner') ?? [...globalIds.values()][0],
    });
    const pages: { id: string; title: string; slug: string }[] = [];
    for (let i = 0; i < baseSlugs.length; i++) {
      const {
        title,
        slug,
        isHome = false,
        isBlogIndex = false,
        status,
        description,
        content,
      } = baseSlugs[i];
      assertValid(title, content);
      const [page] = await db
        .insert(schema.pages)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          title,
          slug,
          status,
          visibility: 'public',
          editorType: 'builder',
          isHome,
          isBlogIndex,
          language: 'en',
          publishedAt: status === 'published' ? nowDate() : null,
          createdBy: status === 'review' ? (ctx.author ?? ctx.admin).id : ctx.admin.id,
        })
        .returning();
      pages.push({ id: page.id, title, slug });
      totalPages++;

      // Page content: drafts only get a draft; everything else is live too.
      const kinds = status === 'published' ? (['draft', 'published'] as const) : (['draft'] as const);
      for (const kind of kinds) {
        await db.insert(schema.pageContents).values({
          id: createId(),
          pageId: page.id,
          kind,
          content,
        });
        totalPageContents++;
      }

      // Page revision
      await db.insert(schema.pageRevisions).values({
        id: createId(),
        pageId: page.id,
        editorType: 'builder',
        kind: status === 'published' ? 'published' : 'manual',
        title,
        label: status === 'published' ? 'First publish' : 'First draft',
        content,
        authorId: ctx.admin.id,
      });
      totalPageRevisions++;

      // SEO meta
      await db.insert(schema.seoMeta).values({
        id: createId(),
        pageId: page.id,
        title: `${title} | ${ctx.name}`,
        description,
        noIndex: slug === 'team-member',
      });
      totalSeo++;

      // Categories & tags
      const cats = categoryBySite.get(ctx.siteId)!;
      const tags = tagBySite.get(ctx.siteId)!;
      await db.insert(schema.pageCategories).values({
        pageId: page.id,
        categoryId: cats[i % cats.length].id,
      });
      await db.insert(schema.pageTags).values({
        pageId: page.id,
        tagId: tags[i % tags.length].id,
      });

      // Preview token
      await db.insert(schema.previewTokens).values({
        id: createId(),
        pageId: page.id,
        postId: null,
        token: `preview_${ctx.siteId}_${slug}_${createId().slice(-8)}`,
        status: 'active',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        viewCount: 0,
        createdBy: ctx.admin.id,
      });
      totalPreviewTokens++;

      // Page views
      await db.insert(schema.pageViews).values({
        id: createId(),
        siteId: ctx.siteId,
        pageId: page.id,
        postId: null,
        path: `/${slug}`,
        referrerHost: null,
        visitorId: `visitor_${createId().slice(-6)}`,
        variant: null,
      });
      totalPageViews++;

      // Editor lock: one draft is "open" by the editor to show the lock UI.
      if (slug === 'careers') {
        await db.insert(schema.editorLocks).values({
          id: createId(),
          siteId: ctx.siteId,
          targetType: 'page',
          targetId: page.id,
          userId: (ctx.editor ?? ctx.admin).id,
          lastSeenAt: nowDate(),
        });
        totalEditorLocks++;
      }
    }
    pageBySite.set(ctx.siteId, pages);
  }
  console.info(
    `Pages: ${totalPages}, page contents: ${totalPageContents}, page revisions: ${totalPageRevisions}, seo: ${totalSeo}, preview tokens: ${totalPreviewTokens}, page views: ${totalPageViews}, editor locks: ${totalEditorLocks}`
  );

  // ─── Posts (per site) ────────────────────────────────────────────────
  let totalPosts = 0;
  let totalPostContents = 0;
  let totalPostRevisions = 0;
  let totalPostSeo = 0;
  const postBySite = new Map<string, { id: string; title: string; slug: string }[]>();

  const demoPosts = [
    {
      title: 'Getting started with Next CMS',
      slug: 'getting-started',
      image: SEED_IMAGES.laptop,
      layout: 'template' as const,
      featured: false,
      body: '<p>This demo site was created by <code>pnpm db:seed</code>. Every page uses real builder blocks, and the header, footer, search, and archive pages use the default site templates.</p><h2>Where to go next</h2><ul><li>Open the <a href="/components">components page</a> to see every block.</li><li>Read the <a href="/user-guide">user guide</a>.</li><li>Sign in at <a href="/login">/login</a> as <code>admin@nextcms.test</code>.</li></ul>',
    },
    {
      title: 'Building better landing pages',
      slug: 'better-landing-pages',
      image: SEED_IMAGES.desk,
      layout: 'template' as const,
      featured: true,
      body: '<p>A good landing page has one goal. Start with a Hero that states it, prove it with Features and Stats, remove doubt with Testimonials and an FAQ, and finish with a single call to action.</p><h2>Keep it on brand</h2><p>Save sections you reuse as global blocks, and start new pages from page templates.</p>',
    },
    {
      title: 'Designing a post with a custom layout',
      slug: 'custom-layout-post',
      image: SEED_IMAGES.meeting,
      layout: 'custom' as const,
      featured: false,
      body: '<p>This post ignores the post templates and uses its own canvas, built in the post builder.</p><p>Use a custom layout for special stories such as launches or case studies.</p>',
    },
  ];

  for (const ctx of siteCtxById.values()) {
    const siteTemplates = templatesBySite.get(ctx.siteId)!;
    const posts: { id: string; title: string; slug: string }[] = [];
    for (let i = 0; i < demoPosts.length; i++) {
      const demo = demoPosts[i];
      const { title, slug } = demo;
      const canvas =
        demo.layout === 'custom'
          ? assertValid(title, page([
              block('PostFeaturedImage', { aspect: '16/9' }),
              block('PostTitle', { showBackLink: true, showExcerpt: true, alignment: 'center' }),
              block('Columns', {
                layout: '2-1',
                column1: [block('PostContent', { width: 'full' })],
                column2: [block('PostMeta', {}), block('CTA', { title: 'Try the builder', description: 'Sign in and open the post builder.', primaryButtonText: 'Sign in', primaryButtonLink: '/login', secondaryButtonText: '', secondaryButtonLink: '', variant: 'subtle' })],
              }),
              block('RelatedPosts', { title: 'More posts', limit: 3, columns: 3 }),
            ]))
          : null;
      const [post] = await db
        .insert(schema.posts)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          title,
          slug,
          excerpt: demo.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160),
          featuredImage: demo.image,
          status: 'published',
          visibility: 'public',
          layout: demo.layout,
          templateId: demo.featured ? siteTemplates.featuredPostLayoutId : siteTemplates.defaultPostLayoutId,
          language: 'en',
          publishedAt: new Date(Date.now() + (i + 1) * 60 * 1000),
          createdBy: i === 0 ? ctx.admin.id : (ctx.author ?? ctx.admin).id,
        })
        .returning();
      posts.push({ id: post.id, title, slug });
      totalPosts++;

      for (const kind of ['draft', 'published'] as const) {
        await db.insert(schema.postContents).values({
          id: createId(),
          postId: post.id,
          kind,
          body: demo.body,
          canvas,
        });
        totalPostContents++;
      }

      await db.insert(schema.postRevisions).values({
        id: createId(),
        postId: post.id,
        kind: 'published',
        title,
        label: 'First publish',
        layout: demo.layout,
        body: demo.body,
        canvas,
        authorId: ctx.admin.id,
      });
      totalPostRevisions++;

      await db.insert(schema.postSeo).values({
        id: createId(),
        postId: post.id,
        title: `${title} | ${ctx.name}`,
        description: `Read about ${title.toLowerCase()} on ${ctx.name}.`,
        noIndex: false,
      });
      totalPostSeo++;

      const cats = categoryBySite.get(ctx.siteId)!;
      const tags = tagBySite.get(ctx.siteId)!;
      await db.insert(schema.postCategories).values({
        postId: post.id,
        categoryId: cats[i % cats.length].id,
      });
      await db.insert(schema.postTags).values({
        postId: post.id,
        tagId: tags[i % tags.length].id,
      });

      await db.insert(schema.pageViews).values({
        id: createId(),
        siteId: ctx.siteId,
        pageId: null,
        postId: post.id,
        path: `/blog/${slug}`,
        referrerHost: null,
        visitorId: `visitor_${createId().slice(-6)}`,
        variant: null,
      });
      totalPageViews++;
    }

    // The user guide: one post per topic.
    const tutorialTag = tagBySite.get(ctx.siteId)!.find(tag => tag.name === 'Tutorial');
    const guide = await seedGuidePosts({
      siteId: ctx.siteId,
      authorId: ctx.admin.id,
      templateId: siteTemplates.defaultPostLayoutId,
      tagIds: tutorialTag ? [tutorialTag.id] : [],
    });
    posts.push(...guide.posts);
    totalPosts += guide.posts.length;
    totalPostContents += guide.posts.length * 2;
    totalPostSeo += guide.posts.length;

    // Example display rule: guide posts get the header with the top bar.
    await db.insert(schema.templateRules).values({
      siteId: ctx.siteId,
      templateId: siteTemplates.headerAlt,
      area: 'header',
      kind: 'category',
      value: guide.categoryId,
      priority: 10,
    });

    postBySite.set(ctx.siteId, posts);
  }
  // Search index: the app's own indexer, so paths match path/host routing.
  for (const ctx of siteCtxById.values()) {
    for (const p of pageBySite.get(ctx.siteId)!) {
      await searchIndex.syncPage(p.id);
    }
    for (const p of postBySite.get(ctx.siteId)!) {
      await searchIndex.syncPost(p.id);
    }
  }
  const [{ count: indexed }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.searchDocuments);
  totalSearchDocuments = indexed;

  console.info(
    `Post templates: ${siteCtxById.size * 2}, posts: ${totalPosts}, post contents: ${totalPostContents}, post revisions: ${totalPostRevisions}, post seo: ${totalPostSeo}`
  );

  // ─── Collections, fields, entries (per site) ─────────────────────────
  let totalCollections = 0;
  let totalCollectionFields = 0;
  let totalCollectionEntries = 0;
  for (const ctx of siteCtxById.values()) {
    const [collection] = await db
      .insert(schema.collections)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        name: 'Authors',
        slug: 'authors',
        templatePageId: null,
        status: 'active',
      })
      .returning();
    totalCollections++;

    const fields: Array<{
      key: string;
      label: string;
      type: (typeof schema.collectionFieldTypeEnum.enumValues)[number];
      required: boolean;
    }> = [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'bio', label: 'Bio', type: 'richtext', required: false },
      { key: 'twitter', label: 'Twitter', type: 'text', required: false },
    ];
    let position = 0;
    for (const f of fields) {
      await db.insert(schema.collectionFields).values({
        id: createId(),
        collectionId: collection.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        position: position++,
        config: {},
      });
      totalCollectionFields++;
    }

    const entries: Array<{
      slug: string;
      data: Record<string, unknown>;
      status: 'published' | 'draft';
    }> = [
      {
        slug: 'jane-doe',
        data: { name: 'Jane Doe', bio: 'Content strategist', twitter: '@jane' },
        status: 'published',
      },
      {
        slug: 'john-smith',
        data: { name: 'John Smith', bio: 'Lead developer', twitter: null },
        status: 'draft',
      },
    ];
    for (const e of entries) {
      await db.insert(schema.collectionEntries).values({
        id: createId(),
        siteId: ctx.siteId,
        collectionId: collection.id,
        slug: e.slug,
        status: e.status,
        data: e.data,
        publishedAt: e.status === 'published' ? nowDate() : null,
      });
      totalCollectionEntries++;
    }

    // Team: entries get public pages rendered with the "Team member" page.
    const teamPage = pageBySite.get(ctx.siteId)!.find(p => p.slug === 'team-member');
    const [team] = await db
      .insert(schema.collections)
      .values({
        siteId: ctx.siteId,
        name: 'Team',
        slug: 'team',
        templatePageId: teamPage?.id ?? null,
        status: 'active',
      })
      .returning();
    totalCollections++;
    const teamFields: typeof fields = [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'photo', label: 'Photo', type: 'media', required: false },
      { key: 'bio', label: 'Bio', type: 'richtext', required: false },
    ];
    for (const [index, f] of teamFields.entries()) {
      await db.insert(schema.collectionFields).values({
        collectionId: team.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        position: index,
        config: {},
      });
      totalCollectionFields++;
    }
    const members = [
      { slug: 'ava-thompson', name: 'Ava Thompson', role: 'Founder', photo: SEED_IMAGES.person1, bio: '<p>Ava started Next CMS to give editors a builder they enjoy.</p>' },
      { slug: 'leo-martins', name: 'Leo Martins', role: 'Engineering', photo: SEED_IMAGES.person2, bio: '<p>Leo leads the builder engine and the public API.</p>' },
      { slug: 'sara-ahmed', name: 'Sara Ahmed', role: 'Design', photo: SEED_IMAGES.person3, bio: '<p>Sara designs the blocks, templates, and theme tokens.</p>' },
    ];
    for (const { slug, ...data } of members) {
      await db.insert(schema.collectionEntries).values({
        siteId: ctx.siteId,
        collectionId: team.id,
        slug,
        status: 'published',
        data,
        publishedAt: nowDate(),
      });
      totalCollectionEntries++;
    }
  }
  console.info(
    `Collections: ${totalCollections}, collection fields: ${totalCollectionFields}, collection entries: ${totalCollectionEntries}`
  );

  // ─── Media, global blocks, page templates (per site) ─────────────────
  let totalMedia = 0;
  let totalPageTemplates = 0;
  for (const ctx of siteCtxById.values()) {
    // Media: the images the seeded pages use.
    for (const [name, url] of Object.entries(SEED_IMAGES)) {
      const portrait = name.startsWith('person');
      await db.insert(schema.media).values({
        id: createId(),
        siteId: ctx.siteId,
        key: `media/${ctx.siteId}/${name}.jpg`,
        url,
        filename: `${name}.jpg`,
        title: name.replace(/(\d)/, ' $1').replace(/^./, c => c.toUpperCase()),
        alt: portrait ? 'Team member portrait' : `Stock photo: ${name}`,
        mime: 'image/jpeg',
        size: 180000,
        width: portrait ? 400 : 1200,
        height: portrait ? 400 : 800,
        folder: portrait ? 'team' : 'stock',
        createdBy: ctx.admin.id,
      });
      totalMedia++;
    }

    // Page templates (starter templates, scoped to site)
    for (const template of STARTER_TEMPLATES) {
      const { key: _key, ...values } = template;
      await db.insert(schema.pageTemplates).values({
        ...values,
        siteId: ctx.siteId,
        content: values.content as object,
        isSystem: true,
        createdBy: ctx.admin.id,
      });
      totalPageTemplates++;
    }
  }
  console.info(
    `Media: ${totalMedia}, global blocks: ${totalGlobalBlocks}, page templates: ${totalPageTemplates}`
  );

  // ─── Analytics dashboards & page experiments (per site) ──────────────
  let totalDashboards = 0;
  let totalExperiments = 0;
  for (const ctx of siteCtxById.values()) {
    await db.insert(schema.analyticsDashboards).values({
      id: createId(),
      siteId: ctx.siteId,
      name: 'Overview',
      createdBy: ctx.admin.id,
      layout: { range: 30, widgets: [] },
    });
    totalDashboards++;

    const sitePages = pageBySite.get(ctx.siteId)!;
    for (const page of sitePages.slice(0, 2)) {
      await db.insert(schema.pageExperiments).values({
        id: createId(),
        siteId: ctx.siteId,
        pageId: page.id,
        variantContent: { root: { props: {} }, content: [], zones: {} },
        weight: 50,
        status: 'draft',
      });
      totalExperiments++;
    }
  }
  console.info(
    `Analytics dashboards: ${totalDashboards}, page experiments: ${totalExperiments}`
  );

  // ─── API keys & rate windows (per site) ──────────────────────────────
  let totalApiKeys = 0;
  let totalRateWindows = 0;
  for (const ctx of siteCtxById.values()) {
    const [apiKey] = await db
      .insert(schema.apiKeys)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        name: `${ctx.name} API key`,
        prefix: 'nc_live',
        hashedKey: `$2b$10$dummy${createId().slice(-16)}`,
        scopes: ['content:read', 'content:write'],
        createdBy: ctx.admin.id,
      })
      .returning();
    totalApiKeys++;

    await db.insert(schema.apiRateWindows).values({
      apiKeyId: apiKey.id,
      windowStart: new Date(Date.now() - 60 * 60 * 1000),
      count: 42,
    });
    totalRateWindows++;
  }
  console.info(`API keys: ${totalApiKeys}, rate windows: ${totalRateWindows}`);

  // ─── Form submissions, redirects, search documents, login tokens ─────
  let totalFormSubmissions = 0;
  let totalRedirects = 0;
  let totalLoginTokens = 0;
  for (const ctx of siteCtxById.values()) {
    const formId = templatesBySite.get(ctx.siteId)!.contactFormId;
    const submissions = [
      { payload: { name: 'Nadia Rahman', email: 'nadia@example.com', topic: 'Pricing', message: 'Do you offer a discount for non-profits?' }, status: 'new' as const, spam: false },
      { payload: { name: 'Tom Becker', email: 'tom@example.com', topic: 'Support', message: 'How do I add a page to the header menu?' }, status: 'read' as const, spam: false },
      { payload: { name: 'Win Big', email: 'promo@spam.test', topic: '', message: 'Click here for free prizes!!!' }, status: 'new' as const, spam: true },
    ];
    for (const submission of submissions) {
      await db.insert(schema.formSubmissions).values({
        id: createId(),
        siteId: ctx.siteId,
        formGlobalId: formId,
        ...submission,
      });
      totalFormSubmissions++;
    }

    for (const [fromPath, toPath, statusCode] of [
      ['/old-page', '/about', 301],
      ['/docs', '/user-guide', 301],
      ['/promo', '/pricing', 302],
    ] as const) {
      await db.insert(schema.redirects).values({
        id: createId(),
        siteId: ctx.siteId,
        fromPath,
        toPath,
        statusCode,
      });
      totalRedirects++;
    }

    await db.insert(schema.loginTokens).values({
      id: createId(),
      siteId: ctx.siteId,
      email: 'admin@nextcms.test',
      tokenHash: `tokenhash_${createId().slice(-12)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
    });
    totalLoginTokens++;
  }
  console.info(
    `Form submissions: ${totalFormSubmissions}, redirects: ${totalRedirects}, search documents: ${totalSearchDocuments}, login tokens: ${totalLoginTokens}`
  );

  // ─── Personalization & personalized sections (per user) ──────────────
  let totalPersonalizations = 0;
  let totalPersonalizedSections = 0;
  const allUsers = [adminUser, editorUser, authorUser, viewerUser];
  for (const user of allUsers) {
    const [personalization] = await db.insert(schema.personalizations).values({
      id: createId(),
      userId: user.id,
      pathname: '/dashboard',
      query: { tab: 'overview' },
    }).returning();
    totalPersonalizations++;

    await db.insert(schema.personalizedSections).values({
      id: createId(),
      personalizationId: personalization.id,
      dataset: 'pages',
      visibility: { hero: true, sidebar: false },
      limit: 10,
    });
    totalPersonalizedSections++;
  }
  console.info(
    `Personalizations: ${totalPersonalizations}, personalized sections: ${totalPersonalizedSections}`
  );

  // ─── Video playlists, videos, video progress (per site) ──────────────
  let totalPlaylists = 0;
  let totalVideos = 0;
  let totalVideoProgress = 0;
  for (const ctx of siteCtxById.values()) {
    const [playlist] = await db
      .insert(schema.videoPlaylists)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        name: 'Featured Videos',
        slug: 'featured-videos',
        description: 'A selection of featured videos',
        position: 0,
        createdBy: ctx.admin.id,
      })
      .returning();
    totalPlaylists++;

    for (let i = 0; i < 2; i++) {
      const [video] = await db
        .insert(schema.videos)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          playlistId: playlist.id,
          title: `Video ${i + 1}`,
          slug: `video-${i + 1}`,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          provider: 'youtube',
          providerId: 'dQw4w9WgXcQ',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          duration: 210,
          status: 'published',
          visibility: 'public',
          position: i,
          publishedAt: nowDate(),
          createdBy: ctx.admin.id,
        })
        .returning();
      totalVideos++;

      await db.insert(schema.videoProgress).values({
        id: createId(),
        siteId: ctx.siteId,
        videoId: video.id,
        userId: ctx.admin.id,
        position: i * 30,
        duration: 210,
        completed: i === 1,
      });
      totalVideoProgress++;
    }
  }
  console.info(
    `Video playlists: ${totalPlaylists}, videos: ${totalVideos}, video progress: ${totalVideoProgress}`
  );

  // ─── Webhook subscriptions & deliveries (per site) ───────────────────
  let totalWebhookSubs = 0;
  let totalWebhookDeliveries = 0;
  for (const ctx of siteCtxById.values()) {
    const [sub] = await db
      .insert(schema.webhookSubscriptions)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        url: `https://${ctx.siteId}.example.com/hooks`,
        secret: `whsec_${createId().slice(-16)}`,
        events: ['content.published', 'entry.changed'],
      })
      .returning();
    totalWebhookSubs++;

    await db.insert(schema.webhookDeliveries).values({
      id: createId(),
      subscriptionId: sub.id,
      event: 'content.published',
      payload: { pageId: 'page-123', title: 'Hello' },
      status: 'delivered',
      responseStatus: 200,
      error: null,
    });
    totalWebhookDeliveries++;
  }
  console.info(
    `Webhook subscriptions: ${totalWebhookSubs}, webhook deliveries: ${totalWebhookDeliveries}`
  );

  // ─── Audit logs, sessions, account (global) ──────────────────────────
  let totalAuditLogs = 0;
  let totalSessions = 0;
  let totalAccounts = 0;
  for (const user of allUsers) {
    await db.insert(schema.auditLogs).values({
      id: createId(),
      actorId: user.id,
      action: 'content.published',
      targetType: 'page',
      targetId: null,
      targetName: null,
      details: 'Seed audit entry',
    });
    totalAuditLogs++;

    await db.insert(schema.sessions).values({
      id: createId(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userIp: '127.0.0.1',
      userAgent: 'seed-script/1.0',
    });
    totalSessions++;
  }

  await db.insert(schema.accounts).values({
    userId: adminUser.id,
    provider: 'google',
    providerAccountId: 'google_123456789',
  });
  totalAccounts++;

  console.info(
    `Audit logs: ${totalAuditLogs}, sessions: ${totalSessions}, accounts: ${totalAccounts}`
  );

  console.info('\nSeed complete. Test accounts (password: Test1234!):');
  console.info('  admin@nextcms.test   - Admin');
  console.info('  editor@nextcms.test  - Editor');
  console.info('  author@nextcms.test  - Author');
  console.info('  viewer@nextcms.test  - Viewer');
  console.info(`\nRun \`pnpm guide:pdf\` to (re)build ${GUIDE_PDF_PATH}.`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
