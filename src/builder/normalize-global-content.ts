import { documentToPuck, isBuilderDocument } from '@nextcms/builder-core';
import type { BuilderData as Data } from '@/builder/data';
import {
  migrateDocumentColumns,
  migratePuckColumns,
} from '@/builder/migrations/column-blocks';

/** Moves a Button's legacy `text` prop into `label`, so the inspector shows it. */
function migrateButtonText(data: Data): Data {
  const migrate = (items: Data['content']): Data['content'] =>
    items.map(item => {
      const props = item.props as Record<string, unknown>;
      if (item.type !== 'Button' || props.text === undefined) return item;
      const { text, ...rest } = props;
      return {
        ...item,
        props: {
          ...rest,
          label: rest.label || text,
          section: rest.section ?? { paddingY: 'none' },
        },
      } as unknown as Data['content'][number];
    });
  return {
    ...data,
    content: migrate(data.content),
    zones: Object.fromEntries(
      Object.entries(data.zones ?? {}).map(([key, items]) => [
        key,
        migrate(items),
      ])
    ),
  };
}

/**
 * Normalizes raw global block content from the database into BuilderData.
 * Preserves root.props so header behaviour settings survive editor reloads.
 */
export function normalizeGlobalContent(raw: unknown): Data {
  if (isBuilderDocument(raw)) {
    return migrateButtonText(
      documentToPuck(migrateDocumentColumns(raw), {
        slots: 'zones',
        ids: 'always',
      }) as Data
    );
  }

  let content: Data['content'] = [];
  let zones: Data['zones'] = {};
  let root: Data['root'] = { props: {} };

  if (Array.isArray(raw)) {
    content = raw as Data['content'];
  } else if (raw && typeof raw === 'object') {
    const obj = raw as {
      root?: { props?: Record<string, unknown> };
      content?: Data['content'];
      zones?: Data['zones'];
    };
    content = Array.isArray(obj.content) ? obj.content : [];
    zones = obj.zones && typeof obj.zones === 'object' ? obj.zones : {};
    if (obj.root?.props && typeof obj.root.props === 'object') {
      root = { props: { ...obj.root.props } };
    }
  }

  return migrateButtonText(
    migratePuckColumns({
      root,
      content,
      zones,
    }) as Data
  );
}
