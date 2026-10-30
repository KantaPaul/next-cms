import * as React from 'react';
import { cn } from '../lib/cn';

export interface InspectorFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function InspectorField({ label, description, required, error, children, className }: InspectorFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-[var(--ne-text)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--ne-danger)]">*</span>}
      </label>
      {children}
      {description && <p className="text-[10px] text-[var(--ne-text-muted)]">{description}</p>}
      {error && <p className="text-[10px] text-[var(--ne-danger)]">{error}</p>}
    </div>
  );
}