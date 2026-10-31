import type { BuilderData as Data } from '@/builder/data';

/**
 * Normalizes raw global block content from the database into BuilderData.
 * Preserves root.props so header behaviour settings survive editor reloads.
 */
export function normalizeGlobalContent(raw: unknown): Data {
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

  return {
    root,
    content,
    zones,
  };
}
