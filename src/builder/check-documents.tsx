/**
 * Checks every stored builder document against the new engine (R683, R684,
 * R810): Puck → BuilderDocument → Puck must round-trip unchanged,
 * BuilderRenderer must produce the same HTML as Puck `Render`, and the core
 * loaders must load the same block data as Puck `resolveAllData`.
 *
 * Run with: pnpm builder:check-documents
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Data } from '@measured/puck';
// Puck's server build: what Next.js uses to render published pages.
import { Render } from '@measured/puck/rsc';
import {
  documentToPuck,
  isLegacyPuckData,
  puckDataEqual,
  puckToDocument,
} from '@nextcms/builder-core';
import { isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  globalBlocks,
  pageContents,
  pageRevisions,
  pageTemplates,
  postContents,
  postTemplates,
} from '@/db/schema';
import { builderConfig, postBuilderConfig } from './config';
import type { BuilderData } from './data';
import { resolveBuilderData } from './render-content';
import { BuilderRenderer } from './renderer';

type Stored = { name: string; content: unknown; post?: boolean };

async function loadAll(): Promise<Stored[]> {
  const [pagesRows, postRows, globals, pageTpl, postTpl, revisions] =
    await Promise.all([
      db.select().from(pageContents).where(isNotNull(pageContents.content)),
      db.select().from(postContents).where(isNotNull(postContents.canvas)),
      db.select().from(globalBlocks),
      db.select().from(pageTemplates),
      db.select().from(postTemplates),
      db.select().from(pageRevisions).where(isNotNull(pageRevisions.content)),
    ]);
  return [
    ...pagesRows.map(r => ({ name: `page ${r.pageId} ${r.kind}`, content: r.content })),
    ...postRows.map(r => ({ name: `post ${r.postId} ${r.kind}`, content: r.canvas, post: true })),
    ...globals.map(r => ({ name: `global ${r.name}`, content: r.content })),
    ...pageTpl.map(r => ({ name: `page template ${r.name}`, content: r.content })),
    ...postTpl.flatMap(r => [
      { name: `post template ${r.name}`, content: r.content, post: true },
      { name: `post template draft ${r.name}`, content: r.draftContent, post: true },
    ]),
    ...revisions.map(r => ({ name: `revision ${r.id}`, content: r.content })),
  ];
}

/** Ignore whitespace and Puck's generated ids so only real output differences count. */
const normalize = (html: string) =>
  html.replace(/\s+/g, ' ').replace(/ id="[^"]*"/g, '').trim();

/** JSON with sorted keys, so key order does not count as a difference. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v
  );
}

function firstDifference(a: string, b: string) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const around = (s: string) => s.slice(Math.max(0, i - 80), i + 120);
  return `at ${i}\n    puck: ${around(a)}\n    new:  ${around(b)}`;
}

async function main() {
  const stored = (await loadAll()).filter(s => isLegacyPuckData(s.content));
  const failures: string[] = [];
  let roundTrips = 0;
  let sameHtml = 0;
  let sameData = 0;
  const needsRequest: string[] = [];

  for (const { name, content, post } of stored) {
    const data = content as BuilderData;
    try {
      const doc = puckToDocument(data);
      if (puckDataEqual(data, documentToPuck(doc))) roundTrips++;
      else failures.push(`round trip changed: ${name}`);

      const puckHtml = normalize(
        renderToStaticMarkup(
          createElement(Render, {
            config: post ? postBuilderConfig : builderConfig,
            data: data as Data,
          })
        )
      );
      const newHtml = normalize(
        renderToStaticMarkup(
          createElement(BuilderRenderer, {
            document: doc,
            kind: post ? 'post' : 'page',
          })
        )
      );
      if (puckHtml === newHtml) sameHtml++;
      else failures.push(`html differs: ${name} ${firstDifference(puckHtml, newHtml)}`);

      // What /api/v1 returns with each engine.
      const input = {
        content: data,
        kind: post ? ('post' as const) : ('page' as const),
        metadata: { language: 'en' },
      };
      // Loaders that read request headers (site context) only run inside
      // Next.js; those documents are compared on the live site instead.
      const puckData = await resolveBuilderData({ ...input, engine: 'puck' }).catch(
        (error: Error) => {
          if (!error.message.includes('outside a request scope')) throw error;
          needsRequest.push(name);
          return null;
        }
      );
      if (puckData === null) continue;
      const coreData = await resolveBuilderData({ ...input, engine: 'core' });
      if (stableJson(puckData) === stableJson(coreData)) sameData++;
      else failures.push(`loaded data differs: ${name} ${firstDifference(stableJson(puckData), stableJson(coreData))}`);
    } catch (error) {
      failures.push(`error: ${name}: ${(error as Error).message}`);
    }
  }

  console.log(
    `${stored.length} documents: ${roundTrips} round-trip unchanged, ${sameHtml} render the same HTML, ${sameData} load the same data`
  );
  if (needsRequest.length)
    console.log(
      `${needsRequest.length} need a live request to load data (compare on the site): ${needsRequest.join(', ')}`
    );
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(failures.length ? 1 : 0);
}

main();
