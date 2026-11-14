import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { DEFAULT_THEME_TOKENS, type ThemeTokens } from '@/db/schemas/pages.schema';
import type { SiteLocale } from '@/db/schemas/sites.schema';
import { DEFAULT_VIDEO_SETTINGS } from '@/db/schemas/video.schema';
import { block, page } from '../builder-nodes';

export const DEMO_LOCALES: SiteLocale[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

export type DemoUserRefs = {
  adminId: string;
  editorId: string;
  authorId: string;
  viewerId: string;
  adminRoleId: string;
  editorRoleId: string;
  authorRoleId: string;
  viewerRoleId: string;
};

export async function clearSiteData(siteId: string) {
  await db.delete(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId));
  await db.delete(schema.menus).where(eq(schema.menus.siteId, siteId));
  await db.delete(schema.pages).where(eq(schema.pages.siteId, siteId));
  await db.delete(schema.posts).where(eq(schema.posts.siteId, siteId));
  await db.delete(schema.categories).where(eq(schema.categories.siteId, siteId));
  await db.delete(schema.tags).where(eq(schema.tags.siteId, siteId));
  await db.delete(schema.collections).where(eq(schema.collections.siteId, siteId));
  await db.delete(schema.pageTemplates).where(eq(schema.pageTemplates.siteId, siteId));
  await db.delete(schema.globalBlocks).where(eq(schema.globalBlocks.siteId, siteId));
  await db.delete(schema.siteMemberships).where(eq(schema.siteMemberships.siteId, siteId));
  await db.delete(schema.sites).where(eq(schema.sites.id, siteId));
}

export async function createDemoSiteShell({
  id,
  slug,
  name,
  description,
  locales = DEMO_LOCALES,
  themeTokens = DEFAULT_THEME_TOKENS,
  users,
  navLabels,
}: {
  id: string;
  slug: string;
  name: string;
  description: string;
  locales?: SiteLocale[];
  themeTokens?: Partial<ThemeTokens>;
  users: DemoUserRefs;
  navLabels: Record<string, Array<{ label: string; href: string }>>;
}) {
  await db.insert(schema.sites).values({
    id,
    name,
    slug,
    primaryHost: null,
    extraDomains: [],
    defaultLocale: locales[0].code,
    locales,
  });

  const memberships = [
    { userId: users.adminId, siteId: id, roleId: users.adminRoleId },
    { userId: users.editorId, siteId: id, roleId: users.editorRoleId },
    { userId: users.authorId, siteId: id, roleId: users.authorRoleId },
    { userId: users.viewerId, siteId: id, roleId: users.viewerRoleId },
  ];
  for (const m of memberships) {
    await db.insert(schema.siteMemberships).values(m);
  }

  const mergedTokens: ThemeTokens = {
    ...DEFAULT_THEME_TOKENS,
    ...themeTokens,
  };

  let defaultHeaderMenuId: string | null = null;
  let defaultFooterMenuId: string | null = null;

  for (const loc of locales) {
    const [headerMenu] = await db
      .insert(schema.menus)
      .values({
        id: createId(),
        siteId: id,
        title: `Main Navigation (${loc.code})`,
        location: 'header',
        language: loc.code,
      })
      .returning();
    const [footerMenu] = await db
      .insert(schema.menus)
      .values({
        id: createId(),
        siteId: id,
        title: `Footer Navigation (${loc.code})`,
        location: 'footer',
        language: loc.code,
      })
      .returning();

    if (loc.code === locales[0].code) {
      defaultHeaderMenuId = headerMenu.id;
      defaultFooterMenuId = footerMenu.id;
    }

    const items = navLabels[loc.code] ?? navLabels.en ?? [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prefix = loc.code === locales[0].code ? `/${slug}` : `/${slug}/${loc.code}`;
      const url = item.href === '/' ? prefix : `${prefix}${item.href}`;
      await db.insert(schema.menuItems).values({
        id: createId(),
        menuId: headerMenu.id,
        label: item.label,
        url,
        order: i,
      });
      await db.insert(schema.menuItems).values({
        id: createId(),
        menuId: footerMenu.id,
        label: item.label,
        url,
        order: i,
      });
    }
  }

  const headerTplId = createId();
  const footerTplId = createId();

  await db.insert(schema.pageTemplates).values([
    {
      id: headerTplId,
      siteId: id,
      name: `${name} Header`,
      category: 'header',
      content: page([
        block('HeaderBar', {
          brandName: name,
          showSearch: true,
          showLanguageSwitcher: true,
        }),
      ]) as unknown,
    },
    {
      id: footerTplId,
      siteId: id,
      name: `${name} Footer`,
      category: 'footer',
      content: page([
        block('FooterColumns', {
          columns: 3,
        }),
        block('Copyright', {
          text: `© ${new Date().getFullYear()} ${name}.`,
        }),
      ]) as unknown,
    },
  ]);

  const contactFormId = createId();
  await db.insert(schema.globalBlocks).values({
    id: contactFormId,
    siteId: id,
    name: 'Contact Form',
    category: 'contact-form',
    content: {
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ],
      submitLabel: 'Send message',
      successMessage: 'Thanks! We received your message.',
    } as never,
    publishedContent: {
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ],
      submitLabel: 'Send message',
      successMessage: 'Thanks! We received your message.',
    } as never,
  });

  await db.insert(schema.siteSettings).values({
    id: `site-settings-${id}`,
    siteId: id,
    siteName: name,
    siteDescription: description,
    seoTitle: name,
    seoDescription: description,
    siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
    headerMenuId: defaultHeaderMenuId,
    footerMenuId: defaultFooterMenuId,
    headerTemplateId: headerTplId,
    footerTemplateId: footerTplId,
    themeTokens: mergedTokens,
    videoSettings: DEFAULT_VIDEO_SETTINGS,
  });

  return { headerTplId, footerTplId, contactFormId };
}
