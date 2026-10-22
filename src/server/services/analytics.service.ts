import 'server-only';
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
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import {
  media,
  pageViews,
  pages,
  users,
} from '@/db/schema';
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

export const analyticsService = {
  recordView: async (input: {
    pageId: string;
    path: string;
    referrer?: string | null;
    visitorId: string;
    userAgent?: string | null;
  }) => {
    if (input.userAgent && BOT_UA.test(input.userAgent)) {
      return { recorded: false, reason: 'bot' as const };
    }

    const [page] = await db
      .select({
        id: pages.id,
        status: pages.status,
        visibility: pages.visibility,
      })
      .from(pages)
      .where(
        and(
          eq(pages.id, input.pageId),
          isNull(pages.deletedAt),
          eq(pages.status, PageStatus.published),
          eq(pages.visibility, VisibilityStatus.public)
        )
      )
      .limit(1);

    if (!page) {
      return { recorded: false, reason: 'unpublished' as const };
    }

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const [recent] = await db
      .select({ id: pageViews.id })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.pageId, input.pageId),
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
      pageId: input.pageId,
      path: input.path.slice(0, 500),
      referrerHost: parseReferrerHost(input.referrer),
      visitorId: input.visitorId,
    });

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
        path: pageViews.path,
        title: pages.title,
        views: count(),
      })
      .from(pageViews)
      .innerJoin(pages, eq(pages.id, pageViews.pageId))
      .where(gte(pageViews.createdAt, since))
      .groupBy(pageViews.pageId, pageViews.path, pages.title)
      .orderBy(desc(count()))
      .limit(10);

    const topReferrers = await db
      .select({
        host: pageViews.referrerHost,
        views: count(),
      })
      .from(pageViews)
      .where(
        and(gte(pageViews.createdAt, since), sql`${pageViews.referrerHost} is not null`)
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
        path: p.path,
        title: p.title,
        views: Number(p.views),
      })),
      topReferrers: topReferrers.map(r => ({
        host: r.host!,
        views: Number(r.views),
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
