'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export function PricingToggle({
  monthly,
  yearly,
}: {
  monthly: ReactNode;
  yearly: ReactNode;
}) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing interval"
          className="s-surface s-border inline-flex rounded-full border p-1 text-sm"
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
