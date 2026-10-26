import type { Table } from 'drizzle-orm';
import {
  and,
  eq,
  exists,
  getTableColumns,
  ilike,
  inArray,
  is,
  isNotNull,
  isNull,
  isSQLWrapper,
  isTable,
  or,
  SQL,
  type SQLWrapper,
  sql,
} from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import isNil from 'lodash/isNil';
import size from 'lodash/size';
import db from '@/db';
// import { segmentAttributes } from '@/db/schema/segment-attributes';
// import { segmentPivot } from '@/db/schema/segment-pivots';
import { isArraySafe, isTruthy } from '@/lib/utils/bool-check';
import {
  betweenDate,
  betweenNumber,
  eqArray,
  eqBoolean,
  eqBuffer,
  eqCustom,
  eqDate,
  eqJson,
  getColumnConfig,
  ilikeArray,
  ilikeBoolean,
  ilikeBuffer,
  ilikeCustom,
  ilikeDate,
  ilikeEnum,
  ilikeJson,
  ilikeNumeric,
  ilikeSql,
} from '@/lib/utils/sql-helpers';
import { isNotEmpty } from '@/lib/utils/string-manipulations';
import { isRangeParams, type RangeParams } from './parse-search-params';

export const andWhere = (filters: (SQL | undefined)[]) => {
  const apply = filters.filter(Boolean);
  if (size(apply) > 0) return and(...apply);
};

/**
 * Generates equality filters for table columns with type-specific handling.
 *
 * Handles different column data types with appropriate equality strategies:
 * - Numbers/BigInts: Direct equality comparison
 * - Strings: Direct equality or date comparison
 * - Booleans: Smart boolean matching with multiple representations
 * - Dates: Formatted date comparison
 * - JSON: JSON structure comparison
 * - Arrays: Array content comparison
 * - Buffers: Hex-encoded comparison
 * - Custom: Text casting comparison
 * - Objects: Range parameters or SQL wrapper handling
 *
 * @param schema - The Drizzle table schema
 * @param searchParams - Object containing column-value pairs for filtering
 * @returns Array of SQL equality conditions
 *
 * @example
 * ```ts
 * // Filter users by status and age
 * const filters = equalFilters(usersTable, {
 *   status: 'active',
 *   age: 25,
 *   isVerified: true
 * });
 * ```
 */
export const equalFilters = <
  S extends PgTable,
  P extends
    | Partial<Record<keyof S['_']['columns'], unknown>>
    | Record<string, unknown>,
>(
  schema: S,
  searchParams: P
): (SQL | undefined)[] => {
  if (!isNotEmpty(searchParams)) return [];

  if (!isTable(schema)) {
    throw new Error('Invalid schema');
  }

  // const table = getTableConfig(schema);
  // Extract columns once with proper typing
  const columns = getTableColumns(schema);

  if (!columns) {
    throw new Error('Invalid schema');
  }

  return Object.entries(searchParams).map(([key, value]) => {
    // Early return if column doesn't exist
    if (!(key in columns)) return;

    const column = columns[key];

    if (!column || isNil(value)) return;

    if (['deletedAt', 'deleted_at'].includes(column.name)) {
      const parsedValue = isTruthy(value);

      if (parsedValue) {
        // TODO return undefined if want to show both
        return isNotNull(column);
      }

      return isNull(column);
    }

    // Handle null/empty values
    // if (isNil(value)) return isNull(column);

    if (!isNotEmpty(value as any)) return;

    // Handle arrays
    if (Array.isArray(value)) {
      return value.length ? inArray(column, value) : undefined;
    }

    // Handle specific types
    switch (typeof value) {
      case 'boolean':
      case 'number':
        return eq(column, value);

      case 'string':
        return column.dataType === 'date'
          ? eqDate(column, value)
          : eq(column, value);

      case 'object':
        if (isRangeParams(value)) return rangeFilter(column, value);

        return is(value, SQL) ? value : undefined;

      default:
        return;
    }
  });
};

export const deletedAtFilter = <T extends PgColumn>(
  column: T,
  includeDeleted = false
) => {
  if (includeDeleted) return;
  return isNull(column);
};

/**
 * Creates range filters for table columns with type-specific handling.
 *
 * Handles different column data types with appropriate range strategies:
 * - Numbers/BigInts: Numeric range comparison
 * - Dates: Date range comparison with UTC handling
 * - Strings: Date string range comparison
 * - Other types: No range support (returns undefined)
 *
 * @param column - The column to create range filter for
 * @param value - Range parameters with start and end values
 * @returns SQL range condition or undefined if not supported
 *
 * @example
 * ```ts
 * // Date range filter
 * const filter = rangeFilter(users.createdAt, { start: '2024-01-01', end: '2024-12-31' });
 * ```
 */
export const rangeFilter = <T extends PgColumn>(
  column: T,
  value: RangeParams
) => {
  const { start, end } = value;

  if (!(start && end)) return;

  switch (column.dataType) {
    case 'number':
    case 'bigint':
      return betweenNumber(column, start, end);

    case 'date':
      return betweenDate(column, start, end);

    case 'string':
      if (column?.columnType === 'PgDateString') {
        return betweenDate(column, start, end);
      }

      return;

    default:
      return;
  }
};

/**
 * Generates an array of SQL search conditions for specified table columns.
 * Handles different data types with appropriate search strategies.
 *
 * @param table - The Drizzle table schema to search
 * @param columns - Array of column names or SQL expressions to search
 * @param search - Optional search term to match against columns
 * @returns Array of SQL conditions for searching columns
 *
 * @example
 * ```ts
 * // Search users table name and email columns
 * const conditions = searchFilters(usersTable, ['name', 'email'], 'john');
 * // Returns SQL conditions for ILIKE matches on name and email
 * ```
 *
 * @template T - Type of the Drizzle table schema
 * @template C - Type of column names in the table schema
 */
/**
 * Generates SQL search conditions for table columns with type-specific matching.
 *
 * Handles different column data types with appropriate search strategies:
 * - Numbers/BigInts: ILIKE on text cast
 * - Strings: ILIKE for text, exact match for enums
 * - Dates: ILIKE on formatted date
 * - Booleans: Smart matching for true/false values
 * - JSON: Text search within JSON structure
 * - Arrays: Text search within array elements
 * - Buffers: Hex-encoded search
 * - Custom: Fallback to text casting
 * - Other: Generic text casting
 *
 * @param table - The Drizzle table schema to search
 * @param columns - Column names or SQL expressions to search
 * @param search - Search term to match against columns
 * @returns Array of SQL conditions for searching columns
 *
 * @example
 * ```ts
 * // Search users table columns
 * const conditions = searchFilters(
 *   usersTable,
 *   ['name', 'email', sql`CONCAT(first_name, ' ', last_name)`],
 *   'john'
 * );
 * // Returns SQL conditions for matching 'john' across specified columns
 * ```
 */
export const searchFilters = <
  T extends Table,
  C extends keyof T['_']['columns'],
>(
  table: T,
  columns: (C | SQLWrapper)[],
  search: string | undefined | null
) => {
  if (!search) return [];

  // if (columns.length === 0) columns = extractColumnNames(table);

  return columns.map(columnOrQuery => {
    if (typeof columnOrQuery === 'object' && isSQLWrapper(columnOrQuery)) {
      return ilikeSql(columnOrQuery, search);
    }

    if (typeof columnOrQuery !== 'string') return;

    const columnConfig = getColumnConfig(table, columnOrQuery);

    switch (columnConfig.dataType) {
      case 'number':
      case 'bigint':
        return ilikeNumeric(columnConfig, search);

      case 'string':
        if (columnConfig.columnType === 'PgDateString') {
          return ilikeDate(columnConfig, search);
        }

        return columnConfig.enumValues
          ? ilikeEnum(columnConfig, search)
          : ilike(columnConfig, `%${search}%`);

      case 'date':
        return ilikeDate(columnConfig, search);

      case 'boolean':
        return ilikeBoolean(columnConfig, search);

      case 'json':
        return ilikeJson(columnConfig, search);

      case 'array':
        return ilikeArray(columnConfig, search);

      case 'buffer':
        return ilikeBuffer(columnConfig, search);

      case 'custom':
        return ilikeCustom(columnConfig, search);

      default:
        return sql`CAST(${columnConfig} as TEXT) ILIKE '%${sql.raw(search)}%'`;
    }
  });
};

/**
 * ✅ CHECKPOINT: WORKING VERSION - Complex Segment Type Grouping Filter
 *
 * Generates SQL filters for segment pivot relationships with proper segment type grouping.
 * This function implements the complex logic: (LOCATION1 OR LOCATION2) AND (PROJECT1 OR PROJECT2) AND (DEPARTMENT1 OR DEPARTMENT2)
 *
 * **Core Logic:**
 * - OR logic within the same segment type (location1 OR location2)
 * - AND logic between different segment types (locations AND projects)
 * - Uses COUNT comparison to ensure ALL segment types have at least one match
 *
 * **Implementation Details:**
 * - Handles pipe-separated URL parameters: segments=id1|id2|id3
 * - Uses COUNT(DISTINCT segment_id) comparison for proper grouping
 * - Count 1: Total distinct segment types in filter
 * - Count 2: Distinct segment types with matches for this record
 * - Logic: Record matches if Count1 = Count2 (all types satisfied)
 *
 * @param column - The database column to filter against (typically an ID column)
 * @param searchParams - Object containing search parameters, specifically looking for 'segments'
 * @param searchParams.segments - Can be pipe-separated string, array of strings, or undefined
 * @returns Array containing single SQL condition for segment grouping
 *
 * @example
 * ```ts
 * // URL: ?segments=location1|location2|project1|project2|dept1
 * const filters = segmentPivotFilter(chartOfAccounts.id, {
 *   segments: 'location1|location2|project1|project2|dept1'
 * });
 * // Results in: Records with (location1 OR location2) AND (project1 OR project2) AND (dept1)
 * ```
 *
 * @example
 * ```ts
 * // Complex case: Multiple segments of same type
 * const filters = segmentPivotFilter(chartOfAccounts.id, {
 *   segments: 'location1|dept1|project1|project3'
 * });
 * // Results in: Records with (location1) AND (dept1) AND (project1 OR project3)
 * ```
 *
 * @version WORKING_CHECKPOINT - Do not modify without creating new checkpoint
 * @tested Location 1 AND Department 1 AND Project 1 ✅
 * @tested Location 1 AND Department 1 AND (Project 1 OR Project 3) ✅
 */
// export const segmentPivotFilter = (column: PgColumn, searchParams: Record<string, unknown>) => {
//   const rawSegments = searchParams?.segments;

//   // Handle both string and array inputs, filtering out invalid values
//   const segments = Array.isArray(rawSegments)
//     ? rawSegments.filter(
//         (item): item is string => typeof item === 'string' && item.trim().length > 0
//       )
//     : typeof rawSegments === 'string' && rawSegments.trim().length > 0
//       ? rawSegments.includes('|')
//         ? rawSegments
//             .split('|')
//             .map((s) => s.trim())
//             .filter((s) => s.length > 0) // Handle pipe-separated values
//         : [rawSegments.trim()]
//       : [];

//   if (!(isArraySafe(segments) && segments.every((item) => typeof item === 'string'))) return [];

//   // Add CUID validation to ensure segments are safe and prevent SQL injection
//   const validSegments = segments.filter((s) => {
//     // CUID format validation (segment IDs should be CUIDs: 24-25 character alphanumeric)
//     return /^[a-z0-9]{24,25}$/.test(s);
//   });

//   if (validSegments.length === 0) return [];

//   // Implement complex segment type grouping logic
//   // This creates (LOCATION1 OR LOCATION2) AND (PROJECT1 OR PROJECT2) AND (DEPARTMENT1 OR DEPARTMENT2)

//   // We need to build this dynamically based on the actual segment groups
//   // Since Drizzle doesn't easily support dynamic query building, we'll use a different approach

//   // Create a condition that ensures ALL segment types represented in the input have matches
//   // This uses a clever COUNT comparison to ensure AND logic between segment types
//   // while maintaining OR logic within each segment type

//   const segmentCondition = sql`
//     (
//       -- Count how many distinct segment types we're filtering for
//       (SELECT COUNT(DISTINCT sa.segment_id)
//        FROM ${segmentAttributes} sa
//        WHERE sa.id = ANY(${sql.raw(`ARRAY[${validSegments.map((s) => `'${s}'`).join(',')}]`)}))
//       =
//       -- Count how many distinct segment types have matches for this record
//       (SELECT COUNT(DISTINCT sa.segment_id)
//        FROM ${segmentAttributes} sa
//        WHERE sa.id = ANY(${sql.raw(`ARRAY[${validSegments.map((s) => `'${s}'`).join(',')}]`)})
//        AND EXISTS (
//          SELECT 1 FROM ${segmentPivot} sp
//          WHERE sp.pivot_id = ${column}
//          AND sp.attribute_id = sa.id
//        ))
//     )
//   `;

//   return [segmentCondition];
// };

/**
 * Legacy segment pivot filter - creates individual EXISTS for each segment (broken logic)
 * This maintains the old behavior for reference but should not be used
 */
// export const segmentPivotFilterLegacy = (
//   column: PgColumn,
//   searchParams: Record<string, unknown>
// ) => {
//   const rawSegments = searchParams?.segments;

//   const segments = Array.isArray(rawSegments)
//     ? rawSegments.filter(
//         (item): item is string => typeof item === 'string' && item.trim().length > 0
//       )
//     : typeof rawSegments === 'string' && rawSegments.trim().length > 0
//       ? [rawSegments.trim()]
//       : [];

//   if (!(isArraySafe(segments) && segments.every((item) => typeof item === 'string'))) return [];

//   // This is the old broken logic that creates AND for all segments
//   return segments.map((attributeId) => {
//     const sq = db
//       .select({ id: sql`1`.mapWith(Number) })
//       .from(segmentPivot)
//       .where(and(eq(segmentPivot.pivotId, column), eq(segmentPivot.attributeId, attributeId)));
//     return exists(sq);
//   });
// };
