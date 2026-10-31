import 'server-only';
import type {
  DashboardQueryResponse,
  DashboardSource,
} from '@nextcms/builder-react/dashboard';
import { and, eq, isNull } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { db } from '@/db';
import { pages, posts } from '@/db/schema';
import type { WidgetQuery } from '@/db/schemas/analytics.schema';
import { PageStatus } from '@/db/schemas/shared.schema';
import {
  type ExecutedWidgetQuery,
  pageViewsSource,
  runDashboardQueries,
} from '@/lib/analytics/dashboard-bridge';
import log from '@/lib/logger/utils';
import { analyticsService } from '@/server/services/analytics.service';
import { adminSiteId } from '@/server/services/site-context';

/** How long one widget result is reused for the same site and query. */
const WIDGET_CACHE_SECONDS = 60;

/** Cache tag for every widget result of a site. */
export const analyticsWidgetsTag = (siteId: string) =>
  `analytics-widgets:${siteId}`;

/**
 * One widget query, cached per site and query (B15 E8). The site is part of
 * the key and is resolved before the cache, so one site never sees another
 * site's numbers. `fetchedAt` is stored with the result, so the editor can
 * tell how old a cached answer is.
 */
function cachedWidget(
  siteId: string,
  query: WidgetQuery,
  boardRange: 7 | 30
): Promise<ExecutedWidgetQuery> {
  return unstable_cache(
    async (): Promise<ExecutedWidgetQuery> => ({
      result: await analyticsService.widget(query, boardRange, siteId),
      fetchedAt: new Date().toISOString(),
    }),
    ['analytics-widget', siteId, JSON.stringify(query), String(boardRange)],
    { revalidate: WIDGET_CACHE_SECONDS, tags: [analyticsWidgetsTag(siteId)] }
  )();
}

/** Published pages and posts of the admin's site, for widget filters. */
const contentOptions = cache(async () => {
  const siteId = await adminSiteId();
  const [publishedPages, publishedPosts] = await Promise.all([
    db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(
        and(
          eq(pages.siteId, siteId),
          isNull(pages.deletedAt),
          eq(pages.status, PageStatus.published)
        )
      )
      .orderBy(pages.title)
      .limit(200),
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.siteId, siteId),
          isNull(posts.deletedAt),
          eq(posts.status, PageStatus.published)
        )
      )
      .orderBy(posts.title)
      .limit(200),
  ]);
  return { pages: publishedPages, posts: publishedPosts };
});

export const analyticsDashboardDataService = {
  sources: async (): Promise<DashboardSource[]> => [
    pageViewsSource(await contentOptions()),
  ],

  /** One batch of structured widget queries for the admin's site. */
  query: async (requests: unknown): Promise<DashboardQueryResponse[]> => {
    const [siteId, sources] = await Promise.all([
      adminSiteId(),
      analyticsDashboardDataService.sources(),
    ]);
    return runDashboardQueries(requests, {
      sources,
      execute: (query, boardRange) => cachedWidget(siteId, query, boardRange),
      onError: (error, request) =>
        log.error('analytics dashboard query failed', {
          error,
          key: request.key,
        }),
    });
  },
};
