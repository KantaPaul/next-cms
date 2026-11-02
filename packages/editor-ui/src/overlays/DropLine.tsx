import React from 'react';

export interface DropLineProps {
  orientation?: 'horizontal' | 'vertical';
  position: {
    top: number;
    left: number;
    length: number;
  };
  allowed?: boolean;
  noop?: boolean;
  tooltip?: string;
  className?: string;
}

export const DropLine: React.FC<DropLineProps> = ({
  orientation = 'horizontal',
  position,
  allowed = true,
  noop = false,
  tooltip,
  className = '',
}) => {
  const isHorizontal = orientation === 'horizontal';
  const label = noop ? undefined : (tooltip || (allowed ? 'Drop here' : undefined));

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: isHorizontal ? `${position.length}px` : '4px',
        height: isHorizontal ? '4px' : `${position.length}px`,
      }}
      className={`absolute z-40 pointer-events-none ne-motion-follow ${
        noop
          ? 'bg-neutral-400/60 opacity-50'
          : allowed
            ? 'bg-[var(--ne-drop)] shadow-xs'
            : 'bg-[var(--ne-danger)] shadow-xs'
      } ${className}`}
    >
      {/* Bead indicator on start edge */}
      <div
        className={`absolute ${
          isHorizontal ? '-top-1 -left-1.5' : '-top-1.5 -left-1'
        } w-3 h-3 rounded-full border-2 border-white shadow-xs ${
          noop
            ? 'bg-neutral-400'
            : allowed
              ? 'bg-[var(--ne-drop)]'
              : 'bg-[var(--ne-danger)]'
        }`}
      />

      {/* Bead indicator on end edge */}
      <div
        className={`absolute ${
          isHorizontal ? '-top-1 -right-1.5' : '-bottom-1.5 -left-1'
        } w-3 h-3 rounded-full border-2 border-white shadow-xs ${
          noop
            ? 'bg-neutral-400'
            : allowed
              ? 'bg-[var(--ne-drop)]'
              : 'bg-[var(--ne-danger)]'
        }`}
      />

      {/* Centred pill label */}
      {label && (
        <div
          className={`absolute ${
            isHorizontal
              ? 'left-1/2 -translate-x-1/2 -top-7'
              : 'top-1/2 -translate-y-1/2 left-3'
          } px-2.5 py-0.5 text-[11px] font-medium rounded-full shadow-md text-white whitespace-nowrap ${
            noop
              ? 'bg-neutral-500/80 text-neutral-200'
              : allowed
                ? 'bg-[var(--ne-drop)]'
                : 'bg-[var(--ne-danger)]'
          }`}
        >
          {label}
        </div>
      )}
    </div>
  );
};
