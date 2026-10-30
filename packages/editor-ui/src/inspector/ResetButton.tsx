import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface ResetButtonProps {
  onReset: () => void;
  tooltip?: string;
  disabled?: boolean;
}

export const ResetButton: React.FC<ResetButtonProps> = ({
  onReset,
  tooltip = 'Reset to default',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={disabled}
      title={tooltip}
      className="p-1 rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
    >
      <RotateCcw className="w-3 h-3" />
    </button>
  );
};
