import { formatDate } from '@/lib/utils/format-date';

/**
 * Types for date range values
 */
type DateRange = [Date | null, Date | null];

/**
 * Parses date range into an object format for date picker
 * @param value Array of dates or null values
 * @returns Object containing parsed dates for selected, start and end dates
 */
export function parseDateRange(value?: DateRange | null): {
  selected: Date | null;
  startDate: Date | null;
  endDate: Date | null;
} {
  if (!value) {
    return {
      selected: null,
      startDate: null,
      endDate: null,
    };
  }

  const [start, end] = value;

  return {
    selected: start,
    startDate: start,
    endDate: end,
  };
}

// Usage example:
/*
const value: DateRange = [new Date('2024-01-01'), new Date('2024-01-31')];
const { selected, startDate, endDate } = parseDateRange(value);

// In your component:
<DatePicker
  selected={selected}
  startDate={startDate}
  endDate={endDate}
/>
*/

type FormattedDateRange = [string | null, string | null];

/**
 * Formats a date range array into string format
 */
export function formatDateRange(dates: DateRange, dateFormat = 'yyyy-MM-dd'): FormattedDateRange {
  const [start, end] = dates;

  return [start ? formatDate(start, dateFormat) : null, end ? formatDate(end, dateFormat) : null];
}
