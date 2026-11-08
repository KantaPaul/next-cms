'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type ElementStyle } from './element';

export function PricingToggle({
  monthly,
  yearly,
  elements,
}: {
  monthly: ReactNode;
  yearly: ReactNode;
  elements?: Record<string, ElementStyle>;
}) {
  const [isYearly, setIsYearly] = useState(false);
  const toggleEl = el(
    { elements },
    'toggle',
    's-surface s-border inline-flex rounded-full border p-1 text-sm'
  );

  return (
    <>
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing interval"
          className={toggleEl.className}
          style={toggleEl.style}
        >
          {(['Monthly', 'Yearly'] as const).map(label => {
            const active = (label === 'Yearly') === isYearly;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setIsYearly(label === 'Yearly')}
                className={cn(
                  'rounded-full px-4 py-1.5 font-medium transition',
                  active ? 's-primary-bg' : 's-muted'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {isYearly ? yearly : monthly}
    </>
  );
}
