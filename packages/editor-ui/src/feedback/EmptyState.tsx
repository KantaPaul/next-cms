import React from 'react';
import { Plus, LayoutTemplate } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface EmptyStatePreset {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  presets?: EmptyStatePreset[];
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Empty Container',
  description = 'No blocks or widgets in this container yet. Choose a layout preset or add your first item.',
  presets,
  onAdd,
  addLabel = 'Add Item',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-[var(--ne-border)] rounded-[var(--ne-radius-lg)] bg-[var(--ne-surface)]/50 ${className}`}>
      <div className="w-9 h-9 rounded-full bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] flex items-center justify-center text-[var(--ne-text-muted)] mb-3">
        <LayoutTemplate className="w-4 h-4" />
      </div>

      <h4 className="text-xs font-semibold text-[var(--ne-text)] mb-1">
        {title}
      </h4>
      <p className="text-xs text-[var(--ne-text-muted)] max-w-sm mb-4 leading-relaxed">
        {description}
      </p>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={preset.onSelect}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[var(--ne-surface)] hover:bg-[var(--ne-surface-hover)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] text-[var(--ne-text)] cursor-pointer transition-colors shadow-2xs"
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {onAdd && (
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
          {addLabel}
        </Button>
      )}
    </div>
  );
};
