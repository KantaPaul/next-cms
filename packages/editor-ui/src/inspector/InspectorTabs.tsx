import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Tabs, TabItem } from '../primitives/Tabs';

export interface InspectorTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
  className?: string;
}

export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
  className = '',
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className={`border-b border-[var(--ne-border)] bg-[var(--ne-surface)] ${className}`}>
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1 gap-2">
        <div className="flex-1 min-w-0">
          <Tabs
            items={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            variant="segmented"
            size="sm"
          />
        </div>

        {showSearch && onSearchChange && (
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search settings"
            className={`p-1 rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] transition-colors cursor-pointer shrink-0 ${
              searchOpen || searchQuery ? 'text-[var(--ne-primary)] bg-[var(--ne-primary-soft)]' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {searchOpen && onSearchChange && (
        <div className="px-2 pb-2 pt-1 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-150">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3 h-3 absolute left-2 text-[var(--ne-text-subtle)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search properties..."
              autoFocus
              className="w-full h-6 pl-7 pr-6 text-xs bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-sm)] text-[var(--ne-text)] placeholder-[var(--ne-text-subtle)] focus:outline-none focus:border-[var(--ne-primary)] font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-1.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
