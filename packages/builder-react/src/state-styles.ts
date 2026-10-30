/**
 * State styles (R725 / UXE-15): state style types and helpers. State styles are
 * stored in `node.meta.stateStyles` as `{ hover?: Props, focus?: Props, active?: Props }`.
 */

import type { BuilderNode, NodeId } from '@nextcms/builder-core';

export type StateStyle = 'hover' | 'focus' | 'active';

export const STATE_STYLES: { id: StateStyle; label: string; icon: string }[] = [
  { id: 'hover', label: 'Hover', icon: '☁' },
  { id: 'focus', label: 'Focus', icon: '⌨' },
  { id: 'active', label: 'Active', icon: '✦' },
];

export type StateStyles = Partial<Record<StateStyle, Record<string, unknown>>>;

export function getStateStyles(node: BuilderNode | undefined): StateStyles {
  if (!node) return {};
  return ((node.meta as Record<string, unknown> | undefined)?.stateStyles as StateStyles) ?? {};
}

export function setStateStyles(doc: { nodes: Record<NodeId, BuilderNode> }, id: NodeId, stateStyles: StateStyles): { nodes: Record<NodeId, BuilderNode> } {
  const node = doc.nodes[id];
  if (!node) return doc;
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: { ...node, meta: { ...(node.meta as Record<string, unknown>), stateStyles } as any },
    },
  };
}

/** Reads the props for a block in a given state: base props merged with state overrides. */
export function propsForState(node: BuilderNode | undefined, state: StateStyle | null): Record<string, unknown> {
  if (!node) return {};
  if (!state) return node.props;
  const stateStyles = getStateStyles(node);
  const overrides = stateStyles[state];
  return overrides ? { ...node.props, ...overrides } : node.props;
}
