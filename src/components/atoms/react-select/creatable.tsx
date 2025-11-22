'use client';

import isEmpty from 'lodash/isEmpty';
import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { type ControlProps, components, type GroupBase } from 'react-select';
import AsyncCreatableSelect, { type AsyncCreatableProps } from 'react-select/async-creatable';
import { ActionButton } from '@/components/atoms/buttons';
import { FieldError, Label } from '@/components/atoms/forms';
import { Box, Flex } from '@/components/atoms/layout';
import {
  ClearIndicator,
  CustomOption,
  DropdownIndicator,
  formatGroupLabel,
  MultiValue,
  Placeholder,
  SingleValue,
} from '@/components/atoms/react-select/components';
import { focusRing } from '@/components/atoms/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { type Option as SelectOption, type Size, sizes } from './select';
import { Spinner } from '../icons/loader/spinner';
import FieldHelperText from '../forms/helpers/field-helper-text';

interface Option {
  readonly label: string;
  readonly value: string;
  icon?: React.ReactNode;
  isLink?: boolean;
  [key: string]: unknown;
}

export interface CreatableSelectProps<IsMulti extends boolean = false>
  extends AsyncCreatableProps<Option, IsMulti, GroupBase<Option>> {
  error?: string;
  label?: string;
  size?: Size;
  prefix?: React.ReactNode;
  helperText?: React.ReactNode;
  helperClassName?: string;
  variant?: 'text' | 'outline' | 'shadow';
  isRequired?: boolean;
  labelClassName?: string;
  errorClassName?: string;
  singleValueClassName?: string;
  selectedItemCount?: number;
  onClear?: () => void;
}

export function CreatableSelect<IsMulti extends boolean = false>({
  value,
  isMulti,
  prefix,
  isClearable,
  singleValueClassName,
  size = 'lg',
  variant = 'outline',
  error,
  label,
  isRequired,
  helperText,
  helperClassName,
  selectedItemCount,
  labelClassName,
  isSearchable = true,
  isDisabled,
  errorClassName,
  onClear,
  className,
  classNames,
  ...props
}: CreatableSelectProps<IsMulti>) {
  const id = useId();
  const selectId = `creatable-${id}`;
  return (
    <Box id={selectId} className={cn('proa-rs grid grid-cols-1', className)}>
      {label && (
        <Label className={cn(labelClassName)}>
          {label} {isRequired && <span className="text-red-500 dark:text-red-dark">*</span>}
        </Label>
      )}
      <AsyncCreatableSelect<Option, IsMulti, GroupBase<Option>>
        value={value}
        isMulti={isMulti}
        classNamePrefix="proa"
        className="proa-rs proa__container"
        menuPortalTarget={document.body}
        loadingMessage={() => (
          <Flex justify="center" className="gap-2">
            <Spinner className="size-4" />
            Loading...
          </Flex>
        )}
        classNames={{
          control: () =>
            cn(
              'custom-control',
              sizes[size],
              `proa__variant-${variant}`,
              error && '[&]:!border-red !shadow-none !ring-transparent'
            ),
        }}
        {...(!isEmpty(value) && { isClearable })}
        {...(isMulti && {
          formatGroupLabel,
          closeMenuOnSelect: false,
          hideSelectedOptions: false,
        })}
        components={{
          Placeholder: ({ ...forwardProps }) => <Placeholder prefix={prefix} {...forwardProps} />,
          SingleValue: ({ className, ...forwardProps }) => (
            <SingleValue prefix={prefix} className={cn(singleValueClassName)} {...forwardProps} />
          ),
          MultiValue: ({ ...forwardProps }) => <MultiValue hideCount={true} {...forwardProps} />,
          ClearIndicator: ({ ...forwardProps }) => <ClearIndicator {...forwardProps} />,
          DropdownIndicator,
          // IndicatorSeparator: () => null,
          Option: CustomOption,
          Control: ({ ...forwardProps }) => (
            <CustomControl id={selectId} {...forwardProps} selectedItemCount={1} />
          ),
        }}
        {...props}
      />
      {error && <FieldError error={error} className={cn(errorClassName)} />}

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
}

export interface CustomControlProps<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
> extends ControlProps<Option, IsMulti, Group> {
  id: string;
  selectedItemCount?: number;
}

// Custom indicators container component
function CustomControl<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ selectedItemCount, id, ...props }: CustomControlProps<Option, IsMulti, Group>) {
  const [isOpen, setIsOpen] = useState(false);
  const { setValue } = props;
  const options = props.getValue();

  const el = document.getElementById(id);
  const width = el?.getBoundingClientRect().width;

  const newOptions = Array.isArray(options) && options.filter(({ __isNew__ }) => __isNew__);

  const maxToShow = selectedItemCount || 1;
  const overflowOptions = props.getValue().slice(maxToShow);
  const overflowLength = overflowOptions.length;

  const handleRemoveOption = (option: Option, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent the dropdown from closing
    setTimeout(() => {
      setIsOpen(true);
    }, 0);

    // Filter out the option we want to remove
    const newValue = props
      .getValue()
      .filter((val) => (val as SelectOption).value !== (option as SelectOption).value);

    // @ts-expect-error
    setValue(newValue, {
      action: 'remove-value',
      removedValue: option,
    });
  };

  if (Array.isArray(options) && !isEmpty(options) && overflowLength > 0) {
    return (
      <>
        <components.Control {...props} />
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <ActionButton
              type="button"
              // variant="text"
              className={cn(
                '-translate-y-1/2 absolute top-1/2 right-20 grid h-7 transform place-content-center rounded-md px-1.5 text-sm text-steel-700 dark:text-steel-200',
                focusRing,
                'focus-visible:ring-offset-0'
              )}
            >
              +{overflowLength}
            </ActionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="-right-20 relative top-3 z-10003 min-w-36 rounded-md border border-steel-100 bg-white p-1.5 shadow-lg dark:border dark:border-dark-400 dark:bg-dark-280 dark:shadow-[0_3px_18px_rgba(0,0,0,0.1)]"
            style={{ width }}
          >
            {overflowOptions.map((option) => (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
                className={cn('flex items-center justify-between')}
                key={(option as SelectOption).value}
              >
                {(option as SelectOption).label}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-steel-700 dark:hover:text-dark-800"
                  onClick={(e) => handleRemoveOption(option, e)}
                >
                  <X size={14} />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  return <components.Control {...props} />;
}
