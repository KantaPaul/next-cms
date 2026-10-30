import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  shortcut?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[side];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none px-2 py-1 text-[11px] leading-tight font-sans text-white bg-slate-900 dark:bg-slate-800 rounded-[var(--ne-radius-sm)] shadow-md whitespace-nowrap flex items-center gap-1.5 border border-slate-700/50 ${positionStyles}`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="font-mono text-[9px] bg-slate-800 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-300">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};
