import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { PanelHeader } from './PanelHeader';
import { PanelResizeDivider } from './PanelResizeDivider';
import { PanelTabs, type PanelTabItem } from './PanelTabs';

export type PanelDockSide = 'left' | 'right';

export interface EditorPanelProps {
  id?: string;
  side?: PanelDockSide;
  onSideChange?: (side: PanelDockSide) => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  tabs?: PanelTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
  headerAction?: React.ReactNode;
  onBack?: () => void;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  id,
  side = 'right',
  onSideChange,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 520,
  collapsible = true,
  defaultCollapsed = false,
  storageKey,
  headerAction,
  onBack,
  breadcrumbs,
  children,
  className,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const panelRef = useRef<HTMLElement>(null);

  const isStart = side === 'left';

  // Persistence
  useEffect(() => {
    if (!storageKey || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.width === 'number') setWidth(parsed.width);
        if (typeof parsed.collapsed === 'boolean') setCollapsed(parsed.collapsed);
      }
    } catch {
      // fallback
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
    } catch {
      // ignore
    }
  }, [storageKey, width, collapsed]);

  const handleResize = useCallback(
    (delta: number) => {
      setWidth(w => {
        const factor = isStart ? 1 : -1;
        const next = w + delta * factor;
        return Math.max(minWidth, Math.min(maxWidth, next));
      });
    },
    [isStart, minWidth, maxWidth]
  );

  const CollapseIcon = isStart ? ChevronLeft : ChevronRight;
  const ExpandIcon = isStart ? ChevronRight : ChevronLeft;

  if (collapsed) {
    return (
      <div
        className={cn(
          'ne-motion-enter relative flex w-9 shrink-0 select-none flex-col items-center justify-start border-[var(--ne-border)] bg-[var(--ne-surface)] py-2',
          isStart ? 'border-e' : 'border-s',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand ${typeof title === 'string' ? title : 'panel'}`}
          title={`Expand ${typeof title === 'string' ? title : 'panel'}`}
          className="cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
        >
          <ExpandIcon className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </button>
        {title && (
          <div className="mt-4 rotate-180 text-[11px] font-medium uppercase tracking-wider text-[var(--ne-text-muted)] [writing-mode:vertical-rl]">
            {title}
          </div>
        )}
      </div>
    );
  }

  const defaultActions = (
    <>
      {onSideChange && (
        <button
          type="button"
          onClick={() => onSideChange(side === 'left' ? 'right' : 'left')}
          aria-label={side === 'left' ? 'Dock to right' : 'Dock to left'}
          title={side === 'left' ? 'Dock to right' : 'Dock to left'}
          className="cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]"
        >
          {side === 'left' ? <PanelRight size={13} /> : <PanelLeft size={13} />}
        </button>
      )}

      {headerAction}

      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse panel"
          title="Collapse panel"
          className="cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]"
        >
          <CollapseIcon className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </button>
      )}
    </>
  );

  return (
    <aside
      id={id}
      ref={panelRef}
      style={{ width }}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-[var(--ne-border)] bg-[var(--ne-surface)] min-h-0',
        isStart ? 'border-e' : 'border-s',
        className
      )}
    >
      {/* Header */}
      {(title || breadcrumbs || headerAction || collapsible || onSideChange) && (
        <PanelHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          breadcrumbs={breadcrumbs}
          actions={defaultActions}
        />
      )}

      {/* Tabs */}
      {tabs && tabs.length > 0 && activeTab && onTabChange && (
        <PanelTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
        />
      )}

      {/* Panel Body */}
      <div className="flex-1 overflow-auto ne-scrollbar min-h-0">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          'absolute inset-y-0 z-30',
          isStart ? '-end-1' : '-start-1'
        )}
      >
        <PanelResizeDivider
          orientation="vertical"
          onResize={handleResize}
          value={width}
          min={minWidth}
          max={maxWidth}
        />
      </div>
    </aside>
  );
};
