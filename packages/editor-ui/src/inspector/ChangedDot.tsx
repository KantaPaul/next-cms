import React from 'react';

export interface ChangedDotProps {
  changed?: boolean;
  tooltip?: string;
  className?: string;
}

export const ChangedDot: React.FC<ChangedDotProps> = ({
  changed = false,
  tooltip = 'Modified from default',
  className = '',
}) => {
  if (!changed) return <span className="w-1.5 h-1.5" />; // spacer

  return (
    <span
      title={tooltip}
      className={`ne-motion-pop-in inline-block w-1.5 h-1.5 rounded-full bg-[var(--ne-primary)] shrink-0 ${className}`}
    />
  );
};
