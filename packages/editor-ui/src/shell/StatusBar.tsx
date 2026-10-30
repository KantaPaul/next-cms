import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb.tsx';
import { Kbd } from '../primitives/Kbd.tsx';

export interface StatusBarProps {
  breadcrumbs?: BreadcrumbItem[];
  onSelectBreadcrumb?: (id: string) => void;
  selectionSummary?: string;
  nodeCount?: number;
  zoom?: number;
  modeLabel?: string;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  breadcrumbs = [],
  onSelectBreadcrumb,
  selectionSummary,
  nodeCount,
  zoom = 100,
  modeLabel,
  className = '',
}) => {
  return (
    <footer className={`h-7 px-3 bg-[var(--ne-surface)] border-t border-[var(--ne-border)] flex items-center justify-between gap-4 text-[11px] font-sans text-[var(--ne-text-muted)] select-none shrink-0 z-30 ${className}`}>
      {/* Left: Breadcrumbs or Active Selection */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs.length > 0 && onSelectBreadcrumb ? (
          <Breadcrumb items={breadcrumbs} onSelect={onSelectBreadcrumb} />
        ) : (
          <span className="truncate">{selectionSummary || 'Ready'}</span>
        )}
      </div>

      {/* Center: Keyboard Move & Navigation Tips */}
      <div className="hidden lg:flex items-center gap-2 text-[10px] text-[var(--ne-text-subtle)]">
        <span>Move: <Kbd>Enter</Kbd> + <Kbd>Arrows</Kbd></span>
        <span>·</span>
        <span>Resize: <Kbd>Shift+Arrows</Kbd></span>
        <span>·</span>
        <span>Palette: <Kbd>⌘K</Kbd></span>
        <span>·</span>
        <span>Insert: <Kbd>/</Kbd></span>
      </div>

      {/* Right: Meta & Document stats */}
      <div className="flex items-center gap-3 shrink-0 tabular-nums">
        {modeLabel && (
          <span className="font-medium text-[var(--ne-text)]">{modeLabel}</span>
        )}
        {nodeCount !== undefined && (
          <span>{nodeCount} items</span>
        )}
        <span className="font-mono">{zoom}%</span>
      </div>
    </footer>
  );
};
