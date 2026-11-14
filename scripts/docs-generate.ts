import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BLOCK_INFO } from '../src/builder/definitions/info';
import { GUIDE_TOPICS } from '../src/content/user-guide';

const OUT_DIR = path.resolve(process.cwd(), 'src/db/seed/sites/docs/content/en');

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Getting started
  writeFileSync(
    path.join(OUT_DIR, 'getting-started.md'),
    `# Getting Started with Meridian

Meridian is a multi-site, multi-language CMS and visual page builder.

## Quick Start

1. Install dependencies with \`pnpm install\`.
2. Start Postgres and run \`pnpm db:push && pnpm db:seed\`.
3. Start the dev server with \`pnpm dev\`.
`
  );

  // 2. Builder blocks reference (generated from BLOCK_INFO)
  const blockLines = Object.entries(BLOCK_INFO)
    .map(([type, info]) => `- **${type}**: ${info.description} (\`<${info.semanticTag ?? 'div'}>\`)`)
    .join('\n');

  writeFileSync(
    path.join(OUT_DIR, 'builder-blocks.md'),
    `# Builder Blocks Reference

Every built-in block available in the Meridian visual editor (${Object.keys(BLOCK_INFO).length} blocks):

${blockLines}
`
  );

  // 3. Admin guide (generated from GUIDE_TOPICS)
  const guideLines = GUIDE_TOPICS.map(
    (topic) => `## ${topic.title}\n\n${topic.summary}`
  ).join('\n\n');

  writeFileSync(
    path.join(OUT_DIR, 'admin-guide.md'),
    `# Meridian Admin Guide

${guideLines}
`
  );

  // 4. Developer & REST API v1
  writeFileSync(
    path.join(OUT_DIR, 'developers-api.md'),
    `# Developer & REST API v1

Meridian exposes a read API at \`/api/v1/*\` authenticated with Bearer API keys, plus custom blocks in \`src/builder/custom\` and plugins via \`@nextcms/plugin-sdk\`.

## Database Backup & Restore

- \`pnpm db:download\` — dump Postgres to \`backups/<db>-YYYYMMDD-HHmmss.dump\`
- \`pnpm db:restore\` — restore from the newest backup in \`backups/\`
- \`pnpm db:backups\` — list available backups
`
  );

  console.log(`Generated ${4} Meridian Docs markdown files in ${path.relative(process.cwd(), OUT_DIR)}`);
}

main();
