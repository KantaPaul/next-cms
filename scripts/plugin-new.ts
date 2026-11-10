import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validatePluginId } from '@nextcms/plugin-sdk';
import { syncPlugins } from './plugins-sync';

function toPascalCase(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function toTitleCase(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export async function scaffoldPlugin(
  rawId: string,
  repoRoot: string = process.cwd()
): Promise<{ dir: string; id: string }> {
  const id = rawId.trim();
  validatePluginId(id);

  const pluginDir = path.join(repoRoot, 'plugins', id);
  if (existsSync(pluginDir)) {
    throw new Error(`Plugin directory already exists: plugins/${id}`);
  }

  const title = toTitleCase(id);
  const pascal = toPascalCase(id);

  mkdirSync(path.join(pluginDir, '__tests__'), { recursive: true });

  writeFileSync(
    path.join(pluginDir, 'plugin.server.ts'),
    `import { definePlugin } from '@nextcms/plugin-sdk';
import { z } from 'zod';

export default definePlugin({
  id: '${id}',
  name: '${title}',
  version: '0.1.0',
  description: '${title} plugin for Next CMS.',
  requires: '>=0.1.0',

  settings: {
    schema: z.object({
      greeting: z.string().default('Hello from ${title}!'),
    }),
    fields: {
      greeting: {
        label: 'Greeting',
        type: 'text',
        defaultValue: 'Hello from ${title}!',
      },
    },
  },

  hooks: {
    'content.published': async (event, ctx) => {
      ctx.logger.info('Published:', event.type, event.id);
    },
  },

  routes: [
    {
      method: 'GET',
      path: '/ping',
      auth: 'public',
      handler: (_req, ctx) =>
        Response.json({
          plugin: '${id}',
          greeting: ctx.settings.greeting ?? 'Hello from ${title}!',
        }),
    },
  ],
});
`,
    'utf8'
  );

  writeFileSync(
    path.join(pluginDir, 'plugin.client.tsx'),
    `import { defineBlock } from '@nextcms/builder-core';
import { defineClientPlugin } from '@nextcms/plugin-sdk/client';
import { z } from 'zod';

const ${pascal}Schema = z.object({
  text: z.string().default('Hello from ${title}!'),
});

type ${pascal}Props = z.infer<typeof ${pascal}Schema> & { editing?: boolean };

function ${pascal}BlockView({ text }: ${pascal}Props) {
  return (
    <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
      {text}
    </div>
  );
}

export const ${pascal}Block = defineBlock({
  type: '${id}/${pascal}',
  label: '${title}',
  category: 'content',
  schema: ${pascal}Schema,
  defaults: {
    text: 'Hello from ${title}!',
  },
  fields: {
    text: {
      label: 'Text',
      type: 'text',
      tab: 'content',
      section: '${title}',
    },
  },
  render: ${pascal}BlockView,
});

export default defineClientPlugin({
  id: '${id}',
  blocks: [${pascal}Block],
});
`,
    'utf8'
  );

  writeFileSync(
    path.join(pluginDir, 'README.md'),
    `# ${title} Plugin (\`${id}\`)

Generated with \`pnpm plugin:new ${id}\`.

## Files
- \`plugin.server.ts\` — server definition (hooks, filters, settings, routes, cron)
- \`plugin.client.tsx\` — client definition (builder blocks, custom inspector fields, admin pages)
- \`__tests__/${id}.test.ts\` — unit tests
`,
    'utf8'
  );

  writeFileSync(
    path.join(pluginDir, '__tests__', `${id}.test.ts`),
    `import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import clientPlugin from '../plugin.client';
import serverPlugin from '../plugin.server';

describe('${id} plugin', () => {
  it('exports valid server and client definitions', () => {
    assert.equal(serverPlugin.id, '${id}');
    assert.equal(clientPlugin.id, '${id}');
    assert.equal(clientPlugin.blocks?.[0]?.type, '${id}/${pascal}');
  });
});
`,
    'utf8'
  );

  // Add to nextcms.plugins.ts
  const configPath = path.join(repoRoot, 'nextcms.plugins.ts');
  const entry = `./plugins/${id}`;
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf8');
    if (!content.includes(`'${entry}'`) && !content.includes(`"${entry}"`)) {
      const updated = content.replace(
        /(\];\s*export default plugins;|\];)/,
        `  '${entry}',\n$1`
      );
      writeFileSync(configPath, updated, 'utf8');
    }
  } else {
    writeFileSync(
      configPath,
      `const plugins: string[] = [\n  '${entry}',\n];\n\nexport default plugins;\n`,
      'utf8'
    );
  }

  await syncPlugins(repoRoot);
  return { dir: pluginDir, id };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]).endsWith(path.join('scripts', 'plugin-new.ts'));

if (isCli) {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: pnpm plugin:new <plugin-id>');
    process.exit(1);
  }
  scaffoldPlugin(id)
    .then(res => {
      console.log(
        `[plugin:new] Created plugins/${res.id}/, registered in nextcms.plugins.ts, and synced.`
      );
    })
    .catch(err => {
      console.error('[plugin:new] Failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
