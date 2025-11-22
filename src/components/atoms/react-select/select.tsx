'use client';

// import { useAtomValue } from 'jotai';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import isPlainObject from 'lodash/isPlainObject';
import omit from 'lodash/omit';
import { type ForwardedRef, forwardRef, useCallback } from 'react';
import ReSelect, {
  type ActionMeta,
  type GroupBase,
  type OnChangeValue,
  type Props,
  type SelectInstance,
} from 'react-select';
import { FieldError, Label } from '@/components/atoms/forms';
// import { FieldError } from '@/components/atoms/forms/helper/field-error-text';
// import FieldHelperText from '@/components/atoms/forms/helper/field-helper-text';
import { Box } from '@/components/atoms/layout';
import {
  ClearIndicator,
  CustomOption,
  DropdownIndicator,
  formatGroupLabel,
  LoadingIndicator,
  MultiValue,
  Placeholder,
  SingleValue,
} from '@/components/atoms/react-select/components';
// import { FULLSCREEN_TARGET } from '@/config/constant';
// import { fullscreenStateAtom } from '@/lib/atoms/fullscreen';
// import { useModal } from '@/lib/store/modal.store';
import { getSafeDocumentBody, getSafeElementById } from '@/lib/utils/browser-only';
import { cn } from '@/lib/utils/cn';
import FieldHelperText from '@/components/atoms/forms/helpers/field-helper-text';

export type Option = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isLink?: boolean;
  [key: string]: unknown;
};

export const sizes = {
  sm: ' h-9 px-2',
  md: ' h-10 px-2.5',
  lg: ' h-10 md:px-3 3xl:px-3.5 xl:h-11 5xl:h-12',
};
export type Size = keyof typeof sizes;

export interface SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> extends Props<Option, IsMulti, Group> {
  error?: string;
  label?: string;
  size?: Size;
  prefix?: React.ReactNode;
  helperText?: React.ReactNode;
  helperClassName?: string;
  variant?: 'text' | 'outline' | 'shadow';
  isReadOnly?: boolean;
  isRequired?: boolean;
  allowSelectAll?: boolean;
  labelClassName?: string;
  errorClassName?: string;
  singleValueClassName?: string;
  selectedItemCount?: number;
  onClear?: () => void;
}

// Define a constant for the "Select All" option
const SELECT_ALL_OPTION: Option = { label: 'Select All', value: '*' };

export const ReactSelect = forwardRef(
  <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>(
    props: SelectProps<Option, IsMulti, Group>,
    ref: ForwardedRef<SelectInstance<Option, IsMulti, Group>>
  ) => {
    const {
      value,
      error,
      label,
      size = 'lg',
      variant = 'outline',
      isMulti,
      prefix,
      isReadOnly,
      isRequired,
      helperText,
      helperClassName,
      selectedItemCount,
      labelClassName,
      isSearchable = true,
      isClearable,
      isDisabled,
      errorClassName,
      onClear,
      className,
      classNames,
      singleValueClassName,
      allowSelectAll,
      options,
      onChange,
      isLoading,
      ...rest
    } = props;
    // const isFullscreen = useAtomValue(fullscreenStateAtom);
    // const portalTarget = getSafeElementById(FULLSCREEN_TARGET);

    // Add the "Select All" option for multi-select if allowSelectAll is true
    const enhancedOptions = useCallback(() => {
      if (isMulti && allowSelectAll && options) {
        return [SELECT_ALL_OPTION, ...(Array.isArray(options) ? options : [])];
      }

      return options;
    }, [allowSelectAll, isMulti, options]);

    function handleOnChange(
      newValue: OnChangeValue<Option, IsMulti>,
      actionMeta: ActionMeta<Option>
    ) {
      if (!onChange) return;

      // Only handle Select All for multi-select
      if (!(isMulti && allowSelectAll)) {
        onChange(newValue, actionMeta);
        return;
      }

      // Handle Select All option
      if (
        isPlainObject(actionMeta.option) &&
        has(actionMeta.option, 'value') &&
        actionMeta.option.value === '*'
      ) {
        // If Select All is clicked and there are already selections, clear everything
        if (Array.isArray(value) && value.length > 0) {
          onChange([] as OnChangeValue<Option, IsMulti>, actionMeta);
        } else {
          // Otherwise select all options except Select All
          const allOptions = Array.isArray(options) ? options : [];
          onChange(allOptions as OnChangeValue<Option, IsMulti>, actionMeta);
        }

        return;
      }

      // Handle removing Select All
      if (
        isPlainObject(actionMeta.removedValue) &&
        has(actionMeta.removedValue, 'value') &&
        actionMeta.removedValue.value === '*'
      ) {
        // Remove all selections
        onChange([] as OnChangeValue<Option, IsMulti>, actionMeta);
        return;
      }

      // Handle selecting all options individually
      const selectedValues = Array.isArray(newValue) ? newValue : [];
      const allOptionsExceptSelectAll = Array.isArray(options) ? options : [];

      // If all options are selected, add the Select All option
      if (
        allOptionsExceptSelectAll.length > 0 &&
        selectedValues.length === allOptionsExceptSelectAll.length
      ) {
        onChange([...selectedValues, SELECT_ALL_OPTION] as any, actionMeta);
        return;
      }

      // If Select All is in the selection but not all options are selected, remove it
      if (
        selectedValues.some((opt: any) => opt.value === '*') &&
        selectedValues.length <= allOptionsExceptSelectAll.length
      ) {
        const filteredValues = selectedValues.filter((opt: any) => opt.value !== '*');
        onChange(filteredValues as any, actionMeta);
        return;
      }

      // Default: pass through the selection
      onChange(newValue, actionMeta);
    }

    const menuPortalTarget = getSafeDocumentBody();

    return (
      <Box className={cn('proa-rs', className)}>
        {label && (
          <Label className={cn(labelClassName)}>
            {label} {isRequired && <span className="text-red-500 dark:text-red-dark">*</span>}
          </Label>
        )}
        <ReSelect
          ref={ref}
          value={value}
          isMulti={isMulti}
          isLoading={isLoading}
          isDisabled={isDisabled}
          options={enhancedOptions()}
          onChange={handleOnChange}
          className={cn('proa-rs proa__container')}
          classNamePrefix="proa"
          menuPosition="fixed"
          isSearchable={isSearchable}
          menuPortalTarget={menuPortalTarget}
          {...(!isEmpty(value) && {
            isClearable: isClearable === false ? false : isRequired ? false : (isClearable ?? true),
          })}
          {...(isMulti && {
            formatGroupLabel,
            closeMenuOnSelect: false,
            hideSelectedOptions: false,
          })}
          classNames={{
            control: () =>
              cn(
                'custom-control',
                sizes[size],
                `proa__variant-${variant}`,
                error && 'proa__control--is-error',
                isReadOnly && 'pointer-events-none select-none',
                classNames?.control
              ),
            ...classNames,
          }}
          components={{
            // This control component creates a misplaced dropdown menu in the multiselect.
            // Do not uncomment this code.
            // Control: ({ ...forwardProps }) => <Control isReadOnly={isReadOnly} {...forwardProps} />,
            Placeholder: ({ ...forwardProps }) => (
              <Placeholder prefix={prefix} className="flex" {...forwardProps} />
            ),
            SingleValue: ({ className, ...forwardProps }) => (
              <SingleValue
                prefix={prefix}
                className={cn('flex', singleValueClassName)}
                {...forwardProps}
              />
            ),
            MultiValue: ({ ...forwardProps }) => (
              <MultiValue selectedItemCount={selectedItemCount} {...forwardProps} />
            ),
            ClearIndicator: ({ ...forwardProps }) => (
              <ClearIndicator onClear={onClear} {...forwardProps} />
            ),
            DropdownIndicator,
            LoadingIndicator,
            // IndicatorSeparator: () => null,
            Option: CustomOption,
          }}
          {...omit(rest, 'className')}
        />
        {error && <FieldError error={error} className={cn('mt-2', errorClassName)} />}

        {helperText && (
          <FieldHelperText size="md" className={cn('mt-2 text-muted-foreground', helperClassName)}>
            {helperText}
          </FieldHelperText>
        )}
      </Box>
    );
  }
);

ReactSelect.displayName = 'ReactSelect';
