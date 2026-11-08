import {
  documentToPuck,
  isBuilderDocument,
} from '@nextcms/builder-core';
import type { BuilderData as Data } from '@/builder/data';
import {
  migrateDocumentColumns,
  migratePuckColumns,
} from '@/builder/migrations/column-blocks';

/**
 * Normalizes raw global block content from the database into BuilderData.
 * Preserves root.props so header behaviour settings survive editor reloads.
 */
export function normalizeGlobalContent(raw: unknown): Data {
  if (isBuilderDocument(raw)) {
    return documentToPuck(migrateDocumentColumns(raw), {
      slots: 'zones',
      ids: 'always',
    }) as Data;
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

  return migratePuckColumns({
    root,
    content,
    zones,
  }) as Data;
}
