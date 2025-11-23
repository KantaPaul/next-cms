'use client';

import { Root, Thumb } from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { FieldError, Label } from '@/components/atoms/forms';
// import { FieldError } from '@/components/atoms/forms/helper/field-error-text';
// import { Loader } from '@/components/atoms/icons/loader';
import { Flex } from '@/components/atoms/layout';
import { focusRing } from '@/components/atoms/utils';
import { cn } from '@/lib/utils/cn';
import { Spinner } from '../atoms/icons/loader/spinner';

// First, let's create a type that omits both onChange and onCheckedChange
type BaseSwitchProps = Omit<React.ComponentProps<typeof Root>, 'onChange' | 'onCheckedChange'> & {
  isLoading?: boolean;
  onChange?: (checked: boolean) => void;
};

function SwitchBase({ className, isLoading, onChange, ...props }: BaseSwitchProps) {
  return (
    <Root
      className={cn(
        'peer relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-zinc-900 data-[state=unchecked]:bg-zinc-200 dark:data-[state=checked]:bg-zinc-50 dark:data-[state=unchecked]:bg-zinc-800',
        focusRing,
        className
      )}
      data-slot="switch"
      onCheckedChange={onChange}
      {...props}
    >
      {isLoading && <Spinner className={cn('absolute z-10', props.checked && 'left-4')} />}
      <Thumb
        className={cn(
          'pointer-events-none block size-4.5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[1.05rem] data-[state=unchecked]:translate-x-0.5 dark:bg-zinc-950'
        )}
        data-slot="switch-thumb"
      />
      {props.checked && <Check className="relative left-px" size={14} />}
    </Root>
  );
}

// Now create our interface with our custom onChange
export interface SwitchProps extends BaseSwitchProps {
  onChange?: (checked: boolean) => void;
  checked?: boolean;
  isLoading?: boolean;
  labelPlacement?: 'left' | 'right';
  label?: React.ReactNode;
  error?: string;
  errorClassName?: string;
  labelClassName?: string;
  wrapperClassName?: string;
}

export function Switch({
  label,
  error,
  className,
  isLoading,
  errorClassName,
  labelClassName,
  wrapperClassName,
  labelPlacement = 'right',
  ...props
}: SwitchProps) {
  const renderLabel = useMemo(() => {
    if (!label) {
      return null;
    }

    return (
      <Label className={cn('mb-0', labelClassName)}
      // disabled={props.disabled}
      >
        {label}
      </Label>
    );
  }, [label, labelClassName, props.disabled]);

  return (
    <div className={cn(wrapperClassName)}>
      <Flex align="center" className={cn('gap-2', className)} justify="start">
        {labelPlacement === 'left' && renderLabel}
        <SwitchBase disabled={isLoading || props.disabled} isLoading={isLoading} {...props} />
        {labelPlacement === 'right' && renderLabel}
      </Flex>
      {error && <FieldError className={cn('mt-2', errorClassName)} error={error}
      // size="md"
      />}
    </div>
  );
}
