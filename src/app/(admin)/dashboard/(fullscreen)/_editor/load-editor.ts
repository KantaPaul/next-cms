import 'server-only';
import {
  type BuilderDocument,
  collectDynamicRefs,
  type NodeId,
  toDocument,
} from '@nextcms/builder-core';
import { editorSetup } from '@/builder/definitions';
import { loadDocumentData } from '@/builder/loaders';
import type { PostView } from '@/builder/post-template';
import { documentIssues } from '@/builder/validate-document';
import {
  type DynamicRefItem,
  type DynamicRefOptions,
  dynamicRefsService,
} from '@/server/services/dynamic-refs.service';

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
}: {
  content: unknown;
  kind: string;
  language: string;
  themeTokens: unknown;
  post?: PostView;
  collectionEntry?: any;
}): Promise<EditorData> {
  const document = toDocument(content);
  const [loaded, options, picked] = await Promise.all([
    loadDocumentData(document, { language, themeTokens, post }),
    dynamicRefsService.options(),
    dynamicRefsService.load(collectDynamicRefs(document)),
  ]);
  return {
    document,
    loaded,
    issues: documentIssues(document, editorSetup(kind).definitions),
    dynamicRefs: {
      pages: withPicked(options.pages, picked.pageRef),
      posts: withPicked(options.posts, picked.postRef),
    },
    collectionEntry,
  };
}
