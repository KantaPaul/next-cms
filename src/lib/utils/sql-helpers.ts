import { endOfDay, startOfDay } from 'date-fns';
import {
  type AnyColumn,
  between,
  type Column,
  type GetColumnData,
  getTableColumns,
  getTableName,
  type InferSelectModel,
  isNull,
  isSQLWrapper,
  or,
  type SQL,
  type SQLWrapper,
  sql,
  type Table,
} from 'drizzle-orm';
import { toSnakeCase } from 'drizzle-orm/casing';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { isNumber } from '@/lib/utils/bool-check';
import type { DateInput } from '@/lib/utils/format-date';
import { Day, toPostgresUTCTimestamptz } from '@/lib/utils/format-date';

const eqBufferRegex = /^[0-9a-fA-F]+$/;

export const buildCaseWhen = (cb: (arr: SQL[], ids: string[]) => void) => {
  const buildSql: SQL[] = [];
  const ids: string[] = [];
  buildSql.push(sql`(case`);
  cb(buildSql, ids);
  buildSql.push(sql`end)`);
  const finalSql: SQL = sql.join(buildSql, sql.raw(' '));
  return [finalSql, ids] as const;
};

/**
 * Retrieves the configuration for a specific column from a given table schema.
 *
 * @template T - The type of the table schema.
 * @template C - The type of the column key in the table schema.
 * @param table - The table schema from which to retrieve the column configuration.
 * @param column - The specific column key for which to retrieve the configuration.
 * @returns The configuration of the specified column as a PgColumn.
 */
export const getColumnConfig = <T extends Table, C extends keyof T['_']['columns']>(
  table: T,
  column: C
): PgColumn => {
  const tableColumns = getTableColumns(table);
  return tableColumns[column];
};

const columnCache = new WeakMap<Table, Array<string>>();

/**
 * Extracts column names from a Drizzle table schema and caches the result.
 * Uses a WeakMap to cache column names for better performance on repeated calls.
 *
 * @example
 * ```ts
 * // Get column names from users table
 * const columnNames = extractColumnNames(usersTable);
 * // Returns: ['id', 'name', 'email', etc...]
 * ```
 */
export const extractColumnNames = <T extends Table>(tableSchema: T) => {
  let cached = columnCache.get(tableSchema);

  if (!cached) {
    const columns = getTableColumns(tableSchema);
    cached = Object.keys(columns);
    columnCache.set(tableSchema, cached);
  }

  return cached as Array<keyof InferSelectModel<T>>;
};

/**
 * Returns table columns excluding specified columns
 * @param tableSchema - Drizzle table schema
 * @param columns - Column names to exclude
 * @returns Filtered table columns
 */
export const getExcludedTableColumns = <T extends Table, C extends keyof T['_']['columns']>(
  tableSchema: T,
  columns: C[]
): T['_']['columns'] => {
  const allColumns = getTableColumns(tableSchema);
  return Object.keys(allColumns)
    .filter((column) => !columns.includes(column as C))
    .reduce(
      (acc, column) => {
        acc[column as C] = allColumns[column as C];
        return acc;
      },
      {} as Record<C, AnyColumn>
    );
};

export const isNotDeleted = <T extends { deletedAt: any }>(table: T) => {
  return or(isNull(table.deletedAt));
};

/**
 * Matches a numeric column against a search term using a `ILIKE` operation.
 * The column is cast to TEXT, and special characters are removed from the search term.
 *
 * @param pgColumn - The numeric column to search
 * @param searchTerm - The search term (special characters are removed)
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeNumeric = (pgColumn: Column, searchTerm: string) => {
  if (!isNumber(searchTerm)) return;

  return sql`CAST(${pgColumn} as TEXT) ILIKE '%${sql.raw(Number.parseFloat(searchTerm).toString())}%'`;
};

export const ilikeSql = <T extends SQLWrapper, S extends string | null | undefined>(
  query: T,
  searchTerm: S
) => {
  if (!(isSQLWrapper(query) && searchTerm)) return;

  return sql`CAST((${query}) as TEXT) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Matches a date | timestamp column against a search term using a `ILIKE` operation.
 * The column is cast to TEXT, and get date from string and format as `YYYY-MM-DD`.
 *
 * @param pgColumn - The date | timestamp column to search
 * @param searchTerm - The search term (format as `YYYY-MM-DD`)
 * @returns SQL condition or undefined if the search term is invalid or invalid Date
 */
export const ilikeDate = (pgColumn: PgColumn, searchTerm: string) => {
  const date = Day.parseDate(searchTerm);

  if (!(searchTerm && date && Day.isValid(date))) return;

  const formattedDate = toPostgresUTCTimestamptz(date);
  return sql`CAST(${pgColumn} as timestamptz) ILIKE '%${sql.raw(formattedDate)}%'`;
};

/**
 * Matches an enum column against a search term using a `ILIKE` operation.
 * Optimized for performance by using simple ILIKE operations that can utilize database indexes.
 * Handles different enum value formats by trying both the original search term and snake_case version.
 *
 * @param pgColumn - The enum column to search
 * @param searchTerm - The search term to match against the enum values
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeEnum = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;
  searchTerm = toSnakeCase(searchTerm.toLowerCase());

  return sql`LOWER(
      REPLACE(REGEXP_REPLACE(CAST(${pgColumn} AS TEXT), '([a-z])([A-Z])', E'\\1_\\2', 'g'), '-', '_')
    ) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Optimized search function that chooses the best search strategy based on search term length.
 * For short search terms, uses exact or prefix matching for better performance.
 * For longer search terms, falls back to ILIKE for flexibility.
 *
 * @param pgColumn - The column to search
 * @param searchTerm - The search term to match
 * @param options - Search options
 * @returns SQL condition or undefined if the search term is invalid
 */
export const optimizedSearch = (
  pgColumn: PgColumn,
  searchTerm: string,
  options: {
    useExactMatch?: boolean;
    usePrefixMatch?: boolean;
    caseSensitive?: boolean;
  } = {}
) => {
  if (!searchTerm) return;

  const { useExactMatch = false, usePrefixMatch = false, caseSensitive = false } = options;
  const trimmedSearch = searchTerm.trim();

  // For very short search terms (1-2 characters), exact match is often more useful
  if (useExactMatch || trimmedSearch.length <= 2) {
    if (caseSensitive) {
      return sql`${pgColumn} = ${trimmedSearch}`;
    }
    return sql`LOWER(${pgColumn}) = ${trimmedSearch.toLowerCase()}`;
  }

  // For short search terms (3-10 characters), prefix matching can be more performant
  if (usePrefixMatch || (trimmedSearch.length <= 10 && !trimmedSearch.includes(' '))) {
    if (caseSensitive) {
      return sql`${pgColumn} LIKE '${trimmedSearch}%'`;
    }
    return sql`LOWER(${pgColumn}) LIKE '${trimmedSearch.toLowerCase()}%'`;
  }

  // For longer search terms or when flexibility is needed, use ILIKE
  if (caseSensitive) {
    return sql`${pgColumn} LIKE '%${trimmedSearch}%'`;
  }
  return sql`LOWER(${pgColumn}) ILIKE '%${trimmedSearch.toLowerCase()}%'`;
};

/**
 * Matches a boolean column against a search term using a `ILIKE` operation.
 * Converts boolean values to text representation for searching.
 *
 * @param pgColumn - The boolean column to search
 * @param searchTerm - The search term to match against boolean values
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeBoolean = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;

  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Handle common boolean representations
  if (['true', '1', 'yes', 'on'].includes(normalizedSearch)) {
    return sql`CAST(${pgColumn} AS TEXT) ILIKE '%true%'`;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedSearch)) {
    return sql`CAST(${pgColumn} AS TEXT) ILIKE '%false%'`;
  }

  // General search on boolean text representation
  return sql`CAST(${pgColumn} AS TEXT) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Matches a JSON column against a search term using a `ILIKE` operation.
 * Searches within the JSON structure as text.
 *
 * @param pgColumn - The JSON column to search
 * @param searchTerm - The search term to match within JSON content
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeJson = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;

  return sql`CAST(${pgColumn} AS TEXT) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Matches an array column against a search term using a `ILIKE` operation.
 * Searches within the array elements as text.
 *
 * @param pgColumn - The array column to search
 * @param searchTerm - The search term to match within array content
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeArray = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;

  return sql`CAST(${pgColumn} AS TEXT) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Matches a buffer column against a search term using a `ILIKE` operation.
 * Converts buffer to hex string for searching.
 *
 * @param pgColumn - The buffer column to search
 * @param searchTerm - The search term to match against buffer content
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeBuffer = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;

  return sql`ENCODE(${pgColumn}, 'hex') ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Matches a custom column against a search term using a `ILIKE` operation.
 * Falls back to text casting for custom column types.
 *
 * @param pgColumn - The custom column to search
 * @param searchTerm - The search term to match against custom column content
 * @returns SQL condition or undefined if the search term is invalid
 */
export const ilikeCustom = (pgColumn: PgColumn, searchTerm: string) => {
  if (!searchTerm) return;

  return sql`CAST(${pgColumn} AS TEXT) ILIKE '%${sql.raw(searchTerm)}%'`;
};

/**
 * Compares a boolean column with a value using an equality operation.
 * Handles various boolean representations and converts them appropriately.
 *
 * @param pgColumn - The boolean column to compare
 * @param value - The value to compare against (can be boolean, string, or number)
 * @returns SQL condition or undefined if the value is invalid
 */
export const eqBoolean = (pgColumn: PgColumn, value: any) => {
  if (value === null || value === undefined) return;

  let boolValue: boolean;

  if (typeof value === 'boolean') {
    boolValue = value;
  } else if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      boolValue = true;
    } else if (['false', '0', 'no', 'off'].includes(normalized)) {
      boolValue = false;
    } else {
      return; // Invalid boolean string
    }
  } else if (typeof value === 'number') {
    boolValue = value !== 0;
  } else {
    return; // Invalid type
  }

  return sql`${pgColumn} = ${boolValue}`;
};

/**
 * Compares a JSON column with a value using an equality operation.
 * Handles JSON string comparison and object comparison.
 *
 * @param pgColumn - The JSON column to compare
 * @param value - The value to compare against (can be object or JSON string)
 * @returns SQL condition or undefined if the value is invalid
 */
export const eqJson = (pgColumn: PgColumn, value: any) => {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    try {
      // Validate JSON string
      JSON.parse(value);
      return sql`${pgColumn}::text = ${value}`;
    } catch {
      return; // Invalid JSON string
    }
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    return sql`${pgColumn} = ${JSON.stringify(value)}::jsonb`;
  }

  return;
};

/**
 * Compares an array column with a value using an equality operation.
 * Handles array comparison for various data types.
 *
 * @param pgColumn - The array column to compare
 * @param value - The value to compare against (can be array or string)
 * @returns SQL condition or undefined if the value is invalid
 */
export const eqArray = (pgColumn: PgColumn, value: any) => {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    return sql`${pgColumn} = ${value}::anyarray`;
  }
  if (typeof value === 'string') {
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return sql`${pgColumn} = ${value}::anyarray`;
      }
    } catch {
      // Not a JSON array, treat as single element array
      return sql`${pgColumn} = ARRAY[${value}]`;
    }
  }

  return;
};

/**
 * Compares a buffer column with a value using an equality operation.
 * Handles buffer comparison with hex encoding.
 *
 * @param pgColumn - The buffer column to compare
 * @param value - The value to compare against (can be Buffer, string, or Uint8Array)
 * @returns SQL condition or undefined if the value is invalid
 */
export const eqBuffer = (pgColumn: PgColumn, value: any) => {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    // Assume hex string
    if (eqBufferRegex.test(value)) {
      return sql`ENCODE(${pgColumn}, 'hex') = ${value}`;
    }

    return; // Invalid hex string
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const hexString = Buffer.from(value).toString('hex');
    return sql`ENCODE(${pgColumn}, 'hex') = ${hexString}`;
  }

  return;
};

/**
 * Compares a custom column with a value using an equality operation.
 * Falls back to text comparison for custom column types.
 *
 * @param pgColumn - The custom column to compare
 * @param value - The value to compare against
 * @returns SQL condition or undefined if the value is invalid
 */
export const eqCustom = (pgColumn: PgColumn, value: any) => {
  if (value === null || value === undefined) return;

  return sql`CAST(${pgColumn} AS TEXT) = ${String(value)}`;
};

/**
 * Compares a date or timestamp column with a query string using an equality operation.
 * The column is cast to DATE, and the query string is parsed and formatted as `YYYY-MM-DD`.
 *
 * @param pgColumn - The date or timestamp column to compare
 * @param query - The query string to compare against (should be a valid date)
 * @returns SQL condition or undefined if the query is invalid or not a valid date
 */
export const eqDate = (pgColumn: PgColumn, query: DateInput) => {
  const date = Day.parseDate(query);

  if (!(query && date && Day.isValid(date))) return;

  const start = startOfDay(date);
  const end = endOfDay(date);

  const startFormatted = toPostgresUTCTimestamptz(start);
  const endFormatted = toPostgresUTCTimestamptz(end);

  return sql`CAST(${pgColumn} as timestamptz) BETWEEN '${sql.raw(startFormatted)}' AND '${sql.raw(endFormatted)}'`;
};

export const gteDate = (pgColumn: PgColumn, query: DateInput) => {
  const date = Day.parseDate(query);

  if (!(query && date && Day.isValid(date))) return;

  const formattedDate = toPostgresUTCTimestamptz(date);
  return sql`CAST(${pgColumn} as timestamptz) >= '${sql.raw(formattedDate)}'`;
};

export const lteDate = (pgColumn: PgColumn, query: DateInput) => {
  const date = Day.parseDate(query);

  if (!(query && date && Day.isValid(date))) return;

  const formattedDate = toPostgresUTCTimestamptz(date);
  return sql`CAST(${pgColumn} as timestamptz) <= '${sql.raw(formattedDate)}'`;
};

/**
 * Creates a SQL BETWEEN condition for a date column within specified range.
 *
 * @example
 * const condition = betweenDate(orders.createdAt, { start: "2024-01-01", end: "2024-12-31" });
 * // Generates: CAST(created_at as DATE) BETWEEN '2024-01-01' AND '2024-12-31'
 */

export const betweenDate = <T extends PgColumn>(column: T, start: DateInput, end: DateInput) => {
  const startDate = Day.parseDate(start);
  const endDate = Day.parseDate(end);

  if (!(startDate && endDate && Day.isValid(startDate) && Day.isValid(endDate))) return;

  // For start date, use beginning of day (00:00:00)
  const prepareFormDate = new Date(startDate);
  prepareFormDate.setHours(0, 0, 0, 0);

  // For end date, use end of day (23:59:59)
  const prepareToDate = new Date(endDate);
  prepareToDate.setHours(23, 59, 59, 999);

  const startFormatted = toPostgresUTCTimestamptz(prepareFormDate);
  const endFormatted = toPostgresUTCTimestamptz(prepareToDate);

  console.log('startFormatted', startFormatted);
  console.log('endFormatted', endFormatted);

  return sql`CAST(${column} as timestamptz) BETWEEN '${sql.raw(startFormatted)}' AND '${sql.raw(endFormatted)}'`;
};

/**
 * Creates a SQL BETWEEN condition for a numeric column within specified range.
 *
 * @example
 * ```ts
 * const priceRange = { start: "10", end: "100" };
 * const condition = betweenNumber(products.price, priceRange);
 * // Generates SQL like: price BETWEEN 10 AND 100
 * ```
 */
export const betweenNumber = <TColumn extends AnyColumn>(
  column: TColumn,
  start: GetColumnData<TColumn, 'raw'>,
  end: GetColumnData<TColumn, 'raw'>
) => {
  const startNum = Number(start);
  const endNum = Number(end);

  if (Number.isNaN(startNum) || Number.isNaN(endNum)) return;

  return between(sql`ABS(${column})`, Math.abs(startNum), Math.abs(endNum));
};

export const buildConflictUpdateColumns = <T extends PgTable, Q extends keyof T['_']['columns']>(
  table: T,
  columns: Q[]
) => {
  const tableColumns = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = tableColumns[column].name;

      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>
  );
};

/**
 * Builds conflict update columns with an optional WHERE condition for PostgreSQL upsert operations.
 * This extends buildConflictUpdateColumns by allowing conditional updates during ON CONFLICT.
 *
 * @param table - The PostgreSQL table
 * @param columns - Array of column names to update on conflict
 * @param whereCondition - Optional SQL condition to apply during the update
 * @returns Object containing the set values and optional setWhere condition for onConflictDoUpdate
 *
 * @example
 * ```typescript
 * // Update only if the new value is different from existing
 * const updateConfig = buildConflictUpdateColumnsWithWhere(
 *   users,
 *   ['name', 'email', 'updatedAt'],
 *   sql`${users.updatedAt} < excluded.updated_at`
 * );
 *
 * await db.insert(users)
 *   .values(userData)
 *   .onConflictDoUpdate({
 *     target: users.id,
 *     ...updateConfig
 *   });
 *
 * // Or with a more complex condition
 * const complexCondition = or(
 *   sql`${products.price} != excluded.price`,
 *   sql`${products.stock} != excluded.stock`
 * );
 *
 * const updateConfig = buildConflictUpdateColumnsWithWhere(
 *   products,
 *   ['price', 'stock', 'lastUpdated'],
 *   complexCondition
 * );
 * ```
 */
export const buildConflictUpdateColumnsWithWhere = <
  T extends PgTable,
  Q extends keyof T['_']['columns'],
>(
  table: T,
  columns: Q[],
  whereCondition?: SQL
): {
  set: Record<Q, SQL>;
  setWhere?: SQL;
} => {
  const tableColumns = getTableColumns(table);
  const set = columns.reduce(
    (acc, column) => {
      const colName = tableColumns[column].name;
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>
  );

  return whereCondition ? { set, setWhere: whereCondition } : { set };
};

export const getDebitOrCreditQuery = <
  T extends PgTable,
  C extends keyof T['_']['columns'],
  Q extends 'debit' | 'credit',
>(
  mainTable: T,
  column: C,
  type: Q
): SQL<number> => {
  const tableName = getTableName(mainTable);
  const columns = getTableColumns(mainTable);
  const columnName = columns[column].name;

  return sql`CASE WHEN
            ${sql.raw(`${tableName}.${columnName}`)} ${sql.raw(type === 'debit' ? '>' : '<')} 0
            THEN ABS(${sql.raw(`${tableName}.${columnName}`)})
            ELSE 0 END`;
};

/**
 * Filters out falsy values from an object while maintaining type safety.
 * Useful for filtering out null/undefined values before database operations.
 *
 * @param obj - The input object to filter
 * @returns A new object containing only truthy values, with the same shape as the input but partial
 * @example
 * const input = { name: "test", age: null, active: false }
 * const filtered = filterTruthyValues(input) // { name: "test" }
 */
export function filterTruthyValues<
  T extends Record<string, unknown>,
  U extends Record<
    string,
    string | number | boolean | Date | SQL<unknown> | PgColumn<any, any, any> | null | undefined
  >,
>(obj: T): Partial<U> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => Boolean(value))
  ) as Partial<U>;
}

/**
 * Concatenates multiple PostgreSQL columns into a single string using SQL CONCAT function,
 * with an optional separator between values.
 *
 * @param separator - String to insert between concatenated values (default: no separator)
 * @param args - One or more PostgreSQL columns to concatenate
 * @returns SQL query that concatenates the columns into a single string
 * @example
 * // Concatenate first name and last name with a space
 * sqlConcat(' ', users.firstName, users.lastName)
 * // Returns: CONCAT(first_name, ' ', last_name)
 */
export function sqlConcat(separator = ',', ...args: PgColumn[]) {
  // Interleave the separator between columns
  const parts = args.flatMap((col, i) =>
    i === args.length - 1 ? [col] : [col, sql.raw(`'${separator}'`)]
  );

  return sql<string>`concat(${sql.join(parts, sql.raw(', '))})`;
}

/**
 * Formats a PostgreSQL date column to display as "Mon DD, YYYY" format
 * and concatenates two date columns with a separator.
 *
 * @param separator - String to insert between the formatted dates (default: ' - ')
 * @param startDate - Start date column
 * @param endDate - End date column
 * @returns SQL query that formats and concatenates the dates
 * @example
 * // Format payroll date range
 * sqlFormatDateRange(' - ', payrolls.startDate, payrolls.endDate)
 * // Returns: "Jun 10, 2025 - Jul 10, 2025"
 */
export function sqlFormatDateRange(separator = ' - ', startDate: PgColumn, endDate: PgColumn) {
  return sql<string>`
    concat(
      to_char(${startDate}, 'Mon DD, YYYY'),
      ${sql.raw(`'${separator}'`)},
      to_char(${endDate}, 'Mon DD, YYYY')
    )
  `;
}
