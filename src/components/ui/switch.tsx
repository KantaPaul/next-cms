'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';
import { FieldError, Label } from '@/components/atoms/forms';
import { Flex } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';
import { Spinner } from '../atoms/icons/loader/spinner';

type BaseSwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitives.Root>,
  'onChange' | 'onCheckedChange'
> & {
  isLoading?: boolean;
  onChange?: (checked: boolean) => void;
};

const SwitchBase = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  BaseSwitchProps
>(({ className, isLoading, onChange, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      ref={ref}
      data-slot="switch"
      onCheckedChange={onChange}
      className={cn(
        'peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
        className
      )}
      {...props}
    >
      {isLoading && (
        <Spinner
          className={cn('absolute z-10 size-3', props.checked && 'left-3')}
        />
      )}
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-3.5 rounded-full bg-background shadow-xs ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5'
        )}
      />
    </SwitchPrimitives.Root>
  );
});
SwitchBase.displayName = 'SwitchBase';

export interface SwitchProps extends BaseSwitchProps {
  labelPlacement?: 'left' | 'right';
  label?: React.ReactNode;
  error?: string;
  errorClassName?: string;
  labelClassName?: string;
  wrapperClassName?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(
  (
    {
      label,
      error,
      className,
      isLoading,
      errorClassName,
      labelClassName,
      wrapperClassName,
      labelPlacement = 'right',
      ...props
    },
    ref
  ) => {
    const renderLabel = label ? (
      <Label className={cn('mb-0 cursor-pointer', labelClassName)}>
        {label}
      </Label>
    ) : null;

    return (
      <div className={cn(wrapperClassName)}>
        <Flex align="center" className={cn('gap-2', className)} justify="start">
          {labelPlacement === 'left' && renderLabel}
          <SwitchBase
            ref={ref}
            disabled={isLoading || props.disabled}
            isLoading={isLoading}
            {...props}
          />
          {labelPlacement === 'right' && renderLabel}
        </Flex>
        {error && (
          <FieldError
            className={cn('mt-2 text-xs', errorClassName)}
            error={error}
          />
        )}
      </div>
    );
  }
);
Switch.displayName = 'Switch';
