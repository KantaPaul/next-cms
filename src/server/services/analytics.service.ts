import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNull,
  sql,
  sum,
} from 'drizzle-orm';
import { db } from '@/db';
import { media, pages, pageViews, posts, users } from '@/db/schema';
import type { WidgetQuery } from '@/db/schemas/analytics.schema';
import { PageStatus, VisibilityStatus } from '@/db/schemas/shared.schema';

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|linkedinbot|twitterbot|yandex|baidu|duckduck|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider/i;

const DEDUPE_WINDOW_MS = 10_000;

function parseReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host.slice(0, 255) || null;
  } catch {
    return null;
  }
}

export type TrendsList = 'pages' | 'paths' | 'referrers';

export type WidgetStatResult = {
  kind: 'stat';
  value: number;
  previous: number | null;
};

export type WidgetSeriesResult = {
  kind: 'series';
  points: { label: string; value: number; previous: number | null }[];
};

export type WidgetRowsResult = {
  kind: 'rows';
  rows: {
    key: string;
    label: string;
    detail: string | null;
    value: number;
    previous: number | null;
  }[];
};

export type WidgetResult =
  WidgetStatResult | WidgetSeriesResult | WidgetRowsResult;

function windows(rangeDays: 7 | 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - rangeDays);
  since.setUTCHours(0, 0, 0, 0);
  const previousSince = new Date(since);
  previousSince.setUTCDate(previousSince.getUTCDate() - rangeDays);
  return { since, previousSince, rangeDays };
}

/** Page and post filters are mutually exclusive. A page id wins when both are set. */
function contentScope(pageId: string | null, postId: string | null) {
  if (pageId) return eq(pageViews.pageId, pageId);
  if (postId) return eq(pageViews.postId, postId);
  return undefined;
}

export const analyticsService = {
  recordView: async (input: {
    path: string;
    referrer?: string | null;
    visitorId: string;
    userAgent?: string | null;
    pageId?: string | null;
    postId?: string | null;
  }) => {
    if (input.userAgent && BOT_UA.test(input.userAgent)) {
      return { recorded: false, reason: 'bot' as const };
    }

    const pageId = input.pageId?.trim() || null;
    const postId = input.postId?.trim() || null;
    if ((pageId && postId) || (!pageId && !postId)) {
      return { recorded: false, reason: 'invalid_target' as const };
    }

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);

    if (pageId) {
      const [page] = await db
        .select({ id: pages.id })
        .from(pages)
        .where(
          and(
            eq(pages.id, pageId),
            isNull(pages.deletedAt),
            eq(pages.status, PageStatus.published),
            eq(pages.visibility, VisibilityStatus.public)
          )
        )
        .limit(1);

      if (!page) {
        return { recorded: false, reason: 'unpublished' as const };
      }

      const [recent] = await db
        .select({ id: pageViews.id })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.pageId, pageId),
            eq(pageViews.visitorId, input.visitorId),
            gte(pageViews.createdAt, since)
          )
        )
        .limit(1);

      if (recent) {
        return { recorded: false, reason: 'deduped' as const };
      }

      await db.insert(pageViews).values({
        id: createId(),
        pageId,
        postId: null,
        path: input.path.slice(0, 500),
        referrerHost: parseReferrerHost(input.referrer),
        visitorId: input.visitorId,
      });
    } else {
      const [post] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.id, postId!),
            isNull(posts.deletedAt),
            eq(posts.status, PageStatus.published),
            eq(posts.visibility, VisibilityStatus.public)
          )
        )
        .limit(1);

      if (!post) {
        return { recorded: false, reason: 'unpublished' as const };
      }

      const [recent] = await db
        .select({ id: pageViews.id })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.postId, postId!),
            eq(pageViews.visitorId, input.visitorId),
            gte(pageViews.createdAt, since)
          )
        )
        .limit(1);

      if (recent) {
        return { recorded: false, reason: 'deduped' as const };
      }

      await db.insert(pageViews).values({
        id: createId(),
        pageId: null,
        postId,
        path: input.path.slice(0, 500),
        referrerHost: parseReferrerHost(input.referrer),
        visitorId: input.visitorId,
      });
    }

    return { recorded: true as const };
  },

  summary: async (rangeDays: 7 | 30) => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - rangeDays);
    since.setUTCHours(0, 0, 0, 0);

    const [totals] = await db
      .select({
        views: count(),
        uniqueVisitors: countDistinct(pageViews.visitorId),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since));

    const daily = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${pageViews.createdAt}), 'YYYY-MM-DD')`,
        views: count(),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(sql`date_trunc('day', ${pageViews.createdAt})`)
      .orderBy(sql`date_trunc('day', ${pageViews.createdAt})`);

    const topPages = await db
      .select({
        pageId: pageViews.pageId,
        postId: pageViews.postId,
        path: pageViews.path,
        pageTitle: pages.title,
        postTitle: posts.title,
        views: count(),
      })
      .from(pageViews)
      .leftJoin(pages, eq(pages.id, pageViews.pageId))
      .leftJoin(posts, eq(posts.id, pageViews.postId))
      .where(gte(pageViews.createdAt, since))
      .groupBy(
        pageViews.pageId,
        pageViews.postId,
        pageViews.path,
        pages.title,
        posts.title
      )
      .orderBy(desc(count()))
      .limit(10);

    const topReferrers = await db
      .select({
        host: pageViews.referrerHost,
        views: count(),
      })
      .from(pageViews)
      .where(
        and(
          gte(pageViews.createdAt, since),
          sql`${pageViews.referrerHost} is not null`
        )
      )
      .groupBy(pageViews.referrerHost)
      .orderBy(desc(count()))
      .limit(10);

    return {
      rangeDays,
      views: Number(totals?.views ?? 0),
      uniqueVisitors: Number(totals?.uniqueVisitors ?? 0),
      daily: daily.map(d => ({ day: d.day, views: Number(d.views) })),
      topPages: topPages.map(p => ({
        pageId: p.pageId,
        postId: p.postId,
        path: p.path,
        title: p.pageTitle ?? p.postTitle ?? p.path,
        views: Number(p.views),
      })),
      topReferrers: topReferrers.map(r => ({
        host: r.host!,
        views: Number(r.views),
      })),
    };
  },

  /**
   * Current window vs the immediately previous window of the same length.
   * Optionally scoped to a single page or a single post. Only the requested list is queried.
   */
  trends: async (
    rangeDays: 7 | 30,
    options?: {
      pageId?: string | null;
      postId?: string | null;
      list?: TrendsList;
    }
  ) => {
    const list: TrendsList =
      options?.list === 'paths' || options?.list === 'referrers'
        ? options.list
        : 'pages';
    const pageId =
      options?.pageId && options.pageId.trim().length > 0
        ? options.pageId.trim()
        : null;
    const postId = pageId
      ? null
      : options?.postId && options.postId.trim().length > 0
        ? options.postId.trim()
        : null;
    const scope = contentScope(pageId, postId);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - rangeDays);
    since.setUTCHours(0, 0, 0, 0);

    const previousSince = new Date(since);
    previousSince.setUTCDate(previousSince.getUTCDate() - rangeDays);

    // Totals for both windows in one scan
    const [totals] = await db
      .select({
        currentViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${since})`,
        previousViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
        currentUnique: sql<number>`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${since})`,
        previousUnique: sql<number>`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
      })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, previousSince), scope));

    const currentViews = Number(totals?.currentViews ?? 0);
    const previousViews = Number(totals?.previousViews ?? 0);
    const currentUnique = Number(totals?.currentUnique ?? 0);
    const previousUnique = Number(totals?.previousUnique ?? 0);

    // Daily series across both windows
    const dailyRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${pageViews.createdAt}), 'YYYY-MM-DD')`,
        views: count(),
      })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, previousSince), scope))
      .groupBy(sql`date_trunc('day', ${pageViews.createdAt})`)
      .orderBy(sql`date_trunc('day', ${pageViews.createdAt})`);

    const byDay = new Map(dailyRows.map(d => [d.day, Number(d.views)]));

    // Align current window days; previous is the same day-offset in the prior window
    const currentDaily: {
      day: string;
      views: number;
      previousViews: number;
    }[] = [];
    // Match DualBars: start = today - rangeDays + 1
    const chartStart = new Date();
    chartStart.setUTCDate(chartStart.getUTCDate() - rangeDays + 1);
    chartStart.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(chartStart);
      d.setUTCDate(chartStart.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);

      const prev = new Date(d);
      prev.setUTCDate(prev.getUTCDate() - rangeDays);
      const prevKey = prev.toISOString().slice(0, 10);

      currentDaily.push({
        day: key,
        views: byDay.get(key) ?? 0,
        previousViews: byDay.get(prevKey) ?? 0,
      });
    }

    // Resolve the filtered content title
    let pageTitle: string | null = null;
    if (pageId) {
      const [p] = await db
        .select({ title: pages.title })
        .from(pages)
        .where(and(eq(pages.id, pageId), isNull(pages.deletedAt)))
        .limit(1);
      pageTitle = p?.title ?? null;
    } else if (postId) {
      const [p] = await db
        .select({ title: posts.title })
        .from(posts)
        .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
        .limit(1);
      pageTitle = p?.title ?? null;
    }

    // Only the active list
    type ListRow = {
      pageId?: string | null;
      postId?: string | null;
      path?: string;
      title?: string | null;
      host?: string;
      views: number;
      previousViews: number;
    };

    let listRows: ListRow[] = [];

    if (list === 'pages') {
      const rows = await db
        .select({
          pageId: pageViews.pageId,
          postId: pageViews.postId,
          path: pageViews.path,
          pageTitle: pages.title,
          postTitle: posts.title,
          currentViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${since})`,
          previousViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
        })
        .from(pageViews)
        .leftJoin(pages, eq(pages.id, pageViews.pageId))
        .leftJoin(posts, eq(posts.id, pageViews.postId))
        .where(and(gte(pageViews.createdAt, previousSince), scope))
        .groupBy(
          pageViews.pageId,
          pageViews.postId,
          pageViews.path,
          pages.title,
          posts.title
        )
        .orderBy(
          desc(sql`count(*) filter (where ${pageViews.createdAt} >= ${since})`)
        )
        .limit(10);

      listRows = rows.map(r => ({
        pageId: r.pageId,
        postId: r.postId,
        path: r.path,
        title: r.pageTitle ?? r.postTitle ?? r.path,
        views: Number(r.currentViews),
        previousViews: Number(r.previousViews),
      }));
    } else if (list === 'paths') {
      const rows = await db
        .select({
          path: pageViews.path,
          currentViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${since})`,
          previousViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
        })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, previousSince), scope))
        .groupBy(pageViews.path)
        .orderBy(
          desc(sql`count(*) filter (where ${pageViews.createdAt} >= ${since})`)
        )
        .limit(10);

      listRows = rows.map(r => ({
        path: r.path,
        views: Number(r.currentViews),
        previousViews: Number(r.previousViews),
      }));
    } else {
      // referrers
      const rows = await db
        .select({
          host: pageViews.referrerHost,
          currentViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${since})`,
          previousViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
        })
        .from(pageViews)
        .where(
          and(
            gte(pageViews.createdAt, previousSince),
            sql`${pageViews.referrerHost} is not null`,
            scope
          )
        )
        .groupBy(pageViews.referrerHost)
        .orderBy(
          desc(sql`count(*) filter (where ${pageViews.createdAt} >= ${since})`)
        )
        .limit(10);

      listRows = rows.map(r => ({
        host: r.host!,
        views: Number(r.currentViews),
        previousViews: Number(r.previousViews),
      }));
    }

    return {
      rangeDays,
      pageId,
      postId,
      pageTitle,
      list,
      views: currentViews,
      previousViews,
      uniqueVisitors: currentUnique,
      previousUniqueVisitors: previousUnique,
      daily: currentDaily,
      rows: listRows,
    };
  },

  /**
   * Dashboard widget query. Same UTC windows as trends.
   * Returns stat | series | rows depending on dimension.
   */
  widget: async (
    query: WidgetQuery,
    boardRange: 7 | 30
  ): Promise<WidgetResult> => {
    const rangeDays =
      query.range === 'inherit' ? boardRange : (query.range as 7 | 30);
    const { since, previousSince } = windows(rangeDays);
    const pageId =
      query.pageId && query.pageId.trim().length > 0
        ? query.pageId.trim()
        : null;
    const postId = pageId
      ? null
      : query.postId && query.postId.trim().length > 0
        ? query.postId.trim()
        : null;
    const scope = contentScope(pageId, postId);
    const compare = query.compare;

    // ── Stat (dimension: none) ─────────────────────────────────────────────
    if (query.dimension === 'none') {
      const [totals] = await db
        .select({
          currentViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${since})`,
          previousViews: sql<number>`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
          currentUnique: sql<number>`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${since})`,
          previousUnique: sql<number>`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`,
        })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, previousSince), scope));

      const currentViews = Number(totals?.currentViews ?? 0);
      const previousViews = Number(totals?.previousViews ?? 0);
      const currentUnique = Number(totals?.currentUnique ?? 0);
      const previousUnique = Number(totals?.previousUnique ?? 0);

      let value = 0;
      let previous: number | null = null;

      if (query.metric === 'views') {
        value = currentViews;
        previous = compare ? previousViews : null;
      } else if (query.metric === 'uniqueVisitors') {
        value = currentUnique;
        previous = compare ? previousUnique : null;
      } else {
        // viewsPerVisitor
        value =
          currentUnique > 0
            ? Math.round((currentViews / currentUnique) * 10) / 10
            : 0;
        if (compare) {
          previous =
            previousUnique > 0
              ? Math.round((previousViews / previousUnique) * 10) / 10
              : 0;
        }
      }

      return { kind: 'stat', value, previous };
    }

    // ── Day series ─────────────────────────────────────────────────────────
    if (query.dimension === 'day') {
      const metricExpr =
        query.metric === 'uniqueVisitors'
          ? sql<number>`count(distinct ${pageViews.visitorId})`
          : count();

      const dailyRows = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${pageViews.createdAt}), 'YYYY-MM-DD')`,
          value: metricExpr,
        })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, previousSince), scope))
        .groupBy(sql`date_trunc('day', ${pageViews.createdAt})`)
        .orderBy(sql`date_trunc('day', ${pageViews.createdAt})`);

      const byDay = new Map(dailyRows.map(d => [d.day, Number(d.value)]));

      const chartStart = new Date();
      chartStart.setUTCDate(chartStart.getUTCDate() - rangeDays + 1);
      chartStart.setUTCHours(0, 0, 0, 0);

      const points: {
        label: string;
        value: number;
        previous: number | null;
      }[] = [];
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(chartStart);
        d.setUTCDate(chartStart.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);

        const prev = new Date(d);
        prev.setUTCDate(prev.getUTCDate() - rangeDays);
        const prevKey = prev.toISOString().slice(0, 10);

        points.push({
          label: key,
          value: byDay.get(key) ?? 0,
          previous: compare ? (byDay.get(prevKey) ?? 0) : null,
        });
      }

      return { kind: 'series', points };
    }

    // ── Categorical (page / path / referrer) ───────────────────────────────
    const limit = query.limit ?? 10;
    const metricFilter =
      query.metric === 'uniqueVisitors'
        ? sql`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${since})`
        : sql`count(*) filter (where ${pageViews.createdAt} >= ${since})`;

    if (query.dimension === 'page') {
      const rows = await db
        .select({
          pageId: pageViews.pageId,
          postId: pageViews.postId,
          path: pageViews.path,
          pageTitle: pages.title,
          postTitle: posts.title,
          currentValue: sql<number>`${metricFilter}`,
          previousValue: sql<number>`${
            query.metric === 'uniqueVisitors'
              ? sql`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
              : sql`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
          }`,
        })
        .from(pageViews)
        .leftJoin(pages, eq(pages.id, pageViews.pageId))
        .leftJoin(posts, eq(posts.id, pageViews.postId))
        .where(and(gte(pageViews.createdAt, previousSince), scope))
        .groupBy(
          pageViews.pageId,
          pageViews.postId,
          pageViews.path,
          pages.title,
          posts.title
        )
        .orderBy(desc(sql`${metricFilter}`))
        .limit(limit);

      return {
        kind: 'rows',
        rows: rows.map(r => ({
          key: r.pageId ?? r.postId ?? r.path,
          label: r.pageTitle ?? r.postTitle ?? r.path,
          detail: r.path,
          value: Number(r.currentValue),
          previous: compare ? Number(r.previousValue) : null,
        })),
      };
    }

    if (query.dimension === 'path') {
      const rows = await db
        .select({
          path: pageViews.path,
          currentValue: sql<number>`${metricFilter}`,
          previousValue: sql<number>`${
            query.metric === 'uniqueVisitors'
              ? sql`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
              : sql`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
          }`,
        })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, previousSince), scope))
        .groupBy(pageViews.path)
        .orderBy(desc(sql`${metricFilter}`))
        .limit(limit);

      return {
        kind: 'rows',
        rows: rows.map(r => ({
          key: r.path,
          label: r.path,
          detail: null,
          value: Number(r.currentValue),
          previous: compare ? Number(r.previousValue) : null,
        })),
      };
    }

    // referrer
    const rows = await db
      .select({
        host: pageViews.referrerHost,
        currentValue: sql<number>`${metricFilter}`,
        previousValue: sql<number>`${
          query.metric === 'uniqueVisitors'
            ? sql`count(distinct ${pageViews.visitorId}) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
            : sql`count(*) filter (where ${pageViews.createdAt} >= ${previousSince} and ${pageViews.createdAt} < ${since})`
        }`,
      })
      .from(pageViews)
      .where(
        and(
          gte(pageViews.createdAt, previousSince),
          sql`${pageViews.referrerHost} is not null`,
          scope
        )
      )
      .groupBy(pageViews.referrerHost)
      .orderBy(desc(sql`${metricFilter}`))
      .limit(limit);

    return {
      kind: 'rows',
      rows: rows.map(r => ({
        key: r.host!,
        label: r.host!,
        detail: null,
        value: Number(r.currentValue),
        previous: compare ? Number(r.previousValue) : null,
      })),
    };
  },

  contentOverview: async () => {
    const [mediaStats] = await db
      .select({
        files: count(),
        totalBytes: sum(media.size),
      })
      .from(media)
      .where(isNull(media.deletedAt));

    const [userCount] = await db
      .select({ total: count() })
      .from(users)
      .where(isNull(users.deletedAt));

    const recentPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        status: pages.status,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(isNull(pages.deletedAt))
      .orderBy(desc(pages.updatedAt))
      .limit(8);

    return {
      mediaFiles: Number(mediaStats?.files ?? 0),
      mediaBytes: Number(mediaStats?.totalBytes ?? 0),
      activeUsers: Number(userCount?.total ?? 0),
      recentPages,
    };
  },
};
