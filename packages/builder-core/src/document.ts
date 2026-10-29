/**
 * Versioned page / post / template / global-block document format (R682 / ENG-03).
 *
 * Design goals:
 * - Flat node map for O(1) lookup, patch saves, and undo
 * - Named slots replace Puck zones + array-item slots
 * - Props keep the same shapes as today (including Responsive<T> from style.ts)
 * - version field enables migration (R703) and package upgrades (R762)
 */

export const DOCUMENT_VERSION = 1 as const;

export type NodeId = string;

/** Editor-only settings for a node; never passed to blocks or shown on the site. */
export type NodeMeta = {
  /** Name shown in the layers panel instead of the block label. */
  name?: string;
  /** Hidden on the editing canvas only. */
  hidden?: boolean;
  /** Cannot be selected on the canvas, moved, or deleted until unlocked. */
  locked?: boolean;
};

/** Prop that carries `NodeMeta` in Puck data, so it survives a round trip. */
export const META_PROP = '__editor';

/**
 * One block instance in the document.
 * Props may contain Responsive<T> values (SectionSettings, ContainerSettings, etc.).
 */
export type BuilderNode = {
  id: NodeId;
  type: string;
  /** Block-specific props. Responsive values use Responsive<T> from ./style. */
  props: Record<string, unknown>;
  /**
   * Named slots → ordered child node ids.
   * Common names: "content" (Container, Columns), panel slots for Tabs/Accordion/Slider.
   * Leaf blocks use an empty object.
   */
  slots: Record<string, NodeId[]>;
  meta?: NodeMeta;
};

/**
 * Versioned builder document.
 * Replaces Puck Data ({ root, content, zones }) as the stored format after migration.
 */
export type BuilderDocument = {
  version: typeof DOCUMENT_VERSION;
  /** Page-level props (maxWidth, theme, paddingY, pageTransition, …). */
  root: {
    props: Record<string, unknown>;
  };
  /** Every node in the document, keyed by id. */
  nodes: Record<NodeId, BuilderNode>;
  /** Ordered top-level children of the page. */
  rootSlot: NodeId[];
};

export const emptyDocument = (): BuilderDocument => ({
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {},
  rootSlot: [],
});

export function isBuilderDocument(value: unknown): value is BuilderDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as BuilderDocument;
  return (
    doc.version === DOCUMENT_VERSION &&
    typeof doc.root === 'object' &&
    doc.root !== null &&
    typeof doc.nodes === 'object' &&
    doc.nodes !== null &&
    Array.isArray(doc.rootSlot)
  );
}

/** Returns true when the value looks like legacy Puck BuilderData. */
export function isLegacyPuckData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const data = value as { content?: unknown; root?: unknown };
  return Array.isArray(data.content) && typeof data.root === 'object';
}
