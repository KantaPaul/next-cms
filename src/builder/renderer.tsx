/**
 * Server renderer for BuilderDocument (R684 / ENG-05).
 * Renders with existing block components from the registry. No Puck.
 *
 * Slot strategy (compatible with current block components):
 * - "content" / default slot → passed as `content` (array of child props trees)
 *   and also as React nodes via a helper for blocks that call renderSlot.
 * - Interactive blocks (Slider, Tabs, Accordion) receive `panels: { label, node }[]`
 *   so they never see unresolved slot functions on the server.
 */

import type { ComponentType, ReactNode } from 'react';
import type { BuilderDocument, BuilderNode, NodeId } from './document';
import { getBlockComponents } from './blocks/registry';
import { cn } from '@/lib/utils/cn';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';

export type RenderMetadata = {
  themeTokens?: unknown;
  language?: string;
  /** When true, blocks receive editing={true} (canvas / preview). */
  editing?: boolean;
  /** Extra context passed through to blocks that need it (post, searchParams, …). */
  [key: string]: unknown;
};

type BlockComponents = Record<
  string,
  ComponentType<Record<string, unknown>>
>;

const MAX_WIDTH: Record<string, string> = {
  md: '48rem',
  lg: '64rem',
  xl: '72rem',
  full: '100%',
};

const ROOT_PADDING: Record<string, string> = {
  none: '',
  sm: 'py-4',
  md: 'py-8',
  lg: 'py-16',
};

function renderNode(
  id: NodeId,
  doc: BuilderDocument,
  components: BlockComponents,
  metadata: RenderMetadata,
  nested: boolean
): ReactNode {
  const node = doc.nodes[id];
  if (!node) return null;

  const Component = components[node.type];
  if (!Component) return null;

  const props = buildProps(node, doc, components, metadata, nested);
  return <Component key={id} {...props} />;
}

function buildProps(
  node: BuilderNode,
  doc: BuilderDocument,
  components: BlockComponents,
  metadata: RenderMetadata,
  nested: boolean
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...node.props,
    id: node.id,
    editing: !!metadata.editing,
  };

  if (nested && base.section && typeof base.section === 'object') {
    base.section = { ...(base.section as object), paddingY: 'none' };
  }

  const slotNames = Object.keys(node.slots);
  if (slotNames.length === 0) return base;

  // Resolve every slot into React nodes and into a serializable child-item shape
  // so both leaf-style and panel-style blocks work.
  for (const slotName of slotNames) {
    const childIds = node.slots[slotName] ?? [];
    const childNodes = childIds
      .map(cid => doc.nodes[cid])
      .filter((n): n is BuilderNode => !!n);

    const reactChildren = childIds.map(cid =>
      renderNode(cid, doc, components, metadata, true)
    );

    if (slotName === 'content' || slotName === 'default') {
      // Container, Columns, and similar: expect `content` as an array of
      // { type, props } items (BlockList / rehydrate style) OR as React nodes.
      // Pass both shapes: content as items for legacy path, and children as nodes.
      base.content = childNodes.map(n => ({
        type: n.type,
        props: { ...n.props, id: n.id },
      }));
      // Also expose resolved React nodes for components that prefer them.
      base._slotNodes = reactChildren;
    } else if (slotName === 'items' || slotName === 'panels') {
      // Slider / Tabs / Accordion: prefer `panels` with pre-rendered nodes.
      const itemsProp = Array.isArray(node.props.items)
        ? (node.props.items as Array<Record<string, unknown>>)
        : [];
      base.panels = childIds.map((cid, i) => {
        const child = doc.nodes[cid];
        const label =
          (itemsProp[i]?.label as string | undefined) ??
          (itemsProp[i]?.title as string | undefined) ??
          (child?.props?.label as string | undefined) ??
          (child?.props?.title as string | undefined) ??
          undefined;
        return {
          label,
          node: renderNode(cid, doc, components, metadata, true),
        };
      });
    } else {
      // Generic named slot: pass React nodes under the slot name.
      base[slotName] = reactChildren;
    }
  }

  return base;
}

/**
 * Render a full BuilderDocument for the public site or preview.
 * Safe to use as a React Server Component entry (blocks that are client
 * components keep their "use client" boundary).
 */
export function BuilderRenderer({
  document: doc,
  metadata = {},
}: {
  document: BuilderDocument;
  metadata?: RenderMetadata;
}): ReactNode {
  const components = getBlockComponents() as unknown as BlockComponents;
  const rootProps = (doc.root?.props ?? {}) as {
    maxWidth?: string;
    theme?: string;
    paddingY?: string;
    pageTransition?: string;
  };

  const tokens = resolveThemeTokens(metadata.themeTokens as never);
  const mode =
    rootProps.theme === 'light' || rootProps.theme === 'dark'
      ? rootProps.theme
      : tokens.colorMode === 'dark'
        ? 'dark'
        : 'light';
  const fontUrl = fontStylesheetUrl(tokens);
  const editing = !!metadata.editing;

  const children = doc.rootSlot.map(id =>
    renderNode(id, doc, components, metadata, false)
  );

  return (
    <div
      className={cn(
        'site-root min-h-full',
        ROOT_PADDING[rootProps.paddingY ?? 'none'] ?? ''
      )}
      data-site-theme={mode}
      style={{
        ...themeStyle(tokens),
        ['--site-max-width' as string]:
          MAX_WIDTH[rootProps.maxWidth ?? 'xl'] ?? MAX_WIDTH.xl,
      }}
    >
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      {!editing && (
        <noscript>
          <style>
            {
              '[data-motion]{opacity:1!important;transform:none!important;filter:none!important}'
            }
          </style>
        </noscript>
      )}
      {children}
    </div>
  );
}

/**
 * Render a single node subtree (e.g. a global block body).
 */
export function renderDocumentSubtree(
  doc: BuilderDocument,
  rootIds: NodeId[],
  metadata: RenderMetadata = {}
): ReactNode {
  const components = getBlockComponents() as unknown as BlockComponents;
  return (
    <>
      {rootIds.map(id => renderNode(id, doc, components, metadata, false))}
    </>
  );
}
