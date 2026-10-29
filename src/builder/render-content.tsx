/**
 * Renders stored builder content with the site's engine during the move off
 * Puck (R686 / R702): `puck` uses Puck `Render` and `resolveAllData`, `core`
 * uses @nextcms/builder-core with the CMS loaders. Both read the same stored
 * Puck data, so a site can switch back at any time.
 */

import { type Data, Render, resolveAllData } from '@measured/puck';
import { toDocument, toPuckData } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { env } from '@/env.mjs';
import type { ResolvedSite } from '@/server/services/site-context';
import { builderConfig, postBuilderConfig } from './config';
import { type LoaderContext, resolvePuckData } from './loaders';
import {
  type RenderKind,
  type RenderMetadata,
  renderDocumentWithLoaders,
} from './renderer';

export type RenderEngine = 'puck' | 'core';

/** BUILDER_RENDER_ENGINE overrides every site; `puck` is the kill switch. */
export function renderEngineFor(
  site: Pick<ResolvedSite, 'renderEngine'>
): RenderEngine {
  return env.BUILDER_RENDER_ENGINE ?? site.renderEngine;
}

const configFor = (kind: RenderKind) =>
  kind === 'post' ? postBuilderConfig : builderConfig;

type RenderInput = {
  engine: RenderEngine;
  /** Stored builder content (Puck data today). */
  content: unknown;
  kind?: RenderKind;
  /** Theme tokens, language, search params, and the post for post layouts. */
  metadata: RenderMetadata;
};

/** Loads block data and renders the content with the chosen engine. */
export async function renderBuilderContent({
  engine,
  content,
  kind = 'page',
  metadata,
}: RenderInput): Promise<ReactNode> {
  if (engine === 'core') {
    return renderDocumentWithLoaders(
      toDocument(content),
      metadata as LoaderContext,
      metadata,
      kind
    );
  }
  const config = configFor(kind);
  const data = await resolveAllData(
    toPuckData(content) as Data,
    config,
    metadata
  );
  return <Render config={config} data={data} metadata={metadata} />;
}

/** Loads block data and returns Puck-shaped JSON, so /api/v1 responses do not change with the engine. */
export async function resolveBuilderData({
  engine,
  content,
  kind = 'page',
  metadata,
}: RenderInput): Promise<Data> {
  if (engine === 'core') {
    const data = await resolvePuckData(
      toPuckData(content),
      metadata as LoaderContext
    );
    // Puck's resolveAllData adds these to the root; keep the API shape the same.
    return {
      ...data,
      root: { ...data.root, props: { ...data.root.props, id: 'root' }, type: 'root' },
    } as Data;
  }
  return resolveAllData(toPuckData(content) as Data, configFor(kind), metadata);
}
