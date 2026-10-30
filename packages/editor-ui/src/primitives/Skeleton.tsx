import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  circle = false,
}) => {
  return (
    <div
      style={{
        width,
        height,
      }}
      className={`animate-pulse bg-[var(--ne-surface-hover)] ${
        circle ? 'rounded-full' : 'rounded-[var(--ne-radius-sm)]'
      } ${className}`}
    />
  );
};
