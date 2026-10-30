import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, ArrowUp, ArrowDown, Lock, Unlock, Eye, Sparkles } from 'lucide-react';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  open: boolean;
  onClose: () => void;
  actions: ContextMenuAction[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  open,
  onClose,
  actions,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('wheel', onClose);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('wheel', onClose);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      style={{
        top: `${y}px`,
        left: `${x}px`,
      }}
      className="fixed z-50 min-w-[190px] p-1 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] shadow-xl animate-in fade-in zoom-in-95 duration-100"
    >
      {actions.map((act) => (
        <button
          key={act.id}
          type="button"
          disabled={act.disabled}
          onClick={() => {
            act.onClick();
            onClose();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-[var(--ne-radius-sm)] transition-colors select-none text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            act.danger
              ? 'text-[var(--ne-danger)] hover:bg-[var(--ne-danger-soft)]'
              : 'text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {act.icon && <span className="w-3.5 h-3.5 flex items-center justify-center text-[var(--ne-text-muted)]">{act.icon}</span>}
            <span>{act.label}</span>
          </div>
          {act.shortcut && (
            <span className="font-mono text-[10px] text-[var(--ne-text-muted)] tracking-wider ml-4">
              {act.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
