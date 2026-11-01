import { useCallback, useEffect, useState } from 'react';

/**
 * Favorite and recently added block types for the block library, kept in
 * localStorage per `storageKey`. Every storage access is guarded: in private
 * windows or with storage blocked the lists simply start empty.
 */

export const MAX_RECENT_BLOCKS = 6;

export interface LibraryPreferences {
  favorites: string[];
  recents: string[];
}

const EMPTY: LibraryPreferences = { favorites: [], recents: [] };

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function readLibraryPreferences(storageKey: string): LibraryPreferences {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LibraryPreferences>;
    return {
      favorites: strings(parsed?.favorites),
      recents: strings(parsed?.recents).slice(0, MAX_RECENT_BLOCKS),
    };
  } catch {
    return EMPTY;
  }
}

export function writeLibraryPreferences(
  storageKey: string,
  prefs: LibraryPreferences
): void {
  try {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked: keep the in-memory lists only.
  }
}

/** Adds or removes `type` from the favorites. */
export function toggleFavoriteBlock(
  prefs: LibraryPreferences,
  type: string
): LibraryPreferences {
  const favorites = prefs.favorites.includes(type)
    ? prefs.favorites.filter(item => item !== type)
    : [...prefs.favorites, type];
  return { ...prefs, favorites };
}

/** Moves `type` to the front of the recents, keeping at most MAX_RECENT_BLOCKS. */
export function pushRecentBlock(
  prefs: LibraryPreferences,
  type: string
): LibraryPreferences {
  const recents = [type, ...prefs.recents.filter(item => item !== type)].slice(
    0,
    MAX_RECENT_BLOCKS
  );
  return { ...prefs, recents };
}

export function useLibraryPreferences(storageKey = 'ne-block-library') {
  // Start empty so server and first client render match; load after mount.
  const [prefs, setPrefs] = useState<LibraryPreferences>(EMPTY);

  useEffect(() => {
    setPrefs(readLibraryPreferences(storageKey));
  }, [storageKey]);

  const update = useCallback(
    (change: (prev: LibraryPreferences) => LibraryPreferences) => {
      setPrefs(prev => {
        const next = change(prev);
        writeLibraryPreferences(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  return {
    favorites: prefs.favorites,
    recents: prefs.recents,
    toggleFavorite: useCallback(
      (type: string) => update(prev => toggleFavoriteBlock(prev, type)),
      [update]
    ),
    addRecent: useCallback(
      (type: string) => update(prev => pushRecentBlock(prev, type)),
      [update]
    ),
  };
}
