import 'server-only';
import { createHmac } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  webhookDeliveries,
  webhookSubscriptions,
} from '@/db/schema';
import { adminSiteId } from '@/server/services/site-context';

export const webhookService = {
  /** Deliver an event to all matching, enabled subscriptions. Does not throw. */
  async deliver(
    targetId: string,
    event: string,
    data: { id: string; type: 'page' | 'post' | 'entry' | 'form'; slug?: string | null },
    siteId: string
  ): Promise<void> {
    const subscriptions = await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.siteId, siteId));

    const enabled = subscriptions.filter(
      row =>
        row.disabledAt === null &&
        Array.isArray(row.events) &&
        (row.events as string[]).includes(event)
    );

    const occurredAt = new Date().toISOString();
    const payload = {
      id: targetId,
      event,
      siteId,
      occurredAt,
      data,
    };
    const body = JSON.stringify(payload);

    for (const sub of enabled) {
      const signature = createHmac('sha256', sub.secret)
        .update(body)
        .digest('hex');

      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          subscriptionId: sub.id,
          event: event as any,
          payload,
          status: 'pending',
        })
        .returning({ id: webhookDeliveries.id });

      try {
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CMS-Signature': `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });

        await db
          .update(webhookDeliveries)
          .set({
            status: res.ok ? 'delivered' : 'failed',
            responseStatus: res.status,
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      } catch (error: any) {
        await db
          .update(webhookDeliveries)
          .set({ status: 'failed', error: error.message ?? String(error) })
          .where(eq(webhookDeliveries.id, delivery.id));
      }
    }
  },
};
