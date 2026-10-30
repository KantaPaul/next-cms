import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'line';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = true,
  className = '',
}) => {
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-0.5 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] ${fullWidth ? 'w-full' : ''} ${className}`}>
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-2.5 transition-all text-xs font-sans rounded-[var(--ne-radius-sm)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] ${
                fullWidth ? 'flex-1' : ''
              } ${size === 'sm' ? 'h-5 text-[11px]' : 'h-6'} ${
                isActive
                  ? 'bg-[var(--ne-surface)] text-[var(--ne-text)] font-medium shadow-xs border border-[var(--ne-border)]'
                  : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] border border-transparent'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 text-[10px] tabular-nums font-mono opacity-70">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center border-b border-[var(--ne-border)] ${fullWidth ? 'w-full' : ''} ${className}`}>
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-sans border-b-2 cursor-pointer select-none transition-colors -mb-[1px] focus-visible:outline-none ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'border-[var(--ne-primary)] text-[var(--ne-primary)] font-medium'
                : 'border-transparent text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:border-[var(--ne-border-strong)]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 text-[10px] tabular-nums font-mono opacity-70">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
