/**
 * Elements view (E12 / R714): the block library. Blocks / Patterns / Global
 * tabs, search, favorites and recent additions, category sections with a
 * hover preview, click-to-add, and optional drag-to-canvas support.
 */

import {
  type BlockSchemas,
  type BuilderDocument,
  createNodeId,
} from '@nextcms/builder-core';
import {
  BlockLibrary,
  type BlockLibraryBlock,
  type BlockLibraryEntry,
  type BlockLibraryTab,
  useLibraryPreferences,
} from '@nextcms/editor-ui';
import { useMemo } from 'react';
import { useEditorStore } from './context';
import { DEFAULT_TEMPLATES, type TemplateItem } from './data/default-templates';
import type { DragController } from './drag';
import type { EditorStore } from './store';

export interface BlockCategory {
  title: string;
  types: string[];
}

export interface ElementsViewProps {
  categories?: BlockCategory[];
  drag?: DragController;
  onSelectBlock?: (type: string) => void;
  /** Saved templates listed under Patterns, ahead of the built-in ones. */
  templates?: TemplateItem[];
  /** Replaces the default insert-at-end when a template is picked. */
  onApplyTemplate?: (template: TemplateItem) => void;
  /** Saved global blocks; picking one inserts a GlobalRef to it. */
  globals?: BlockLibraryEntry[];
  /** Side the hover preview opens on; the side away from the panel's dock. */
  previewSide?: 'left' | 'right';
  /** localStorage key for favorites and recents. */
  storageKey?: string;
  defaultTab?: BlockLibraryTab;
  className?: string;
}

const DEFAULT_CATEGORIES: BlockCategory[] = [
  {
    title: 'Layout',
    types: ['Section', 'Container', 'Columns', 'Grid', 'Card'],
  },
  {
    title: 'Typography',
    types: ['Heading', 'Text', 'Paragraph', 'Quote', 'List'],
  },
  {
    title: 'Media',
    types: ['Image', 'Video', 'Icon', 'Gallery'],
  },
  {
    title: 'Interactive',
    types: ['Button', 'Link', 'Tabs', 'Accordion', 'Modal'],
  },
];

const GLOBAL_REF = 'GlobalRef';
const TEMPLATE = 'template:';
const PRESET = 'preset:';

function libraryBlock(
  schemas: BlockSchemas,
  type: string,
  category: string
): BlockLibraryBlock {
  const schema = schemas[type];
  const hasSlots =
    Object.keys(schema.slots ?? {}).length > 0 ||
    Object.keys(schema.arraySlots ?? {}).length > 0;
  return {
    type,
    label: schema.label ?? type,
    category,
    icon: schema.icon,
    description: schema.description,
    capabilities: schema.capabilities,
    semanticTag: schema.semanticTag,
    nesting: schema.nesting ?? (hasSlots ? 'children' : 'leaf'),
    defaultSize: schema.defaultSize,
  };
}

/** Appends a template's blocks to the page under fresh ids and selects the first. */
function insertTemplate(store: EditorStore, content: BuilderDocument) {
  const doc = store.getState().doc;
  const ids = new Map<string, string>();
  for (const [id, node] of Object.entries(content.nodes)) {
    ids.set(id, createNodeId(node.type));
  }
  const nodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(content.nodes)) {
    const slots: Record<string, string[]> = {};
    for (const [key, children] of Object.entries(node.slots ?? {})) {
      slots[key] = children.map(child => ids.get(child) ?? child);
    }
    const fresh = ids.get(id) ?? id;
    nodes[fresh] = { ...node, id: fresh, slots };
  }
  const added = (content.rootSlot ?? []).map(child => ids.get(child) ?? child);
  store.replaceDocument(
    { ...doc, nodes, rootSlot: [...(doc.rootSlot ?? []), ...added] },
    { label: 'Insert pattern' }
  );
  if (added.length) store.select([added[0]]);
}

export function ElementsView({
  categories = DEFAULT_CATEGORIES,
  drag,
  onSelectBlock,
  templates,
  onApplyTemplate,
  globals,
  previewSide,
  storageKey,
  defaultTab,
  className,
}: ElementsViewProps) {
  const store = useEditorStore();
  const { schemas } = store;
  const { favorites, recents, toggleFavorite, addRecent } =
    useLibraryPreferences(storageKey);

  const blocks = useMemo<BlockLibraryBlock[]>(() => {
    const list: BlockLibraryBlock[] = [];
    const seen = new Set<string>();
    for (const cat of categories) {
      for (const type of cat.types) {
        if (seen.has(type) || !schemas[type]) continue;
        seen.add(type);
        list.push(libraryBlock(schemas, type, cat.title));
      }
    }
    // Schemas the categories leave out are listed under "Other".
    for (const type of Object.keys(schemas)) {
      if (seen.has(type)) continue;
      seen.add(type);
      list.push(libraryBlock(schemas, type, 'Other'));
    }
    return list;
  }, [categories, schemas]);

  // Templates whose blocks this editor knows, then each block's presets.
  const allTemplates = useMemo(
    () =>
      [...(templates ?? []), ...DEFAULT_TEMPLATES].filter(template =>
        Object.values(template.content.nodes).every(node => schemas[node.type])
      ),
    [templates, schemas]
  );
  const patterns = useMemo<BlockLibraryEntry[]>(() => {
    const list: BlockLibraryEntry[] = allTemplates.map(template => ({
      id: TEMPLATE + template.id,
      label: template.name,
      description: template.description,
      category: template.category === 'Custom' ? 'Saved' : 'Templates',
    }));
    for (const block of blocks) {
      for (const name of Object.keys(schemas[block.type].presets ?? {})) {
        list.push({
          id: `${PRESET}${block.type}:${name}`,
          label: `${block.label}: ${name}`,
          description: block.description,
          category: 'Section presets',
        });
      }
    }
    return list;
  }, [allTemplates, blocks, schemas]);

  const globalEntries = useMemo<BlockLibraryEntry[]>(() => {
    if (!schemas[GLOBAL_REF]) return [];
    return [
      ...(globals ?? []),
      {
        id: '',
        label: schemas[GLOBAL_REF].label ?? 'Global block',
        description: 'Insert a link and pick the global block in its settings.',
      },
    ];
  }, [globals, schemas]);

  const handleInsert = (type: string, props?: Record<string, unknown>) => {
    store.insertBlock(type, undefined, props);
    addRecent(type);
    onSelectBlock?.(type);
  };

  const applyPattern = (entry: BlockLibraryEntry) => {
    if (entry.id.startsWith(TEMPLATE)) {
      const template = allTemplates.find(
        t => TEMPLATE + t.id === entry.id
      );
      if (!template) return;
      if (onApplyTemplate) onApplyTemplate(template);
      else insertTemplate(store, template.content);
      return;
    }
    const [type, ...rest] = entry.id.slice(PRESET.length).split(':');
    const preset = schemas[type]?.presets?.[rest.join(':')];
    if (preset) handleInsert(type, preset);
  };

  return (
    <BlockLibrary
      className={className}
      blocks={blocks}
      patterns={patterns}
      globals={globalEntries}
      favorites={favorites}
      recents={recents}
      onToggleFavorite={toggleFavorite}
      onAddBlock={type => handleInsert(type)}
      onBlockPointerDown={
        drag
          ? (type, event) =>
              drag.start({ kind: 'new', type }, event, () => handleInsert(type))
          : undefined
      }
      onApplyPattern={applyPattern}
      onAddGlobal={entry =>
        handleInsert(
          GLOBAL_REF,
          entry.id ? { globalBlockId: entry.id } : undefined
        )
      }
      previewSide={previewSide}
      defaultTab={defaultTab}
    />
  );
}
