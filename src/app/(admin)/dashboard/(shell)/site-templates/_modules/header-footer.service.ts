import 'server-only';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { globalBlocks, menuItems, overlayStats, pages, posts, users } from '@/db/schema';
import type { BuilderData } from '@/builder/data';
import { migratePuckColumns } from '@/builder/migrations/column-blocks';
import { normalizeOverlaySettings } from '@/lib/overlays/settings';
import type { OverlaySettings } from '@/lib/overlays/types';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { templateResolverService } from '@/server/services/template-resolver.service';
import { PERMISSIONS } from '@/config/permissions';
import {
  getStarterContent,
  SEARCH_STARTER_SIMPLE,
  ARCHIVE_STARTER_GRID,
  MEGA_STARTER_COLUMNS,
  POPUP_STARTER_NEWSLETTER,
  DRAWER_STARTER_INFO,
  SITE_TEMPLATE_CATEGORIES,
  type SiteTemplateCategory,
} from '@/db/seed/header-footer-starters';

export type HeaderFooterItem = {
  id: string;
  name: string;
  category: SiteTemplateCategory;
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
  /** Display rules that assign this template automatically. */
  ruleCount: number;
  /** Menu items that open this mega menu (MegaMenu only). */
  menuItemCount: number;
  /** Assigned anywhere: site default, locale, page, display rule or menu item. */
  inUse: boolean;
  /** Parsed settings for Popup & Drawer templates. */
  overlaySettings?: OverlaySettings | null;
  /** Last 30-day stats for Popup & Drawer templates. */
  overlayStats?: {
    views: number;
    closes: number;
    conversions: number;
    conversionRate: number;
  };
};

const DEFAULT_HEADER_CONTENT = migratePuckColumns({
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
}) as BuilderData;

const DEFAULT_FOOTER_CONTENT = migratePuckColumns({
  root: {
    props: {
      background: 'default',
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
}) as BuilderData;

export const headerFooterService = {
  listHeaderFooters: async (): Promise<HeaderFooterItem[]> => {
    const siteId = await adminSiteId();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const [rows, settings, pageRows, postRows, ruleRows, megaRows, statRows] = await Promise.all([
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
            inArray(globalBlocks.category, [...SITE_TEMPLATE_CATEGORIES])
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
      templateResolverService.getRulesForSite(siteId).catch(() => []),
      db
        .select({ megaMenuId: menuItems.megaMenuId })
        .from(menuItems)
        .innerJoin(globalBlocks, eq(globalBlocks.id, menuItems.megaMenuId))
        .where(eq(globalBlocks.siteId, siteId)),
      db
        .select({
          overlayId: overlayStats.overlayId,
          views: sql<number>`coalesce(sum(${overlayStats.views}), 0)::int`,
          closes: sql<number>`coalesce(sum(${overlayStats.closes}), 0)::int`,
          conversions: sql<number>`coalesce(sum(${overlayStats.conversions}), 0)::int`,
        })
        .from(overlayStats)
        .where(
          and(
            eq(overlayStats.siteId, siteId),
            gte(overlayStats.day, thirtyDaysAgoStr)
          )
        )
        .groupBy(overlayStats.overlayId),
    ]);

    const statCounts: Record<
      string,
      { views: number; closes: number; conversions: number }
    > = {};
    for (const s of statRows) {
      statCounts[s.overlayId] = {
        views: Number(s.views) || 0,
        closes: Number(s.closes) || 0,
        conversions: Number(s.conversions) || 0,
      };
    }

    const megaCounts: Record<string, number> = {};
    for (const r of megaRows) {
      if (r.megaMenuId) megaCounts[r.megaMenuId] = (megaCounts[r.megaMenuId] || 0) + 1;
    }

    const ruleCounts: Record<string, number> = {};
    for (const r of ruleRows) {
      ruleCounts[r.templateId] = (ruleCounts[r.templateId] || 0) + 1;
    }

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

    const settingKey = {
      Header: 'headerTemplateId',
      Footer: 'footerTemplateId',
      Search: 'searchTemplateId',
      Archive: 'archiveTemplateId',
      MegaMenu: null,
      Popup: null,
      Drawer: null,
    } as const;

    return rows.map(row => {
      const category = row.category as SiteTemplateCategory;
      const key = settingKey[category];
      const isSiteDefault = !!key && settings[key] === row.id;

      const locales: string[] = [];
      if (settings.translations) {
        for (const [code, copy] of Object.entries(settings.translations)) {
          if (key && copy[key] === row.id) locales.push(code);
        }
      }

      // Search and archive templates are site-wide, not assigned per page.
      const pageCount =
        category === 'Header'
          ? headerCounts[row.id] || 0
          : category === 'Footer'
            ? footerCounts[row.id] || 0
            : 0;

      const ruleCount = ruleCounts[row.id] || 0;
      const menuItemCount = megaCounts[row.id] || 0;
      const inUse =
        isSiteDefault ||
        locales.length > 0 ||
        pageCount > 0 ||
        ruleCount > 0 ||
        menuItemCount > 0;

      // Search and archive templates use the global block editor, which
      // saves straight to live content (no separate publish step).
      const savesLive = category === 'Search' || category === 'Archive';
      const isPublished = savesLive || !!row.publishedAt;
      const hasDraftChanges =
        !savesLive &&
        (!isPublished ||
          (row.updatedAt && row.publishedAt && new Date(row.updatedAt) > new Date(row.publishedAt)) ||
          JSON.stringify(row.content) !== JSON.stringify(row.publishedContent));

      const isOverlay = row.category === 'Popup' || row.category === 'Drawer';
      const rootProps: OverlaySettings | undefined =
        isOverlay && row.content && typeof row.content === 'object'
          ? normalizeOverlaySettings(
              (row.content as BuilderData)?.root?.props,
              row.category as 'Popup' | 'Drawer'
            )
          : undefined;

      const stats = statCounts[row.id] ?? {
        views: 0,
        closes: 0,
        conversions: 0,
      };
      const views = stats.views;
      const conversions = stats.conversions;
      const conversionRate = views > 0 ? (conversions / views) * 100 : 0;

      return {
        id: row.id,
        name: row.name,
        category,
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
        ruleCount,
        menuItemCount,
        inUse,
        overlaySettings: rootProps ?? null,
        overlayStats: {
          views,
          closes: stats.closes,
          conversions,
          conversionRate,
        },
      };
    });
  },

  create: async (
    input: { name: string; category: SiteTemplateCategory; starter?: string },
    access: UserAccess
  ) => {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_CREATE);
    const siteId = await adminSiteId();
    const trimmedName = input.name.trim();
    await assertUniqueTemplateName(siteId, trimmedName);

    const starterContent = input.starter
      ? getStarterContent(input.category, input.starter)
      : null;

    const defaultContent: Record<SiteTemplateCategory, unknown> = {
      Header: DEFAULT_HEADER_CONTENT,
      Footer: DEFAULT_FOOTER_CONTENT,
      Search: SEARCH_STARTER_SIMPLE.content,
      Archive: ARCHIVE_STARTER_GRID.content,
      MegaMenu: MEGA_STARTER_COLUMNS.content,
      Popup: POPUP_STARTER_NEWSLETTER.content,
      Drawer: DRAWER_STARTER_INFO.content,
    };
    const initialContent =
      starterContent || structuredClone(defaultContent[input.category]);

    const [row] = await db
      .insert(globalBlocks)
      .values({
        siteId,
        name: trimmedName,
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

    const copyName = await nextUniqueCopyName(siteId, source.name);

    const [row] = await db
      .insert(globalBlocks)
      .values({
        siteId,
        name: copyName,
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
    const trimmedName = input.name.trim();
    await assertUniqueTemplateName(siteId, trimmedName, input.id);

    const [row] = await db
      .update(globalBlocks)
      .set({ name: trimmedName })
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

async function assertUniqueTemplateName(
  siteId: string,
  name: string,
  excludeId?: string
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ApplicationException('Template name is required.');
  }
  const existing = await db
    .select({ id: globalBlocks.id })
    .from(globalBlocks)
    .where(
      and(
        eq(globalBlocks.siteId, siteId),
        inArray(globalBlocks.category, [...SITE_TEMPLATE_CATEGORIES]),
        sql`lower(trim(${globalBlocks.name})) = lower(${trimmed})`
      )
    );
  if (existing.some(row => row.id !== excludeId)) {
    throw new ApplicationException(
      `A site template named "${trimmed}" already exists.`
    );
  }
}

async function nextUniqueCopyName(
  siteId: string,
  sourceName: string
): Promise<string> {
  const rows = await db
    .select({ name: globalBlocks.name })
    .from(globalBlocks)
    .where(
      and(
        eq(globalBlocks.siteId, siteId),
        inArray(globalBlocks.category, [...SITE_TEMPLATE_CATEGORIES])
      )
    );
  const taken = new Set(rows.map(r => r.name.trim().toLowerCase()));
  const base = sourceName.trim().replace(/\s*\(Copy(?:\s+\d+)?\)$/i, '');
  let candidate = `${base} (Copy)`;
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base} (Copy ${counter})`;
    counter++;
  }
  return candidate;
}
