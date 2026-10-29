/**
 * Patch saves (R739 / DAT-03): the difference between the last saved
 * document and the current one, sent instead of the whole page. Commands
 * keep unchanged nodes as the same objects, so the diff compares references
 * and costs little even on large pages.
 */

import type { BuilderDocument, BuilderNode, NodeId } from './document';

export type DocumentPatch = {
  /** Page props, when they changed. */
  root?: BuilderDocument['root'];
  /** Top-level order, when it changed. */
  rootSlot?: NodeId[];
  /** Nodes added or changed, in full. */
  upsert: Record<NodeId, BuilderNode>;
  /** Nodes removed. */
  remove: NodeId[];
};

export function diffDocuments(from: BuilderDocument, to: BuilderDocument): DocumentPatch {
  const patch: DocumentPatch = { upsert: {}, remove: [] };
  if (from.root !== to.root && JSON.stringify(from.root) !== JSON.stringify(to.root)) {
    patch.root = to.root;
  }
  if (from.rootSlot !== to.rootSlot && from.rootSlot.join('\u0000') !== to.rootSlot.join('\u0000')) {
    patch.rootSlot = to.rootSlot;
  }
  for (const [id, node] of Object.entries(to.nodes)) {
    const before = from.nodes[id];
    if (before !== node && JSON.stringify(before) !== JSON.stringify(node)) patch.upsert[id] = node;
  }
  for (const id of Object.keys(from.nodes)) {
    if (!(id in to.nodes)) patch.remove.push(id);
  }
  return patch;
}

export function isEmptyPatch(patch: DocumentPatch): boolean {
  return (
    !patch.root &&
    !patch.rootSlot &&
    Object.keys(patch.upsert).length === 0 &&
    patch.remove.length === 0
  );
}

export function applyPatch(doc: BuilderDocument, patch: DocumentPatch): BuilderDocument {
  const nodes = { ...doc.nodes, ...patch.upsert };
  for (const id of patch.remove) delete nodes[id];
  return {
    ...doc,
    root: patch.root ?? doc.root,
    rootSlot: patch.rootSlot ?? doc.rootSlot,
    nodes,
  };
}

/** Problems that make a document unsafe to store: dangling ids, cycles, or nodes in two places. */
export function documentProblems(doc: BuilderDocument): string[] {
  const problems: string[] = [];
  const seen = new Map<NodeId, string>();
  const visit = (id: NodeId, where: string, path: Set<NodeId>) => {
    const node = doc.nodes[id];
    if (!node) {
      problems.push(`${where} points to missing node ${id}`);
      return;
    }
    if (path.has(id)) {
      problems.push(`node ${id} is inside itself`);
      return;
    }
    if (seen.has(id)) {
      problems.push(`node ${id} is in ${seen.get(id)} and ${where}`);
      return;
    }
    seen.set(id, where);
    const next = new Set(path).add(id);
    for (const [slot, children] of Object.entries(node.slots)) {
      for (const child of children) visit(child, `${id}.${slot}`, next);
    }
  };
  for (const id of doc.rootSlot) visit(id, 'the page', new Set());
  for (const id of Object.keys(doc.nodes)) {
    if (!seen.has(id)) problems.push(`node ${id} is not on the page`);
  }
  return problems;
}
