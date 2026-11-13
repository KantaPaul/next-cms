import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiRateWindows } from '@/db/schema';

export interface RateWindowResult {
  allowed: boolean;
  /** Requests counted in the current window, this one included. */
  count: number;
  limit: number;
  /** When the current window ends (ms since epoch). */
  resetAt: number;
}

/**
 * Fixed-window counter in `api_rate_windows` (the table the public API and
 * form limits use), keyed by any string, e.g. `extapi:host:api.example.com`.
 *
 * Fails open: if the database cannot be reached the request is allowed, so
 * a limiter problem never takes pages down. The count is bumped with an
 * atomic `count = count + 1`; two first requests in the same window can
 * still both insert, which only lets a burst over by one.
 */
export async function hitRateWindow(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): Promise<RateWindowResult> {
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = windowStartMs + windowMs;
  try {
    const [updated] = await db
      .update(apiRateWindows)
      .set({ count: sql`${apiRateWindows.count} + 1`, updatedAt: new Date(now) })
      .where(
        and(eq(apiRateWindows.apiKeyId, key), eq(apiRateWindows.windowStart, windowStart))
      )
      .returning({ count: apiRateWindows.count });
    let count = updated?.count;
    if (count === undefined) {
      await db.insert(apiRateWindows).values({ apiKeyId: key, windowStart, count: 1 });
      count = 1;
    }
    return { allowed: count <= limit, count, limit, resetAt };
  } catch (error) {
    console.error('[rate-window] check failed, allowing request', error);
    return { allowed: true, count: 0, limit, resetAt };
  }
}
