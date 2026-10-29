'use client';

import { createUsePuck } from '@measured/puck';
import { type ReactNode, useMemo } from 'react';
import { EditorBridgeProvider } from '@/builder/controls/editor-bridge';
import { DEVICE_WIDTH, type Device, deviceForWidth } from '@/builder/style';

const usePuck = createUsePuck();

/** Gives inspector controls the Puck canvas device, selected block, and theme tokens. */
export function PuckEditorBridge({ children }: { children: ReactNode }) {
  const width = usePuck(s => s.appState.ui.viewports.current.width);
  const dispatch = usePuck(s => s.dispatch);
  const selectedType = usePuck(s => s.selectedItem?.type as string | undefined);
  const selectedProps = usePuck(
    s => s.selectedItem?.props as Record<string, unknown> | undefined
  );
  const themeTokens = usePuck(s => {
    const state = s as unknown as {
      metadata?: { themeTokens?: Record<string, string> };
      appState?: { metadata?: { themeTokens?: Record<string, string> } };
    };
    return state.metadata?.themeTokens ?? state.appState?.metadata?.themeTokens;
  });

  const value = useMemo(
    () => ({
      device: deviceForWidth(width),
      setDevice: (next: Device) =>
        dispatch({
          type: 'setUi',
          ui: ui => ({
            viewports: {
              ...ui.viewports,
              current: { width: DEVICE_WIDTH[next], height: 'auto' },
            },
          }),
        }),
      selectedType,
      selectedProps,
      themeTokens,
    }),
    [width, dispatch, selectedType, selectedProps, themeTokens]
  );

  return <EditorBridgeProvider value={value}>{children}</EditorBridgeProvider>;
}
