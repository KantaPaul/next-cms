'use client';

import { ArrowUp, Ban, Eye } from 'lucide-react';
import type { PageTransition } from '../style';
import { Choose } from './primitives';

export function PageTransitionField({
  value,
  onChange,
  field,
}: {
  value: PageTransition | undefined;
  onChange: (value: PageTransition) => void;
  field: { label?: string };
}) {
  return (
    <Choose
      label={field.label ?? 'Page transition'}
      value={value ?? 'none'}
      options={[
        { value: 'none', label: 'None', icon: <Ban /> },
        { value: 'fade', label: 'Fade', icon: <Eye /> },
        { value: 'slide-up', label: 'Slide up', icon: <ArrowUp /> },
      ]}
      onChange={onChange}
    />
  );
}
