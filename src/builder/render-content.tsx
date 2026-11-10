/**
 * Renders stored builder content with the core engine.
 */

import { type BuilderDocument, toDocument, toPuckData } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { applyFilters } from '@/server/plugins/hooks';
import { pluginsService } from '@/server/plugins/plugins.service';
import { localeLinksService } from '@/server/services/locale-links.service';
import { siteContext } from '@/server/services/site-context';
import { type LoaderContext, resolvePuckData } from './loaders';
import type { PostView } from './post-template';
import {
  type RenderKind,
  type RenderMetadata,
  renderDocumentWithLoaders,
} from './renderer';
import { sanitizeRichText } from './sanitize';

type RenderInput = {
  /** Stored builder content (Puck data today). */
  content: unknown;
  kind?: RenderKind;
  /** Theme tokens, language, search params, and the post for post layouts. */
  metadata: RenderMetadata;
};

async function applyHtmlFiltersToDocument(
  doc: BuilderDocument,
  meta: {
    kind: 'page' | 'post';
    id: string;
    slug?: string;
    title?: string;
    language?: string;
    siteId: string;
  }
): Promise<BuilderDocument> {
  const richTextEntries = Object.entries(doc.nodes).filter(
    ([, node]) =>
      node.type === 'RichText' && typeof node.props?.content === 'string'
  );
  if (richTextEntries.length === 0) return doc;

  const nextNodes = { ...doc.nodes };
  for (const [nodeId, node] of richTextEntries) {
    const sanitized = sanitizeRichText(node.props.content);
    const filteredHtml = await applyFilters('content.html', sanitized, meta);
    nextNodes[nodeId] = {
      ...node,
      props: {
        ...node.props,
        filteredHtml,
      },
    };
  }
  return { ...doc, nodes: nextNodes };
}

/** Loads block data and renders the content. */
export async function renderBuilderContent({
  content,
  kind = 'page',
  metadata,
}: RenderInput): Promise<ReactNode> {
  const siteId =
    typeof metadata.siteId === 'string'
      ? metadata.siteId
      : (await siteContext.publicSite().catch(() => ({ id: 'default' }))).id;

  // Links to content with a translation in this page's language keep the visitor in it.
  const [localeLinks, enabledPluginIds] = await Promise.all([
    metadata.editing
      ? Promise.resolve(null)
      : localeLinksService.forLanguage(
          typeof metadata.language === 'string' ? metadata.language : undefined
        ),
    pluginsService.getEnabledIds(siteId),
  ]);

  let doc = toDocument(content);
  let nextMetadata: RenderMetadata = {
    ...metadata,
    enabledPluginIds,
  };

  if (!metadata.editing) {
    const post = metadata.post as PostView | undefined;
    const page = metadata.page as
      | { id?: string; slug?: string; title?: string }
      | undefined;
    const contentMeta = {
      kind: (post ? 'post' : 'page') as 'page' | 'post',
      id: String(post?.id ?? page?.id ?? ''),
      slug: post?.slug ?? page?.slug,
      title: post?.title ?? page?.title,
      language:
        typeof metadata.language === 'string' ? metadata.language : undefined,
      siteId,
    };

    if (post?.body) {
      const sanitized = sanitizeRichText(post.body);
      const filteredBody = await applyFilters(
        'content.html',
        sanitized,
        contentMeta
      );
      nextMetadata = {
        ...nextMetadata,
        post: { ...post, filteredBody },
      };
    }

    doc = await applyHtmlFiltersToDocument(doc, contentMeta);
  }

  return renderDocumentWithLoaders(
    doc,
    { ...(nextMetadata as LoaderContext), localeLinks },
    nextMetadata,
    kind
  );
}

/** Loads block data and returns Puck-shaped JSON, so /api/v1 responses do not change. */
export async function resolveBuilderData({
  content,
  kind = 'page',
  metadata,
}: RenderInput): Promise<any> {
  const data = await resolvePuckData(
    toPuckData(content),
    metadata as LoaderContext
  );
  // Puck's resolveAllData adds these to the root; keep the API shape the same.
  return {
    ...data,
    root: { ...data.root, props: { ...data.root.props, id: 'root' }, type: 'root' },
  };
}
