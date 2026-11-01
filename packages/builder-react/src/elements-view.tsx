/**
 * Elements view (E12 / R714): categorized block library with search, click-to-add,
 * preset chips, and optional drag-to-canvas support.
 */

import {
  Chip,
  ChipList,
  type LibraryItemDef,
  LibraryPanel,
} from '@nextcms/editor-ui';
import { useMemo, useState } from 'react';
import { useEditorStore } from './context';
import type { DragController } from './drag';

export interface BlockCategory {
  title: string;
  types: string[];
}

export interface ElementsViewProps {
  categories?: BlockCategory[];
  drag?: DragController;
  onSelectBlock?: (type: string) => void;
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

export function ElementsView({
  categories = DEFAULT_CATEGORIES,
  drag,
  onSelectBlock,
  className,
}: ElementsViewProps) {
  const store = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all available schemas from the store if categories aren't matching schemas
  const items = useMemo<LibraryItemDef[]>(() => {
    const list: LibraryItemDef[] = [];
    const seen = new Set<string>();

    for (const cat of categories) {
      for (const type of cat.types) {
        if (seen.has(type)) continue;
        const schema = store.schemas[type];
        if (schema) {
          seen.add(type);
          list.push({
            type,
            label: schema.label ?? type,
            category: cat.title,
          });
        }
      }
    }

    // Add any remaining schemas not explicitly in categories under "Other"
    for (const [type, schema] of Object.entries(store.schemas)) {
      if (!seen.has(type)) {
        seen.add(type);
        list.push({
          type,
          label: schema.label ?? type,
          category: 'Other',
        });
      }
    }

    return list;
  }, [categories, store.schemas]);

  const handleInsert = (type: string, presetProps?: Record<string, unknown>) => {
    store.insertBlock(type, undefined, presetProps);
    onSelectBlock?.(type);
  };

  return (
    <div className={className}>
      <LibraryPanel
        items={items}
        searchPlaceholder="Search elements…"
        itemHint="Click to add, or drag onto canvas"
        onSelectItem={item => handleInsert(item.type)}
        onItemPointerDown={(item, event) => {
          if (drag) {
            drag.start({ kind: 'new', type: item.type }, event, () =>
              handleInsert(item.type)
            );
          } else {
            handleInsert(item.type);
          }
        }}
        renderItemExtra={item => {
          const presets = store.schemas[item.type]?.presets;
          const names = presets ? Object.keys(presets) : [];
          if (!names.length) return null;
          return (
            <ChipList label={`${item.label} presets`}>
              {names.map(name => (
                <li key={name}>
                  <Chip
                    title={`Add the ${name} preset`}
                    onClick={e => {
                      e.stopPropagation();
                      handleInsert(item.type, presets?.[name]);
                    }}
                  >
                    {name}
                  </Chip>
                </li>
              ))}
            </ChipList>
          );
        }}
      />
    </div>
  );
}
