/**
 * The pure part of a versioned page save (R738, R741): check the version,
 * apply the editor's patch (or take its whole document) to what is stored,
 * validate the result, and produce what to store. The page service wraps
 * this in its transaction; tests run the same logic without a database.
 */

import {
  applyPatch,
  type BuilderDocument,
  type DocumentPatch,
  documentToPuck,
  type PuckData,
  toDocument,
} from '@nextcms/builder-core';
import { documentIssues } from './validate-document';

export type EditorSaveInput = {
  baseVersion: number;
  patch?: DocumentPatch;
  document?: BuilderDocument;
};

export type EditorSavePlan =
  | { kind: 'conflict'; version: number; document: BuilderDocument }
  | { kind: 'invalid'; problems: string[] }
  | { kind: 'empty' }
  | { kind: 'save'; content: PuckData; document: BuilderDocument };

export function planEditorSave(
  stored: unknown,
  currentVersion: number,
  input: EditorSaveInput,
  issuesOf: (doc: BuilderDocument) => string[] = documentIssues
): EditorSavePlan {
  const base = toDocument(stored);
  if (input.baseVersion !== currentVersion) {
    return { kind: 'conflict', version: currentVersion, document: base };
  }
  const next = input.patch ? applyPatch(base, input.patch) : input.document;
  if (!next) return { kind: 'empty' };
  const problems = issuesOf(next);
  if (problems.length) return { kind: 'invalid', problems };
  // Store every block id: the next save reads this back and applies a patch
  // by id, so blocks added in the editor must keep theirs.
  return {
    kind: 'save',
    content: documentToPuck(next, { ids: 'always' }),
    document: next,
  };
}
