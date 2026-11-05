/**
 * Renders stored builder content with the core engine.
 */

import { toDocument, toPuckData } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { localeLinksService } from '@/server/services/locale-links.service';
import type { ResolvedSite } from '@/server/services/site-context';
import { type LoaderContext, resolvePuckData } from './loaders';
import {
  type RenderKind,
  type RenderMetadata,
  renderDocumentWithLoaders,
} from './renderer';

type RenderInput = {
  /** Stored builder content (Puck data today). */
  content: unknown;
  kind?: RenderKind;
  /** Theme tokens, language, search params, and the post for post layouts. */
  metadata: RenderMetadata;
};

/** Loads block data and renders the content. */
export async function renderBuilderContent({
  content,
  kind = 'page',
  metadata,
}: RenderInput): Promise<ReactNode> {
  // Links to content with a translation in this page's language keep the visitor in it.
  const localeLinks = metadata.editing
    ? null
    : await localeLinksService.forLanguage(
        typeof metadata.language === 'string' ? metadata.language : undefined
      );
  return renderDocumentWithLoaders(
    toDocument(content),
    { ...(metadata as LoaderContext), localeLinks },
    metadata,
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