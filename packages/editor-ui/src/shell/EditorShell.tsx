import React, { useState, useEffect } from 'react';
import { TopBar, TopBarProps } from './TopBar.tsx';
import { Panel } from './Panel.tsx';
import { StatusBar } from './StatusBar.tsx';
import { CommandPalette, CommandAction } from './CommandPalette.tsx';
import { LiveAnnouncerProvider } from '../a11y/LiveAnnouncer.tsx';
import { ToastProvider } from '../primitives/Toast.tsx';
import { BreadcrumbItem } from './Breadcrumb.tsx';

export interface EditorShellProps {
  topBarProps: Omit<TopBarProps, 'focusMode' | 'onToggleFocusMode' | 'onOpenCommandPalette'>;
  leftPanelTitle?: string;
  leftPanelContent?: React.ReactNode;
  leftPanelDefaultWidth?: number;
  rightPanelTitle?: string;
  rightPanelContent?: React.ReactNode;
  rightPanelDefaultWidth?: number;
  canvas: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onSelectBreadcrumb?: (id: string) => void;
  selectionSummary?: string;
  nodeCount?: number;
  commandActions?: CommandAction[];
  modeLabel?: string;
  className?: string;
}

export const EditorShell: React.FC<EditorShellProps> = ({
  topBarProps,
  leftPanelTitle = 'Components',
  leftPanelContent,
  leftPanelDefaultWidth = 260,
  rightPanelTitle = 'Inspector',
  rightPanelContent,
  rightPanelDefaultWidth = 320,
  canvas,
  breadcrumbs = [],
  onSelectBreadcrumb,
  selectionSummary,
  nodeCount,
  commandActions = [],
  modeLabel,
  className = '',
}) => {
  const [focusMode, setFocusMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Esc to exit focus mode if active
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  return (
    <LiveAnnouncerProvider>
      <ToastProvider>
        <div className={`ne-editor-root flex flex-col h-screen w-screen overflow-hidden bg-[var(--ne-bg)] select-none text-[var(--ne-text)] ${className}`}>
          {/* Top Bar */}
          <TopBar
            {...topBarProps}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode(!focusMode)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />

          {/* Main workspace container */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Library/Layers Panel (hidden in focus mode) */}
            {!focusMode && leftPanelContent && (
              <Panel
                side="left"
                title={leftPanelTitle}
                defaultWidth={leftPanelDefaultWidth}
                minWidth={220}
                maxWidth={400}
              >
                {leftPanelContent}
              </Panel>
            )}

            {/* Central Canvas Slot */}
            <main className="flex-1 relative overflow-auto bg-[var(--ne-bg)] flex flex-col items-center justify-start ne-scrollbar">
              {canvas}
            </main>

            {/* Right Inspector Panel (hidden in focus mode) */}
            {!focusMode && rightPanelContent && (
              <Panel
                side="right"
                title={rightPanelTitle}
                defaultWidth={rightPanelDefaultWidth}
                minWidth={280}
                maxWidth={460}
              >
                {rightPanelContent}
              </Panel>
            )}
          </div>

          {/* Bottom Status Bar */}
          <StatusBar
            breadcrumbs={breadcrumbs}
            onSelectBreadcrumb={onSelectBreadcrumb}
            selectionSummary={selectionSummary}
            nodeCount={nodeCount}
            zoom={topBarProps.zoom}
            modeLabel={modeLabel}
          />

          {/* Global Command Palette */}
          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            actions={commandActions}
          />
        </div>
      </ToastProvider>
    </LiveAnnouncerProvider>
  );
};
