import 'server-only';
import type { HookName, HookPayloadMap } from '@nextcms/plugin-sdk';
import { webhookService } from '@/server/services/webhook.service';

export type WebhookDeliverFn = typeof webhookService.deliver;

/**
 * Built-in subscriber bridging CMS service events to outbound webhook
 * subscriptions (`content.published`, `content.unpublished`, `form.submitted`,
 * `entry.changed`).
 */
export async function deliverWebhooksForHook<K extends HookName>(
  name: K,
  payload: HookPayloadMap[K],
  deliver: WebhookDeliverFn = webhookService.deliver
): Promise<void> {
  if (name === 'content.published') {
    const p = payload as HookPayloadMap['content.published'];
    await deliver(
      p.id,
      'content.published',
      { id: p.id, type: p.type, slug: p.slug },
      p.siteId
    );
    return;
  }

  if (name === 'content.unpublished') {
    const p = payload as HookPayloadMap['content.unpublished'];
    await deliver(
      p.id,
      'content.unpublished',
      { id: p.id, type: p.type, slug: p.slug },
      p.siteId
    );
    return;
  }

  if (name === 'form.submitted') {
    const p = payload as HookPayloadMap['form.submitted'];
    await deliver(
      p.submissionId,
      'form.submitted',
      { id: p.submissionId, type: 'form' },
      p.siteId
    );
    return;
  }

  if (name === 'entry.changed') {
    const p = payload as HookPayloadMap['entry.changed'];
    await deliver(
      p.id,
      'entry.changed',
      { id: p.id, type: 'entry', slug: p.slug },
      p.siteId
    );
  }
}
