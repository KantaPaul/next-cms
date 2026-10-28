/**
 * Multisite seed script.
 *
 * Truncates every application table (except drizzle's `ledgerly_migrations`)
 * and seeds test data across multiple sites so the CMS can be exercised in a
 * multisite configuration.
 *
 * Idempotent: safe to re-run with `pnpm db:seed`.
 *
 * Seed accounts (password `Test1234!` for all):
 *   admin@nextcms.test   - Admin   (member of every site)
 *   editor@nextcms.test  - Editor  (default + acme)
 *   author@nextcms.test  - Author  (default only)
 *   viewer@nextcms.test  - Viewer  (default only)
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

  // ─── Sites (multisite) ───────────────────────────────────────────────
  const siteConfigs = [
    {
      id: DEFAULT_SITE_ID,
      name: 'Next CMS',
      slug: 'main',
      primaryHost: null,
      locales: DEFAULT_SITE_LOCALES,
    },
    {
      id: 'site-acme',
      name: 'Acme Marketing',
      slug: 'acme',
      primaryHost: 'acme.localhost',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Spanish' },
      ],
    },
    {
      id: 'site-devblog',
      name: 'Dev Blog',
      slug: 'devblog',
      primaryHost: 'devblog.localhost',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'French' },
        { code: 'ja', label: 'Japanese' },
      ],
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

    // Memberships: admin on every site; editor/author/viewer on default only
    // (editor also on acme for cross-site coverage).
    const memberships = [
      { userId: adminUser.id, siteId: cfg.id, roleId: adminRole.id },
      { userId: editorUser.id, siteId: cfg.id, roleId: editorRole.id },
      { userId: authorUser.id, siteId: cfg.id, roleId: authorRole.id },
      { userId: viewerUser.id, siteId: cfg.id, roleId: viewerRole.id },
    ].filter(m => {
      if (cfg.id === DEFAULT_SITE_ID) return true;
      if (cfg.id === 'site-acme' && m.userId === editorUser.id) return true;
      return m.userId === adminUser.id;
    });

    for (const m of memberships) {
      await db.insert(schema.siteMemberships).values(m);
    }

    siteCtxById.set(cfg.id, {
      siteId: cfg.id,
      name: cfg.name,
      admin: adminUser,
      editor: cfg.id === DEFAULT_SITE_ID || cfg.id === 'site-acme' ? editorUser : null,
      author: cfg.id === DEFAULT_SITE_ID ? authorUser : null,
      viewer: cfg.id === DEFAULT_SITE_ID ? viewerUser : null,
    });
  }
  console.info(`Sites: ${siteConfigs.length}`);

  // ─── Site settings (one per site) ────────────────────────────────────
  for (const ctx of siteCtxById.values()) {
    await db.insert(schema.siteSettings).values({
      id: `site-settings-${ctx.siteId}`,
      siteId: ctx.siteId,
      siteName: ctx.name,
      siteDescription: `Site settings for ${ctx.name}`,
      seoTitle: `${ctx.name} — Official Site`,
      seoDescription: `Welcome to ${ctx.name}`,
      siteUrl:
        ctx.siteId === DEFAULT_SITE_ID
          ? 'http://localhost:3000'
          : `http://${ctx.siteId}.localhost`,
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
      { label: 'Blog', url: '/blog', order: 2 },
      { label: 'Contact', url: '/contact', order: 3 },
    ];
    const footerItems = [
      { label: 'Privacy', url: '/privacy', order: 0 },
      { label: 'Terms', url: '/terms', order: 1 },
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

  for (const ctx of siteCtxById.values()) {
    const baseSlugs = [
      { title: 'Home', slug: 'home', isHome: true, isBlogIndex: false },
      { title: 'About', slug: 'about', isHome: false, isBlogIndex: false },
      { title: 'Contact', slug: 'contact', isHome: false, isBlogIndex: false },
      { title: 'Blog', slug: 'blog', isHome: false, isBlogIndex: true },
      { title: 'Privacy', slug: 'privacy', isHome: false, isBlogIndex: false },
    ];
    const pages: { id: string; title: string; slug: string }[] = [];
    for (let i = 0; i < baseSlugs.length; i++) {
      const { title, slug, isHome, isBlogIndex } = baseSlugs[i];
      const [page] = await db
        .insert(schema.pages)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          title,
          slug,
          status: i === 0 || isBlogIndex ? 'published' : 'draft',
          visibility: 'public',
          editorType: 'builder',
          isHome,
          isBlogIndex,
          language: 'en',
          createdBy: ctx.admin.id,
        })
        .returning();
      pages.push({ id: page.id, title, slug });
      totalPages++;

      // Page content (draft + published)
      for (const kind of ['draft', 'published'] as const) {
        await db.insert(schema.pageContents).values({
          id: createId(),
          pageId: page.id,
          kind,
          content: {
            root: {
              props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' },
            },
            content: [
              {
                type: 'Hero',
                props: {
                  title: `${title} — ${ctx.name}`,
                  subtitle: `A ${slug} page for ${ctx.name}`,
                  alignment: 'center',
                },
              },
            ],
            zones: {},
          },
        });
        totalPageContents++;
      }

      // Page revision
      await db.insert(schema.pageRevisions).values({
        id: createId(),
        pageId: page.id,
        editorType: 'builder',
        kind: 'published',
        title,
        label: 'First publish',
        content: { root: { props: {} }, content: [], zones: {} },
        authorId: ctx.admin.id,
      });
      totalPageRevisions++;

      // SEO meta
      await db.insert(schema.seoMeta).values({
        id: createId(),
        pageId: page.id,
        title: `${title} | ${ctx.name}`,
        description: `The ${slug} page of ${ctx.name}.`,
        noIndex: false,
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

      // Editor lock
      await db.insert(schema.editorLocks).values({
        id: createId(),
        siteId: ctx.siteId,
        targetType: 'page',
        targetId: page.id,
        userId: ctx.admin.id,
        lastSeenAt: nowDate(),
      });
      totalEditorLocks++;
    }
    pageBySite.set(ctx.siteId, pages);
  }
  console.info(
    `Pages: ${totalPages}, page contents: ${totalPageContents}, page revisions: ${totalPageRevisions}, seo: ${totalSeo}, preview tokens: ${totalPreviewTokens}, page views: ${totalPageViews}, editor locks: ${totalEditorLocks}`
  );

  // ─── Post templates & posts (per site) ───────────────────────────────
  let totalPostTemplates = 0;
  let totalPosts = 0;
  let totalPostContents = 0;
  let totalPostRevisions = 0;
  let totalPostSeo = 0;
  const postBySite = new Map<string, { id: string; title: string; slug: string }[]>();

  for (const ctx of siteCtxById.values()) {
    const [defaultTemplate] = await db
      .insert(schema.postTemplates)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        name: 'Default post layout',
        description: 'Single column article layout',
        content: null,
        draftContent: null,
        isDefault: true,
        createdBy: ctx.admin.id,
      })
      .returning();
    totalPostTemplates++;

    const editor = ctx.editor ?? ctx.admin;
    const [customTemplate] = await db
      .insert(schema.postTemplates)
      .values({
        id: createId(),
        siteId: ctx.siteId,
        name: 'Featured post layout',
        description: 'Wide layout with featured image',
        content: null,
        draftContent: null,
        isDefault: false,
        createdBy: editor.id,
      })
      .returning();
    totalPostTemplates++;

    const posts: { id: string; title: string; slug: string }[] = [];
    const postTitles = [
      'Getting started with multisite',
      'Building better landing pages',
      'The future of hybrid editing',
    ];
    for (let i = 0; i < postTitles.length; i++) {
      const title = postTitles[i];
      const slug = `post-${i + 1}`;
      const [post] = await db
        .insert(schema.posts)
        .values({
          id: createId(),
          siteId: ctx.siteId,
          title,
          slug,
          excerpt: `Excerpt for ${title}`,
          featuredImage: null,
          status: i === 0 ? 'published' : 'draft',
          visibility: 'public',
          layout: i === 2 ? 'custom' : 'template',
          templateId: i === 2 ? customTemplate.id : defaultTemplate.id,
          language: 'en',
          createdBy: i === 0 ? ctx.admin.id : ctx.author ? ctx.author.id : ctx.admin.id,
        })
        .returning();
      posts.push({ id: post.id, title, slug });
      totalPosts++;

      // Post content
      await db.insert(schema.postContents).values({
        id: createId(),
        postId: post.id,
        kind: 'published',
        body: `# ${title}\n\nThis is the body of the "${title}" post on ${ctx.name}.`,
        canvas: null,
      });
      totalPostContents++;

      // Post revision
      await db.insert(schema.postRevisions).values({
        id: createId(),
        postId: post.id,
        kind: 'published',
        title,
        label: 'First publish',
        layout: 'template',
        body: `# ${title}\n\nDraft body.`,
        canvas: null,
        authorId: ctx.admin.id,
      });
      totalPostRevisions++;

      // Post SEO
      await db.insert(schema.postSeo).values({
        id: createId(),
        postId: post.id,
        title: `${title} | ${ctx.name}`,
        description: `Read about ${title} on ${ctx.name}.`,
        noIndex: false,
      });
      totalPostSeo++;

      // Post categories & tags
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

      // Page view for post
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

      // Editor lock for post
      await db.insert(schema.editorLocks).values({
        id: createId(),
        siteId: ctx.siteId,
        targetType: 'post',
        targetId: post.id,
        userId: ctx.author ? ctx.author.id : ctx.admin.id,
        lastSeenAt: nowDate(),
      });
      totalEditorLocks++;
    }
    postBySite.set(ctx.siteId, posts);
  }
  console.info(
    `Post templates: ${totalPostTemplates}, posts: ${totalPosts}, post contents: ${totalPostContents}, post revisions: ${totalPostRevisions}, post seo: ${totalPostSeo}`
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

    const fields = [
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

    const entries = [
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
  }
  console.info(
    `Collections: ${totalCollections}, collection fields: ${totalCollectionFields}, collection entries: ${totalCollectionEntries}`
  );

  // ─── Media, global blocks, page templates (per site) ─────────────────
  let totalMedia = 0;
  let totalGlobalBlocks = 0;
  let totalPageTemplates = 0;
  for (const ctx of siteCtxById.values()) {
    // Media
    for (let i = 0; i < 3; i++) {
      await db.insert(schema.media).values({
        id: createId(),
        siteId: ctx.siteId,
        key: `media/${ctx.siteId}/image-${i + 1}.png`,
        url: `https://images.unsplash.com/photo-${1500000000 + i}?w=800`,
        filename: `image-${i + 1}.png`,
        title: `Image ${i + 1}`,
        alt: `Alt text for image ${i + 1}`,
        mime: 'image/png',
        size: 120000 + i * 1000,
        width: 800,
        height: 600,
        folder: 'uploads',
        createdBy: ctx.admin.id,
      });
      totalMedia++;
    }

    // Global blocks
    for (const block of STARTER_GLOBAL_BLOCKS) {
      await db.insert(schema.globalBlocks).values({
        id: createId(),
        siteId: ctx.siteId,
        name: block.name,
        category: block.category,
        content: block.content,
        createdBy: ctx.admin.id,
      });
      totalGlobalBlocks++;
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
      id: createId(),
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
  let totalSearchDocuments = 0;
  let totalLoginTokens = 0;
  for (const ctx of siteCtxById.values()) {
    await db.insert(schema.formSubmissions).values({
      id: createId(),
      siteId: ctx.siteId,
      formGlobalId: 'contact-form',
      payload: { name: 'Test User', email: 'test@example.com', message: 'Hello' },
      status: 'new',
      spam: false,
    });
    totalFormSubmissions++;

    await db.insert(schema.redirects).values({
      id: createId(),
      siteId: ctx.siteId,
      fromPath: '/old-page',
      toPath: '/about',
      statusCode: 301,
    });
    totalRedirects++;

    const sitePages = pageBySite.get(ctx.siteId)!;
    const sitePosts = postBySite.get(ctx.siteId)!;
    await db.insert(schema.searchDocuments).values({
      id: createId(),
      siteId: ctx.siteId,
      kind: 'page',
      pageId: sitePages[0].id,
      postId: null,
      title: sitePages[0].title,
      path: `/${sitePages[0].slug}`,
      language: 'en',
      body: `Searchable body for ${sitePages[0].title}`,
    });
    totalSearchDocuments++;

    await db.insert(schema.searchDocuments).values({
      id: createId(),
      siteId: ctx.siteId,
      kind: 'post',
      pageId: null,
      postId: sitePosts[0].id,
      title: sitePosts[0].title,
      path: `/blog/${sitePosts[0].slug}`,
      language: 'en',
      body: `Searchable body for ${sitePosts[0].title}`,
    });
    totalSearchDocuments++;

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
  console.info('  admin@nextcms.test   - Admin   (all sites)');
  console.info('  editor@nextcms.test  - Editor  (default + acme)');
  console.info('  author@nextcms.test  - Author  (default)');
  console.info('  viewer@nextcms.test  - Viewer  (default)');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
