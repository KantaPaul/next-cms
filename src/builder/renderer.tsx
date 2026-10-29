/**
 * CMS page renderer on top of @nextcms/builder-core (R684 / ENG-05).
 *
 * builder-core renders blocks with the same props Puck `Render` passes; this
 * file adds the CMS parts: the block registry, the site root (theme tokens,
 * fonts, page transition), resolved `panels` for Slider, Tabs, and Accordion
 * (client components cannot receive slot functions), and, for posts, the post
 * blocks with the current post, matching `builderConfig` and `postBuilderConfig`.
 */

import {
  type BlockComponents,
  type BuilderDocument,
  type BuilderNode,
  type NodeId,
  type RenderOptions,
  renderDocument,
  renderNodes,
} from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  PostContent,
  PostFeaturedImage,
  PostMeta,
  PostTitle,
  RelatedPosts,
} from './blocks/blog';
import { renderSlot, type SlotValue } from './blocks/content';
import { getBlockComponents } from './blocks/registry';
import { type LoaderContext, resolveDocumentData } from './loaders';
import { MotionScope } from './motion';
import { type PostView, SAMPLE_POST } from './post-template';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';

/** `post` adds the post blocks, like `postBuilderConfig` does for Puck. */
export type RenderKind = 'page' | 'post';

export type RenderMetadata = {
  themeTokens?: unknown;
  language?: string;
  /** When true, blocks receive editing={true} (canvas / preview). */
  editing?: boolean;
  /** Extra context passed through to blocks that need it (post, searchParams, …). */
  [key: string]: unknown;
};

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

/** Client blocks that receive resolved `panels` instead of `items` with slots. */
const PANEL_TYPES = new Set(['Slider', 'Tabs', 'Accordion']);

/** Blocks bound to the post being rendered, like `renderPostBlock` in config.tsx. */
const POST_BLOCKS = { PostTitle, PostFeaturedImage, PostMeta, PostContent };

/** Every component a kind of content can render; mirrors the Puck configs. */
export function rendererComponents(kind: RenderKind): BlockComponents {
  const page = getBlockComponents() as unknown as BlockComponents;
  if (kind === 'page') return page;
  return {
    ...page,
    ...(POST_BLOCKS as unknown as BlockComponents),
    RelatedPosts: RelatedPosts as unknown as BlockComponents[string],
  };
}

/** Same as `renderPanels` in config.tsx: resolve each item's slot to a node. */
function resolvePanels(
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

/** CMS prop changes per block: the current post for post blocks, panels for panel blocks. */
export function cmsTransformProps(
  metadata: RenderMetadata,
  kind: RenderKind
): NonNullable<RenderOptions['transformProps']> {
  const post = (metadata.post as PostView | undefined) ?? SAMPLE_POST;
  return (node, props) =>
    kind === 'post' && node.type in POST_BLOCKS
      ? { ...props, post }
      : resolvePanels(node, props);
}

function renderOptions(
  metadata: RenderMetadata,
  kind: RenderKind
): RenderOptions {
  return {
    components: rendererComponents(kind),
    editing: !!metadata.editing,
    transformProps: cmsTransformProps(metadata, kind),
  };
}

type RootProps = {
  maxWidth?: string;
  theme?: string;
  paddingY?: string;
  pageTransition?: string;
};

/** The site root around page content: theme tokens, fonts, width, and page transition. */
export function SiteRoot({
  rootProps,
  metadata = {},
  children,
}: {
  rootProps: RootProps;
  metadata?: RenderMetadata;
  children: ReactNode;
}): ReactNode {
  const tokens = resolveThemeTokens(metadata.themeTokens as never);
  const mode =
    rootProps.theme === 'light' || rootProps.theme === 'dark'
      ? rootProps.theme
      : tokens.colorMode === 'dark'
        ? 'dark'
        : 'light';
  const fontUrl = fontStylesheetUrl(tokens);
  const editing = !!metadata.editing;

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
        {children}
      </MotionScope>
    </div>
  );
}

/**
 * Render a full BuilderDocument for the public site or preview.
 * Safe to use as a React Server Component entry (blocks that are client
 * components keep their "use client" boundary).
 */
export function BuilderRenderer({
  document: doc,
  metadata = {},
  kind = 'page',
}: {
  document: BuilderDocument;
  metadata?: RenderMetadata;
  kind?: RenderKind;
}): ReactNode {
  return (
    <SiteRoot rootProps={(doc.root?.props ?? {}) as RootProps} metadata={metadata}>
      {renderDocument(doc, renderOptions(metadata, kind))}
    </SiteRoot>
  );
}

/**
 * Render a single node subtree (e.g. a global block body).
 */
export function renderDocumentSubtree(
  doc: BuilderDocument,
  rootIds: NodeId[],
  metadata: RenderMetadata = {},
  kind: RenderKind = 'page'
): ReactNode {
  return renderNodes(doc, rootIds, renderOptions(metadata, kind));
}

/**
 * Resolve server data (R685) then render. Preferred public-site entry once
 * the R686 flag switches off Puck.
 */
export async function renderDocumentWithLoaders(
  doc: BuilderDocument,
  ctx: LoaderContext = {},
  metadata: RenderMetadata = {},
  kind: RenderKind = 'page'
): Promise<ReactNode> {
  const resolved = await resolveDocumentData(doc, ctx);
  return (
    <BuilderRenderer
      kind={kind}
      document={resolved}
      metadata={{
        ...metadata,
        language: metadata.language ?? ctx.language,
        themeTokens: metadata.themeTokens ?? ctx.themeTokens,
      }}
    />
  );
}
