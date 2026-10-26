import { useMemo } from 'react';
import {
  groupSelectedOptions,
  handleMultiSelect,
  handleOnChange,
  type Option,
  ReactSelect,
  type SelectProps,
} from '@/components/atoms/react-select';
import { ARRAY_SEPARATOR } from '@/config/constant';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps } from '../types';

interface MultiSelectFilterProps
  extends BaseFilterProps,
    Omit<
      SelectProps<Option, true>,
      keyof BaseFilterProps | 'onChange' | 'onClear'
    > {}

export function MultiSelectFilter({
  value,
  size,
  label,
  showLabel,
  className,
  placeholder = '',
  options = [],
  isPending,
  handlers,
  config,
}: MultiSelectFilterProps) {
  const paramsArray = useMemo(
    () => value?.split(ARRAY_SEPARATOR) ?? [],
    [value]
  );

  const optionsArray = useMemo(
    () => (Array.isArray(options) ? (options as Option[]) : []),
    [options]
  );

  const [groupOptions, selectedOptions] = useMemo(
    () => groupSelectedOptions(optionsArray, paramsArray),
    [optionsArray, paramsArray]
  );

  return (
    <ReactSelect
      className={cn('min-w-48', className)}
      size={size}
      {...(showLabel && { label })}
      isClearable
      isLoading={isPending}
      isMulti
      onChange={newValue => {
        const processedValue = handleOnChange(newValue) as string[];
        handlers.setValue(processedValue.join(ARRAY_SEPARATOR));
      }}
      onClear={handlers.clear}
      options={groupOptions}
      placeholder={placeholder}
      value={handleMultiSelect(selectedOptions, paramsArray)}
      variant="outline"
      {...config}
    />
  );
}
