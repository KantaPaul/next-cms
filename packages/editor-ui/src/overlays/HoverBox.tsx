import React from 'react';

export interface HoverBoxProps {
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  label?: string;
  className?: string;
}

export const HoverBox: React.FC<HoverBoxProps> = ({
  bounds,
  label,
  className = '',
}) => {
  return (
    <div
      style={{
        top: `${bounds.top}px`,
        left: `${bounds.left}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      }}
      className={`absolute pointer-events-none z-20 border border-dashed border-[var(--ne-hover)] bg-[var(--ne-primary)]/5 transition-all duration-75 ${className}`}
    >
      {label && (
        <div className="absolute -top-5 left-0 px-1 py-0.5 text-[9px] font-sans font-medium text-[var(--ne-primary)] bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-sm)] shadow-2xs">
          {label}
        </div>
      )}
    </div>
  );
};
