import {
  handleOnChange,
  handleSelected,
  type Option,
  ReactSelect,
  type SelectProps,
} from '@/components/atoms/react-select';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps } from '../types';

interface SelectFilterProps
  extends BaseFilterProps,
    Omit<
      SelectProps<Option>,
      | 'value'
      | 'onChange'
      | 'onClear'
      | 'size'
      | 'label'
      | 'className'
      | 'placeholder'
    > {}

export function SelectFilter({
  value,
  size,
  label,
  showLabel,
  prefix,
  className,
  placeholder = '',
  options = [],
  isDisabled,
  isPending,
  handlers,
  config,
}: SelectFilterProps) {
  const optionsArray = Array.isArray(options) ? (options as Option[]) : [];

  return (
    <ReactSelect
      className={cn('min-w-48', className)}
      size={size}
      {...(showLabel && { label })}
      isClearable
      isDisabled={isDisabled}
      isLoading={isPending}
      onChange={newValue =>
        handlers.setValue(handleOnChange(newValue) as string)
      }
      onClear={handlers.clear}
      options={options}
      placeholder={placeholder}
      prefix={prefix}
      value={handleSelected(optionsArray, value)}
      variant="outline"
      {...config}
    />
  );
}
