import { useMemo } from 'react';
// import { Loader } from 'rizzui';
import { Spinner } from '../../icons/loader/spinner';
import DatePicker, { type DatePickerProps } from '@/components/atoms/datepicker/datepicker';
import { RANGE_SEPARATOR } from '@/config/constant';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps } from '../types';

interface DateRangeFilterProps
  extends BaseFilterProps,
    Omit<DatePickerProps<true>, keyof BaseFilterProps | 'onChange' | 'selected' | 'selectsRange'> {}

export function DateRangeFilter({
  value,
  size,
  label,
  showLabel,
  className,
  placeholderText,
  isPending,
  handlers,
  config,
}: DateRangeFilterProps) {
  const selectedDateRange = useMemo(() => value?.split(RANGE_SEPARATOR), [value]);

  return (
    <DatePicker
      className={cn('min-w-74', className)}
      endDate={selectedDateRange?.[1] ? new Date(selectedDateRange[1]) : null}
      inputProps={{
        // rounded: 'sm',
        // clearable: true,
        // size,
        // ...(showLabel && { label }),
        // ...(isPending && {
        //   suffix: <Loader aria-label="Filtering..." className={cn('!size-4')} variant="spinner" />,
        // }),
        // onClear: handlers.clear,
      }}
      onChange={handlers.setDateRangeValue}
      placeholderText={placeholderText}
      selected={selectedDateRange?.[0] ? new Date(selectedDateRange[0]) : null}
      selectsRange
      startDate={selectedDateRange?.[0] ? new Date(selectedDateRange[0]) : null}
      {...config}
    />
  );
}
