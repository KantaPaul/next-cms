'use client';

import { createContext, useContext } from 'react';

export type EditorMessages = Record<string, string>;

const DEFAULT_EDITOR_MESSAGES: EditorMessages = {
  blocks: 'Blocks',
  styles: 'Styles',
  settings: 'Settings',
  layers: 'Layers',
  classes: 'Classes',
  undo: 'Undo',
  redo: 'Redo',
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
  insertBlock: 'Insert block',
  preview: 'Preview',
  publish: 'Publish',
  save: 'Save',
};

const EditorI18nContext = createContext<EditorMessages>(DEFAULT_EDITOR_MESSAGES);

export function EditorI18nProvider({
  messages,
  children,
}: {
  messages?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <EditorI18nContext.Provider
      value={{ ...DEFAULT_EDITOR_MESSAGES, ...(messages ?? {}) }}
    >
      {children}
    </EditorI18nContext.Provider>
  );
}

export function useEditorMessages(): EditorMessages {
  return useContext(EditorI18nContext);
}
