import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  defineClientPlugin,
  definePlugin,
  isMaskedSecret,
  maskSecretValue,
  satisfiesCmsVersion,
} from '../index';

describe('@nextcms/plugin-sdk', () => {
  it('validates and returns a server plugin definition', () => {
    const plugin = definePlugin({
      id: 'sample-plugin',
      name: 'Sample Plugin',
      version: '1.2.3',
      description: 'Test plugin',
      requires: '>=0.1.0',
      settings: {
        schema: z.object({ apiKey: z.string().optional() }),
        fields: {
          apiKey: { label: 'API Key', secret: true },
        },
      },
      permissions: [
        { key: 'sample.manage', label: 'Manage sample plugin' },
      ],
      hooks: {
        'content.published': async () => {},
      },
      filters: {
        'content.html': html => html,
      },
      routes: [
        {
          method: 'GET',
          path: '/ping',
          auth: 'public',
          handler: () => Response.json({ ok: true }),
        },
      ],
      cron: [
        {
          every: 'hourly',
          run: async () => {},
        },
      ],
    });

    assert.equal(plugin.id, 'sample-plugin');
    assert.equal(plugin.version, '1.2.3');
  });

  it('rejects invalid plugin ids, versions, permissions, and routes', () => {
    assert.throws(
      () =>
        definePlugin({
          id: 'Bad_ID',
          name: 'Bad',
          version: '1.0.0',
        }),
      /Invalid plugin id/
    );

    assert.throws(
      () =>
        definePlugin({
          id: 'good-id',
          name: 'Bad Version',
          version: 'v1',
        }),
      /invalid version/
    );

    assert.throws(
      () =>
        definePlugin({
          id: 'good-id',
          name: 'Bad Perm',
          version: '1.0.0',
          permissions: [{ key: 'nodot', label: 'Invalid' }],
        }),
      /resource\.action/
    );

    assert.throws(
      () =>
        definePlugin({
          id: 'good-id',
          name: 'Bad Route',
          version: '1.0.0',
          routes: [{ method: 'GET', path: 'no-slash', handler: () => new Response() }],
        }),
      /must start with "\/"/
    );
  });

  it('enforces block namespacing in defineClientPlugin', () => {
    assert.throws(
      () =>
        defineClientPlugin({
          id: 'my-plugin',
          blocks: [
            {
              type: 'UnnamespacedBlock',
              label: 'Bad',
              render: () => null,
            },
          ],
        }),
      /my-plugin\/<BlockName>/
    );

    const ok = defineClientPlugin({
      id: 'my-plugin',
      blocks: [
        {
          type: 'my-plugin/Widget',
          label: 'Widget',
          render: () => null,
        },
      ],
      adminPages: [{ slug: 'settings-extra', title: 'Extra', component: () => null }],
    });
    assert.equal(ok.blocks?.length, 1);
  });

  it('evaluates CMS version ranges', () => {
    assert.equal(satisfiesCmsVersion('0.1.0', '*'), true);
    assert.equal(satisfiesCmsVersion('0.1.0', '>=0.1.0'), true);
    assert.equal(satisfiesCmsVersion('0.1.0', '>=0.2.0'), false);
    assert.equal(satisfiesCmsVersion('0.1.5', '^0.1.0'), true);
    assert.equal(satisfiesCmsVersion('0.2.0', '^0.1.0'), false);
    assert.equal(satisfiesCmsVersion('1.2.3', '~1.2.0'), true);
    assert.equal(satisfiesCmsVersion('1.3.0', '~1.2.0'), false);
    assert.equal(satisfiesCmsVersion('0.1.0', '>=0.1.0 <0.2.0'), true);
  });

  it('masks secrets and detects mask sentinels', () => {
    const masked = maskSecretValue('super-secret-key');
    assert.equal(masked.includes('super-secret'), false);
    assert.equal(isMaskedSecret(masked), true);
    assert.equal(isMaskedSecret('real-new-key'), false);
    assert.equal(maskSecretValue(''), '');
  });
});
