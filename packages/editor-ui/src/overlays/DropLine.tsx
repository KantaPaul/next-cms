import React from 'react';

export interface DropLineProps {
  orientation?: 'horizontal' | 'vertical';
  position: {
    top: number;
    left: number;
    length: number;
  };
  allowed?: boolean;
  tooltip?: string;
  className?: string;
}

export const DropLine: React.FC<DropLineProps> = ({
  orientation = 'horizontal',
  position,
  allowed = true,
  tooltip,
  className = '',
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: isHorizontal ? `${position.length}px` : '2px',
        height: isHorizontal ? '2px' : `${position.length}px`,
      }}
      className={`absolute z-40 pointer-events-none transition-all duration-75 ${
        allowed ? 'bg-[var(--ne-drop)] shadow-xs' : 'bg-[var(--ne-danger)] shadow-xs'
      } ${className}`}
    >
      {/* Bead indicator on edge */}
      <div
        className={`absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
          allowed ? 'bg-[var(--ne-drop)]' : 'bg-[var(--ne-danger)]'
        }`}
      />

      {/* Tooltip notice (e.g. "Columns cannot go inside Columns") */}
      {tooltip && (
        <div
          className={`absolute left-4 -top-6 px-1.5 py-0.5 text-[10px] rounded-[var(--ne-radius-sm)] shadow-md text-white whitespace-nowrap ${
            allowed ? 'bg-[var(--ne-primary)]' : 'bg-[var(--ne-danger)]'
          }`}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};
