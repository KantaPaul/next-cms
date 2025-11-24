'use client';

import { type ForwardedRef, forwardRef } from 'react';
import PhoneInput, { type PhoneInputProps } from 'react-phone-input-2';
import './style.css';
import { FieldError, Label } from '@/components/atoms/forms';
import { Box } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';
import FieldHelperText from '@/components/atoms/forms/helpers/field-helper-text';

interface PhoneNumberInputProps extends PhoneInputProps {
  label?: string;
  labelClassName?: string;
  error?: string;
  isRequired?: boolean;
  inputClassName?: string;
  errorClassName?: string;
  variant?: 'text' | 'flat' | 'outline';
  helperText?: string;
  helperClassName?: string;
  className?: string;
}
export const PhoneNumberInput = forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      label,
      disabled,
      labelClassName,
      error,
      variant = 'outline',
      inputClassName,
      errorClassName,
      isRequired,
      helperText,
      helperClassName,
      className,
      ...props
    }: PhoneNumberInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <Box className={cn(className)}>
        {label && (
          <Label className={cn(labelClassName)}>
            {label} {isRequired && <span className="text-red-500 dark:text-red-dark">*</span>}
          </Label>
        )}
        <PhoneInput
          country="us"
          disabled={disabled}
          containerClass={cn(
            // base styles
            'flex 5xl:h-12 h-11 w-full flex-row-reverse items-center rounded-lg transition duration-300 dark:bg-dark-50',
            // variant styles
            variant === 'outline' && 'border-2 border-steel-100 dark:border-dark-400',
            // hover state
            'hover:border-steel-200 hover:dark:border-dark-500',

            // focus within - using this as basic focus.
            // !readOnly &&
            'focus-within:border-steel-700',

            // focus by keyboard
            'focus-visible:border-steel-200 focus-visible:outline-steel-300 focus-visible:outline-offset-4 focus-visible:dark:border-dark-500 focus-visible:dark:outline-dark-500',
            // disabled state
            disabled &&
              'dark:!bg-white/10 bg-steel-100 text-steel-400 hover:border-steel-100 dark:hover:border-dark-400',
            // error state
            error &&
              'border-red focus-within:border-red focus-within:ring-red hover:border-red hover:focus-within:border-red'
          )}
          buttonClass={cn('ml-2 flex h-9 w-10 cursor-pointer items-center')}
          inputClass={cn(
            'h-full w-full rounded-lg border-0 bg-transparent p-0 text-sm placeholder:opacity-60 focus:ring-0'
          )}
          dropdownClass={cn('absolute top-12 left-0 w-full')}
          searchClass={cn('searchClassName')}
          {...props}
        />

        {error && <FieldError error={error} className={cn('mt-2', errorClassName)} />}

        {helperText && (
          <FieldHelperText
            size="md"
            className={cn('mt-2', helperClassName, disabled && 'text-muted-foreground')}
          >
            {helperText}
          </FieldHelperText>
        )}
      </Box>
    );
  }
);

// Add display name for better debugging
PhoneNumberInput.displayName = 'PhoneNumberInput';
