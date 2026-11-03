import {
  Columns2,
  Command,
  Edit3,
  Eye,
  Keyboard,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Redo2,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { type SaveState, SaveStatus } from '../feedback/SaveStatus';
import type { DeviceType } from '../inspector/DeviceValueBadge';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';

/**
 * Editor top bar (B15 E3). Every control is optional and shows only when its
 * callback is passed, so the page and dashboard builders share it.
 */
export interface TopBarProps {
  title: string;
  /** Logo or product mark at the inline start. */
  brand?: React.ReactNode;
  onRenameDocument?: (name: string) => void;
  saveStatus: SaveState;
  lastSavedAt?: string | Date;
  onRetrySave?: () => void;
  onResolveConflict?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  device?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  isPreview?: boolean;
  onPreview?: () => void;
  onPublish?: () => void;
  /** Label for the primary action, e.g. "Update live page" or "Submit for review". */
  publishLabel?: string;
  publishDisabled?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  /** Single dockable panel vs classic split (library + inspector). */
  layout?: 'single' | 'split';
  onLayoutChange?: (layout: 'single' | 'split') => void;
  /** Which side the single panel docks to; the toggle shows in single layout. */
  dockSide?: 'left' | 'right';
  onDockSideChange?: (side: 'left' | 'right') => void;
  /** Export/import control (e.g. the JSON split button), before Shortcuts. */
  exportAction?: React.ReactNode;
  extraActions?: React.ReactNode;
}

const segment = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ne-radius-sm)] text-[11px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] ${
    active
      ? 'bg-[var(--ne-surface)] text-[var(--ne-primary)] font-semibold shadow-2xs'
      : 'text-[var(--ne-text-muted)] font-medium hover:text-[var(--ne-text)]'
  }`;

const pill =
  'flex items-center gap-0.5 p-0.5 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-lg)]';

const pillButton =
  'p-1.5 rounded-[var(--ne-radius-md)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] text-[var(--ne-text)] hover:text-[var(--ne-primary)] hover:bg-[var(--ne-surface)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--ne-text)]';

const DEVICES: { id: DeviceType; label: string; Icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop view', Icon: Monitor },
  { id: 'tablet', label: 'Tablet view', Icon: Tablet },
  { id: 'mobile', label: 'Mobile view', Icon: Smartphone },
];

export const TopBar: React.FC<TopBarProps> = ({
  title,
  brand,
  onRenameDocument,
  saveStatus,
  lastSavedAt,
  onRetrySave,
  onResolveConflict,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  device = 'desktop',
  onDeviceChange,
  zoom,
  onZoomChange,
  isPreview = false,
  onPreview,
  onPublish,
  publishLabel = 'Publish',
  publishDisabled = false,
  focusMode = false,
  onToggleFocusMode,
  isDark = false,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenShortcuts,
  layout,
  onLayoutChange,
  dockSide = 'right',
  onDockSideChange,
  exportAction,
  extraActions,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleCommitTitle = () => {
    if (tempTitle.trim() && onRenameDocument) {
      onRenameDocument(tempTitle.trim());
    }
    setEditingTitle(false);
  };

  return (
    <header className="h-12 px-3 bg-[var(--ne-surface)] border-b border-[var(--ne-border)] flex items-center justify-between gap-4 select-none shrink-0 z-40">
      {/* Zone 1: Brand, document name, save status, undo/redo */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-[5rem]">
          {brand && (
            <div className="flex shrink-0 items-center gap-2">{brand}</div>
          )}
          {brand && (
            <div className="h-4 w-[1px] bg-[var(--ne-border)] shrink-0" />
          )}
          {editingTitle && onRenameDocument ? (
            <input
              type="text"
              value={tempTitle}
              onChange={e => setTempTitle(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCommitTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              autoFocus
              className="h-6 px-1.5 text-xs font-semibold bg-[var(--ne-surface-subtle)] border border-[var(--ne-primary)] rounded-[var(--ne-radius-sm)] text-[var(--ne-text)] focus:outline-none w-44 font-sans"
            />
          ) : onRenameDocument ? (
            <button
              type="button"
              onClick={() => {
                setTempTitle(title);
                setEditingTitle(true);
              }}
              title="Click to rename"
              className="group flex min-w-[3rem] items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] hover:text-[var(--ne-primary)] cursor-pointer font-sans"
            >
              <span className="truncate">{title}</span>
              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
            </button>
          ) : (
            <h1
              title={title}
              className="min-w-[3rem] truncate text-xs font-semibold text-[var(--ne-text)]"
            >
              {title}
            </h1>
          )}
        </div>

        <SaveStatus
          className="shrink-0 whitespace-nowrap"
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          onRetry={onRetrySave}
          onResolveConflict={onResolveConflict}
        />

        <div className="h-4 w-[1px] bg-[var(--ne-border)] shrink-0" />

        <div className={pill}>
          <button
            type="button"
            className={pillButton}
            disabled={!canUndo}
            onClick={onUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={pillButton}
            disabled={!canRedo}
            onClick={onRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 2: Layout and dock, then device and zoom when the host keeps them here */}
      <div className="flex shrink-0 items-center gap-2">
        {/* {layout && onLayoutChange && (
          <div role="group" aria-label="Editor layout" className={pill}>
            <button
              type="button"
              aria-pressed={layout === 'single'}
              onClick={() => onLayoutChange('single')}
              title="Single-panel layout"
              className={segment(layout === 'single')}
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span>Panel</span>
            </button>
            <button
              type="button"
              aria-pressed={layout === 'split'}
              onClick={() => onLayoutChange('split')}
              title="Split layout (library and inspector)"
              className={segment(layout === 'split')}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>
        )} */}

        {layout !== 'split' && onDockSideChange && (
          <button
            type="button"
            onClick={() => onDockSideChange(dockSide === 'left' ? 'right' : 'left')}
            aria-label={dockSide === 'left' ? 'Dock panel to right' : 'Dock panel to left'}
            title={dockSide === 'left' ? 'Dock panel to right' : 'Dock panel to left'}
            className="p-1.5 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
          >
            {dockSide === 'left' ? (
              <PanelRight className="w-3.5 h-3.5" />
            ) : (
              <PanelLeft className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {onDeviceChange && (
          <>
            <div className="h-3.5 w-[1px] bg-[var(--ne-border)] shrink-0" />
            <div
              role="group"
              aria-label="Device preview"
              className="flex items-center p-0.5 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)]"
            >
              {DEVICES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onDeviceChange(id)}
                  aria-label={label}
                  aria-pressed={device === id}
                  title={label}
                  className={`p-1 rounded-[var(--ne-radius-sm)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] ${
                    device === id
                      ? 'bg-[var(--ne-surface)] text-[var(--ne-primary)] shadow-2xs font-medium'
                      : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </>
        )}

        {zoom !== undefined && onZoomChange && (
          <>
            <div className="h-3.5 w-[1px] bg-[var(--ne-border)] shrink-0" />
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--ne-text-muted)]">
              <button
                type="button"
                onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                className="p-1 hover:text-[var(--ne-text)] cursor-pointer"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(100)}
                className="w-8 text-center tabular-nums hover:text-[var(--ne-text)] cursor-pointer"
                aria-live="polite"
                title="Reset zoom to 100%"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(Math.min(150, zoom + 10))}
                className="p-1 hover:text-[var(--ne-text)] cursor-pointer"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Zone 3: Builder actions, export, shortcuts, preview and publish */}
      <div className="flex shrink-0 justify-end items-center gap-2">
        {extraActions}

        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Command Palette (⌘K)"
            aria-label="Command palette"
            className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 text-[11px] font-sans text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] cursor-pointer hover:border-[var(--ne-border-strong)] transition-colors"
          >
            <Command className="w-3 h-3 text-[var(--ne-text-subtle)]" />
            <span>Search</span>
            <kbd className="font-mono text-[9px] bg-[var(--ne-surface)] px-1 py-0.5 rounded border border-[var(--ne-border)]">
              ⌘K
            </kbd>
          </button>
        )}

        {exportAction}

        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] border border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)] rounded-[var(--ne-radius-md)] transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Shortcuts</span>
            <kbd className="hidden 2xl:inline-block font-mono text-[10px] px-1.5 bg-[var(--ne-surface-subtle)] rounded border border-[var(--ne-border)]">
              ?
            </kbd>
          </button>
        )}

        {onToggleTheme && (
          <IconButton
            size="sm"
            tooltip={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onClick={onToggleTheme}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </IconButton>
        )}

        {onToggleFocusMode && (
          <IconButton
            size="sm"
            tooltip={
              focusMode ? 'Exit Focus Mode' : 'Focus Mode (Hide all panels)'
            }
            active={focusMode}
            onClick={onToggleFocusMode}
          >
            {focusMode ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </IconButton>
        )}

        {onPreview && (
          <Button
            variant={isPreview ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={onPreview}
          >
            {isPreview ? 'Editing' : 'Preview'}
          </Button>
        )}

        {onPublish && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            disabled={publishDisabled}
            onClick={onPublish}
          >
            {publishLabel}
          </Button>
        )}
      </div>
    </header>
  );
};
