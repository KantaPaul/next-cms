import 'server-only';
import {
  type BuilderDocument,
  collectDynamicRefs,
  type NodeId,
  toDocument,
} from '@nextcms/builder-core';
import { editorSetup } from '@/builder/definitions';
import { migrateCollectionItems } from '@/builder/collection-item-migrate';
import { hiddenBlocksFor } from '@/config/block-manager';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { loadDocumentData } from '@/builder/loaders';
import type { PostView } from '@/builder/post-template';
import { documentIssues } from '@/builder/validate-document';
import {
  type DynamicRefItem,
  type DynamicRefOptions,
  dynamicRefsService,
} from '@/server/services/dynamic-refs.service';
import { collectionBlocksService } from '@/server/services/collection-blocks.service';

export type EditorData = {
  document: BuilderDocument;
  /** Block data (blog posts, videos, global blocks) shown on the canvas, never stored. */
  loaded: Record<NodeId, Record<string, unknown>>;
  /** Problems found in the stored document (R797). */
  issues: string[];
  /** Pages and posts for "Specific Page/Blog Post" bindings: picker and preview. */
  dynamicRefs: DynamicRefOptions;
  /** Collection entry context for template pages. */
  collectionEntry?: any;
  /** Collection-scoped blocks for the insert panel presets. */
  collectionBlocks?: { id: string; name: string }[];
  /** Block manager: block types left out of this editor's insert panel. */
  hiddenBlocks: string[];
};

/** Adds records the document already points at that fell outside the option list. */
function withPicked(
  options: DynamicRefItem[],
  picked: Record<string, DynamicRefItem>
): DynamicRefItem[] {
  const known = new Set(options.map(item => item.id));
  return [...options, ...Object.values(picked).filter(item => !known.has(item.id))];
}

/** Everything the new editor needs on load, in one server pass (R744). */
export async function loadEditorData({
  content,
  kind,
  language,
  themeTokens,
  post,
  collectionEntry,
  collectionId,
}: {
  content: unknown;
  kind: string;
  language: string;
  themeTokens: unknown;
  post?: PostView;
  collectionEntry?: any;
  collectionId?: string;
}): Promise<EditorData> {
  const document = migrateCollectionItems(toDocument(content));
  const setup = editorSetup(kind);
  const resolvedCollectionId =
    collectionId ||
    collectionEntry?.collection?.id ||
    collectionEntry?.collectionId;
  const [loaded, options, picked, settings, collectionBlocks] = await Promise.all([
    loadDocumentData(document, {
      language,
      themeTokens,
      post,
      collectionEntry,
      editor: true,
    }),
    dynamicRefsService.options(),
    dynamicRefsService.load(collectDynamicRefs(document)),
    siteSettingsService.get(),
    resolvedCollectionId && (kind === 'entry' || kind === 'entry-template')
      ? collectionBlocksService.options(resolvedCollectionId).catch(() => [])
      : Promise.resolve([]),
  ]);
  return {
    document,
    loaded,
    issues: documentIssues(document, setup.definitions),
    hiddenBlocks: hiddenBlocksFor(
      settings.blockSettings,
      kind,
      setup.groups.flatMap(group => group.types)
    ),
    dynamicRefs: {
      pages: withPicked(options.pages, picked.pageRef),
      posts: withPicked(options.posts, picked.postRef),
    },
    collectionEntry,
    collectionBlocks,
  };
}
