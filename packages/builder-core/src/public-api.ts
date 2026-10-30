/**
 * The package's small public surface (R758 / PKG-04): `createBuilderConfig`
 * turns a flat list of `defineBlock` definitions into the schemas and React
 * components the editor and renderer need; `BuilderRenderer` renders a
 * document with that config; `validateDocument`, `migrateDocument`, and
 * `serializeDocument` are the document-format contract (R762 / PKG-08).
 * Everything else a host needs — `defineBlock`, `defineField` (builder-react),
 * `extendBlock`, traits, adapters — is exported from the package directly;
 * this file only adds the handful of names the "Target usage" example calls
 * for that didn't already exist as a single function or component.
 */

import type { ComponentType, ReactNode } from 'react';
import { puckToDocument } from './converter';
import type { BlockDefinition } from './define';
import { toBlockSchema } from './define';
import {
  type BuilderDocument,
  DOCUMENT_VERSION,
  emptyDocument,
  isBuilderDocument,
  isLegacyPuckData,
} from './document';
import { documentProblems } from './patch';
import type { PuckData } from './puck-data';
import {
  type BlockComponents,
  type RenderOptions,
  renderDocument,
} from './renderer';
import { composeRender } from './traits';

/** One group of block types shown together in an insert panel, by category. */
export type BuilderBlockGroup = { title: string; types: string[] };

/** What `createBuilderConfig` builds from a block list: everything the editor and renderer need. */
export type BuilderConfig = {
  /** Every block's type and raw `defineBlock` definition, for anything beyond schemas and components. */
  blocks: Record<string, BlockDefinition>;
  /** The editor's view of each block: defaults, slots, and presets. */
  schemas: Record<string, ReturnType<typeof toBlockSchema>>;
  /** Each block's render component, with its traits' wrappers already composed. */
  components: BlockComponents;
  /** Block types grouped by category, in the order blocks were given. */
  groups: BuilderBlockGroup[];
};

/**
 * Builds a `BuilderConfig` from a flat list of blocks defined with
 * `defineBlock` (R758 / PKG-04): the glue a host would otherwise hand-write
 * between its block definitions and the editor's `schemas` / `components`
 * maps.
 */
export function createBuilderConfig(options: {
  blocks: BlockDefinition[];
}): BuilderConfig {
  const blocks: Record<string, BlockDefinition> = {};
  const schemas: Record<string, ReturnType<typeof toBlockSchema>> = {};
  const components: BlockComponents = {};
  const order: string[] = [];
  const byCategory = new Map<string, string[]>();

  for (const block of options.blocks) {
    blocks[block.type] = block;
    schemas[block.type] = toBlockSchema(block);
    components[block.type] = composeRender(
      block,
      block.traits ?? []
    ) as unknown as ComponentType<Record<string, unknown>>;
    const category = block.category ?? 'Blocks';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
      order.push(category);
    }
    byCategory.get(category)?.push(block.type);
  }

  return {
    blocks,
    schemas,
    components,
    groups: order.map(title => ({ title, types: byCategory.get(title) ?? [] })),
  };
}

/**
 * Renders a document with a `BuilderConfig`'s components (R758 / PKG-04) —
 * the "public page, no editor code shipped" half of the target usage.
 */
export function BuilderRenderer({
  config,
  document,
  ...options
}: { config: BuilderConfig; document: BuilderDocument } & Partial<
  Omit<RenderOptions, 'components'>
>): ReactNode {
  return renderDocument(document, {
    components: config.components,
    ...options,
  });
}

export type DocumentValidation =
  | { ok: true; document: BuilderDocument }
  | { ok: false; issues: string[] };

/**
 * Checks that a value is a usable document: the current version's shape (or
 * legacy Puck data, converted), with no dangling references, cycles, or
 * duplicate placements (R758 / PKG-04; the structural checks are R797).
 */
export function validateDocument(value: unknown): DocumentValidation {
  if (isLegacyPuckData(value)) {
    return { ok: true, document: puckToDocument(value as PuckData) };
  }
  if (!isBuilderDocument(value)) {
    return {
      ok: false,
      issues: [
        'Not a recognized document: expected a BuilderDocument or legacy Puck data.',
      ],
    };
  }
  const issues = documentProblems(value);
  return issues.length ? { ok: false, issues } : { ok: true, document: value };
}

/** One version's upgrade: returns the document (or raw record) one version newer. */
export type DocumentMigration = (
  doc: Record<string, unknown>
) => Record<string, unknown>;

/**
 * Migrations a host has registered, keyed by the version they upgrade from.
 * Empty today — `DOCUMENT_VERSION` is still 1 — but this is where a future
 * bump registers its migration, so stored documents from an older package
 * version keep working after an upgrade (R762 / PKG-08).
 */
export const documentMigrations: Record<number, DocumentMigration> = {};

/**
 * Upgrades a stored value to the current document version: converts legacy
 * Puck data, then steps through `documentMigrations` from the stored
 * version. Falls back to an empty document for anything it cannot recognize
 * or has no migration path for, so a corrupt or unknown value never throws
 * (`validateDocument` is the call for surfacing *why* something failed).
 */
export function migrateDocument(value: unknown): BuilderDocument {
  if (isLegacyPuckData(value)) return puckToDocument(value as PuckData);
  if (!value || typeof value !== 'object') return emptyDocument();
  let doc = value as Record<string, unknown>;
  let version =
    typeof doc.version === 'number' ? doc.version : DOCUMENT_VERSION;
  while (version < DOCUMENT_VERSION) {
    const migrate = documentMigrations[version];
    if (!migrate) break;
    doc = migrate(doc);
    version = typeof doc.version === 'number' ? doc.version : version + 1;
  }
  return isBuilderDocument(doc) ? doc : emptyDocument();
}

/** A document as stored JSON (R758 / PKG-04). */
export function serializeDocument(doc: BuilderDocument): string {
  return JSON.stringify(doc);
}

/** The reverse of `serializeDocument`: parses and validates in one step. */
export function deserializeDocument(json: string): DocumentValidation {
  try {
    return validateDocument(JSON.parse(json));
  } catch {
    return { ok: false, issues: ['Could not parse JSON.'] };
  }
}
