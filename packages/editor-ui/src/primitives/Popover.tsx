import React, { useState, useRef, useEffect } from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'center',
  side = 'bottom',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const alignStyles = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }[align];

  const sideStyles = {
    top: 'bottom-full mb-1.5',
    bottom: 'top-full mt-1.5',
  }[side];

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer inline-flex">
        {trigger}
      </div>

      {open && (
        <div
          className={`absolute z-50 min-w-[200px] p-3 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-lg)] shadow-lg animate-in fade-in zoom-in-95 duration-150 ${alignStyles} ${sideStyles} ${className}`}
        >
          {typeof content === 'function' ? content(() => setOpen(false)) : content}
        </div>
      )}
    </div>
  );
};
