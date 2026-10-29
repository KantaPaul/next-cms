/**
 * Two-way converter between legacy Puck BuilderData and BuilderDocument (R683 / ENG-04).
 *
 * Puck stores:
 *   { root, content: BuilderItem[], zones: { "parentId:slotPath": BuilderItem[] } }
 *
 * Zone key shapes (from layers-panel / rehydrateItem):
 *   - Simple slot:     `${id}:content` | `${id}:column1` | …
 *   - Array item slot: `${id}:items[0].content` | `${id}:items[1].content` | …
 *
 * Document stores a flat node map + named slots (slot path → child ids).
 */

import type { BuilderData, BuilderItem } from './data';
import {
  DOCUMENT_VERSION,
  type BuilderDocument,
  type BuilderNode,
  type NodeId,
  emptyDocument,
  isBuilderDocument,
  isLegacyPuckData,
} from './document';

/** Slot path as stored on the node (everything after `${id}:`). */
type SlotPath = string;

function ensureId(item: BuilderItem, fallbackType: string): string {
  const id = item.props?.id;
  if (typeof id === 'string' && id.length > 0) return id;
  return `${fallbackType}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Strip nested slot arrays from props when those children live in zones/slots. */
function stripSlotArraysFromProps(
  props: Record<string, unknown>,
  slotPaths: SlotPath[]
): Record<string, unknown> {
  const next = { ...props };
  for (const path of slotPaths) {
    // Simple top-level slot: "content", "column1"
    if (!path.includes('[') && !path.includes('.')) {
      if (Array.isArray(next[path])) {
        delete next[path];
      }
      continue;
    }
    // Array path: items[0].content — leave the array items' non-slot fields;
    // clear only the nested slot key on each item when present.
    const match = path.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
    if (match) {
      const [, arrayKey, indexStr, slotKey] = match;
      const idx = Number(indexStr);
      const arr = next[arrayKey];
      if (Array.isArray(arr) && arr[idx] && typeof arr[idx] === 'object') {
        const item = { ...(arr[idx] as Record<string, unknown>) };
        if (Array.isArray(item[slotKey])) {
          delete item[slotKey];
        }
        const copy = [...arr];
        copy[idx] = item;
        next[arrayKey] = copy;
      }
    }
  }
  return next;
}

/**
 * Convert Puck BuilderData → BuilderDocument.
 */
export function puckToDocument(data: BuilderData): BuilderDocument {
  const zones = data.zones ?? {};
  const nodes: Record<NodeId, BuilderNode> = {};
  const visited = new Set<NodeId>();

  function processItem(item: BuilderItem): NodeId {
    const id = ensureId(item, item.type || 'Block');
    if (visited.has(id)) return id;
    visited.add(id);

    const prefix = `${id}:`;
    const slots: Record<string, NodeId[]> = {};
    const slotPaths: SlotPath[] = [];

    // Zones that belong to this node
    for (const [zoneKey, zoneItems] of Object.entries(zones)) {
      if (!zoneKey.startsWith(prefix)) continue;
      const slotPath = zoneKey.slice(prefix.length);
      if (!slotPath) continue;
      slotPaths.push(slotPath);
      const childIds: NodeId[] = [];
      for (const child of zoneItems ?? []) {
        if (!child || typeof child !== 'object') continue;
        childIds.push(processItem(child as BuilderItem));
      }
      slots[slotPath] = childIds;
    }

    // Also pick up slot arrays embedded in props (pre-rehydrate / inline)
    const propsIn = (item.props ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(propsIn)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      // Array of BuilderItems (slot stored inline)
      if (
        value.every(
          v =>
            v &&
            typeof v === 'object' &&
            typeof (v as BuilderItem).type === 'string' &&
            (v as BuilderItem).props
        )
      ) {
        if (slots[key]) continue; // zones already won
        slotPaths.push(key);
        slots[key] = (value as BuilderItem[]).map(processItem);
        continue;
      }
      // Array of panel objects with nested content slot
      value.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;
        const content = (entry as Record<string, unknown>).content;
        if (
          Array.isArray(content) &&
          content.every(
            v =>
              v &&
              typeof v === 'object' &&
              typeof (v as BuilderItem).type === 'string'
          )
        ) {
          const path = `${key}[${idx}].content`;
          if (slots[path]) return;
          slotPaths.push(path);
          slots[path] = (content as BuilderItem[]).map(processItem);
        }
      });
    }

    const props = stripSlotArraysFromProps({ ...propsIn, id }, slotPaths);

    nodes[id] = {
      id,
      type: item.type,
      props,
      slots,
    };

    return id;
  }

  const rootSlot = (data.content ?? []).map(processItem);

  return {
    version: DOCUMENT_VERSION,
    root: { props: { ...(data.root?.props ?? {}) } },
    nodes,
    rootSlot,
  };
}

export type DocumentToPuckOptions = {
  /**
   * Where slot children go. `inline` (default) writes them into props at the
   * slot path, which is how Puck 0.20 `slot` fields store them. `zones` writes
   * `{id}:{slotPath}` zone entries, for data saved with the older DropZone API.
   */
  slots?: 'inline' | 'zones';
};

/**
 * Convert BuilderDocument → Puck BuilderData.
 */
export function documentToPuck(
  doc: BuilderDocument,
  options: DocumentToPuckOptions = {}
): BuilderData {
  const useZones = options.slots === 'zones';
  const zones: Record<string, BuilderItem[]> = {};

  function nodeToItem(id: NodeId): BuilderItem | null {
    const node = doc.nodes[id];
    if (!node) return null;

    const props: Record<string, unknown> = {
      ...node.props,
      id: node.id,
    };

    for (const [slotPath, childIds] of Object.entries(node.slots)) {
      const children = childIds
        .map(cid => nodeToItem(cid))
        .filter((c): c is BuilderItem => c !== null);

      if (useZones) zones[`${node.id}:${slotPath}`] = children;

      // Array panel paths items[i].content: make sure the parent item exists,
      // and put the children on it when slots are stored inline.
      const match = slotPath.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
      if (match) {
        const [, arrayKey, indexStr, slotKey] = match;
        const idx = Number(indexStr);
        const existing = props[arrayKey];
        const copy: Record<string, unknown>[] = Array.isArray(existing)
          ? [...existing]
          : [];
        while (copy.length <= idx) copy.push({});
        if (!copy[idx] || typeof copy[idx] !== 'object') copy[idx] = {};
        if (!useZones) copy[idx] = { ...copy[idx], [slotKey]: children };
        props[arrayKey] = copy;
      } else if (!useZones) {
        props[slotPath] = children;
      }
    }

    return {
      type: node.type,
      props: props as Record<string, unknown> & { id: string },
    };
  }

  const content = doc.rootSlot
    .map(id => nodeToItem(id))
    .filter((c): c is BuilderItem => c !== null);

  return {
    root: { props: { ...(doc.root?.props ?? {}) } },
    content,
    zones,
  };
}

/**
 * Accept either format and return a BuilderDocument.
 */
export function toDocument(value: unknown): BuilderDocument {
  if (isBuilderDocument(value)) return value;
  if (isLegacyPuckData(value)) return puckToDocument(value as BuilderData);
  return emptyDocument();
}

/**
 * Accept either format and return Puck BuilderData.
 */
export function toPuckData(value: unknown): BuilderData {
  if (isBuilderDocument(value)) return documentToPuck(value);
  if (isLegacyPuckData(value)) return value as BuilderData;
  return { root: { props: {} }, content: [], zones: {} };
}

/**
 * Structural equality for round-trip tests (ignores key order in objects).
 */
export function documentsEqual(a: BuilderDocument, b: BuilderDocument): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function puckDataEqual(a: BuilderData, b: BuilderData): boolean {
  return stableStringify(normalizePuckForCompare(a)) ===
    stableStringify(normalizePuckForCompare(b));
}

function normalizePuckForCompare(data: BuilderData): unknown {
  // Drop empty zone entries; sort zone keys
  const zones: Record<string, unknown> = {};
  for (const key of Object.keys(data.zones ?? {}).sort()) {
    const items = data.zones![key] ?? [];
    if (items.length) zones[key] = items;
  }
  return {
    root: data.root ?? { props: {} },
    content: data.content ?? [],
    zones,
  };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
