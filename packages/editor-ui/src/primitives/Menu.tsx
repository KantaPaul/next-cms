import React, { useState, useRef, useEffect } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'start',
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[180px] p-1 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] shadow-lg animate-in fade-in zoom-in-95 duration-100 ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`div-${index}`} className="my-1 border-t border-[var(--ne-border)]" />;
            }
            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-sans rounded-[var(--ne-radius-sm)] transition-colors select-none text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.danger
                    ? 'text-[var(--ne-danger)] hover:bg-[var(--ne-danger-soft)]'
                    : 'text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon && <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="ml-3 font-mono text-[10px] text-[var(--ne-text-muted)] tracking-wider">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
