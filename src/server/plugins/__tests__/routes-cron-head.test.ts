import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { definePlugin, type PluginContext } from '@nextcms/plugin-sdk';
import { isCronJobDue, runDuePluginCrons } from '../cron';
import { dispatchPluginRoute, type PluginRouteDispatchDeps } from '../routes';
import { partitionSiteHeadItems } from '../site-head';

function fakeContext(pluginId: string): PluginContext {
  return {
    pluginId,
    settings: {},
    site: { id: 'default', name: 'Site', slug: null, url: null, defaultLocale: 'en' },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    mail: async () => ({ sent: false }),
    storage: { put: async k => ({ url: k }), remove: async () => {}, read: async () => null },
    safeFetch: fetch,
    db: null,
    kv: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
  };
}

describe('plugin routes, cron, and site.head consent gates', () => {
  it('returns 404 for disabled plugins and enforces route auth defaults', async () => {
    const plugin = definePlugin({
      id: 'demo',
      name: 'Demo',
      version: '1.0.0',
      permissions: [{ key: 'demo.manage', label: 'Manage Demo' }],
      routes: [
        {
          method: 'GET',
          path: '/public-ping',
          auth: 'public',
          handler: () => Response.json({ ok: true }),
        },
        {
          method: 'GET',
          path: '/private-data',
          handler: () => Response.json({ secret: 1 }),
        },
      ],
    });

    let enabled = false;
    let authResult: { ok: true; userId: string } | { ok: false; status: 401 | 403; error: string } = {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    };

    const deps: PluginRouteDispatchDeps = {
      getPlugin: id => (id === 'demo' ? plugin : undefined),
      resolveSiteId: async () => 'default',
      isEnabled: async () => enabled,
      getSettings: async () => ({}),
      buildContext: async opts => fakeContext(opts.pluginId),
      checkAuth: async () => authResult,
      recordError: async () => {},
    };

    // Disabled -> 404 even on public route
    const disabledRes = await dispatchPluginRoute(
      new Request('http://localhost/api/plugins/demo/public-ping'),
      'demo',
      ['public-ping'],
      deps
    );
    assert.equal(disabledRes.status, 404);

    // Enabled -> public passes, private requires auth
    enabled = true;
    const publicRes = await dispatchPluginRoute(
      new Request('http://localhost/api/plugins/demo/public-ping'),
      'demo',
      ['public-ping'],
      deps
    );
    assert.equal(publicRes.status, 200);

    const unauthRes = await dispatchPluginRoute(
      new Request('http://localhost/api/plugins/demo/private-data'),
      'demo',
      ['private-data'],
      deps
    );
    assert.equal(unauthRes.status, 401);

    authResult = { ok: true, userId: 'u1' };
    const authRes = await dispatchPluginRoute(
      new Request('http://localhost/api/plugins/demo/private-data'),
      'demo',
      ['private-data'],
      deps
    );
    assert.equal(authRes.status, 200);
  });

  it('runs only due cron jobs on enabled plugins and isolates failures', async () => {
    const ran: string[] = [];
    const savedRuns: Record<string, string>[] = [];
    const recordedErrors: string[] = [];
    const now = Date.parse('2026-11-10T12:00:00Z');

    assert.equal(isCronJobDue('hourly', undefined, now), true);
    assert.equal(isCronJobDue('hourly', '2026-11-10T11:30:00Z', now), false);
    assert.equal(isCronJobDue('hourly', '2026-11-10T10:59:00Z', now), true);
    assert.equal(isCronJobDue('daily', '2026-11-09T11:00:00Z', now), true);

    const cronPlugin = definePlugin({
      id: 'cron-p',
      name: 'Cron P',
      version: '1.0.0',
      cron: [
        {
          id: 'hourly-ok',
          every: 'hourly',
          run: async () => {
            ran.push('hourly-ok');
          },
        },
        {
          id: 'daily-skip',
          every: 'daily',
          run: async () => {
            ran.push('daily-skip');
          },
        },
        {
          id: 'hourly-fail',
          every: 'hourly',
          run: async () => {
            throw new Error('cron boom');
          },
        },
      ],
    });

    const res = await runDuePluginCrons({
      nowMs: now,
      deps: {
        listSiteIds: async () => ['default'],
        listEnabledRows: async () => [
          {
            id: 'row-1',
            pluginId: 'cron-p',
            settings: {},
            lastCronRunAt: {
              'daily:daily-skip': '2026-11-10T08:00:00Z',
            },
          },
        ],
        getPlugin: id => (id === 'cron-p' ? cronPlugin : undefined),
        buildContext: async opts => fakeContext(opts.pluginId),
        saveLastCronRunAt: async (_rowId, map) => {
          savedRuns.push(map);
        },
        recordError: async (_s, _p, msg) => {
          recordedErrors.push(msg);
        },
      },
    });

    assert.deepEqual(ran, ['hourly-ok']);
    assert.equal(res.ran.length, 1);
    assert.equal(res.skipped, 1);
    assert.equal(res.errors.length, 1);
    assert.equal(recordedErrors.length, 1);
    assert.ok(savedRuns[0]['hourly:hourly-ok']);
  });

  it('routes site.head scripts through consent and rejects scripts lacking consentCategory', () => {
    const warnings: string[] = [];
    const partitioned = partitionSiteHeadItems(
      [
        { type: 'meta', attrs: { name: 'generator', content: 'nextcms' } },
        {
          type: 'script',
          consentCategory: 'analytics',
          src: 'https://cdn.example.com/a.js',
          defer: true,
        },
        {
          type: 'script',
          consentCategory: '' as any,
          src: 'https://cdn.example.com/bad.js',
        },
        {
          type: 'html',
          html: '<script>alert(1)</script>',
        },
        {
          type: 'html',
          html: '<script>console.log("ok")</script>',
          consentCategory: 'marketing',
        },
      ],
      msg => warnings.push(msg)
    );

    assert.equal(partitioned.nonScriptItems.length, 1);
    assert.equal(partitioned.scriptSnippets.length, 2);
    assert.equal(partitioned.scriptSnippets[0].category, 'analytics');
    assert.ok(partitioned.scriptSnippets[0].html.includes('defer'));
    assert.equal(partitioned.scriptSnippets[1].category, 'marketing');
    assert.equal(warnings.length, 2);
  });
});
