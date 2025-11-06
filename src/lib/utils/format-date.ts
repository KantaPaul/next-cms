import { RANGE_SEPARATOR } from '@/config/constant';
import { isRangeParams } from '@/db/helpers/parse-search-params';
import { type IntervalDatesParams } from '@/lib/types';
import type { Dayjs } from 'dayjs';
import dayjs, { type ConfigType, type QUnitType } from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(quarterOfYear);
dayjs.extend(timezone);
dayjs.extend(minMax);

type StringOrNull<T = ConfigType> = T extends null | undefined ? null : string;
export type NonNullableConfigType = NonNullable<ConfigType>;
export type IDateUnionType = string | number | Date | null | undefined;

/**
 * Gets the server's timezone
 * @returns The server's timezone string (e.g., 'Asia/Dhaka', 'UTC', etc.)
 */
export function getServerTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const dayFormat = {
  yearMonthDay: 'YYYY-MM-DD', // Example: 2024-10-17
  dayMonthYear: 'DD-MM-YYYY', // Example: 17-10-2024
  monthDayYear: 'MM-DD-YYYY', // Example: 10-17-2024
  yearSlashMonthSlashDay: 'YYYY/MM/DD', // Example: 2024/10/17
  daySlashMonthSlashYear: 'DD/MM/YYYY', // Example: 17/10/2024
  monthSlashDaySlashYear: 'MM/DD/YYYY', // Example: 10/17/2024
  dayShortMonthYear: 'MMM d, YYYY', // Example: Nov 14, 2024
  dayFullMonthYear: 'DD Month YYYY', // Example: 17 October 2024
  fullMonthDayYear: 'Month DD, YYYY', // Example: October 17, 2024
  abbreviatedDayDayMonthYear: 'ddd, DD MMM YYYY', // Example: Thu, 17 Oct 2024
  fullDayDayFullMonthYear: 'dddd, DD MMMM YYYY', // Example: Thursday, 17 October 2024
  compactYearMonthDay: 'YYYYMMDD', // Example: 20241017
  time24Hour: 'HH:mm:ss', // Example: 14:30:45
  time12Hour: 'hh:mm:ss A', // Example: 02:30:45 PM
  shortTime24Hour: 'HH:mm', // Example: 14:30
  shortTime12Hour: 'hh:mm A', // Example: 02:30 PM
  fullDateTime24Hour: 'DD/MM/YYYY HH:mm:ss', // Example: 17/10/2024 14:30:45
  fullDateTime12Hour: 'ddd, DD MMM YYYY hh:mm a', // Example: Thu, 17 Oct 2024 02:30 PM
  specificDateFormat: 'MMM DD, YYYY HH:mm', // Example: 17 2024 02:30 PM
  iso8601: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', // Example: 2024-12-31T18:00:00.000Z
  fullDayMonthDayYearTime: 'dddd, MMMM D, YYYY [at] hh:mm A', // Example: Thursday, May 29, 2025 at 11:44 AM
  default: 'MMM DD, YYYY',
  dateTimeInput: 'MMM DD, YYYY hh:mm A',
} as const;

export function formatDate<T extends ConfigType>(
  date: T,
  dateFormat: string = dayFormat?.default
): StringOrNull<T> {
  if (!date) return null as StringOrNull<T>;
  return dayjs(date).format(dateFormat) as StringOrNull<T>;
}

export function endOfDayWithMilliseconds(date: ConfigType): string {
  return dayjs(date).endOf('day').toISOString();
}

export function startOfDayWithMilliseconds(date: ConfigType): string {
  return dayjs(date).startOf('day').toISOString();
}

export function getUtcDayStartEnd(date: Date | string) {
  const day = dayjs.utc(date);

  const start = day.startOf('day').toDate();
  const end = day.endOf('day').toDate();

  return { start, end };
}

export function formatMillisecondsToDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds <= 0) return '0m';

  // Convert to days, hours, minutes
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  // Build the string based on what values exist
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function formatUTC<T extends ConfigType>(date: T): StringOrNull<T> {
  return date
    ? (dayjs(date).utc(true).format('YYYY-MM-DD') as StringOrNull<T>)
    : (null as StringOrNull<T>);
}

export const toFilterDateUTC = (date: Date | string | number | null): Date => {
  return dayjs(date).utc(true).toDate();
};

/**
 * Converts a date to an ISO date string.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string} The ISO 8061 string.
 * ```ts
 * toISODate(new Date()); // -> date in ISO8601, without fraction seconds e.g. '2020-04-02T08:02:17-05:00'
 * ```
 */
export const toISODate = (date: ConfigType): string => {
  if (!date) return '';
  return dayjs(date).utc(true).format();
};

/**
 * Converts a date to an ISO date time string.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string} The ISO 8601 date time string.
 * ```ts
 * toISODateTime(new Date()); // 2021-09-01 12:00:00+06:00
 * toISODateTime('2021-09-01'); // 2021-09-01 00:00:00+06:00
 * toISODateTime(1630512000000); // 2021-09-01 00:00:00+06:00
 * ```
 */
export const toISODateTime = (date: ConfigType): string => {
  if (!date) return '';
  return dayjs(date).utc(true).format('YYYY-MM-DD HH:mm:ssZ');
};

export const formatTime = (date: ConfigType): string => {
  if (!date) return '';
  return dayjs(date).format(' h:mm a');
  // return dayjs(date).format('DD MMMM YYYY h:mm a');
};

export const isValidDate = (date: unknown): boolean => {
  // Early return for invalid inputs
  if (!date || Array.isArray(date)) return false;

  // Handle date ranges (both object and string formats)
  const isDateRange =
    (typeof date === 'object' && isRangeParams(date)) ||
    (typeof date === 'string' && date.includes(RANGE_SEPARATOR));

  if (isDateRange) {
    const [start, end] =
      typeof date === 'string' ? date.split(RANGE_SEPARATOR) : [date.start, date.end];
    return dayjs(start).isValid() && dayjs(end).isValid();
  }

  // Handle single date values
  return dayjs(date as ConfigType).isValid();
};

/**
 * Generates an array of dates based on the initial date, interval, and frequency.
 * @example
 * ```
 * getPeriodicDate('2023-01-01', 3, 'month');
 * ```
 * Initial date: January 1, 2023
 * Frequency: 'month'
 * Interval: 3
 * Result: [February 1, 2023, March 1, 2023, April 1, 2023]
 */
export function getPeriodicDate(
  initialDate: ConfigType,
  interval: number,
  frequency: QUnitType | 'week',
  endDate?: ConfigType,
  utc: boolean = true
): Date[] {
  const startDate = dayjs(initialDate).utc(utc);
  let multiplier = 1;

  switch (frequency) {
    case 'quarter':
      frequency = 'month';
      multiplier = 3;
      break;
    case 'week':
      frequency = 'day';
      multiplier = 7;
      break;
    default:
      multiplier = 1;
  }

  if (!endDate) {
    return Array.from({ length: interval }, (_, i) => {
      return startDate.add(i * multiplier, frequency).toDate();
    });
  }

  const end = dayjs(endDate).utc(utc);
  const result: Date[] = [];

  for (let i = 0; i < interval; i++) {
    const nextDate = startDate.add(i * multiplier, frequency);

    if (nextDate.isAfter(end)) {
      break;
    }

    result.push(nextDate.toDate());
  }

  return result;
}

/**
 * Adjusts a given date by a specified interval and unit, either forward or backward.
 *
 * @param {ConfigType} date - The initial date to adjust. Can be a Date object, string, or number.
 * @param {number} interval - The amount to adjust the date by.
 * @param {QUnitType} unit - The unit of time to adjust by (e.g., 'day', 'month', 'year').
 * @param {'forward' | 'backward'} operationType - The direction to adjust the date: 'forward' to add or 'backward' to subtract.
 * @returns {Date} - The adjusted date as a JavaScript Date object.
 *
 * @example
 * // Move the date 3 days forward
 * getNextOrPreviousDate('2023-01-01', 3, 'day', 'forward'); // Returns: Date object for '2023-01-04'
 *
 * @example
 * // Move the date 2 months backward
 * getNextOrPreviousDate(new Date(), 2, 'month', 'backward'); // Returns: Date object for two months prior to today
 */

export function getNextOrPreviousDate(
  date: ConfigType,
  interval: number,
  unit: QUnitType | 'week',
  operationType: 'forward' | 'backward' = 'forward'
) {
  if (unit === 'week') {
    unit = 'day';
    interval = interval * 7;
  }

  if (operationType === 'forward') {
    return dayjs(date).add(interval, unit).toDate();
  } else {
    return dayjs(date).subtract(interval, unit).toDate();
  }
}

export function getIntervalDates(params: IntervalDatesParams): {
  startDate: string;
  endDate: string;
} {
  const { date, interval, unit, operationType } = params;

  let startDate = dayjs(date).utc();
  let endDate = dayjs(date).utc();

  if (operationType === 'forward') {
    endDate = startDate.add(interval, unit);
  } else {
    startDate = startDate.subtract(interval, unit);
  }

  return {
    startDate: toISODateTime(startDate.toDate()),
    endDate: toISODateTime(endDate.toDate()),
  };
}

/**
 * this function is used to get previous fiscal year date based on current date
 * @param startingDate is a date it can contains date string or date object or null
 * @param range how many years you want to go back
 * @returns date
 */
export function getPreviousFiscalYear(startingDate: ConfigType, range: number = 1) {
  return dayjs(startingDate).subtract(range, 'year').toDate();
}

/**
 *
 * @param {Date | string | number | null} date date to compare
 * @returns {boolean}
 */
export function isToday(date: ConfigType, utc: boolean = true): boolean {
  return date ? dayjs(date).utc(utc).isSame(dayjs().utc(utc), 'day') : false;
}

export function newDate(date?: ConfigType, utc: boolean = true): Date {
  return dayjs(date).utc(utc).toDate();
}

export function newTime(timeString?: string): Date {
  // For time-only values, don't use UTC conversion
  return dayjs(timeString).toDate();
}

export const Day = dayjs;

export const utcDay = (date?: ConfigType): Dayjs => {
  return dayjs(date).utc(true);
};

/**
 * Converts a date to a relative time string showing how long ago it was.
 * Returns a human-readable string with appropriate unit (s, m, h, d, w, m, y).
 *
 * @param {ConfigType} date - The date to compare against now
 * @returns {string} A human-readable string showing time ago (e.g. "5s", "2m", "3h", "1d", "2w", "3m", "1y")
 *
 * @example
 * timeAgo(new Date()) // "0s"
 * timeAgo(dayjs().subtract(1, 'hour').toDate()) // "60m"
 * timeAgo(dayjs().subtract(1, 'day').toDate()) // "24h"
 */
export function timeAgo(date: ConfigType): string {
  return dayjs(date).fromNow();
}

/**
 * Converts a date to a relative time string showing how long until now.
 * Uses dayjs's toNow() method to generate human-readable time differences.
 *
 * @param {ConfigType} date - The date to compare against now
 * @returns {string} A human-readable string showing time until now (e.g. "in 2 hours", "in 3 days")
 *
 * @example
 * timeToNow(new Date()) // "in a few seconds"
 * timeToNow(dayjs().subtract(1, 'day').toDate()) // "in a day"
 */
export function timeToNow(date: ConfigType): string {
  return dayjs(date).toNow();
}

export function timeTo(date: ConfigType, compared: ConfigType): string {
  return dayjs(date).to(compared);
}

export function timeFrom(
  date: ConfigType,
  compared: ConfigType,
  withoutSuffix: boolean = true
): string {
  return dayjs(date).from(compared, withoutSuffix);
}

export const getBudgetPeriodDate = <T extends 'string' | 'dayjs' | 'date' = 'string'>({
  endPeriod,
  startPeriod,
  fyStart,
  fyEnd,
  formate,
}: {
  startPeriod: number;
  endPeriod: number;
  fyStart: string;
  fyEnd: string;
  formate?: T;
}) => {
  const ConstructDate = (date: Dayjs): string | Date | Dayjs => {
    return formate === 'dayjs'
      ? date
      : formate === 'date'
        ? date.toDate()
        : date.format('YYYY-MM-DD');
  };

  const startFY = ConstructDate(dayjs(fyStart).year(startPeriod)) as T extends 'string'
    ? string
    : T extends 'date'
      ? Date
      : Dayjs;

  const endFY = ConstructDate(dayjs(fyEnd).year(endPeriod)) as T extends 'string'
    ? string
    : T extends 'date'
      ? Date
      : Dayjs;

  return { startFY, endFY };
};

/**
 * Regular expression for validating dates in YYYY-MM-DD format.
 * Ensures year is 4 digits, month is 01-12, and day is 01-31.
 * Note: Does not validate actual calendar dates (e.g., Feb 30 or Sept 31 would pass).
 */

export const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Converts UTC date to local timezone
 * @example
 * // Convert UTC date to server timezone Date object
 * const localDate = utcToLocal('2024-03-15T10:00:00Z');
 *
 * // Convert UTC date to specific timezone formatted string
 * const localDateStr = utcToLocal('2024-03-15T10:00:00Z', 'YYYY-MM-DD HH:mm:ss', 'Asia/Dhaka');
 *
 * // Convert UTC date to user's timezone
 * const userLocalDate = utcToLocal('2024-03-15T10:00:00Z', undefined, userTimezone);
 */
export function utcToLocal({
  utcDate,
  format = dayFormat.default,
  timezone,
}: {
  utcDate: ConfigType;
  format?: string | null | undefined;
  timezone: string;
}): Date | string | null {
  if (!utcDate) return null;

  const localDate = dayjs(utcDate).tz(timezone);

  return format ? localDate.format(format) : localDate.toDate();
}

/** Converts local timezone date to UTC
 * @example
 * // Convert local date to UTC Date object
 * const utcDate = localToUtc({
 *   localDate: '2024-03-15 10:00:00',
 *   timezone: 'Asia/Dhaka'
 * });
 *
 * // Convert local date to UTC formatted string
 * const utcDateStr = localToUtc({
 *   localDate: '2024-03-15 10:00:00',
 *   format: 'YYYY-MM-DD HH:mm:ss',
 *   timezone: 'Asia/Dhaka'
 * });
 */
export function localToUtc({
  localDate,
  format,
  timezone,
}: {
  localDate: ConfigType;
  format?: string;
  timezone: string;
}): Date | string | null {
  const utcDate = dayjs.tz(localDate, timezone).utc();

  return format ? utcDate.format(format) : utcDate.toDate();
}

export function getDateRange(dateRange: string) {
  if (!isValidDate(dateRange) && !isRangeParams(dateRange)) {
    return {
      startDate: formatUTC(new Date(new Date().setFullYear(new Date().getFullYear() - 1))),
      endDate: formatUTC(new Date()),
    };
  }

  const [start, end] = dateRange.split(RANGE_SEPARATOR);
  return {
    startDate: formatUTC(new Date(start)),
    endDate: formatUTC(new Date(end)),
  };
}

/**
 * Checks if two dates are the same day (date only, not time) in UTC.
 * Both dates are converted to UTC before comparison.
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if both dates represent the same day in UTC
 *
 * @example
 * isSameDate('2024-01-15 14:30:00', '2024-01-15 09:00:00') // true (same day in UTC)
 * isSameDate('2024-01-15 23:30:00', '2024-01-16 00:00:00') // false (different days in UTC)
 */
export function isSameDate(date1: ConfigType, date2: ConfigType): boolean {
  if (!date1 || !date2) return false;

  const utcDate1 = dayjs(date1).utc(true).startOf('day');
  const utcDate2 = dayjs(date2).utc(true).startOf('day');

  return utcDate1.isSame(utcDate2, 'day');
}

/**
 * Checks if the first date is before the second date (date only, not time) in UTC.
 * Both dates are converted to UTC before comparison.
 *
 * @param date1 - First date to check
 * @param date2 - Second date to compare against
 * @returns true if date1 is before date2 in UTC
 *
 * @example
 * isDateBefore('2024-01-15 14:30:00', '2024-01-16 09:00:00') // true
 * isDateBefore('2024-01-15 23:30:00', '2024-01-15 00:00:00') // false (same day)
 */
export function isDateBefore(date1: ConfigType, date2: ConfigType): boolean {
  if (!date1 || !date2) return false;

  const utcDate1 = dayjs(date1).utc(true).startOf('day');
  const utcDate2 = dayjs(date2).utc(true).startOf('day');

  return utcDate1.isBefore(utcDate2, 'day');
}

/**
 * Checks if the first date is after the second date (date only, not time) in UTC.
 * Both dates are converted to UTC before comparison.
 *
 * @param date1 - First date to check
 * @param date2 - Second date to compare against
 * @returns true if date1 is after date2 in UTC
 *
 * @example
 * isDateAfter('2024-01-16 14:30:00', '2024-01-15 09:00:00') // true
 * isDateAfter('2024-01-15 23:30:00', '2024-01-15 00:00:00') // false (same day)
 */
export function isDateAfter(date1: ConfigType, date2: ConfigType): boolean {
  if (!date1 || !date2) return false;

  const utcDate1 = dayjs(date1).utc(true).startOf('day');
  const utcDate2 = dayjs(date2).utc(true).startOf('day');

  return utcDate1.isAfter(utcDate2, 'day');
}
