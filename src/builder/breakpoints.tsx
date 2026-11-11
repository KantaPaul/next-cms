'use client';

import {
  type BreakpointConfig,
  DEFAULT_BREAKPOINTS,
  normalizeBreakpointConfig,
} from '@nextcms/builder-core';
import { createContext, type ReactNode, useContext } from 'react';
import { useEditorBridge } from './controls/editor-bridge';

const BreakpointsContext = createContext<BreakpointConfig | null>(null);

export function BreakpointsProvider({
  value,
  children,
}: {
  value: BreakpointConfig;
  children: ReactNode;
}) {
  return (
    <BreakpointsContext.Provider value={value}>
      {children}
    </BreakpointsContext.Provider>
  );
}

/** Reads the active breakpoint config from DOM `data-breakpoints` attribute when outside React context. */
export function readBreakpointsFromDocument(
  doc?: Document
): BreakpointConfig {
  const target = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!target) return DEFAULT_BREAKPOINTS;
  const el = target.querySelector<HTMLElement>('[data-breakpoints]');
  const raw = el?.getAttribute('data-breakpoints');
  if (!raw) return DEFAULT_BREAKPOINTS;
  try {
    return normalizeBreakpointConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_BREAKPOINTS;
  }
}

/**
 * Returns the site's active breakpoint config from React context, editor bridge,
 * or the `[data-breakpoints]` attribute on the site root.
 */
export function useBreakpoints(): BreakpointConfig {
  const ctx = useContext(BreakpointsContext);
  const bridge = useEditorBridge();
  if (ctx) return ctx;
  if (bridge?.breakpoints) return bridge.breakpoints;
  return readBreakpointsFromDocument();
}
