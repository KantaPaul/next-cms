/**
 * Editing commands (R688 / ENG-09). Each is a pure function from a document to
 * a new document, so the editor can keep snapshots for undo and diff them for
 * patch saves later (DAT-03). Invalid targets return the document unchanged.
 */

import type { BuilderDocument, BuilderNode, NodeId } from './document';
import {
  childIds,
  findPosition,
  type SlotPosition,
  type Subtree,
  slotChildren,
  subtreeIds,
  withSlotChildren,
} from './tree';

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}

/** Inserts a node (with its descendants) at a position. */
export function insertSubtree(
  doc: BuilderDocument,
  subtree: Subtree,
  at: SlotPosition
): BuilderDocument {
  if (at.parentId !== null && !doc.nodes[at.parentId]) return doc;
  const withNodes = { ...doc, nodes: { ...doc.nodes, ...subtree.nodes } };
  const children = [...slotChildren(withNodes, at)];
  children.splice(clampIndex(at.index, children.length), 0, subtree.rootId);
  return withSlotChildren(withNodes, at, children);
}

/** Removes a node and everything inside it. */
export function removeNode(doc: BuilderDocument, id: NodeId): BuilderDocument {
  const position = findPosition(doc, id);
  if (!position) return doc;
  const detached = withSlotChildren(
    doc,
    position,
    slotChildren(doc, position).filter(child => child !== id)
  );
  const nodes = { ...detached.nodes };
  for (const nodeId of subtreeIds(doc, id)) delete nodes[nodeId];
  return { ...detached, nodes };
}

/**
 * Moves a node to a position. `to.index` counts the target slot as it is
 * before the move, so dropping between two siblings works the same whether
 * the node came from above, below, or another slot.
 */
export function moveNode(
  doc: BuilderDocument,
  id: NodeId,
  to: SlotPosition
): BuilderDocument {
  const from = findPosition(doc, id);
  if (!from) return doc;
  if (to.parentId !== null) {
    if (!doc.nodes[to.parentId]) return doc;
    if (subtreeIds(doc, id).includes(to.parentId)) return doc;
  }
  const sameSlot = from.parentId === to.parentId && from.slot === to.slot;
  const index = sameSlot && from.index < to.index ? to.index - 1 : to.index;
  if (sameSlot && index === from.index) return doc;

  const detached = withSlotChildren(
    doc,
    from,
    slotChildren(doc, from).filter(child => child !== id)
  );
  const children = [...slotChildren(detached, to)];
  children.splice(clampIndex(index, children.length), 0, id);
  return withSlotChildren(detached, to, children);
}

/** Shallow-merges props into a node. */
export function updateProps(
  doc: BuilderDocument,
  id: NodeId,
  patch: Record<string, unknown>
): BuilderDocument {
  const node = doc.nodes[id];
  if (!node) return doc;
  return {
    ...doc,
    nodes: { ...doc.nodes, [id]: { ...node, props: { ...node.props, ...patch } } },
  };
}

export function updateRootProps(
  doc: BuilderDocument,
  patch: Record<string, unknown>
): BuilderDocument {
  return { ...doc, root: { ...doc.root, props: { ...doc.root.props, ...patch } } };
}

/**
 * Wraps sibling nodes in a new node, keeping their order, at the position of
 * the first one. Nodes that are not siblings of the first are ignored.
 */
export function wrapNodes(
  doc: BuilderDocument,
  ids: NodeId[],
  wrapper: BuilderNode,
  slot: string
): BuilderDocument {
  const first = ids[0] && findPosition(doc, ids[0]);
  if (!first) return doc;
  const siblings = slotChildren(doc, first);
  const wrapped = siblings.filter(child => ids.includes(child));
  const index = siblings.indexOf(wrapped[0]);
  const remaining = siblings.filter(child => !wrapped.includes(child));
  remaining.splice(index, 0, wrapper.id);
  const withWrapper: BuilderDocument = {
    ...doc,
    nodes: {
      ...doc.nodes,
      [wrapper.id]: { ...wrapper, slots: { ...wrapper.slots, [slot]: wrapped } },
    },
  };
  return withSlotChildren(withWrapper, first, remaining);
}

/** Replaces a node with its children (all slots, in order). */
export function unwrapNode(doc: BuilderDocument, id: NodeId): BuilderDocument {
  const node = doc.nodes[id];
  const position = findPosition(doc, id);
  if (!node || !position) return doc;
  const children = slotChildren(doc, position).flatMap(child =>
    child === id ? childIds(node) : [child]
  );
  const nodes = { ...doc.nodes };
  delete nodes[id];
  return withSlotChildren({ ...doc, nodes }, position, children);
}

/** Drops nodes that are no longer reachable from the page, for example after a tab was removed. */
export function pruneDetached(doc: BuilderDocument): BuilderDocument {
  const reachable = new Set(doc.rootSlot.flatMap(id => subtreeIds(doc, id)));
  if (reachable.size === Object.keys(doc.nodes).length) return doc;
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const id of reachable) if (doc.nodes[id]) nodes[id] = doc.nodes[id];
  return { ...doc, nodes };
}
