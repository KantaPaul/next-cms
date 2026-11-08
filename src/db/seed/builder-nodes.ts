/**
 * Helpers for writing builder content in the seed. Blocks start from their
 * definition's defaults, so seeded content matches what the editor would
 * create, and every document is validated before it is stored.
 */
import { toDocument } from '@nextcms/builder-core';
import type { BuilderData, BuilderItem } from '@/builder/data';
import { pageDefinitions } from '@/builder/definitions';
import { migrateColumnBlocks } from '@/builder/migrations/column-blocks';
import { documentIssues } from '@/builder/validate-document';

let counter = 0;

/** A block with its default props, overridden by `props`. Slot children go in `props` too. */
export function block(type: string, props: Record<string, unknown> = {}): BuilderItem {
  const definition = pageDefinitions[type];
  if (!definition) throw new Error(`Seed: unknown block type ${type}`);
  counter += 1;
  const defaults = structuredClone((definition as { defaults?: Record<string, unknown> }).defaults ?? {});
  return {
    type,
    props: { ...defaults, ...props, id: `${type}-seed-${counter}` },
  } as BuilderItem;
}

/** A section of a page: one block with its own heading in a RichText above it. */
export function titled(heading: string, text: string, item: BuilderItem): BuilderItem[] {
  return [
    block('RichText', {
      content: `<h2>${heading}</h2><p>${text}</p>`,
      width: 'normal',
    }),
    item,
  ];
}

export function page(
  content: BuilderItem[],
  rootProps: Record<string, unknown> = { maxWidth: 'xl', theme: 'site', paddingY: 'none' }
): BuilderData {
  return migrateColumnBlocks({
    root: { props: rootProps },
    content,
    zones: {},
  }) as BuilderData;
}

/** Throws when a document would be rejected by the editor's save check. */
export function assertValid(name: string, data: unknown) {
  const migrated = migrateColumnBlocks(data);
  const issues = documentIssues(toDocument(migrated));
  if (issues.length) {
    throw new Error(`Seed content "${name}" is invalid:\n  - ${issues.join('\n  - ')}`);
  }
  return migrated;
}
