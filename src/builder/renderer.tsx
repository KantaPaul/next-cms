/**
 * Server renderer for BuilderDocument (R684 / ENG-05).
 * Renders with existing block components from the registry. No Puck.
 *
 * Blocks receive the same props as under Puck `Render` (see buildProps), so
 * published HTML is identical during the R686 rollout:
 * - every slot path (`content`, `column1`, `items[0].content`) is a slot function;
 * - interactive blocks (Slider, Tabs, Accordion) receive resolved `panels`,
 *   so they never see slot functions across the client boundary.
 */

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { BuilderDocument, BuilderNode, NodeId } from './document';
import { renderSlot, type SlotValue } from './blocks/content';
import { getBlockComponents } from './blocks/registry';
import { cn } from '@/lib/utils/cn';
import { MotionScope } from './motion';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';
import {
  resolveDocumentData,
  type LoaderContext,
} from './loaders';

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
  metadata: RenderMetadata
): ReactNode {
  const node = doc.nodes[id];
  if (!node) return null;

  const Component = components[node.type];
  if (!Component) return null;

  const props = buildProps(node, doc, components, metadata);
  return <Component key={id} {...props} />;
}

/** Client blocks that receive resolved `panels` instead of `items` with slots. */
const PANEL_TYPES = new Set(['Slider', 'Tabs', 'Accordion']);

/** Matches Puck's slot render function: children inside a plain wrapper div. */
type SlotRender = (options?: {
  className?: string;
  style?: CSSProperties;
  minEmptyHeight?: number;
}) => ReactNode;

/**
 * Builds the props Puck `Render` passes to a block, so every block renders the
 * same with either engine: each slot path becomes a slot function, panel blocks
 * get resolved `panels`, and `id` is dropped like `renderBlock` does in config.
 */
function buildProps(
  node: BuilderNode,
  doc: BuilderDocument,
  components: BlockComponents,
  metadata: RenderMetadata
): Record<string, unknown> {
  const props: Record<string, unknown> = { ...node.props };
  delete props.id;

  for (const [slotPath, childIds] of Object.entries(node.slots)) {
    const slot: SlotRender = options => (
      <div className={options?.className} style={options?.style}>
        {childIds.map(cid => renderNode(cid, doc, components, metadata))}
      </div>
    );
    const panel = slotPath.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
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

  if (PANEL_TYPES.has(node.type)) {
    const items = Array.isArray(props.items)
      ? (props.items as { label?: string; title?: string; content?: SlotValue }[])
      : [];
    props.panels = items.map(item => ({
      label: item?.label ?? item?.title,
      node: renderSlot(item?.content),
    }));
    delete props.items;
  }

  props.editing = !!metadata.editing;
  return props;
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
    renderNode(id, doc, components, metadata)
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
      <MotionScope
        editing={editing}
        preview={!!metadata.motionPreview}
        transition={rootProps.pageTransition}
      >
        {/* Same wrapper as Puck's root drop zone, so published HTML stays identical during the R686 rollout. */}
        <div>{children}</div>
      </MotionScope>
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
      {rootIds.map(id => renderNode(id, doc, components, metadata))}
    </>
  );
}

/**
 * Resolve server data (R685) then render. Preferred public-site entry once
 * the R686 flag switches off Puck.
 */
export async function renderDocumentWithLoaders(
  doc: BuilderDocument,
  ctx: LoaderContext = {},
  metadata: RenderMetadata = {}
): Promise<ReactNode> {
  const resolved = await resolveDocumentData(doc, ctx);
  return (
    <BuilderRenderer
      document={resolved}
      metadata={{
        ...metadata,
        language: metadata.language ?? ctx.language,
        themeTokens: metadata.themeTokens ?? ctx.themeTokens,
      }}
    />
  );
}
