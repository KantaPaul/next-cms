import DatePicker, {
  type DatePickerProps,
} from '@/components/atoms/datepicker/datepicker';
import { cn } from '@/lib/utils/cn';
import { Spinner } from '../../icons/loader/spinner';
import type { BaseFilterProps } from '../types';

interface DatePickerFilterProps
  extends BaseFilterProps,
    Omit<
      DatePickerProps<false>,
      keyof BaseFilterProps | 'onChange' | 'selected'
    > {}

export function DatePickerFilter({
  value,
  size,
  label,
  showLabel,
  className,
  placeholder = '',
  isClearable,
  isPending,
  handlers,
  config,
}: DatePickerFilterProps) {
  return (
    <DatePicker
      className={cn(className)}
      inputProps={{
        // rounded: 'sm',
        // clearable: isClearable,
        // size,
        ...(showLabel && { label }),
        // onClear: handlers.clear,
        // ...(isPending && {
        //   suffix: <Spinner aria-label="Filtering..." className={cn('size-4')} />,
        // }),
      }}
      onChange={handlers.setDateValue}
      placeholderText={placeholder}
      selected={value ? new Date(value) : null}
      {...config}
    />
  );
}
