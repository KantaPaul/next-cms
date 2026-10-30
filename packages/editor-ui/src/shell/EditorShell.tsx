import * as React from 'react';
import { cn } from '../lib/cn';

export interface EditorShellProps {
  topBar?: React.ReactNode;
  library?: React.ReactNode;
  canvas: React.ReactNode;
  inspector?: React.ReactNode;
  statusBar?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function EditorShell({ topBar, library, canvas, inspector, statusBar, className, style }: EditorShellProps) {
  return (
    <div className={cn('ne-editor-root flex h-screen w-screen flex-col overflow-hidden', className)} style={style}>
      {topBar && <header className="shrink-0 border-b border-[var(--ne-border)] bg-[var(--ne-surface)]">{topBar}</header>}
      <div className="flex flex-1 overflow-hidden">
        {library && <aside className="shrink-0 overflow-hidden">{library}</aside>}
        <main className="flex-1 overflow-hidden">{canvas}</main>
        {inspector && <aside className="shrink-0 overflow-hidden">{inspector}</aside>}
      </div>
      {statusBar && <footer className="shrink-0 border-t border-[var(--ne-border)] bg-[var(--ne-surface)]">{statusBar}</footer>}
    </div>
  );
}