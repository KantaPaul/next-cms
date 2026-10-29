import 'server-only';
import { type BuilderDocument, type NodeId, toDocument } from '@nextcms/builder-core';
import { editorSetup } from '@/builder/definitions';
import { loadDocumentData } from '@/builder/loaders';
import type { PostView } from '@/builder/post-template';
import { documentIssues } from '@/builder/validate-document';

export type EditorData = {
  document: BuilderDocument;
  /** Block data (blog posts, videos, global blocks) shown on the canvas, never stored. */
  loaded: Record<NodeId, Record<string, unknown>>;
  /** Problems found in the stored document (R797). */
  issues: string[];
};

/** Everything the new editor needs on load, in one server pass (R744). */
export async function loadEditorData({
  content,
  kind,
  language,
  themeTokens,
  post,
}: {
  content: unknown;
  kind: string;
  language: string;
  themeTokens: unknown;
  post?: PostView;
}): Promise<EditorData> {
  const document = toDocument(content);
  const loaded = await loadDocumentData(document, { language, themeTokens, post });
  return {
    document,
    loaded,
    issues: documentIssues(document, editorSetup(kind).definitions),
  };
}
