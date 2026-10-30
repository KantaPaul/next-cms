import type React from 'react';
import { LiveAnnouncerProvider } from '../a11y/LiveAnnouncer';
import { cn } from '../lib/cn';
import { ToastProvider } from '../primitives/Toast';
import { EditorUIScope } from '../theme/EditorUIProvider';

/**
 * The frame both builders sit in (B15 E3, gap G6). Every region is a slot:
 * the shell owns layout only, never palette, focus, or document state.
 * Builders pass their own command palette (with its open state and shortcut)
 * into `commandPalette`, so there is one palette and one Cmd+K listener.
 */
export interface EditorShellProps {
  topBar?: React.ReactNode;
  library?: React.ReactNode;
  canvas: React.ReactNode;
  inspector?: React.ReactNode;
  statusBar?: React.ReactNode;
  commandPalette?: React.ReactNode;
  /** Hides the library and inspector slots without unmounting the canvas. */
  focusMode?: boolean;
  theme?: 'light' | 'dark';
  dir?: 'ltr' | 'rtl';
  className?: string;
  style?: React.CSSProperties;
}

export const EditorShell: React.FC<EditorShellProps> = ({
  topBar,
  library,
  canvas,
  inspector,
  statusBar,
  commandPalette,
  focusMode = false,
  theme,
  dir,
  className,
  style,
}) => (
  <EditorUIScope theme={theme} dir={dir}>
    <LiveAnnouncerProvider>
      <ToastProvider>
        <div
          data-ne-theme={theme}
          dir={dir}
          className={cn(
            'ne-editor-root flex h-screen w-full flex-col overflow-hidden bg-[var(--ne-bg)] text-[var(--ne-text)]',
            className
          )}
          style={style}
        >
          {topBar}
          <div className="relative flex flex-1 overflow-hidden">
            {!focusMode && library}
            <main className="ne-scrollbar relative flex min-w-0 flex-1 flex-col overflow-auto bg-[var(--ne-bg)]">
              {canvas}
            </main>
            {!focusMode && inspector}
          </div>
          {statusBar}
          {commandPalette}
        </div>
      </ToastProvider>
    </LiveAnnouncerProvider>
  </EditorUIScope>
);
