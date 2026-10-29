import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react';
import type { EditorState, EditorStore } from './store';

const EditorContext = createContext<EditorStore | null>(null);

export function EditorProvider({
  store,
  children,
}: {
  store: EditorStore;
  children: ReactNode;
}) {
  return <EditorContext.Provider value={store}>{children}</EditorContext.Provider>;
}

export function useEditorStore(): EditorStore {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditorStore must be used inside <EditorProvider>.');
  return store;
}

/**
 * Reads part of the editor state and re-renders only when it changes. The
 * selector must return state values or primitives, not new objects.
 */
export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useEditorStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
