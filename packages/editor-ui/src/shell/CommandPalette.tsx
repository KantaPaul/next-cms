import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight } from 'lucide-react';
import { Kbd } from '../primitives/Kbd.tsx';

export interface CommandAction {
  id: string;
  title: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onExecute: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  actions,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = actions.filter((act) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      act.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onExecute();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Palette box */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-lg)] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-3 border-b border-[var(--ne-border)] h-11 gap-2">
          <Search className="w-4 h-4 text-[var(--ne-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search actions..."
            className="w-full text-xs bg-transparent text-[var(--ne-text)] placeholder-[var(--ne-text-subtle)] focus:outline-none font-sans"
          />
          <Kbd>ESC</Kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 ne-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--ne-text-muted)]">
              No matching commands
            </div>
          ) : (
            filtered.map((act, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    act.onExecute();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--ne-radius-sm)] text-xs text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--ne-primary)] text-white'
                      : 'text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {act.icon && (
                      <span className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                        isSelected ? 'text-white' : 'text-[var(--ne-text-muted)]'
                      }`}>
                        {act.icon}
                      </span>
                    )}
                    <span className="font-medium truncate font-sans">{act.title}</span>
                    <span className={`text-[10px] font-sans px-1 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'text-[var(--ne-text-muted)]'
                    }`}>
                      {act.category}
                    </span>
                  </div>

                  {act.shortcut && (
                    <span className={`font-mono text-[10px] tracking-wider ml-3 ${
                      isSelected ? 'text-white/80' : 'text-[var(--ne-text-muted)]'
                    }`}>
                      {act.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] flex items-center justify-between text-[10px] text-[var(--ne-text-muted)] font-sans">
          <span>Navigate with <Kbd>↑</Kbd> <Kbd>↓</Kbd></span>
          <span>Select with <Kbd>↵</Kbd></span>
        </div>
      </div>
    </div>
  );
};
