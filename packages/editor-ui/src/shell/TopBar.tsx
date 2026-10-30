import {
  Command,
  Edit3,
  Eye,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  Redo2,
  Send,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type React from 'react';
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
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenCommandPalette?: () => void;
  extraActions?: React.ReactNode;
}

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
  focusMode = false,
  onToggleFocusMode,
  isDark = false,
  onToggleTheme,
  onOpenCommandPalette,
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
    <header className="h-11 px-3 bg-[var(--ne-surface)] border-b border-[var(--ne-border)] flex items-center justify-between gap-4 select-none shrink-0 z-40">
      {/* Zone 1: Brand & Document Name & Save Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {brand}
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
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!onRenameDocument) return;
                setTempTitle(title);
                setEditingTitle(true);
              }}
              title={onRenameDocument ? 'Click to rename' : undefined}
              className="group flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] hover:text-[var(--ne-primary)] cursor-pointer truncate font-sans"
            >
              <span className="truncate">{title}</span>
              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
            </button>
          )}
        </div>

        <div className="h-3.5 w-[1px] bg-[var(--ne-border)] shrink-0" />

        <SaveStatus
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          onRetry={onRetrySave}
          onResolveConflict={onResolveConflict}
        />
      </div>

      {/* Zone 2: Undo/Redo & Device Switcher & Zoom */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            disabled={!canUndo}
            tooltip="Undo (Cmd+Z)"
            onClick={onUndo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            disabled={!canRedo}
            tooltip="Redo (Cmd+Shift+Z)"
            onClick={onRedo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>

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
              <span className="w-8 text-center tabular-nums" aria-live="polite">
                {zoom}%
              </span>
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

      {/* Zone 3: Command palette, Theme, Focus, Preview & Publish */}
      <div className="flex items-center gap-2">
        {extraActions}

        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Command Palette (Cmd+K)"
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[11px] font-sans text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] cursor-pointer hover:border-[var(--ne-border-strong)] transition-colors"
          >
            <Command className="w-3 h-3 text-[var(--ne-text-subtle)]" />
            <span>Search</span>
            <kbd className="font-mono text-[9px] bg-[var(--ne-surface)] px-1 py-0.5 rounded border border-[var(--ne-border)]">
              ⌘K
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
            leftIcon={<Send className="w-3.5 h-3.5" />}
            onClick={onPublish}
          >
            Publish
          </Button>
        )}
      </div>
    </header>
  );
};
