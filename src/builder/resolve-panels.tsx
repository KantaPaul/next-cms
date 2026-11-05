import type { BuilderNode } from '@nextcms/builder-core';
import { renderSlot, type SlotValue } from './blocks/content';

/** Client blocks that receive resolved `panels` instead of `items` with slots. */
const PANEL_TYPES = new Set(['Slider', 'Tabs', 'Accordion']);

/** Same as `renderPanels` in config.tsx: resolve each item's slot to a node. */
export function resolvePanels(
  node: BuilderNode,
  props: Record<string, unknown>
): Record<string, unknown> {
  if (!PANEL_TYPES.has(node.type)) return props;
  const { items, ...rest } = props;
  const list = Array.isArray(items)
    ? (items as { label?: string; title?: string; content?: SlotValue }[])
    : [];
  return {
    ...rest,
    panels: list.map(item => ({
      label: item?.label ?? item?.title,
      node: renderSlot(item?.content),
    })),
  };
}

