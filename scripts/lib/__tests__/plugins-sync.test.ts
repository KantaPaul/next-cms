import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { defineBlock } from '@nextcms/builder-core';
import { defineClientPlugin, definePlugin } from '@nextcms/plugin-sdk';
import {
  renderClientRegistry,
  renderPermissionsRegistry,
  renderServerRegistry,
  validateLoadedPlugins,
} from '../plugins-sync-core';

describe('plugins-sync validation and registry generation', () => {
  it('validates plugins and emits static server/client/permissions registries', () => {
    const server = definePlugin({
      id: 'alpha',
      name: 'Alpha',
      version: '1.0.0',
      requires: '>=0.1.0',
      permissions: [{ key: 'alpha.manage', label: 'Manage Alpha' }],
    });
    const client = defineClientPlugin({
      id: 'alpha',
      blocks: [
        defineBlock({
          type: 'alpha/Card',
          label: 'Alpha Card',
          render: () => null,
        }),
      ],
    });

    const loaded = [
      {
        specifier: './plugins/alpha',
        server,
        client,
        serverImport: '../../../plugins/alpha/plugin.server',
        clientImport: '../../../plugins/alpha/plugin.client',
      },
    ];

    const { permissions } = validateLoadedPlugins(loaded, '0.1.0');
    assert.equal(permissions.length, 1);
    assert.equal(permissions[0].key, 'alpha.manage');

    const serverCode = renderServerRegistry(loaded);
    assert.ok(serverCode.includes("import serverPlugin_0 from '../../../plugins/alpha/plugin.server';"));
    assert.ok(serverCode.includes('["alpha"]: serverPlugin_0'));

    const clientCode = renderClientRegistry(loaded);
    assert.ok(clientCode.includes("import clientPlugin_0 from '../../../plugins/alpha/plugin.client';"));
    assert.ok(!clientCode.includes('plugin.server'));

    const permCode = renderPermissionsRegistry(permissions);
    assert.ok(permCode.includes('"alpha.manage"'));
  });

  it('rejects duplicate plugin ids, mismatched client/server ids, and duplicate block types', () => {
    const p1 = definePlugin({ id: 'dup', name: 'Dup 1', version: '1.0.0' });
    const p2 = definePlugin({ id: 'dup', name: 'Dup 2', version: '1.0.0' });
    assert.throws(
      () =>
        validateLoadedPlugins(
          [
            { specifier: './a', server: p1, client: null, serverImport: './a', clientImport: null },
            { specifier: './b', server: p2, client: null, serverImport: './b', clientImport: null },
          ],
          '0.1.0'
        ),
      /Duplicate plugin id/
    );

    const pGood = definePlugin({ id: 'one', name: 'One', version: '1.0.0' });
    const cMismatch = defineClientPlugin({ id: 'two' });
    assert.throws(
      () =>
        validateLoadedPlugins(
          [
            {
              specifier: './one',
              server: pGood,
              client: cMismatch,
              serverImport: './one',
              clientImport: './two',
            },
          ],
          '0.1.0'
        ),
      /id mismatch/
    );

    const cOne = defineClientPlugin({
      id: 'one',
      blocks: [defineBlock({ type: 'one/Card', label: 'Card', render: () => null })],
    });
    assert.throws(
      () =>
        validateLoadedPlugins(
          [
            {
              specifier: './one',
              server: pGood,
              client: cOne,
              serverImport: './one',
              clientImport: './c',
            },
          ],
          '0.1.0',
          new Set(['one/Card'])
        ),
      /Duplicate block type/
    );
  });

  it('rejects plugins requiring a newer CMS version', () => {
    const p = definePlugin({
      id: 'future',
      name: 'Future',
      version: '1.0.0',
      requires: '>=99.0.0',
    });
    assert.throws(
      () =>
        validateLoadedPlugins(
          [{ specifier: './f', server: p, client: null, serverImport: './f', clientImport: null }],
          '0.1.0'
        ),
      /requires CMS version/
    );
  });

  it('scaffoldPlugin creates a valid plugin structure in a temp repo', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'nextcms-plugin-new-'));
    try {
      const { writeFileSync, mkdirSync, existsSync, readFileSync, symlinkSync } = await import('node:fs');
      symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(tmp, 'node_modules'));
      writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '0.1.0' }));
      writeFileSync(
        path.join(tmp, 'nextcms.plugins.ts'),
        'const plugins: string[] = [];\nexport default plugins;\n'
      );
      mkdirSync(path.join(tmp, 'src/plugins/generated'), { recursive: true });

      const { scaffoldPlugin } = await import('../../plugin-new');
      await scaffoldPlugin('hello-world', tmp);

      assert.ok(existsSync(path.join(tmp, 'plugins/hello-world/plugin.server.ts')));
      assert.ok(existsSync(path.join(tmp, 'plugins/hello-world/plugin.client.tsx')));
      assert.ok(existsSync(path.join(tmp, 'plugins/hello-world/README.md')));
      assert.ok(existsSync(path.join(tmp, 'plugins/hello-world/__tests__/hello-world.test.ts')));
      assert.ok(readFileSync(path.join(tmp, 'nextcms.plugins.ts'), 'utf8').includes('./plugins/hello-world'));
      assert.ok(readFileSync(path.join(tmp, 'src/plugins/generated/server-registry.ts'), 'utf8').includes('hello-world'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
