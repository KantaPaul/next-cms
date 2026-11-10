import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { definePlugin, type PluginContext } from '@nextcms/plugin-sdk';
import { applyFilters, type PluginHookRuntime, runActionNow } from '../hooks';

function makeContext(pluginId: string, settings: Record<string, unknown>): PluginContext {
  return {
    pluginId,
    settings,
    site: { id: 'site-1', name: 'Test', slug: 'main', url: null, defaultLocale: 'en' },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    mail: async () => ({ sent: false }),
    storage: {
      put: async key => ({ url: `/media/${key}` }),
      remove: async () => {},
      read: async () => null,
    },
    safeFetch: fetch,
    db: null,
    kv: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      list: async () => [],
    },
  };
}

describe('plugin hook bus & filter pipeline', () => {
  it('isolates throwing and hanging plugins in doAction and records last_error', async () => {
    const calls: string[] = [];
    const errors: Array<{ siteId: string; pluginId: string; message: string }> = [];

    const thrower = definePlugin({
      id: 'thrower',
      name: 'Thrower',
      version: '1.0.0',
      hooks: {
        'content.published': () => {
          throw new Error('boom');
        },
      },
    });

    const hanger = definePlugin({
      id: 'hanger',
      name: 'Hanger',
      version: '1.0.0',
      hooks: {
        'content.published': async () => {
          await new Promise(resolve => setTimeout(resolve, 250));
        },
      },
    });

    const healthy = definePlugin({
      id: 'healthy',
      name: 'Healthy',
      version: '1.0.0',
      hooks: {
        'content.published': {
          priority: 20,
          run: async event => {
            calls.push(`healthy:${event.id}`);
          },
        },
      },
    });

    const disabledPlugin = definePlugin({
      id: 'disabled-one',
      name: 'Disabled',
      version: '1.0.0',
      hooks: {
        'content.published': () => {
          calls.push('disabled:should-not-run');
        },
      },
    });

    const runtime: PluginHookRuntime = {
      plugins: [thrower, hanger, healthy, disabledPlugin],
      getEnabledPluginMap: async () =>
        new Map([
          ['thrower', {}],
          ['hanger', {}],
          ['healthy', {}],
        ]),
      buildContext: async ({ pluginId, settings }) =>
        makeContext(pluginId, settings),
      recordError: async (siteId, pluginId, message) => {
        errors.push({ siteId, pluginId, message });
      },
      runBuiltinSubscriber: async () => {
        calls.push('builtin');
      },
    };

    const res = await runActionNow(
      'content.published',
      { id: 'page-1', type: 'page', siteId: 'site-1', title: 'Home' },
      { timeoutMs: 40, runtime }
    );

    assert.deepEqual(calls, ['builtin', 'healthy:page-1']);
    assert.deepEqual(res.executed, ['healthy']);
    assert.equal(res.errors.length, 2);
    assert.equal(errors.length, 2);
    assert.equal(errors[0].pluginId, 'thrower');
    assert.ok(errors[0].message.includes('boom'));
    assert.equal(errors[1].pluginId, 'hanger');
    assert.ok(errors[1].message.includes('timed out'));
  });

  it('runs applyFilters in priority order, skips disabled plugins, and falls back on throw', async () => {
    const recordedErrors: string[] = [];

    const second = definePlugin({
      id: 'p-second',
      name: 'Second',
      version: '1.0.0',
      filters: {
        'content.html': {
          priority: 20,
          run: html => `${html}[second]`,
        },
      },
    });

    const first = definePlugin({
      id: 'p-first',
      name: 'First',
      version: '1.0.0',
      filters: {
        'content.html': {
          priority: 5,
          run: html => `${html}[first]`,
        },
      },
    });

    const broken = definePlugin({
      id: 'p-broken',
      name: 'Broken',
      version: '1.0.0',
      filters: {
        'content.html': {
          priority: 10,
          run: () => {
            throw new Error('filter crash');
          },
        },
      },
    });

    const off = definePlugin({
      id: 'p-off',
      name: 'Off',
      version: '1.0.0',
      filters: {
        'content.html': {
          priority: 1,
          run: html => `${html}[off]`,
        },
      },
    });

    const runtime: PluginHookRuntime = {
      plugins: [second, first, broken, off],
      getEnabledPluginMap: async () =>
        new Map([
          ['p-first', {}],
          ['p-broken', {}],
          ['p-second', {}],
        ]),
      buildContext: async ({ pluginId, settings }) =>
        makeContext(pluginId, settings),
      recordError: async (_siteId, pluginId, message) => {
        recordedErrors.push(`${pluginId}:${message}`);
      },
      runBuiltinSubscriber: async () => {},
    };

    const result = await applyFilters(
      'content.html',
      '<p>hi</p>',
      { kind: 'page', id: 'p1', siteId: 'site-1' },
      { runtime }
    );

    assert.equal(result, '<p>hi</p>[first][second]');
    assert.equal(recordedErrors.length, 1);
    assert.ok(recordedErrors[0].includes('p-broken'));
  });
});
