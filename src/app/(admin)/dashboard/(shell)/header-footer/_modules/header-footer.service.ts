import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks, pages, posts, users } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { PERMISSIONS } from '@/config/permissions';
import { getStarterContent } from '@/db/seed/header-footer-starters';

export type HeaderFooterItem = {
  id: string;
  name: string;
  category: 'Header' | 'Footer';
  content: unknown;
  publishedContent: unknown;
  publishedAt: Date | null;
  isPublished: boolean;
  hasDraftChanges: boolean;
  updatedAt: Date | null;
  createdByName: string | null;
  isSiteDefault: boolean;
  locales: string[];
  pageCount: number;
};

const DEFAULT_HEADER_CONTENT = {
  root: {
    props: {
      sticky: 'off',
      transparent: false,
      shrinkOnScroll: false,
      hideOnScrollDown: false,
      shadow: 'none',
      zIndex: 50,
    },
  },
  content: [
    {
      type: 'HeaderBar',
      props: {
        id: 'header-bar-main',
        width: 'boxed',
        background: 'default',
        paddingY: 'sm',
        align: 'center',
        borderBottom: true,
      },
    },
  ],
  zones: {
    'header-bar-main:left': [
      {
        type: 'Logo',
        props: {
          id: 'header-logo',
          source: 'site',
          width: 140,
          link: '/',
          showSiteName: true,
        },
      },
    ],
    'header-bar-main:right': [
      {
        type: 'NavMenu',
        props: {
          id: 'header-nav',
          location: 'header',
          orientation: 'horizontal',
          activeStyle: 'underline',
        },
      },
    ],
  },
};

const DEFAULT_FOOTER_CONTENT = {
  root: {
    props: {
      background: 'default',
      paddingY: 'lg',
    },
  },
  content: [
    {
      type: 'FooterColumns',
      props: {
        id: 'footer-cols-main',
        width: 'boxed',
        background: 'default',
        paddingY: 'lg',
        columns: 4,
        gap: 'lg',
      },
    },
    {
      type: 'FooterColumns',
      props: {
        id: 'footer-cols-bottom',
        width: 'boxed',
        background: 'default',
        paddingY: 'sm',
        columns: 1,
        gap: 'sm',
      },
    },
  ],
  zones: {
    'footer-cols-main:col1': [
      {
        type: 'Logo',
        props: {
          id: 'footer-logo',
          source: 'site',
          width: 120,
          link: '/',
          showSiteName: true,
        },
      },
    ],
    'footer-cols-main:col2': [
      {
        type: 'FooterLinks',
        props: {
          id: 'footer-quick-links',
          heading: 'Quick Links',
          source: 'manual',
          links: [
            { label: 'Home', url: '/' },
            { label: 'About', url: '/about' },
            { label: 'Blog', url: '/blog' },
          ],
        },
      },
    ],
    'footer-cols-bottom:col1': [
      {
        type: 'Copyright',
        props: {
          id: 'footer-copyright',
          text: '© {year} {site_name}. All rights reserved.',
          align: 'center',
        },
      },
    ],
  },
};

export const headerFooterService = {
  listHeaderFooters: async (): Promise<HeaderFooterItem[]> => {
    const siteId = await adminSiteId();

    const [rows, settings, pageRows, postRows] = await Promise.all([
      db
        .select({
          id: globalBlocks.id,
          name: globalBlocks.name,
          category: globalBlocks.category,
          content: globalBlocks.content,
          publishedContent: globalBlocks.publishedContent,
          publishedAt: globalBlocks.publishedAt,
          updatedAt: globalBlocks.updatedAt,
          createdByName: users.name,
        })
        .from(globalBlocks)
        .leftJoin(users, eq(users.id, globalBlocks.createdBy))
        .where(
          and(
            eq(globalBlocks.siteId, siteId),
            inArray(globalBlocks.category, ['Header', 'Footer'])
          )
        )
        .orderBy(asc(globalBlocks.name)),
      siteSettingsService.get(),
      db
        .select({
          headerTemplateId: pages.headerTemplateId,
          footerTemplateId: pages.footerTemplateId,
        })
        .from(pages)
        .where(eq(pages.siteId, siteId)),
      db
        .select({
          headerTemplateId: posts.headerTemplateId,
          footerTemplateId: posts.footerTemplateId,
        })
        .from(posts)
        .where(eq(posts.siteId, siteId)),
    ]);

    const headerCounts: Record<string, number> = {};
    const footerCounts: Record<string, number> = {};

    for (const p of pageRows) {
      if (p.headerTemplateId) {
        headerCounts[p.headerTemplateId] = (headerCounts[p.headerTemplateId] || 0) + 1;
      }
      if (p.footerTemplateId) {
        footerCounts[p.footerTemplateId] = (footerCounts[p.footerTemplateId] || 0) + 1;
      }
    }

    for (const p of postRows) {
      if (p.headerTemplateId) {
        headerCounts[p.headerTemplateId] = (headerCounts[p.headerTemplateId] || 0) + 1;
      }
      if (p.footerTemplateId) {
        footerCounts[p.footerTemplateId] = (footerCounts[p.footerTemplateId] || 0) + 1;
      }
    }

    return rows.map(row => {
      const isHeader = row.category === 'Header';
      const isSiteDefault = isHeader
        ? settings.headerTemplateId === row.id
        : settings.footerTemplateId === row.id;

      const locales: string[] = [];
      if (settings.translations) {
        for (const [code, copy] of Object.entries(settings.translations)) {
          const match = isHeader
            ? copy.headerTemplateId === row.id
            : copy.footerTemplateId === row.id;
          if (match) locales.push(code);
        }
      }

      const pageCount = isHeader
        ? headerCounts[row.id] || 0
        : footerCounts[row.id] || 0;

      const isPublished = !!row.publishedAt;
      const hasDraftChanges =
        !isPublished ||
        (row.updatedAt && row.publishedAt && new Date(row.updatedAt) > new Date(row.publishedAt)) ||
        JSON.stringify(row.content) !== JSON.stringify(row.publishedContent);

      return {
        id: row.id,
        name: row.name,
        category: (row.category === 'Footer' ? 'Footer' : 'Header') as 'Header' | 'Footer',
        content: row.content,
        publishedContent: row.publishedContent,
        publishedAt: row.publishedAt,
        isPublished,
        hasDraftChanges,
        updatedAt: row.updatedAt,
        createdByName: row.createdByName,
        isSiteDefault,
        locales,
        pageCount,
      };
    });
  },

  create: async (
    input: { name: string; category: 'Header' | 'Footer'; starter?: string },
    access: UserAccess
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_CREATE);
    const siteId = await adminSiteId();

    const starterContent = input.starter
      ? getStarterContent(input.category, input.starter)
      : null;

    const initialContent =
      starterContent ||
      (input.category === 'Header'
        ? DEFAULT_HEADER_CONTENT
        : DEFAULT_FOOTER_CONTENT);

    const [row] = await db
      .insert(globalBlocks)
      .values({
        siteId,
        name: input.name.trim(),
        category: input.category,
        content: initialContent,
        createdBy: access.userId,
      })
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });

    return row;
  },

  duplicate: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_CREATE);
    const siteId = await adminSiteId();

    const [source] = await db
      .select()
      .from(globalBlocks)
      .where(and(eq(globalBlocks.id, id), eq(globalBlocks.siteId, siteId)));

    if (!source) throw new NotFoundException('Template not found');

    const [row] = await db
      .insert(globalBlocks)
      .values({
        siteId,
        name: `${source.name} (Copy)`,
        category: source.category,
        content: source.content,
        createdBy: access.userId,
      })
      .returning();

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });

    return row;
  },

  rename: async (
    input: { id: string; name: string },
    access: UserAccess
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_EDIT);
    const siteId = await adminSiteId();

    const [row] = await db
      .update(globalBlocks)
      .set({ name: input.name.trim() })
      .where(and(eq(globalBlocks.id, input.id), eq(globalBlocks.siteId, siteId)))
      .returning();

    if (!row) throw new NotFoundException('Template not found');

    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });

    return row;
  },

  delete: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_DELETE);
    const siteId = await adminSiteId();

    const [row] = await db
      .delete(globalBlocks)
      .where(and(eq(globalBlocks.id, id), eq(globalBlocks.siteId, siteId)))
      .returning();

    if (!row) throw new NotFoundException('Template not found');

    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'global_block',
      targetId: row.id,
      targetName: row.name,
    });

    return row;
  },
};
