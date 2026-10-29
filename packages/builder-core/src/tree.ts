/**
 * Read and write helpers for the document tree. Every write returns a new
 * document and leaves the input untouched, so history can keep snapshots.
 */

import type { BuilderDocument, BuilderNode, NodeId } from './document';

/** A slot that can hold children. `parentId: null` is the page's top level. */
export type SlotRef = { parentId: NodeId | null; slot: string };

/** A position inside a slot. */
export type SlotPosition = SlotRef & { index: number };

/** Slot name used for the page's top level. */
export const ROOT_SLOT = 'root';

/** A node with every descendant, as copied, pasted, or inserted. */
export type Subtree = {
  rootId: NodeId;
  nodes: Record<NodeId, BuilderNode>;
};

export function slotChildren(doc: BuilderDocument, ref: SlotRef): NodeId[] {
  if (ref.parentId === null) return doc.rootSlot;
  return doc.nodes[ref.parentId]?.slots[ref.slot] ?? [];
}

export function withSlotChildren(
  doc: BuilderDocument,
  ref: SlotRef,
  children: NodeId[]
): BuilderDocument {
  if (ref.parentId === null) return { ...doc, rootSlot: children };
  const parent = doc.nodes[ref.parentId];
  if (!parent) return doc;
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [parent.id]: { ...parent, slots: { ...parent.slots, [ref.slot]: children } },
    },
  };
}

/** Where a node sits, or null if it is not attached to the tree. */
export function findPosition(
  doc: BuilderDocument,
  id: NodeId
): SlotPosition | null {
  const rootIndex = doc.rootSlot.indexOf(id);
  if (rootIndex !== -1) return { parentId: null, slot: ROOT_SLOT, index: rootIndex };
  for (const node of Object.values(doc.nodes)) {
    for (const [slot, children] of Object.entries(node.slots)) {
      const index = children.indexOf(id);
      if (index !== -1) return { parentId: node.id, slot, index };
    }
  }
  return null;
}

/** Every slot of a node, in the order the slots were added. */
export function slotNames(node: BuilderNode): string[] {
  return Object.keys(node.slots);
}

/** The node's children across all of its slots, in slot order. */
export function childIds(node: BuilderNode): NodeId[] {
  return slotNames(node).flatMap(slot => node.slots[slot] ?? []);
}

/** The node and all of its descendants. */
export function subtreeIds(doc: BuilderDocument, id: NodeId): NodeId[] {
  const node = doc.nodes[id];
  if (!node) return [];
  return [id, ...childIds(node).flatMap(child => subtreeIds(doc, child))];
}

export function isInside(
  doc: BuilderDocument,
  ancestorId: NodeId,
  id: NodeId
): boolean {
  return subtreeIds(doc, ancestorId).includes(id);
}

/** Ids of the node's ancestors, nearest first. */
export function ancestorIds(doc: BuilderDocument, id: NodeId): NodeId[] {
  const position = findPosition(doc, id);
  if (!position || position.parentId === null) return [];
  return [position.parentId, ...ancestorIds(doc, position.parentId)];
}

export function extractSubtree(
  doc: BuilderDocument,
  id: NodeId
): Subtree | null {
  if (!doc.nodes[id]) return null;
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const nodeId of subtreeIds(doc, id)) nodes[nodeId] = doc.nodes[nodeId];
  return { rootId: id, nodes };
}

/** Copies a subtree with fresh ids, for paste and duplicate. */
export function cloneSubtree(
  subtree: Subtree,
  createId: (type: string) => NodeId
): Subtree {
  const ids = new Map<NodeId, NodeId>();
  for (const node of Object.values(subtree.nodes)) {
    ids.set(node.id, createId(node.type));
  }
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const node of Object.values(subtree.nodes)) {
    const id = ids.get(node.id) as NodeId;
    const props = { ...node.props };
    if (props.id !== undefined) props.id = id;
    nodes[id] = {
      id,
      type: node.type,
      props,
      slots: Object.fromEntries(
        Object.entries(node.slots).map(([slot, children]) => [
          slot,
          children.map(child => ids.get(child) ?? child),
        ])
      ),
    };
  }
  return { rootId: ids.get(subtree.rootId) as NodeId, nodes };
}

/** Default id generator: block type plus a random suffix. */
export function createNodeId(type: string): NodeId {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}
