/**
 * Adapter contracts (R759 / PKG-05, R788 / EXT-16): the host provides these
 * to the editor and renderer. Each is optional with a working default, so a
 * standalone host can run with mock/localStorage adapters while the CMS uses
 * real database, media, and permission adapters. Production code never
 * imports the mocks (checked by src/builder/__tests__/dashboard-adapters.test.ts).
 * The dashboard builder's adapters live in dashboard-adapters.ts.
 */

import type { BuilderDocument } from '@nextcms/builder-core';

/** A single stored revision of a document. */
export type DocumentRevision = {
  id: string;
  createdAt: string;
  label?: string;
  published?: boolean;
};

/** Storage adapter: load, patch save, version conflict (R738, R739, R740). */
export type StorageAdapter = {
  /** Load the current draft (or published doc when `version === 'published'`). */
  load: (id: string, version?: 'draft' | 'published') => Promise<BuilderDocument>;
  /** Save a full document; returns the new version number. */
  saveFull: (id: string, doc: BuilderDocument, expectedVersion: number) => Promise<{ version: number }>;
  /** Patch save: apply changed nodes in one transaction (R739). */
  savePatch?: (id: string, patch: unknown, expectedVersion: number) => Promise<{ version: number }>;
  /** List revisions for a document. */
  listRevisions?: (id: string) => Promise<DocumentRevision[]>;
  /** Restore a revision as the current draft. */
  restoreRevision?: (id: string, revisionId: string) => Promise<BuilderDocument>;
};

/** Media picker / upload adapter (R743, R760). */
export type MediaAdapter = {
  /** Open a media picker dialog; resolves with the selected asset id. */
  pick: (options?: { accept?: string; multiple?: boolean }) => Promise<string | string[] | null>;
  /** Upload a file and return its asset id. */
  upload: (file: File) => Promise<string>;
  /** Resolve an asset id to a URL + srcset + dimensions. */
  resolve: (assetId: string) => Promise<{ src: string; srcset?: string; width?: number; height?: number; alt?: string }>;
};

/** Link picker adapter. */
export type LinkAdapter = {
  pick: (options?: { types?: string[] }) => Promise<string | null>;
};

/** Data source for dynamic content and query loops (R685, R788). */
export type DataSource = {
  id: string;
  label: string;
  /** Fetch rows for a query; returns column names + rows. */
  query: (params: Record<string, unknown>) => Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
};

export type DataAdapter = {
  sources: DataSource[];
  /** Resolve a single data binding (R788). */
  resolve?: (sourceId: string, params: Record<string, unknown>) => Promise<unknown>;
};

/** Permissions adapter (R800, PKG-05). */
export type PermissionsAdapter = {
  canInsert: (blockType: string) => boolean;
  canDelete: (blockType: string) => boolean;
  canPublish: () => boolean;
  canEditField: (blockType: string, field: string) => boolean;
  /** Lock props in templates so page editors cannot change them. */
  isLocked: (blockType: string, field: string) => boolean;
};

/** AI adapter (R730, PKG-05). */
export type AiAdapter = {
  generateSection: (prompt: string) => Promise<unknown>;
  rewrite: (text: string, instruction: string) => Promise<string>;
  translate: (text: string, locale: string) => Promise<string>;
  writeAltText: (imageAssetId: string) => Promise<string>;
  suggestLayouts: (context: unknown) => Promise<unknown[]>;
};

/** Translation adapter. */
export type TranslationAdapter = {
  locales: string[];
  translate: (text: string, from: string, to: string) => Promise<string>;
};

/** Comments and presence transport (R728, R729). */
export type CommentsAdapter = {
  list: (documentId: string) => Promise<unknown[]>;
  add: (documentId: string, comment: unknown) => Promise<unknown>;
  update: (commentId: string, patch: unknown) => Promise<unknown>;
  resolve: (commentId: string) => Promise<void>;
};

export type PresenceAdapter = {
  connect: (documentId: string, userId: string) => { disconnect: () => void };
  onPresence: (cb: (users: unknown[]) => void) => () => void;
  onSelection: (cb: (selections: Record<string, unknown>) => void) => () => void;
};

/** The full adapter bundle a host provides (R759). */
export type EditorAdapters = {
  storage?: StorageAdapter;
  media?: MediaAdapter;
  link?: LinkAdapter;
  data?: DataAdapter;
  permissions?: PermissionsAdapter;
  ai?: AiAdapter;
  translation?: TranslationAdapter;
  comments?: CommentsAdapter;
  presence?: PresenceAdapter;
};

/** Default mock adapters for standalone/prototype use (R768). */
export function createMockAdapters(): EditorAdapters {
  return {
    storage: {
      load: async () => ({ version: 1, root: { props: {} }, nodes: {}, slots: {} } as any),
      saveFull: async (_id, _doc, _v) => ({ version: 1 }),
    },
    media: {
      pick: async () => null,
      upload: async () => 'mock-asset',
      resolve: async (id) => ({ src: `https://mock/${id}`, alt: '' }),
    },
    link: { pick: async () => null },
    data: { sources: [] },
    permissions: {
      canInsert: () => true,
      canDelete: () => true,
      canPublish: () => true,
      canEditField: () => true,
      isLocked: () => false,
    },
  };
}