/**
 * Checks every stored builder document against the new engine (R683 / R684):
 * Puck → BuilderDocument → Puck must round-trip unchanged, and BuilderRenderer
 * must produce the same HTML as Puck `Render`.
 *
 * Run with: pnpm builder:check-documents
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Render, type Data } from '@measured/puck';
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

function firstDifference(a: string, b: string) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const around = (s: string) => s.slice(Math.max(0, i - 80), i + 120);
  return `at ${i}\n    puck: ${around(a)}\n    new:  ${around(b)}`;
}

/** Puck data with every item's `id` removed, for documents saved before ids existed. */
function withoutIds(data: BuilderData): BuilderData {
  const strip = (items: BuilderData['content']) =>
    items.map(({ type, props }) => {
      const { id: _id, ...rest } = props;
      return { type, props: rest } as BuilderData['content'][number];
    });
  return {
    root: data.root,
    content: strip(data.content ?? []),
    zones: Object.fromEntries(
      Object.entries(data.zones ?? {}).map(([key, items]) => [key, strip(items)])
    ),
  };
}

async function main() {
  const stored = (await loadAll()).filter(s => isLegacyPuckData(s.content));
  const failures: string[] = [];
  let roundTrips = 0;
  let sameHtml = 0;

  for (const { name, content, post } of stored) {
    const data = content as BuilderData;
    try {
      // The first pass may add ids to items saved without one (Puck does the
      // same on load); after that, a round trip must change nothing at all.
      const doc = puckToDocument(data);
      const once = documentToPuck(doc);
      const twice = documentToPuck(puckToDocument(once));
      const hasIds = (data.content ?? []).every(item => item.props?.id);
      const sameAsStored = hasIds
        ? puckDataEqual(data, once)
        : puckDataEqual(withoutIds(data), withoutIds(once));
      if (sameAsStored && puckDataEqual(once, twice)) roundTrips++;
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
        renderToStaticMarkup(createElement(BuilderRenderer, { document: doc }))
      );
      if (puckHtml === newHtml) sameHtml++;
      else failures.push(`html differs: ${name} ${firstDifference(puckHtml, newHtml)}`);
    } catch (error) {
      failures.push(`error: ${name}: ${(error as Error).message}`);
    }
  }

  console.log(
    `${stored.length} documents: ${roundTrips} round-trip unchanged, ${sameHtml} render the same HTML`
  );
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(failures.length ? 1 : 0);
}

main();
