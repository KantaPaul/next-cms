import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type PluginHookRuntime, runActionNow } from '../hooks';
import { deliverWebhooksForHook } from '../webhooks-subscriber';

describe('built-in webhook subscriber', () => {
  it('fires webhook deliveries once per publish, unpublish, form submission, and entry change', async () => {
    const delivered: Array<{
      targetId: string;
      event: string;
      type: string;
      siteId: string;
    }> = [];

    const mockDeliver = async (
      targetId: string,
      event: string,
      data: { id: string; type: 'page' | 'post' | 'entry' | 'form'; slug?: string | null },
      siteId: string
    ) => {
      delivered.push({ targetId, event, type: data.type, siteId });
    };

    const runtime: PluginHookRuntime = {
      plugins: [],
      getEnabledPluginMap: async () => new Map(),
      buildContext: async () => {
        throw new Error('not called');
      },
      recordError: async () => {},
      runBuiltinSubscriber: (name, payload) =>
        deliverWebhooksForHook(name, payload, mockDeliver),
    };

    await runActionNow(
      'content.published',
      { id: 'page-1', type: 'page', slug: 'about', siteId: 'site-1' },
      { runtime }
    );
    await runActionNow(
      'content.unpublished',
      { id: 'post-1', type: 'post', slug: 'hello', siteId: 'site-1' },
      { runtime }
    );
    await runActionNow(
      'form.submitted',
      { submissionId: 'sub-1', siteId: 'site-1', payload: {}, files: [] },
      { runtime }
    );
    await runActionNow(
      'entry.changed',
      { id: 'ent-1', type: 'entry', slug: 'item', action: 'published', siteId: 'site-1' },
      { runtime }
    );

    assert.deepEqual(delivered, [
      { targetId: 'page-1', event: 'content.published', type: 'page', siteId: 'site-1' },
      { targetId: 'post-1', event: 'content.unpublished', type: 'post', siteId: 'site-1' },
      { targetId: 'sub-1', event: 'form.submitted', type: 'form', siteId: 'site-1' },
      { targetId: 'ent-1', event: 'entry.changed', type: 'entry', siteId: 'site-1' },
    ]);
  });
});
