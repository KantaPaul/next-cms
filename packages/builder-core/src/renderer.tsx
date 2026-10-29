/**
 * Renders a BuilderDocument with the host's block components (R684 / ENG-05).
 *
 * Blocks receive the same props as under Puck `Render`, so published HTML stays
 * identical during the R686 rollout:
 * - every slot path (`content`, `column1`, `items[0].content`) becomes a slot
 *   function that renders its children inside a plain wrapper div;
 * - `id` is not passed, matching how the CMS adapts blocks for Puck;
 * - hosts adjust props per block with `transformProps` (for example resolving
 *   panels for client components).
 */

import { type ComponentType, type CSSProperties, Fragment, type ReactNode } from 'react';
import type { BuilderDocument, BuilderNode, NodeId } from './document';
import { ROOT_SLOT } from './tree';

export type BlockComponents = Record<
  string,
  ComponentType<Record<string, unknown>>
>;

/** Slot value passed to blocks: call it to render the slot's children. */
export type SlotRender = (options?: {
  className?: string;
  style?: CSSProperties;
  minEmptyHeight?: number;
}) => ReactNode;

/** What a custom slot renderer receives; see `RenderOptions.renderSlot`. */
export type SlotRenderArgs = {
  /** `null` for the page's top level. */
  parentId: NodeId | null;
  slot: string;
  className?: string;
  style?: CSSProperties;
  empty: boolean;
  children: ReactNode;
};

export type RenderOptions = {
  components: BlockComponents;
  /** Passed to every block as `editing`. */
  editing?: boolean;
  /** Adjusts a block's props after slots are built and before it renders. */
  transformProps?: (
    node: BuilderNode,
    props: Record<string, unknown>
  ) => Record<string, unknown>;
  /** Wraps each rendered block, so an editor can find and measure it. */
  wrapNode?: (node: BuilderNode, element: ReactNode) => ReactNode;
  /**
   * Renders slot wrappers, including the page's top level. Without it a slot
   * is a plain div and the top level has no wrapper, as in Puck `Render`.
   */
  renderSlot?: (args: SlotRenderArgs) => ReactNode;
};

const PANEL_SLOT = /^(\w+)\[(\d+)\]\.(\w+)$/;

function buildProps(
  node: BuilderNode,
  doc: BuilderDocument,
  options: RenderOptions
): Record<string, unknown> {
  const props: Record<string, unknown> = { ...node.props };
  delete props.id;

  for (const [slotPath, childIds] of Object.entries(node.slots)) {
    const slot: SlotRender = slotOptions => {
      const children = renderNodes(doc, childIds, options);
      if (options.renderSlot) {
        return options.renderSlot({
          parentId: node.id,
          slot: slotPath,
          className: slotOptions?.className,
          style: slotOptions?.style,
          empty: childIds.length === 0,
          children,
        });
      }
      return (
        <div className={slotOptions?.className} style={slotOptions?.style}>
          {children}
        </div>
      );
    };
    const panel = slotPath.match(PANEL_SLOT);
    if (panel) {
      const [, arrayKey, index, key] = panel;
      const items = Array.isArray(props[arrayKey])
        ? [...(props[arrayKey] as Record<string, unknown>[])]
        : [];
      while (items.length <= Number(index)) items.push({});
      items[Number(index)] = { ...items[Number(index)], [key]: slot };
      props[arrayKey] = items;
    } else {
      props[slotPath] = slot;
    }
  }

  props.editing = !!options.editing;
  return options.transformProps ? options.transformProps(node, props) : props;
}

/** Renders one node and its slots, or nothing for an unknown id or block type. */
export function renderNode(
  doc: BuilderDocument,
  id: NodeId,
  options: RenderOptions
): ReactNode {
  const node = doc.nodes[id];
  if (!node) return null;
  const Component = options.components[node.type];
  if (!Component) return null;
  const element = <Component key={id} {...buildProps(node, doc, options)} />;
  if (!options.wrapNode) return element;
  return <Fragment key={id}>{options.wrapNode(node, element)}</Fragment>;
}

/** Renders a list of sibling nodes, for example a global block body. */
export function renderNodes(
  doc: BuilderDocument,
  ids: NodeId[],
  options: RenderOptions
): ReactNode {
  return <>{ids.map(id => renderNode(doc, id, options))}</>;
}

/**
 * Renders the page's top-level blocks. Like Puck's server `Render`, the root
 * has no wrapper element; only slots wrap their children in a div.
 */
export function renderDocument(
  doc: BuilderDocument,
  options: RenderOptions
): ReactNode {
  const children = renderNodes(doc, doc.rootSlot, options);
  if (!options.renderSlot) return children;
  return options.renderSlot({
    parentId: null,
    slot: ROOT_SLOT,
    empty: doc.rootSlot.length === 0,
    children,
  });
}
