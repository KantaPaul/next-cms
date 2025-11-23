'use client';

import { useState } from 'react';
// import { Button } from '@/components/atoms/button/button';
// import { Label } from '@/components/atoms/forms/label';
// import { Input, type InputProps } from '@/components/ui/input';
import { RANGE_SEPARATOR } from '@/config/constant';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps } from '../types';
import type { InputProps} from '../../forms';
import { Input, Label } from '../../forms';
import { Button } from '@/components/ui/button';

interface NumberRangeFilterProps
  extends BaseFilterProps,
    Omit<InputProps, keyof BaseFilterProps | 'value' | 'onChange'> {}

export function NumberRangeFilter({
  value,
  size = 'md',
  label,
  className,
  placeholder = '',
  isPending,
  handlers,
  config,
}: NumberRangeFilterProps) {
  const [minRange, setMinRange] = useState('');
  const [maxRange, setMaxRange] = useState('');

  const handleApply = () => {
    if (minRange !== '' || maxRange !== '') {
      const range = [minRange, maxRange].join(RANGE_SEPARATOR);
      handlers.setValue(range);
    }
  };

  const handleClear = () => {
    handlers.clear();
    setMinRange('');
    setMaxRange('');
  };

  const placeHolderFrom = placeholder ? `${placeholder} From` : 'from';
  const placeHolderTo = placeholder ? `${placeholder} To` : 'To';

  return (
    <div className={cn('grid min-w-72 grid-cols-[repeat(2,1fr)_auto] items-center', className)}>
      {(label || value) && (
        <div className="col-span-full mb-2 flex items-center justify-between">
          {label && <Label className={cn('col-span-full mb-0')}>{label}</Label>}
          {value && (
            <button className="text-muted-foreground text-sm" onClick={handleClear} type="button">
              clear
            </button>
          )}
        </div>
      )}
      <Input
        aria-label="Min Value"
        inputClassName="rounded-e-none xl:rounded-e-none focus-within:relative focus-within:z-10"
        // isClearable={false}
        onChange={(e) => setMinRange(e.target.value)}
        placeholder={placeHolderFrom}
        // size={size}
        type="number"
        value={minRange}
      />
      <Input
        aria-label="Max Value"
        inputClassName="-ms-px rounded-none xl:rounded-none focus-within:relative focus-within:z-10"
        // isClearable={false}
        onChange={(e) => setMaxRange(e.target.value)}
        placeholder={placeHolderTo}
        // size={size}
        type="number"
        value={maxRange}
      />
      <Button
        className="-ms-0.5 rounded-s-none xl:rounded-s-none"
        // isLoading={isPending}
        onClick={handleApply}
        // size={size}
        variant="outline"
      >
        Apply
      </Button>
    </div>
  );
}
