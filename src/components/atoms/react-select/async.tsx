'use client';

import type { GroupBase } from 'react-select';
import Select, { type AsyncProps } from 'react-select/async';
import { FieldError, Label } from '@/components/atoms/forms';
import { Box } from '@/components/atoms/layout';
import { ClearIndicator, DropdownIndicator } from '@/components/atoms/react-select/components';
import { cn } from '@/lib/utils/cn';
import { type Size, sizes } from './select';
import FieldHelperText from '@/components/atoms/forms/helpers/field-helper-text';

type SelectProps<
  option,
  isMulti extends boolean = false,
  group extends GroupBase<option> = GroupBase<option>,
> = AsyncProps<option, isMulti, group> & {
  label?: string;
  error?: string;
  size?: Size;
  variant?: 'text' | 'outline' | 'shadow';
  isRequired?: boolean;
  labelClassName?: string;
  errorClassName?: string;
  boxClassName?: string;
  helperClassName?: string;
  helperText?: React.ReactNode;
};

export const AsyncSelect = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  label,
  error,
  size = 'lg',
  variant = 'outline',
  isRequired,
  boxClassName,
  labelClassName,
  errorClassName,
  helperText,
  isDisabled,
  helperClassName,
  ...props
}: SelectProps<Option, IsMulti, Group>) => {
  return (
    <Box className={cn('grid w-full grid-cols-1', boxClassName)}>
      {label && (
        <Label className={cn(labelClassName)}>
          {label} {isRequired && <span className="text-red-500 dark:text-red-dark">*</span>}
        </Label>
      )}
      <Select
        isDisabled={isDisabled}
        components={{
          ClearIndicator,
          DropdownIndicator,
          IndicatorSeparator: () => null,
        }}
        menuPortalTarget={document.body}
        className="proa-rs proa__container"
        classNamePrefix="proa"
        classNames={{
          control: () =>
            cn(
              'custom-control',
              sizes[size],
              `proa__variant-${variant}`,
              error && 'proa__control--is-error'
            ),
        }}
        {...props}
      />
      {error && <FieldError error={error} className={cn('mt-2', errorClassName)} />}

      {helperText && (
        <FieldHelperText
          size="md"
          className={cn('mt-2', helperClassName, isDisabled && 'text-muted-foreground')}
        >
          {helperText}
        </FieldHelperText>
      )}
    </Box>
  );
};
