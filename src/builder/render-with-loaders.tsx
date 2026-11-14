import 'server-only';
/**
 * Server-side render entry: resolves block data with the loaders, then renders.
 *
 * Kept apart from `renderer.tsx` on purpose: the editor (a client component)
 * imports `renderer.tsx`, and the loaders reach server services (database,
 * `node:dns` in safeFetch). Importing them from `renderer.tsx` put those in the
 * browser bundle and broke the builder page.
 */

import { type BuilderDocument, collectUsedClassIds } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import type { LocaleLinkMap } from '@/lib/utils/locale-links';
import {
  hasItemBindings,
  type LoaderContext,
  resolveDeferredExternalApi,
  resolveDocumentData,
} from './loaders';
import type { PostView } from './post-template';
import {
  BuilderRenderer,
  type RenderKind,
  type RenderMetadata,
} from './renderer';
import { prefixDocumentLinks, prefixHtmlLinks } from './site-links';

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
  ) => Promise<{ classes: Record<string, { name: string }>; css: string }>;  /**
   * Receives the resolved document with per-item bindings (External API
   * Item, Loop Item) still intact, when it has any. A popup re-renders it in
   * the browser with the item it was opened from.
   */
  onClientDocument?: (doc: BuilderDocument) => void;
};

export async function renderDocumentWithLoaders(
  doc: BuilderDocument,
  ctx: LoaderContext = {},
  metadata: RenderMetadata = {},
  kind: RenderKind = 'page',
  options: RenderWithLoadersOptions = {}
): Promise<ReactNode> {
  const mergedCtx: LoaderContext = { ...metadata, ...ctx };
  let resolved: BuilderDocument;
  if (options.onClientDocument) {
    const deferred = await resolveDocumentData(doc, { ...mergedCtx, deferExternalApi: true });
    if (hasItemBindings(deferred)) options.onClientDocument(deferred);
    resolved = await resolveDeferredExternalApi(deferred, mergedCtx);
  } else {
    resolved = await resolveDocumentData(doc, mergedCtx);
  }
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
