import type React from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { createContext, useContext, useMemo } from 'react';

/**
 * Theme and direction for editor chrome (B15 E2, gaps G2 and G3). The host
 * feeds both from its own preferences (the page editor uses
 * builder-react's preferences store), so one setting drives the whole editor.
 * Renders a wrapper with `data-ne-theme` and `dir`, which tokens.css and the
 * logical utilities read. Unset values inherit (a `.dark` ancestor, the
 * document direction), so portalled layers only pin what was chosen.
 */
export type EditorTheme = 'light' | 'dark';
export type EditorDirection = 'ltr' | 'rtl';

export type EditorUIContextValue = {
  theme?: EditorTheme;
  dir?: EditorDirection;
};

const EditorUIContext = createContext<EditorUIContextValue>({});

/** Merges a theme and direction into the context for everything below. */
export function EditorUIScope({
  theme,
  dir,
  children,
}: EditorUIContextValue & { children: React.ReactNode }) {
  const parent = useContext(EditorUIContext);
  const resolvedTheme = theme ?? parent.theme;
  const resolvedDir = dir ?? parent.dir;
  const value = useMemo(
    () => ({ theme: resolvedTheme, dir: resolvedDir }),
    [resolvedTheme, resolvedDir]
  );
  return (
    <EditorUIContext.Provider value={value}>
      {/* Radix menus, popovers and selects read direction from here (gap G3). */}
      <DirectionProvider dir={resolvedDir ?? 'ltr'}>
        {children}
      </DirectionProvider>
    </EditorUIContext.Provider>
  );
}

export interface EditorUIProviderProps extends EditorUIContextValue {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorUIProvider: React.FC<EditorUIProviderProps> = ({
  theme,
  dir,
  children,
  className,
  style,
}) => (
  <EditorUIScope theme={theme} dir={dir}>
    <div data-ne-theme={theme} dir={dir} className={className} style={style}>
      {children}
    </div>
  </EditorUIScope>
);

/** The current editor theme and direction, for portalled content that must match. */
export function useEditorUI(): EditorUIContextValue {
  return useContext(EditorUIContext);
}

/**
 * Props for a layer Radix portals to <body> (menus, popovers, tooltips,
 * dialogs): the `.ne-ui` styling scope plus the editor's theme and
 * direction, which the portal would otherwise lose.
 */
export function useLayerScope(): {
  className: string;
  'data-ne-theme'?: EditorTheme;
  dir?: EditorDirection;
} {
  const { theme, dir } = useContext(EditorUIContext);
  return { className: 'ne-ui', 'data-ne-theme': theme, dir };
}
