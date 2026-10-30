import React from 'react';
import { Star, GripVertical } from 'lucide-react';

export interface LibraryItemDef {
  type: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ReactNode;
  isFavorite?: boolean;
  isRecent?: boolean;
}

export interface LibraryItemProps {
  item: LibraryItemDef;
  onSelect: (item: LibraryItemDef) => void;
  onToggleFavorite?: (type: string) => void;
  isFavorite?: boolean;
}

export const LibraryItem: React.FC<LibraryItemProps> = ({
  item,
  onSelect,
  onToggleFavorite,
  isFavorite = false,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group relative flex items-center gap-2.5 p-2 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] hover:border-[var(--ne-primary)] hover:shadow-xs transition-all cursor-grab active:cursor-grabbing select-none"
    >
      <div className="w-7 h-7 rounded-[var(--ne-radius-sm)] bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] text-[var(--ne-primary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--ne-primary-soft)] transition-colors">
        {item.icon}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs font-medium text-[var(--ne-text)] truncate font-sans">
          {item.label}
        </div>
        {item.description && (
          <div className="text-[11px] text-[var(--ne-text-muted)] truncate font-sans">
            {item.description}
          </div>
        )}
      </div>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.type);
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`opacity-0 group-hover:opacity-100 p-1 text-[var(--ne-text-muted)] hover:text-amber-500 cursor-pointer transition-opacity ${
            isFavorite ? 'opacity-100 text-amber-500' : ''
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>
      )}

      <div className="opacity-0 group-hover:opacity-50 text-[var(--ne-text-muted)] cursor-grab">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
