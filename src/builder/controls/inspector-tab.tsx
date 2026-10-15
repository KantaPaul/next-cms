'use client';

import { createContext, useContext } from 'react';

export type InspectorTab = 'content' | 'style' | 'layout';

/**
 * Set by the floating card around `Puck.Fields`. Outside the card (for example the global block editor,
 * which keeps Puck's default sidebar) there is no tab and every group renders.
 */
export const InspectorTabContext = createContext<InspectorTab | null>(null);

export const useInspectorTab = () => useContext(InspectorTabContext);
