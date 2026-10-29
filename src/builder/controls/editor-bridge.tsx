'use client';

/**
 * What inspector controls need from whichever editor hosts them: the canvas
 * device, the selected block, and theme tokens. The Puck builder and the new
 * editor each provide it, so controls work in both during the move off Puck.
 */

import { createContext, type ReactNode, useContext } from 'react';
import type { Device } from '../style';

export type EditorBridge = {
  device: Device;
  setDevice: (device: Device) => void;
  selectedType?: string;
  selectedProps?: Record<string, unknown>;
  themeTokens?: Record<string, string>;
};

const OUTSIDE_EDITOR: EditorBridge = { device: 'desktop', setDevice: () => {} };

const EditorBridgeContext = createContext<EditorBridge>(OUTSIDE_EDITOR);

export function EditorBridgeProvider({
  value,
  children,
}: {
  value: EditorBridge;
  children: ReactNode;
}) {
  return (
    <EditorBridgeContext.Provider value={value}>
      {children}
    </EditorBridgeContext.Provider>
  );
}

export function useEditorBridge(): EditorBridge {
  return useContext(EditorBridgeContext);
}
