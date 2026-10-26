'use client';

import { format, isValid } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { FieldError, Label } from '@/components/atoms/forms';
import FieldHelperText from '@/components/atoms/forms/helpers/field-helper-text';
import { Box } from '@/components/atoms/layout';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { dateFormats } from '@/db/enums/enums';
import { cn } from '@/lib/utils/cn';

export interface DatePickerRef {
  focus: () => void;
}

export interface DatepickerInputProps {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  isRequired?: boolean;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  [key: string]: any;
}

export interface DatePickerProps<IsRange extends boolean | undefined = false> {
  selected?: Date | string | number | null | [Date | null, Date | null];
  startDate?: Date | null;
  endDate?: Date | null;
  selectsRange?: IsRange;
  onChange?(
    date: IsRange extends false | undefined
      ? Date | null
      : [Date | null, Date | null],
    event?: React.SyntheticEvent<any> | undefined
  ): void;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  isClearable?: boolean;
  placeholderText?: string;
  showTimeSelect?: boolean;
  inputProps?: DatepickerInputProps;
  className?: string;
  calendarClassName?: string;
  onCalendarOpen?: () => void;
  onCalendarClose?: () => void;
  disabled?: boolean;
  inline?: boolean;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
  showYearPicker?: boolean;
  [key: string]: any;
}

function safeParseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isValid(d) ? d : null;
  }
  return null;
}

function DatePickerInner<IsRange extends boolean | undefined = false>(
  props: DatePickerProps<IsRange>,
  ref: React.ForwardedRef<DatePickerRef>
) {
  const {
    selected,
    startDate,
    endDate,
    selectsRange,
    onChange,
    minDate,
    maxDate,
    dateFormat = dateFormats.US_FULL,
    isClearable = true,
    placeholderText = 'Select date',
    showTimeSelect = false,
    inputProps,
    className,
    calendarClassName,
    disabled = false,
    inline = false,
    ...rest
  } = props;

  const [open, setOpenState] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const rangeClicks = React.useRef(0);

  const setOpen = (next: boolean) => {
    if (next) rangeClicks.current = 0;
    setOpenState(next);
  };

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      triggerRef.current?.focus();
    },
  }));

  // Parse single date
  const singleDate = React.useMemo(() => {
    if (selectsRange) return null;
    return safeParseDate(selected);
  }, [selectsRange, selected]);

  // Parse range date
  const rangeDate: DateRange | undefined = React.useMemo(() => {
    if (!selectsRange) return undefined;
    let from: Date | null = null;
    let to: Date | null = null;

    if (Array.isArray(selected)) {
      from = safeParseDate(selected[0]);
      to = safeParseDate(selected[1]);
    } else {
      from = safeParseDate(startDate ?? selected);
      to = safeParseDate(endDate);
    }

    return {
      from: from ?? undefined,
      to: to ?? undefined,
    };
  }, [selectsRange, selected, startDate, endDate]);

  const [timeValue, setTimeValue] = React.useState(() => {
    const base = singleDate ?? rangeDate?.from;
    if (base) {
      const hours = String(base.getHours()).padStart(2, '0');
      const minutes = String(base.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '12:00';
  });

  // Display text in trigger
  const displayText = React.useMemo(() => {
    if (selectsRange) {
      if (rangeDate?.from && rangeDate?.to) {
        return `${format(rangeDate.from, dateFormat)} - ${format(rangeDate.to, dateFormat)}`;
      }
      if (rangeDate?.from) {
        return `${format(rangeDate.from, dateFormat)} - ...`;
      }
      return placeholderText;
    }

    if (singleDate) {
      const formattedDate = format(singleDate, dateFormat);
      if (showTimeSelect) {
        return `${formattedDate} ${timeValue}`;
      }
      return formattedDate;
    }

    return placeholderText;
  }, [
    selectsRange,
    rangeDate,
    singleDate,
    dateFormat,
    showTimeSelect,
    timeValue,
    placeholderText,
  ]);

  const hasValue = selectsRange
    ? Boolean(rangeDate?.from || rangeDate?.to)
    : Boolean(singleDate);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectsRange) {
      (onChange as any)?.([null, null]);
    } else {
      (onChange as any)?.(null);
    }
  };

  const handleSingleSelect = (day: Date | undefined) => {
    if (!day) {
      (onChange as any)?.(null);
      return;
    }

    const nextDate = new Date(day);
    if (showTimeSelect && timeValue) {
      const [h, m] = timeValue.split(':').map(Number);
      nextDate.setHours(h || 0, m || 0, 0, 0);
    }

    (onChange as any)?.(nextDate);
    if (!showTimeSelect) {
      setOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    const from = range?.from ?? null;
    const to = range?.to ?? null;
    (onChange as any)?.([from, to]);
    // react-day-picker fills `to` on the first click, so wait for the second click before closing.
    rangeClicks.current += 1;
    if (from && to && rangeClicks.current >= 2 && !showTimeSelect) {
      setOpen(false);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    if (singleDate) {
      const nextDate = new Date(singleDate);
      const [h, m] = newTime.split(':').map(Number);
      nextDate.setHours(h || 0, m || 0, 0, 0);
      (onChange as any)?.(nextDate);
    }
  };

  // Disabled matcher for Calendar
  const disabledMatchers = React.useMemo(() => {
    const matchers: any[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  const {
    label,
    error,
    helperText,
    isRequired,
    labelClassName,
    errorClassName,
  } = inputProps || {};

  return (
    <Box className={cn('grid w-full grid-cols-1 gap-1.5', className)}>
      {label && (
        <Label className={cn('text-sm font-medium', labelClassName)}>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={cn(
              'group flex h-9 md:h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive/20',
              !hasValue && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="size-4 shrink-0 opacity-50" />
              <span className="truncate">{displayText}</span>
            </div>

            <div className="flex items-center gap-1 pl-1">
              {isClearable && hasValue && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </span>
              )}
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-1">
            {selectsRange ? (
              <Calendar
                mode="range"
                selected={rangeDate}
                onSelect={handleRangeSelect}
                disabled={disabledMatchers}
                className={calendarClassName}
                autoFocus
              />
            ) : (
              <Calendar
                mode="single"
                selected={singleDate ?? undefined}
                onSelect={handleSingleSelect}
                disabled={disabledMatchers}
                className={calendarClassName}
                autoFocus
              />
            )}

            {showTimeSelect && (
              <div className="flex items-center justify-between border-t border-border p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Time
                </span>
                <input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <FieldError error={error} className={cn('text-xs', errorClassName)} />
      )}

      {helperText && (
        <FieldHelperText size="md" className="text-muted-foreground">
          {helperText}
        </FieldHelperText>
      )}
    </Box>
  );
}

const DatePicker = React.forwardRef(DatePickerInner) as <
  IsRange extends boolean | undefined = false,
>(
  props: DatePickerProps<IsRange> & { ref?: React.ForwardedRef<DatePickerRef> }
) => React.ReactElement;

export default DatePicker;

export const CustomInput = React.forwardRef<HTMLInputElement, any>(
  (props, ref) => {
    return <input ref={ref} {...props} />;
  }
);
CustomInput.displayName = 'CustomInput';

export const headerClassNames = {};
