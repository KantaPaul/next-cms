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
  AuthorBio,
  AuthorCard,
  BookmarkButton,
  PostNavigation,
  ShareButtons,
} from './blocks/post-extras';
import { Comments } from './blocks/comments';
import {
  type BlockComponents,
  type BreakpointConfig,
  type BuilderDocument,
  type BuilderNode,
  DEFAULT_BREAKPOINTS,
  type NodeId,
  normalizeBreakpointConfig,
  type RenderOptions,
  renderDocument,
  collectUsedClassIds,
  renderNodes,
  styleClassNameFor,
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
import { getBlockComponents } from './blocks/registry';
import { PLUGIN_BLOCK_OWNER } from '@/plugins/client-blocks';
import { resolvePanels } from './resolve-panels';
import { type LoaderContext, resolveDocumentData } from './loaders';
import type { LocaleLinkMap } from '@/lib/utils/locale-links';
import { prefixDocumentLinks, prefixHtmlLinks } from './site-links';
import { MotionItem, MotionScope } from './motion';
import { type PostView, SAMPLE_POST } from './post-template';
import { BreakpointsProvider } from './breakpoints';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';
import { type ChromeStyle, resolveAnimation, resolveChromeStyle } from './style';

/** `post` adds the post blocks, like `postBuilderConfig` does for Puck. */
export type RenderKind = 'page' | 'post';

export type RenderMetadata = {
  themeTokens?: unknown;
  breakpoints?: BreakpointConfig;
  language?: string;
  /** When true, blocks receive editing={true} (canvas / preview). */
  editing?: boolean;
  /** Extra context passed through to blocks that need it (post, searchParams, …). */
  [key: string]: unknown;
  /** Style class id -> { name } for resolving classIds on rendered blocks. */
  classes?: Record<string, { name: string }>;
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
  xl: 'py-24',
};

/** Blocks bound to the post being rendered, like `renderPostBlock` in config.tsx. */
const POST_BLOCKS = {
  PostTitle,
  PostFeaturedImage,
  PostMeta,
  PostContent,
  AuthorBio,
  AuthorCard,
  Comments,
  ShareButtons,
  PostNavigation,
  BookmarkButton,
};

/** Every component a kind of content can render; mirrors the Puck configs. */
export function rendererComponents(
  kind: RenderKind,
  enabledPluginIds?: Set<string> | string[]
): BlockComponents {
  const rawPage = getBlockComponents() as unknown as BlockComponents;
  const enabledSet = enabledPluginIds
    ? enabledPluginIds instanceof Set
      ? enabledPluginIds
      : new Set(enabledPluginIds)
    : null;
  const page = enabledSet
    ? Object.fromEntries(
        Object.entries(rawPage).filter(([type]) => {
          const owner = PLUGIN_BLOCK_OWNER[type];
          return !owner || enabledSet.has(owner);
        })
      )
    : rawPage;
  if (kind === 'page') return page;
  return {
    ...page,
    ...(POST_BLOCKS as unknown as BlockComponents),
    RelatedPosts: RelatedPosts as unknown as BlockComponents[string],
  };
}

/** CMS prop changes per block: the current post for post blocks, panels for panel blocks. */
export function cmsTransformProps(
  metadata: RenderMetadata,
  kind: RenderKind
): NonNullable<RenderOptions['transformProps']> {
  const realPost = metadata.post as PostView | undefined;
  const post = realPost ?? SAMPLE_POST;
  const page = metadata.page as { id?: string; title?: string } | undefined;
  const transform = (node: BuilderNode, props: Record<string, unknown>): Record<string, unknown> => {
    if (node.type === 'Breadcrumbs') {
      // Real context only: without it the block shows a sample trail in the editor.
      return kind === 'post'
        ? { ...props, post: realPost }
        : { ...props, page: page?.title ? { title: page.title } : undefined };
    }
    if (node.type === 'ContactForm') {
      const nodeId = node.id || (props.id as string | undefined);
      // A saved form's own id wins; then the global block being rendered
      // (header, footer, popup), which the server can look up like any saved form.
      const globalId =
        (props.formId as string | undefined) ||
        (metadata.globalBlock as { id?: string } | undefined)?.id ||
        undefined;
      const formSource = globalId
        ? { kind: 'global' as const, id: globalId, nodeId }
        : kind === 'post' && (realPost?.id || (metadata.post as any)?.id)
          ? {
              kind: 'post' as const,
              id: (realPost?.id ?? (metadata.post as any)?.id) as string,
              nodeId,
            }
          : page?.id || (metadata.page as any)?.id
            ? {
                kind: 'page' as const,
                id: (page?.id ?? (metadata.page as any)?.id) as string,
                nodeId,
              }
            : undefined;

      return {
        ...props,
        nodeId,
        formSource: formSource ?? props.formSource,
      };
    }
    return kind === 'post' && node.type in POST_BLOCKS
      ? { ...props, post }
      : resolvePanels(node, props);
  };
  // Style classes apply to every block, after the block-specific changes.
  return (node, props) => applyStyleClasses(transform(node, props), metadata.classes);
}

/**
 * Resolves a node's `classIds` to class names (KRK-01) and hands them to the
 * block twice: as `styleClassName`, and inside `section` settings so the
 * shared `Section` wrapper puts them on the block's outer element without a
 * per-block change. Blocks without a `Section` read `styleClassName`.
 */
export function applyStyleClasses(
  props: Record<string, unknown>,
  classes: Record<string, { name: string }> | undefined
): Record<string, unknown> {
  const styleClassName = styleClassNameFor(props.classIds, classes);
  if (!styleClassName) return props;
  const section =
    props.section && typeof props.section === 'object' ? (props.section as Record<string, unknown>) : {};
  return { ...props, styleClassName, section: { ...section, styleClassName } };
}

function renderOptions(
  metadata: RenderMetadata,
  kind: RenderKind
): RenderOptions {
  const enabledPluginIds = metadata.enabledPluginIds as
    | Set<string>
    | string[]
    | undefined;
  return {
    components: rendererComponents(kind, enabledPluginIds),
    editing: !!metadata.editing,
    transformProps: cmsTransformProps(metadata, kind),
    wrapNode: (node, element) => {
      const anim = (node.props as Record<string, unknown>)?.animation as any;
      if (!anim || !anim.entrance || anim.entrance === 'none') return element;
      const resolved = resolveAnimation(anim);
      if (!resolved) return element;
      return <MotionItem animation={resolved}>{element}</MotionItem>;
    },
  };
}

export function collectDocumentFontFamilies(doc: unknown): string[] {
  const families = new Set<string>();
  if (!doc || typeof doc !== 'object') return [];

  function walk(val: unknown) {
    if (!val || typeof val !== 'object') return;
    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }
    const record = val as Record<string, unknown>;
    if (typeof record.family === 'string' && record.family.trim()) {
      families.add(record.family.trim());
    }
    if (
      record.typography &&
      typeof record.typography === 'object' &&
      typeof (record.typography as any).family === 'string'
    ) {
      families.add((record.typography as any).family.trim());
    }
    for (const key of Object.keys(record)) {
      walk(record[key]);
    }
  }

  walk(doc);
  return Array.from(families);
}

type RootProps = {
  maxWidth?: string;
  theme?: string;
  paddingY?: string;
  pageTransition?: string;
  background?: string;
  style?: ChromeStyle;
};

/** The site root around page content: theme tokens, fonts, width, and page transition. */
export function SiteRoot({
  rootProps,
  metadata = {},
  fonts = [],
  children,
}: {
  rootProps: RootProps;
  metadata?: RenderMetadata;
  fonts?: string[];
  children: ReactNode;
}): ReactNode {
  const tokens = resolveThemeTokens(metadata.themeTokens as never);
  const breakpoints = metadata.breakpoints
    ? normalizeBreakpointConfig(metadata.breakpoints)
    : DEFAULT_BREAKPOINTS;
  const mode =
    rootProps.theme === 'light' || rootProps.theme === 'dark'
      ? rootProps.theme
      : tokens.colorMode === 'dark' || tokens.colorMode === 'system'
        ? tokens.colorMode
        : 'light';
  const fontUrl = fontStylesheetUrl(tokens, fonts);
  const editing = !!metadata.editing;

  const isChrome = Boolean(rootProps.style || rootProps.background);
  const chrome = isChrome
    ? resolveChromeStyle(rootProps.style, {
        background: rootProps.background,
      })
    : null;

  const content = chrome ? (
    <div className={cn('site-chrome', chrome.classes)} style={chrome.style}>
      {children}
    </div>
  ) : (
    children
  );

  return (
    <BreakpointsProvider value={breakpoints}>
      <div
        className={cn(
          'site-root min-h-full',
          ROOT_PADDING[isChrome ? 'none' : (rootProps.paddingY ?? 'none')] ?? ''
        )}
        data-site-theme={mode}
        data-breakpoints={JSON.stringify(breakpoints)}
        style={{
          ...themeStyle(tokens, breakpoints),
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
          {content}
        </MotionScope>
      </div>
    </BreakpointsProvider>
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
  const documentFonts = collectDocumentFontFamilies(doc);
  return (
    <SiteRoot
      rootProps={(doc.root?.props ?? {}) as RootProps}
      metadata={metadata}
      fonts={documentFonts}
    >
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
export type RenderWithLoadersOptions = {
  /**
   * Loads names and CSS for the style classes the resolved document uses
   * (KRK-01). Supplied by the server (render-content); this file is also
   * bundled for the editor, so it must not import the database itself.
   */
  loadStyleClasses?: (
    usedIds: Set<string>
  ) => Promise<{ classes: Record<string, { name: string }>; css: string }>;
};

export async function renderDocumentWithLoaders(
  doc: BuilderDocument,
  ctx: LoaderContext = {},
  metadata: RenderMetadata = {},
  kind: RenderKind = 'page',
  options: RenderWithLoadersOptions = {}
): Promise<ReactNode> {
  const mergedCtx: LoaderContext = { ...metadata, ...ctx };
  const resolved = await resolveDocumentData(doc, mergedCtx);
  // Collected after loading, so classes inside global blocks count too.
  const usedClassIds = collectUsedClassIds(resolved);
  const styleClasses =
    options.loadStyleClasses && usedClassIds.size > 0
      ? await options.loadStyleClasses(usedClassIds).catch(error => {
          console.error('[style-classes] could not load classes for render', error);
          return null;
        })
      : null;
  // Path routing: add the site slug to links typed into content; on a
  // non-default locale, point links at their translations (localeLinks).
  const siteSlug = typeof mergedCtx.siteSlug === 'string' ? mergedCtx.siteSlug : '';
  const localeLinks =
    mergedCtx.localeLinks instanceof Map ? (mergedCtx.localeLinks as LocaleLinkMap) : null;
  const prefix = (Boolean(siteSlug) || Boolean(localeLinks?.size)) && !metadata.editing;
  const document = prefix ? prefixDocumentLinks(resolved, siteSlug, localeLinks) : resolved;
  const post = metadata.post as PostView | undefined;
  const rendered = (
    <BuilderRenderer
      kind={kind}
      document={document}
      metadata={{
        ...metadata,
        ...(styleClasses ? { classes: { ...metadata.classes, ...styleClasses.classes } } : {}),
        ...(prefix && post?.body
          ? {
              post: {
                ...post,
                body: prefixHtmlLinks(post.body, siteSlug, localeLinks),
                ...(post.filteredBody
                  ? {
                      filteredBody: prefixHtmlLinks(
                        post.filteredBody,
                        siteSlug,
                        localeLinks
                      ),
                    }
                  : {}),
              },
            }
          : {}),
        language: metadata.language ?? mergedCtx.language,
        themeTokens: metadata.themeTokens ?? mergedCtx.themeTokens,
      }}
    />
  );
  if (!styleClasses?.css) return rendered;
  return (
    <>
      {/* Compiled from sanitized declarations and checked class names (compileStyleClasses). */}
      <style data-style-classes="" dangerouslySetInnerHTML={{ __html: styleClasses.css }} />
      {rendered}
    </>
  );
}
