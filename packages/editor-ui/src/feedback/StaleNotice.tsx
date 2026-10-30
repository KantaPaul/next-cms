import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';

export interface StaleNoticeProps {
  lastUpdatedText?: string;
  onRefresh?: () => void;
  className?: string;
}

export const StaleNotice: React.FC<StaleNoticeProps> = ({
  lastUpdatedText = 'Updated 12 min ago',
  onRefresh,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--ne-radius-sm)] bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] text-[11px] text-[var(--ne-text-muted)] ${className}`}>
      <Clock className="w-3 h-3 text-[var(--ne-text-subtle)]" />
      <span>{lastUpdatedText}</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh data"
          className="ml-1 p-0.5 hover:text-[var(--ne-primary)] cursor-pointer"
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};
