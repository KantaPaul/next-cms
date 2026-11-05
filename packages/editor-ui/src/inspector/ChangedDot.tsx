import React from 'react';

export interface ChangedDotProps {
  changed?: boolean;
  tooltip?: string;
  className?: string;
}

/**
 * Modified-from-default marker. It stays mounted and scales in or out, so
 * resetting a field visibly shrinks the dot instead of dropping it.
 */
export const ChangedDot: React.FC<ChangedDotProps> = ({
  changed = false,
  tooltip = 'Modified from default',
  className = '',
}) => (
  <span
    title={changed ? tooltip : undefined}
    aria-hidden={changed ? undefined : true}
    data-on={changed ? 'true' : 'false'}
    className={`ne-changed-dot inline-block w-1.5 h-1.5 rounded-full bg-[var(--ne-primary)] shrink-0 ${className}`}
  />
);
