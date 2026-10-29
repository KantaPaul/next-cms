/**
 * What the editor needs to know about each block type: its defaults and slots,
 * and which blocks each slot accepts. Hosts build these from their block
 * definitions (the CMS derives them from its Puck config during the move).
 */

import type { BuilderDocument, BuilderNode, NodeId } from './document';
import { ROOT_SLOT, type SlotRef, subtreeIds } from './tree';

/** Which block types a slot accepts. Empty or missing `allow` accepts all. */
export type SlotRules = { allow?: string[]; disallow?: string[] };

export type BlockSchema = {
  type: string;
  label?: string;
  defaultProps?: Record<string, unknown>;
  /** Slots stored directly on the block, such as `content` or `column1`. */
  slots?: Record<string, SlotRules>;
  /**
   * Slots inside each item of an array prop, such as `items[].content` for
   * tabs: `{ items: { content: rules } }`.
   */
  arraySlots?: Record<string, Record<string, SlotRules>>;
};

export type BlockSchemas = Record<string, BlockSchema>;

/** Rules for slots placed on the page itself. */
export type EditorRules = { root?: SlotRules };

const PANEL_SLOT = /^(\w+)\[(\d+)\]\.(\w+)$/;

function rulesFor(
  schemas: BlockSchemas,
  parent: BuilderNode | undefined,
  slot: string,
  rootRules?: SlotRules
): SlotRules | undefined {
  if (!parent) return slot === ROOT_SLOT ? rootRules : undefined;
  const schema = schemas[parent.type];
  if (!schema) return undefined;
  const panel = slot.match(PANEL_SLOT);
  if (panel) return schema.arraySlots?.[panel[1]]?.[panel[3]];
  return schema.slots?.[slot];
}

function allowed(rules: SlotRules | undefined, type: string): boolean {
  if (!rules) return true;
  if (rules.disallow?.includes(type)) return false;
  if (rules.allow?.length && !rules.allow.includes(type)) return false;
  return true;
}

/**
 * Whether a block of `type` may go into `target`. When moving an existing
 * node, pass its id: a node cannot be dropped inside itself, and every block
 * in its subtree must be allowed where it would end up.
 */
export function canPlace(
  doc: BuilderDocument,
  schemas: BlockSchemas,
  type: string,
  target: SlotRef,
  options: { movingId?: NodeId; rules?: EditorRules } = {}
): boolean {
  const parent =
    target.parentId === null ? undefined : doc.nodes[target.parentId];
  if (target.parentId !== null && !parent) return false;
  if (options.movingId && target.parentId !== null) {
    if (subtreeIds(doc, options.movingId).includes(target.parentId)) return false;
  }
  return allowed(rulesFor(schemas, parent, target.slot, options.rules?.root), type);
}

/** A new node with the block's default props and an empty list per slot. */
export function createNode(
  schema: BlockSchema,
  id: NodeId,
  props: Record<string, unknown> = {}
): BuilderNode {
  return normalizeNode(
    { id, type: schema.type, props: { ...schema.defaultProps, ...props }, slots: {} },
    schema
  );
}

/**
 * Makes a node's slots match its schema: every declared slot exists, slot
 * arrays left in props (Puck stores empty slots that way) become slots, and
 * array items get one slot per item.
 */
export function normalizeNode(node: BuilderNode, schema?: BlockSchema): BuilderNode {
  if (!schema) return node;
  const props = { ...node.props };
  const slots = { ...node.slots };

  for (const slot of Object.keys(schema.slots ?? {})) {
    if (!slots[slot]) slots[slot] = [];
    if (Array.isArray(props[slot]) && (props[slot] as unknown[]).length === 0) {
      delete props[slot];
    }
  }

  for (const [arrayKey, keys] of Object.entries(schema.arraySlots ?? {})) {
    const items = Array.isArray(props[arrayKey])
      ? (props[arrayKey] as Record<string, unknown>[])
      : [];
    props[arrayKey] = items.map((item, index) => {
      const next = { ...item };
      for (const key of Object.keys(keys)) {
        const path = `${arrayKey}[${index}].${key}`;
        if (!slots[path]) slots[path] = [];
        if (Array.isArray(next[key]) && (next[key] as unknown[]).length === 0) {
          delete next[key];
        }
      }
      return next;
    });
    // Drop slots for items that no longer exist.
    for (const path of Object.keys(slots)) {
      const match = path.match(PANEL_SLOT);
      if (match && match[1] === arrayKey && Number(match[2]) >= items.length) {
        delete slots[path];
      }
    }
  }

  return { ...node, props, slots };
}

/** Normalizes every node that has a schema; see `normalizeNode`. */
export function normalizeDocument(
  doc: BuilderDocument,
  schemas: BlockSchemas
): BuilderDocument {
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    nodes[id] = normalizeNode(node, schemas[node.type]);
  }
  return { ...doc, nodes };
}
