import { GripVertical, Star } from 'lucide-react';
import type React from 'react';

export interface LibraryItemDef {
  type: string;
  label: string;
  description?: string;
  category: string;
  /** Falls back to the label's first letter. */
  icon?: React.ReactNode;
  isFavorite?: boolean;
  isRecent?: boolean;
}

export interface LibraryItemProps {
  item: LibraryItemDef;
  onSelect: (item: LibraryItemDef) => void;
  /**
   * Host-driven pointer drag (B15 E4). When set, the item is not an HTML5
   * drag source and a click does not call `onSelect`: the host decides
   * between click and drag from the pointer events. Enter/Space still select.
   */
  onPointerDown?: (
    item: LibraryItemDef,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  onToggleFavorite?: (type: string) => void;
  isFavorite?: boolean;
  /** Shown under the item, outside its button (e.g. preset chips). */
  extra?: React.ReactNode;
  /** Tooltip for the item. */
  hint?: string;
}

export const LibraryItem: React.FC<LibraryItemProps> = ({
  item,
  onSelect,
  onPointerDown,
  onToggleFavorite,
  isFavorite = false,
  extra,
  hint,
}) => {
  const hostDrag = !!onPointerDown;
  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: holds a nested favorite button, so it cannot be a <button> */}
      <div
        role="button"
        tabIndex={0}
        title={hint}
        draggable={!hostDrag}
        onDragStart={
          hostDrag
            ? undefined
            : e => {
                e.dataTransfer.setData('text/plain', item.type);
                e.dataTransfer.effectAllowed = 'copy';
              }
        }
        onPointerDown={
          hostDrag
            ? e => {
                if ((e.target as HTMLElement).closest('button')) return;
                onPointerDown(item, e);
              }
            : undefined
        }
        onClick={hostDrag ? undefined : () => onSelect(item)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item);
          }
        }}
        className="group relative flex cursor-grab touch-none select-none items-center gap-2.5 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-2 transition-[border-color,box-shadow,scale] duration-[var(--ne-duration-fast)] hover:border-[var(--ne-primary)] hover:shadow-xs active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] active:cursor-grabbing"
      >
        <div
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] text-xs font-semibold text-[var(--ne-primary)] transition-colors group-hover:bg-[var(--ne-primary-soft)]"
        >
          {item.icon ?? item.label.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1 text-start">
          <div className="truncate text-xs font-medium text-[var(--ne-text)]">
            {item.label}
          </div>
          {item.description && (
            <div className="truncate text-[11px] text-[var(--ne-text-muted)]">
              {item.description}
            </div>
          )}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite(item.type);
            }}
            aria-label={
              isFavorite
                ? `Remove ${item.label} from favorites`
                : `Add ${item.label} to favorites`
            }
            aria-pressed={isFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`cursor-pointer p-1 text-[var(--ne-text-muted)] opacity-0 transition-opacity hover:text-amber-500 group-hover:opacity-100 focus-visible:opacity-100 ${
              isFavorite ? 'text-amber-500 opacity-100' : ''
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`}
            />
          </button>
        )}

        <div
          aria-hidden
          className="cursor-grab text-[var(--ne-text-muted)] opacity-0 group-hover:opacity-50"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>
      {extra}
    </div>
  );
};
