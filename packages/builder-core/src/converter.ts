/**
 * Two-way converter between legacy Puck PuckData and BuilderDocument (R683 / ENG-04).
 *
 * Puck stores:
 *   { root, content: PuckItem[], zones: { "parentId:slotPath": PuckItem[] } }
 *
 * Zone key shapes (from layers-panel / rehydrateItem):
 *   - Simple slot:     `${id}:content` | `${id}:column1` | …
 *   - Array item slot: `${id}:items[0].content` | `${id}:items[1].content` | …
 *
 * Document stores a flat node map + named slots (slot path → child ids).
 */

import type { PuckData, PuckItem } from './puck-data';
import {
  DOCUMENT_VERSION,
  type BuilderDocument,
  type BuilderNode,
  type NodeId,
  emptyDocument,
  isBuilderDocument,
  isLegacyPuckData,
  META_PROP,
  type NodeMeta,
} from './document';

/** Slot path as stored on the node (everything after `${id}:`). */
type SlotPath = string;

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
 * Convert Puck PuckData → BuilderDocument.
 */
export function puckToDocument(data: PuckData): BuilderDocument {
  const zones = data.zones ?? {};
  const nodes: Record<NodeId, BuilderNode> = {};
  const visited = new Set<NodeId>();
  let generated = 0;

  // Items saved without an id get a deterministic one, so converting the same
  // data twice gives the same document. Their props keep no id, so converting
  // back returns the item as it was stored.
  function idFor(item: PuckItem): NodeId {
    const id = item.props?.id;
    if (typeof id === 'string' && id.length > 0) return id;
    generated += 1;
    return `${item.type || 'Block'}-auto-${generated}`;
  }

  function processItem(item: PuckItem): NodeId {
    const id = idFor(item);
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
        childIds.push(processItem(child as PuckItem));
      }
      slots[slotPath] = childIds;
    }

    // Also pick up slot arrays embedded in props (pre-rehydrate / inline)
    const propsIn = (item.props ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(propsIn)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      // Array of Puck items (slot stored inline)
      if (
        value.every(
          v =>
            v &&
            typeof v === 'object' &&
            typeof (v as PuckItem).type === 'string' &&
            (v as PuckItem).props
        )
      ) {
        if (slots[key]) continue; // zones already won
        slotPaths.push(key);
        slots[key] = (value as PuckItem[]).map(processItem);
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
              typeof (v as PuckItem).type === 'string'
          )
        ) {
          const path = `${key}[${idx}].content`;
          if (slots[path]) return;
          slotPaths.push(path);
          slots[path] = (content as PuckItem[]).map(processItem);
        }
      });
    }

    const props = stripSlotArraysFromProps({ ...propsIn }, slotPaths);
    const meta = props[META_PROP] as NodeMeta | undefined;
    delete props[META_PROP];

    nodes[id] = {
      id,
      type: item.type,
      props,
      slots,
      ...(meta && typeof meta === 'object' ? { meta } : {}),
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
  /**
   * Which items carry `props.id`. `stored` (default) writes it only where the
   * block already had one, so data saved without ids round-trips unchanged.
   * `always` writes every block's id. Use it wherever stored data is read back
   * and patched by id, such as versioned page saves: otherwise a block made in
   * the editor (no `props.id`) comes back as `Type-auto-N`, and the next patch
   * that touches it misses and leaves it orphaned.
   */
  ids?: 'stored' | 'always';
};

/**
 * Convert BuilderDocument → Puck PuckData.
 */
export function documentToPuck(
  doc: BuilderDocument,
  options: DocumentToPuckOptions = {}
): PuckData {
  const useZones = options.slots === 'zones';
  const writeIds = useZones || options.ids === 'always';
  const zones: Record<string, PuckItem[]> = {};

  function nodeToItem(id: NodeId): PuckItem | null {
    const node = doc.nodes[id];
    if (!node) return null;

    // Zone keys need the id; inline items only carry one if it was stored,
    // unless the caller asked for every id (see `ids`).
    const props: Record<string, unknown> = { ...node.props };
    if (writeIds || node.props.id !== undefined) props.id = node.id;
    if (node.meta && Object.keys(node.meta).length) props[META_PROP] = node.meta;

    for (const [slotPath, childIds] of Object.entries(node.slots)) {
      const children = childIds
        .map(cid => nodeToItem(cid))
        .filter((c): c is PuckItem => c !== null);

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
    .filter((c): c is PuckItem => c !== null);

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
  if (isLegacyPuckData(value)) return puckToDocument(value as PuckData);
  return emptyDocument();
}

/**
 * Accept either format and return Puck PuckData.
 */
export function toPuckData(value: unknown): PuckData {
  if (isBuilderDocument(value)) return documentToPuck(value);
  if (isLegacyPuckData(value)) return value as PuckData;
  return { root: { props: {} }, content: [], zones: {} };
}

/**
 * Structural equality for round-trip tests (ignores key order in objects).
 */
export function documentsEqual(a: BuilderDocument, b: BuilderDocument): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function puckDataEqual(a: PuckData, b: PuckData): boolean {
  return stableStringify(normalizePuckForCompare(a)) ===
    stableStringify(normalizePuckForCompare(b));
}

function normalizePuckForCompare(data: PuckData): unknown {
  // Drop empty zone entries; sort zone keys
  const zones: Record<string, unknown> = {};
  for (const key of Object.keys(data.zones ?? {}).sort()) {
    const items = data.zones?.[key] ?? [];
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
