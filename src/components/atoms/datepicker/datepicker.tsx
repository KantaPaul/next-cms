'use client';

import { useAtomValue } from 'jotai';
import { Calendar, ChevronsUpDown } from 'lucide-react';
import type { ForwardedRef } from 'react';
import { forwardRef, useRef, useState } from 'react';
import ReactDatePicker, { type DatePickerProps as ReactDatePickerProps } from 'react-datepicker';
// import { Input, type RizzUIInputProps } from '@/components/atoms/forms';
import { Box } from '@/components/atoms/layout';
// import { borderColor } from '@/components/atoms/table-grid';
import { focusOutline } from '@/components/atoms/utils';
// import { FULLSCREEN_TARGET } from '@/config/constant';
// import { fullscreenStateAtom } from '@/lib/atoms/fullscreen';
import { cn } from '@/lib/utils/cn';
import 'react-datepicker/dist/react-datepicker.css';
// import { dateFormats } from '@/db/team-enums';
// import { useConfig } from '@/lib/store/config.store';
import { CustomHeader } from './custom-date-header';
import type { InputProps } from '../forms';
import { Input } from '../forms';
import { dateFormats } from '@/db/enums/enums';

// Define the ref type with focus method
interface DatePickerRefObject {
  focus: () => void;
}

interface DatepickerInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: string | number | readonly string[] | undefined;
  isCalenderOpen?: boolean;
  showYearPicker?: boolean;
  showTimeSelect?: boolean;
  dateFormat?: string;
  label?: string;
}

export interface DatePickerProps<IsRange extends boolean | undefined>
  extends Omit<ReactDatePickerProps, 'selectsRange' | 'onChange' | 'selected'> {
  onChange(
    date: IsRange extends false | undefined ? Date | null : [Date | null, Date | null],
    event: React.SyntheticEvent<any> | undefined
  ): void;
  selectsRange?: IsRange;
  inputProps?: DatepickerInputProps;
  className?: string;
  selected?: Date | string | null | number | [Date | null, Date | null];
}

// Create a custom type for the ref object
export type DatePickerRef = {
  focus: () => void;
};

function DatePickerInner<IsRange extends boolean | undefined = false>(
  {
    customInput,
    showPopperArrow = false,
    dateFormat,
    selectsRange,
    onCalendarOpen,
    onCalendarClose,
    inputProps,
    className,
    calendarClassName,
    placeholderText = 'Select Date',
    selected,
    isClearable,
    onChange,
    showYearDropdown = true,
    showMonthDropdown = true,
    minDate,
    maxDate,
    showYearPicker,
    ...props
  }: DatePickerProps<IsRange>,
  ref: ForwardedRef<DatePickerRefObject>
) {
  // const { teamSettings } = useConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCalenderOpen, setIsCalenderOpen] = useState(false);
  const handleCalenderOpen = () => setIsCalenderOpen(true);
  const handleCalenderClose = () => setIsCalenderOpen(false);
  const { label, ...rest } = {
    ...inputProps,
  };

  // const isFullscreen = useAtomValue(fullscreenStateAtom);

  // Create an object with a focus method that React Hook Form can use
  const refObject = {
    focus: () => {
      if (containerRef.current) {
        const input = containerRef.current.querySelector('input');

        if (input) {
          input.focus();
        }
      }
    },
  };

  // Pass the ref object to React Hook Form
  if (typeof ref === 'function') {
    ref(refObject);
  } else if (ref) {
    ref.current = refObject;
  }

  return (
    <Box
      ref={containerRef}
      className={cn(
        'relative',
        props.inline && 'absolute top-[69px]',
        className
      )}
    >
      <ReactDatePicker
        {...(!showYearPicker && {
          renderCustomHeader: headerProps => (
            <CustomHeader
              {...headerProps}
              minDate={minDate}
              maxDate={maxDate}
              showYearDropdown={showYearDropdown}
              showMonthDropdown={showMonthDropdown}
            />
          ),
        })}
        minDate={minDate}
        maxDate={maxDate}
        showYearDropdown={showYearDropdown}
        showMonthDropdown={showMonthDropdown}
        onChange={onChange as any}
        customInput={
          <CustomInput
            isCalenderOpen={isCalenderOpen}
            label={label}
            {...rest}
          />
        }
        clearButtonClassName={cn(label ? '!hidden' : '')}
        popperPlacement="bottom-start"
        placeholderText={placeholderText}
        showPopperArrow={showPopperArrow}
        dateFormat={
          dateFormat ?? dateFormats.US_FULL
        }
        {...(selectsRange
          ? {
              startDate: Array.isArray(selected) ? selected[0] : null,
              endDate: Array.isArray(selected) ? selected[1] : null,
              selectsRange: true as const,
            }
          : {
              selected: selected
                ? new Date(selected as string | number | Date)
                : null,
            })}
        onCalendarOpen={onCalendarOpen || handleCalenderOpen}
        onCalendarClose={onCalendarClose || handleCalenderClose}
        calendarClassName={cn(calendarClassName)}
        portalId="react-datepicker-root-portal"
        showYearPicker={showYearPicker}
        {...(props as any)}
      />
    </Box>
  );
}

const DatePicker = forwardRef(DatePickerInner) as <IsRange extends boolean | undefined = false>(
  props: DatePickerProps<IsRange> & { ref?: ForwardedRef<DatePickerRefObject> }
) => ReturnType<typeof DatePickerInner>;

export default DatePicker;

export const CustomInput = forwardRef<HTMLInputElement, DatepickerInputProps>(
  ({ isCalenderOpen, ...rest }, ref) => {
    return (
      <Input
        data-size={rest.size}
        ref={ref}
        // prefix={<Calendar className="size-5 text-steel-300" />}
        // suffixClassName="pl-2"
        // suffix={
        //   <ChevronsUpDown
        //     strokeWidth={1.8}
        //     className={cn(
        //       'size-5 text-steel-300 transition hover:text-steel-500 dark:text-dark-600 dark:hover:text-dark-800'
        //       // isCalenderOpen && 'rotate-180'
        //     )}
        //   />
        // }
        {...rest}
      />
    );
  }
);

CustomInput.displayName = 'CustomInput';

export const headerClassNames = {
  container: cn('flex items-center justify-between gap-2 px-4'),
  select: cn(
    focusOutline,
    'focus:border-steel-100 focus-visible:outline-2 focus-visible:outline-offset-2',
    'border-steel-100 dark:border-dark-400',
    'rounded-lg text-sm focus:ring-transparent dark:bg-dark-300 dark:text-dark-800 dark:focus:ring-offset-transparent'
  ),
  navigation: cn(
    'rounded-md p-1.5 transition duration-300 hover:bg-steel-50 dark:text-dark-800',
    focusOutline,
    'focus-visible:outline-offset-2'
  ),
};
