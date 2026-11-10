'use client';

import type { FormActionInspectorField } from '@nextcms/plugin-sdk/client';
import { createContext, type ReactNode, useContext } from 'react';

export type SerializedPluginFormAction = {
  id: string;
  label: string;
  pluginId: string;
  fields?: Record<string, FormActionInspectorField>;
};

const PluginFormActionsContext = createContext<SerializedPluginFormAction[]>(
  []
);

export function PluginFormActionsProvider({
  actions,
  children,
}: {
  actions: SerializedPluginFormAction[];
  children: ReactNode;
}) {
  return (
    <PluginFormActionsContext.Provider value={actions}>
      {children}
    </PluginFormActionsContext.Provider>
  );
}

export function usePluginFormActions(): SerializedPluginFormAction[] {
  return useContext(PluginFormActionsContext);
}
