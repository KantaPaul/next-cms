/**
 * Block manager: which blocks each editor type offers in its insert panel.
 * Settings store the *hidden* blocks per editor type, so blocks added later
 * show up by default. Hiding a block never breaks content that already uses
 * it: it is only left out of the insert panel.
 */

export const BLOCK_EDITOR_TYPES = [
  { kind: 'page', label: 'Pages' },
  { kind: 'post', label: 'Post layouts' },
  { kind: 'post-template', label: 'Post templates' },
  { kind: 'page-template', label: 'Page templates' },
  { kind: 'loop-item', label: 'Loop items' },
  { kind: 'entry', label: 'Post type entries' },
  { kind: 'entry-template', label: 'Post type templates' },
  { kind: 'collection-block', label: 'Collection blocks' },
  { kind: 'global', label: 'Global blocks' },
  { kind: 'contact-form', label: 'Contact forms' },
  { kind: 'header', label: 'Header' },
  { kind: 'footer', label: 'Footer' },
] as const;

export type BlockEditorKind = (typeof BLOCK_EDITOR_TYPES)[number]['kind'];

export const BLOCK_EDITOR_KINDS = BLOCK_EDITOR_TYPES.map(t => t.kind) as [
  BlockEditorKind,
  ...BlockEditorKind[],
];

/** Editor kinds scoped to an individual custom post type (collection). */
export const COLLECTION_BLOCK_EDITOR_TYPES = [
  { kind: 'entry', label: 'Entries (custom layout)' },
  { kind: 'entry-template', label: 'Single templates' },
  { kind: 'collection-block', label: 'Collection blocks' },
] as const;

export type CollectionBlockEditorKind =
  (typeof COLLECTION_BLOCK_EDITOR_TYPES)[number]['kind'];

export const COLLECTION_BLOCK_EDITOR_KINDS = COLLECTION_BLOCK_EDITOR_TYPES.map(
  t => t.kind
) as [CollectionBlockEditorKind, ...CollectionBlockEditorKind[]];

export type BlockSettings = {
  /** Hidden block types per editor type. A missing kind uses the default. */
  hidden: Partial<Record<BlockEditorKind, string[]>>;
};

export type CollectionBlockSettings = {
  /** Hidden block types per collection editor kind. A missing kind inherits site settings. */
  hidden: Partial<Record<CollectionBlockEditorKind, string[]>>;
};

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = { hidden: {} };

export const DEFAULT_COLLECTION_BLOCK_SETTINGS: CollectionBlockSettings = {
  hidden: {},
};

/**
 * Editor types that start with a short list instead of every block. The
 * Loop Item editor designs one card, so page sections are left out.
 */
const DEFAULT_ONLY: Partial<Record<BlockEditorKind, readonly string[]>> = {
  'loop-item': [
    'LoopItemField',
    'RichText',
    'Image',
    'Video',
    'Container',
    'Columns',
    'Button',
    'Spacer',
  ],
};

/** Hidden blocks for an editor type when the site hasn't customised it. */
export function defaultHiddenBlocks(
  kind: string,
  available: readonly string[]
): string[] {
  const only = DEFAULT_ONLY[kind as BlockEditorKind];
  return only ? available.filter(type => !only.includes(type)) : [];
}

/** Hidden blocks for an editor type: collection override (if any), else site choice, else default. */
export function hiddenBlocksFor(
  settings: BlockSettings | null | undefined,
  kind: string,
  available: readonly string[],
  collectionSettings?: CollectionBlockSettings | null
): string[] {
  const collectionSaved =
    collectionSettings?.hidden?.[kind as CollectionBlockEditorKind];
  if (Array.isArray(collectionSaved)) return collectionSaved;
  const saved = settings?.hidden?.[kind as BlockEditorKind];
  return Array.isArray(saved) ? saved : defaultHiddenBlocks(kind, available);
}

function normalizeHiddenMap<K extends string>(
  value: unknown,
  kinds: readonly K[]
): Partial<Record<K, string[]>> {
  const hidden: Partial<Record<K, string[]>> = {};
  const raw =
    value && typeof value === 'object'
      ? (value as { hidden?: unknown }).hidden
      : undefined;
  if (raw && typeof raw === 'object') {
    for (const kind of kinds) {
      const list = (raw as Record<string, unknown>)[kind];
      if (Array.isArray(list)) {
        hidden[kind] = list.filter((t): t is string => typeof t === 'string');
      }
    }
  }
  return hidden;
}

/** Accepts stored JSON of any shape and returns valid settings. */
export function normalizeBlockSettings(value: unknown): BlockSettings {
  return { hidden: normalizeHiddenMap(value, BLOCK_EDITOR_KINDS) };
}

/** Accepts stored collection block settings JSON and returns valid settings. */
export function normalizeCollectionBlockSettings(
  value: unknown
): CollectionBlockSettings {
  return { hidden: normalizeHiddenMap(value, COLLECTION_BLOCK_EDITOR_KINDS) };
}
