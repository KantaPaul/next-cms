'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type CollectionEntryWithFields = {
  id: string;
  collectionId: string;
  slug: string;
  status: string;
  data: unknown;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  collection: {
    id: string;
    siteId: string;
    name: string;
    slug: string;
    templatePageId: string | null;
    fields: { key: string; label: string; type: string }[];
  };
};

type EntryContextValue = {
  entry: CollectionEntryWithFields | null;
  setEntry: (entry: CollectionEntryWithFields | null) => void;
};

const EntryContext = createContext<EntryContextValue | null>(null);

export function EntryProvider({
  entry,
  children,
}: {
  entry: CollectionEntryWithFields | null;
  children: ReactNode;
}) {
  return (
    <EntryContext.Provider value={{ entry, setEntry: () => {} }}>
      {children}
    </EntryContext.Provider>
  );
}

export function useEntry() {
  const ctx = useContext(EntryContext);
  // The builder preview has no collection entry context: return null so blocks
  // such as CollectionItem can render their editing placeholder instead of
  // throwing when dropped onto the canvas.
  if (!ctx) return { entry: null, setEntry: () => {} };
  return ctx;
}
