'use client';

import { addYears, getMonth, getYear } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactDatePickerCustomHeaderProps } from 'react-datepicker';
import { Box } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';
import { headerClassNames } from './datepicker';

/**
 * Generates an array of years between two dates
 * @param minDate Minimum date (defaults to January 1st, 1900)
 * @param maxDate Maximum date (defaults to current date)
 * @returns Array of years
 */
function getYearsBetweenDates(minDate?: Date, maxDate?: Date): number[] {
  // Set default minimum date to January 1st, 1900
  const defaultMinDate = new Date(1900, 0, 1);

  // Set default maximum date to current date
  const defaultMaxDate = addYears(new Date(), 15);

  // Use provided dates or defaults
  const start = minDate || defaultMinDate;
  const end = maxDate || defaultMaxDate;

  // Ensure start date is not after end date
  if (start > end) {
    throw new Error('Minimum date cannot be after maximum date');
  }

  // Extract years from dates
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  // Generate array of years
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}

/**
 * Get filterable months based on min and max dates
 * @param date Current date
 * @param minDate Minimum allowed date
 * @param maxDate Maximum allowed date
 * @returns Array of filterable months
 */
function getFilteredMonths(
  date: Date,
  minDate?: Date,
  maxDate?: Date
): {
  months: string[];
  minMonth: number;
  maxMonth: number;
} {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const currentYear = getYear(date);
  let minMonth = 0;
  let maxMonth = 11;

  // If min date is in the current year, set the minimum month
  if (minDate && getYear(minDate) === currentYear) {
    minMonth = getMonth(minDate);
  }

  // If max date is in the current year, set the maximum month
  if (maxDate && getYear(maxDate) === currentYear) {
    maxMonth = getMonth(maxDate);
  }

  // Filter months based on min and max
  const filteredMonths = months.filter((_, index) => index >= minMonth && index <= maxMonth);

  return {
    months: filteredMonths,
    minMonth,
    maxMonth,
  };
}

interface HeaderProps extends ReactDatePickerCustomHeaderProps {
  minDate?: Date;
  maxDate?: Date;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
}

export function CustomHeader({
  date,
  minDate,
  maxDate,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  showYearDropdown,
  showMonthDropdown,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  ...rest
}: HeaderProps) {
  const years = getYearsBetweenDates(minDate, maxDate);
  const { months: availableMonths, minMonth, maxMonth } = getFilteredMonths(date, minDate, maxDate);

  // Modify changeMonth to respect min and max month constraints
  const handleMonthChange = (monthIndex: number) => {
    if (monthIndex >= minMonth && monthIndex <= maxMonth) {
      changeMonth(monthIndex);
    }
  };

  return (
    <Box className={headerClassNames.container}>
      <button
        type="button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className={headerClassNames.navigation}
      >
        <ChevronLeft size={16} />
      </button>

      {showMonthDropdown && (
        <select
          className={cn(headerClassNames.select)}
          value={availableMonths[getMonth(date) - minMonth] || availableMonths[0]}
          onChange={({ target: { value } }) => {
            const monthIndex = availableMonths.indexOf(value);
            handleMonthChange(monthIndex + minMonth);
          }}
        >
          {availableMonths.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {showYearDropdown && (
        <select
          className={cn(headerClassNames.select)}
          value={getYear(date)}
          onChange={({ target: { value } }) => changeYear(Number(value))}
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className={headerClassNames.navigation}
      >
        <ChevronRight size={16} />
      </button>
    </Box>
  );
}
