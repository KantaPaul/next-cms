import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PanelProps {
  side: 'left' | 'right';
  title?: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  side,
  title,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 480,
  collapsible = true,
  defaultCollapsed = false,
  headerAction,
  children,
  className = '',
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);

  const isLeft = side === 'left';

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = isLeft
        ? startWidthRef.current + deltaX
        : startWidthRef.current - deltaX;
      setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (isCollapsed) {
    return (
      <div className={`relative flex flex-col justify-start items-center py-2 bg-[var(--ne-surface)] border-${isLeft ? 'r' : 'l'} border-[var(--ne-border)] w-9 shrink-0 select-none`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title={`Expand ${isLeft ? 'left panel' : 'inspector'}`}
          className="p-1 rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] cursor-pointer"
        >
          {isLeft ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {title && (
          <div className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-medium text-[var(--ne-text-muted)] mt-4 tracking-wider uppercase">
            {title}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className={`relative flex flex-col h-full bg-[var(--ne-surface)] border-${isLeft ? 'r' : 'l'} border-[var(--ne-border)] shrink-0 select-none ${
        isResizing ? 'transition-none select-none' : 'transition-[width] duration-150'
      } ${className}`}
    >
      {/* Panel Header */}
      {title && (
        <div className="h-9 px-3 border-b border-[var(--ne-border)] flex items-center justify-between gap-2 shrink-0 bg-[var(--ne-surface)]">
          <div className="text-xs font-semibold text-[var(--ne-text)] font-sans truncate">
            {title}
          </div>
          <div className="flex items-center gap-1">
            {headerAction}
            {collapsible && (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title={`Collapse ${isLeft ? 'left panel' : 'inspector'}`}
                className="p-1 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] rounded-[var(--ne-radius-sm)] cursor-pointer"
              >
                {isLeft ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel Body */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </div>

      {/* Resizing Handle on appropriate side */}
      <div
        onMouseDown={startResize}
        title="Drag to resize panel"
        className={`absolute top-0 bottom-0 w-2.5 z-30 cursor-col-resize hover:bg-[var(--ne-primary)]/20 transition-colors ${
          isLeft ? '-right-1.5' : '-left-1.5'
        }`}
      />
    </aside>
  );
};
