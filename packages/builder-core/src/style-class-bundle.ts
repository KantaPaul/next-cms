/**
 * Moving style classes with a document (KRK-01, step 1.8). Nodes reference
 * classes by id, and ids only mean something on one site, so a document that
 * leaves the site (JSON export) carries the classes it uses. On import they
 * are matched to the target site's classes by name:
 *
 * - same name and same styles → reuse the existing class
 * - same name, different styles → create `name-2` (never restyle what is there)
 * - no class by that name → create it
 * - tag styles → reuse the site's style for that tag if it has one
 *
 * Then the document's `classIds` are rewritten to the target site's ids.
 */

import type { BuilderDocument } from './document';
import { collectUsedClassIds, type CssDeclarations, type StyleClass } from './style-classes';

/** A class as carried in an exported file: its source id plus what is needed to recreate it. */
export type BundledStyleClass = {
  id: string;
  name: string;
  kind: StyleClass['kind'];
  tag?: string;
  comboOf?: string;
  variants: Record<string, CssDeclarations>;
};

/** The key an exported document file carries its classes under. */
export const STYLE_CLASS_BUNDLE_KEY = 'styleClasses';

/** The classes a document uses, plus the bases of its combos, ready to export. */
export function bundleStyleClasses(doc: BuilderDocument, classes: Record<string, StyleClass>): BundledStyleClass[] {
  const ids = new Set(collectUsedClassIds(doc));
  for (const id of [...ids]) {
    const base = classes[id]?.comboOf;
    if (base) ids.add(base);
  }
  return [...ids]
    .map(id => classes[id])
    .filter((cls): cls is StyleClass => Boolean(cls))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(cls => ({
      id: cls.id,
      name: cls.name,
      kind: cls.kind,
      ...(cls.tag ? { tag: cls.tag } : {}),
      ...(cls.comboOf ? { comboOf: cls.comboOf } : {}),
      variants: cls.variants,
    }));
}

/** Splits an imported file into the document and its class bundle (if any). */
export function splitStyleClassBundle(value: unknown): { document: unknown; bundle: BundledStyleClass[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { document: value, bundle: [] };
  const { [STYLE_CLASS_BUNDLE_KEY]: raw, ...document } = value as Record<string, unknown>;
  if (!Array.isArray(raw)) return { document: value, bundle: [] };
  const bundle = raw.filter(
    (item): item is BundledStyleClass =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as BundledStyleClass).id === 'string' &&
      typeof (item as BundledStyleClass).name === 'string' &&
      ((item as BundledStyleClass).kind === 'class' || (item as BundledStyleClass).kind === 'tag') &&
      !!(item as BundledStyleClass).variants &&
      typeof (item as BundledStyleClass).variants === 'object'
  );
  return { document, bundle };
}

/** Stable comparison of two variant maps. */
function sameVariants(a: Record<string, CssDeclarations>, b: Record<string, CssDeclarations>): boolean {
  const norm = (v: Record<string, CssDeclarations>) =>
    JSON.stringify(
      Object.keys(v)
        .filter(key => Object.keys(v[key] ?? {}).length)
        .sort()
        .map(key => [key, Object.entries(v[key]).sort(([x], [y]) => x.localeCompare(y))])
    );
  return norm(a) === norm(b);
}

export type StyleClassImportStep =
  | { action: 'reuse'; sourceId: string; targetId: string }
  | {
      action: 'create';
      sourceId: string;
      name: string;
      kind: StyleClass['kind'];
      tag?: string;
      /** Source id of the base; resolve it through the map once the base exists. */
      comboOfSource?: string;
      variants: Record<string, CssDeclarations>;
    };

/**
 * What importing a bundle into a site does, in an order that creates combo
 * bases before their combos. Names are made unique against the site's
 * classes and against each other. Combos whose base is missing are skipped.
 */
export function planStyleClassImport(bundle: BundledStyleClass[], existing: StyleClass[]): StyleClassImportStep[] {
  const taken = new Set(existing.map(cls => cls.name));
  const bySource = new Map(bundle.map(cls => [cls.id, cls]));
  const unique = (name: string) => {
    if (!taken.has(name)) return name;
    for (let n = 2; ; n++) {
      const candidate = `${name.slice(0, 80 - `-${n}`.length)}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  };
  // Bases (and tag styles) first, then combos whose base is in the bundle.
  const ordered = [
    ...bundle.filter(cls => !cls.comboOf),
    ...bundle.filter(cls => cls.comboOf && bySource.has(cls.comboOf) && !bySource.get(cls.comboOf)?.comboOf),
  ];
  const steps: StyleClassImportStep[] = [];
  const reusedTarget = new Map<string, StyleClass>();

  for (const cls of ordered) {
    if (cls.kind === 'tag') {
      const match = existing.find(e => e.kind === 'tag' && e.tag === cls.tag);
      if (match) {
        steps.push({ action: 'reuse', sourceId: cls.id, targetId: match.id });
        continue;
      }
    } else {
      const match = existing.find(e => e.kind === 'class' && e.name === cls.name);
      // A combo only matches a class that is a combo of the same (reused) base.
      const baseTarget = cls.comboOf ? reusedTarget.get(cls.comboOf)?.id : undefined;
      const sameShape = match && (cls.comboOf ? match.comboOf === baseTarget && baseTarget !== undefined : !match.comboOf);
      if (match && sameShape && sameVariants(match.variants, cls.variants)) {
        steps.push({ action: 'reuse', sourceId: cls.id, targetId: match.id });
        reusedTarget.set(cls.id, match);
        continue;
      }
    }
    const name = cls.kind === 'tag' ? cls.name : unique(cls.name);
    taken.add(name);
    steps.push({
      action: 'create',
      sourceId: cls.id,
      name,
      kind: cls.kind,
      ...(cls.kind === 'tag' && cls.tag ? { tag: cls.tag } : {}),
      ...(cls.comboOf ? { comboOfSource: cls.comboOf } : {}),
      variants: cls.variants,
    });
  }
  return steps;
}

/**
 * Rewrites every node's `classIds` through `map` (source id → target id).
 * Ids not in the map are dropped: they belonged to the source site.
 * Returns the same document when nothing changes.
 */
export function remapDocumentClassIds(doc: BuilderDocument, map: Record<string, string>): BuilderDocument {
  let changed = false;
  const nodes: BuilderDocument['nodes'] = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    const classIds = node.props.classIds;
    if (!Array.isArray(classIds)) {
      nodes[id] = node;
      continue;
    }
    const next = classIds
      .map(classId => (typeof classId === 'string' ? map[classId] : undefined))
      .filter((classId, index, all): classId is string => !!classId && all.indexOf(classId) === index);
    const same = next.length === classIds.length && next.every((classId, index) => classId === classIds[index]);
    if (same) {
      nodes[id] = node;
      continue;
    }
    changed = true;
    const props = { ...node.props };
    if (next.length) props.classIds = next;
    else delete props.classIds;
    nodes[id] = { ...node, props };
  }
  return changed ? { ...doc, nodes } : doc;
}
