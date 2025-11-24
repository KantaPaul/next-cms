import { sentenceCase } from '@/lib/utils/change-case';
import { utcToLocal } from '@/lib/utils/format-date';
import { getValueByKey } from '@/lib/utils/retrieve-value';

export interface ExportDataProcessorOptions {
  timezone?: string;
  skipEmptyValues?: boolean;
  customValueTransformers?: Record<string, (value: any) => any>;
  visibilityFilter?: Record<string, boolean>;
}

export interface ProcessedExportData {
  filteredRows: Record<string, any>[];
  headers: string[];
}

/**
 * Generic utility to process data for export with timezone conversion and column filtering
 *
 * @param data - Array of data objects to process
 * @param allowedColumns - Array of column keys to include in export
 * @param options - Configuration options for processing
 * @returns Object containing filtered rows and headers
 *
 * @example
 * ```typescript
 * const { filteredRows, headers } = processDataForExport(
 *   journals,
 *   ['referenceNumber', 'date', 'description'],
 *   { timezone: 'Asia/Dhaka' }
 * );
 * ```
 */
export function processDataForExport<T extends Record<string, any>>(
  data: T[],
  allowedColumns: string[],
  options: ExportDataProcessorOptions = {}
): ProcessedExportData {
  const {
    timezone = 'UTC',
    skipEmptyValues = true,
    customValueTransformers = {},
    visibilityFilter,
  } = options;

  const filteredRows: Record<string, any>[] = [];
  const headers: string[] = [];

  let firstRound = true;

  for (const row of data) {
    const filteredData: Record<string, any> = {};

    for (const column of allowedColumns) {
      // Skip column if visibility filter is provided and column is not visible
      if (visibilityFilter && !visibilityFilter[column]) continue;

      const value = getValueByKey(row, column);

      // Skip empty values if configured to do so
      if (skipEmptyValues && !value) continue;

      let processedValue = value;

      // Apply custom transformer if available for this column
      if (customValueTransformers[column]) {
        processedValue = customValueTransformers[column](value);
      } else if (value instanceof Date) {
        // Default date transformation
        processedValue = utcToLocal({
          utcDate: value,
          timezone,
        });
      }

      filteredData[column] = processedValue;

      // Build headers on first iteration
      if (firstRound) {
        headers.push(sentenceCase(column));
      }
    }

    filteredRows.push(filteredData);
    firstRound = false;
  }

  return { filteredRows, headers };
}

/**
 * Process data for Excel export with additional Excel-specific formatting
 *
 * @param data - Array of data objects to process
 * @param allowedColumns - Array of column keys to include in export
 * @param options - Configuration options for processing
 * @returns Object containing filtered rows and headers optimized for Excel
 *
 * @example
 * ```typescript
 * const { filteredRows, headers } = processDataForExcelExport(
 *   journals,
 *   ['referenceNumber', 'date', 'description'],
 *   {
 *     timezone: 'Asia/Dhaka',
 *     customValueTransformers: {
 *       'amount': (value) => Number(value).toFixed(2)
 *     }
 *   }
 * );
 * ```
 */
export function processDataForExcelExport<T extends Record<string, any>>(
  data: T[],
  allowedColumns: string[],
  options: ExportDataProcessorOptions = {}
): ProcessedExportData {
  return processDataForExport(data, allowedColumns, {
    ...options,
    skipEmptyValues: false, // Excel exports typically include empty cells
  });
}

/**
 * Process data for CSV export with CSV-specific formatting
 *
 * @param data - Array of data objects to process
 * @param allowedColumns - Array of column keys to include in export
 * @param options - Configuration options for processing
 * @returns Object containing filtered rows and headers optimized for CSV
 *
 * @example
 * ```typescript
 * const { filteredRows, headers } = processDataForCsvExport(
 *   journals,
 *   ['referenceNumber', 'date', 'description'],
 *   { timezone: 'Asia/Dhaka' }
 * );
 * ```
 */
export function processDataForCsvExport<T extends Record<string, any>>(
  data: T[],
  allowedColumns: string[],
  options: ExportDataProcessorOptions = {}
): ProcessedExportData {
  return processDataForExport(data, allowedColumns, {
    ...options,
    skipEmptyValues: true, // CSV exports typically skip empty values
  });
}

/**
 * Advanced export processor for complex data structures with visibility filtering
 * This is particularly useful for services that have complex column visibility logic
 *
 * @param data - Array of data objects to process
 * @param columnMapping - Object mapping column keys to their display names and visibility
 * @param options - Configuration options for processing
 * @returns Object containing filtered rows and headers
 *
 * @example
 * ```typescript
 * const { filteredRows, headers } = processDataWithVisibilityFilter(
 *   taxCodes,
 *   {
 *     country: { label: 'Country', visible: visibility.country },
 *     state: { label: 'State', visible: visibility.state },
 *     taxCode: { label: 'Tax Code', visible: visibility.taxCode },
 *     effectiveDate: {
 *       label: 'Effective Date',
 *       visible: visibility.effectiveDate,
 *       transformer: (value) => utcToLocal({ utcDate: value, timezone, format: 'YYYY-MM-DD' })
 *     }
 *   },
 *   { timezone: 'Asia/Dhaka' }
 * );
 * ```
 */
export function processDataWithVisibilityFilter<T extends Record<string, any>>(
  data: T[],
  columnMapping: Record<
    string,
    { label: string; visible: boolean; transformer?: (value: any) => any }
  >,
  options: ExportDataProcessorOptions = {}
): ProcessedExportData {
  const { timezone = 'UTC' } = options;

  const filteredRows: Record<string, any>[] = [];
  const headers: string[] = [];

  // Build headers first
  for (const [key, config] of Object.entries(columnMapping)) {
    if (config.visible) {
      headers.push(config.label);
    }
  }

  // Process data rows
  for (const row of data) {
    const filteredData: Record<string, any> = {};

    for (const [key, config] of Object.entries(columnMapping)) {
      if (!config.visible) continue;

      const value = getValueByKey(row, key);

      if (value === null || value === undefined) continue;

      let processedValue: any = value;

      // Apply custom transformer if available
      if (config.transformer) {
        processedValue = config.transformer(value);
      } else if (value instanceof Date) {
        // Default date transformation
        processedValue = utcToLocal({
          utcDate: value,
          timezone,
        });
      }

      filteredData[config.label] = processedValue;
    }

    filteredRows.push(filteredData);
  }

  return { filteredRows, headers };
}

/**
 * EXAMPLE: How to refactor the tax code service export function using this utility
 *
 * Before (original tax code service):
 * ```typescript
 * export: async ({ params, visibility, teamId }) => {
 *   const { taxCodes } = await TaxCodeService.getTaxCodes(inputs);
 *
 *   const filteredRows = taxCodes.map((row) => {
 *     const { country, state, city, taxCode, description, taxRate, account, effectiveDate, status } = row;
 *
 *     const localEffectiveDate = utcToLocal({
 *       utcDate: effectiveDate,
 *       timezone: params.timeZone ?? 'UTC',
 *       format: dayFormat.specificDateFormat,
 *     });
 *
 *     return {
 *       ...(visibility.country && { country }),
 *       ...(visibility.state && { state }),
 *       ...(visibility.city && { city }),
 *       ...(visibility.taxCode && { taxCode }),
 *       ...(visibility.description && { description }),
 *       ...(visibility.taxRate && { taxRate }),
 *       ...(visibility.accountCode && { accountCode: account?.name }),
 *       ...(visibility.effectiveDate && { effectiveDate: localEffectiveDate }),
 *       ...(visibility.status && { status }),
 *     };
 *   });
 *
 *   const headers = [
 *     ...(visibility.country ? ['Country'] : []),
 *     ...(visibility.state ? ['State'] : []),
 *     ...(visibility.city ? ['City'] : []),
 *     ...(visibility.taxCode ? ['Tax Code'] : []),
 *     ...(visibility.description ? ['Description'] : []),
 *     ...(visibility.taxRate ? ['Tax Rate (%)'] : []),
 *     ...(visibility.accountCode ? ['Account Name'] : []),
 *     ...(visibility.effectiveDate ? ['Effective Date'] : []),
 *     ...(visibility.status ? ['Status'] : []),
 *   ];
 *
 *   const worksheet = utils.json_to_sheet(filteredRows);
 *   const workbook = utils.book_new();
 *   utils.book_append_sheet(workbook, worksheet, 'Data');
 *   utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
 *
 *   return workbook;
 * }
 * ```
 *
 * After (using the utility):
 * ```typescript
 * export: async ({ params, visibility, teamId }) => {
 *   const { taxCodes } = await TaxCodeService.getTaxCodes(inputs);
 *
 *   const { filteredRows, headers } = processDataWithVisibilityFilter(
 *     taxCodes,
 *     {
 *       country: { label: 'Country', visible: visibility.country },
 *       state: { label: 'State', visible: visibility.state },
 *       city: { label: 'City', visible: visibility.city },
 *       taxCode: { label: 'Tax Code', visible: visibility.taxCode },
 *       description: { label: 'Description', visible: visibility.description },
 *       taxRate: { label: 'Tax Rate (%)', visible: visibility.taxRate },
 *       'account.name': { label: 'Account Name', visible: visibility.accountCode },
 *       effectiveDate: {
 *         label: 'Effective Date',
 *         visible: visibility.effectiveDate,
 *         transformer: (value) => utcToLocal({
 *           utcDate: value,
 *           timezone: params.timeZone ?? 'UTC',
 *           format: dayFormat.specificDateFormat
 *         })
 *       },
 *       status: { label: 'Status', visible: visibility.status }
 *     }
 *   );
 *
 *   const worksheet = utils.json_to_sheet(filteredRows);
 *   const workbook = utils.book_new();
 *   utils.book_append_sheet(workbook, worksheet, 'Data');
 *   utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
 *
 *   return workbook;
 * }
 * ```
 *
 * Benefits:
 * - Reduced code duplication
 * - Consistent timezone handling
 * - Type-safe column mapping
 * - Reusable across different services
 * - Easier to maintain and test
 */
