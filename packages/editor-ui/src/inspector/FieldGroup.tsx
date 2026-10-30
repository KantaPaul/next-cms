import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface FieldGroupProps {
  title: string;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  defaultExpanded = true,
  action,
  children,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`border-b border-[var(--ne-border)] last:border-b-0 py-2.5 ${className}`}>
      <div className="flex items-center justify-between mb-1.5 select-none">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)] hover:text-[var(--ne-primary)] cursor-pointer transition-colors"
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-[var(--ne-text-muted)] transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span>{title}</span>
        </button>
        {action && <div>{action}</div>}
      </div>

      {expanded && (
        <div className="pl-5 pr-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};
