/**
 * Utility functions for handling URL query parameters
 * Used by useQueryParams hook and other URL manipulation utilities
 */

export type QueryParamValue = string | string[] | undefined | null;
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Checks if a value should be included in query params
 */
function isValidParamValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Cleans query parameters by removing falsy values
 * @param params - Object containing query parameters
 * @returns Cleaned params object with only valid values
 */
export function cleanParams(params: QueryParams): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!isValidParamValue(value)) continue;

    // Handle arrays by joining with comma
    if (Array.isArray(value)) {
      cleaned[key] = value.join(',');
    } else if (typeof value === 'object') {
      // Skip objects - they shouldn't be in query params
      console.warn(
        `[query-params] Skipping object value for key "${key}". Query params must be strings or arrays.`
      );
    } else {
      cleaned[key] = String(value);
    }
  }

  return cleaned;
}

/**
 * Builds a URL query string from params object
 * @param params - Clean params object
 * @returns URL query string (without leading '?')
 */
export function buildQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/**
 * Merges new params with existing params, removing empty values
 * @param current - Current query params
 * @param updates - New params to merge
 * @returns Merged params object
 */
export function mergeParams(
  current: QueryParams,
  updates: Partial<QueryParams>
): QueryParams {
  const result: QueryParams = {};

  // Copy non-empty values from current
  for (const [key, value] of Object.entries(current)) {
    if (isValidParamValue(value)) {
      result[key] = value;
    }
  }

  // Add or update with new values
  for (const [key, value] of Object.entries(updates)) {
    if (isValidParamValue(value)) {
      result[key] = value;
    } else {
      // If update value is empty, remove the key
      delete result[key];
    }
  }

  return result;
}

/**
 * Removes specified keys from params
 * @param params - Current params
 * @param keys - Keys to remove (string or array of strings)
 * @returns Params with specified keys removed
 */
export function removeParamKeys(
  params: QueryParams,
  keys: string | string[]
): QueryParams {
  const keysArray = Array.isArray(keys) ? keys : [keys];
  const result = { ...params };

  for (const key of keysArray) {
    delete result[key];
  }

  return result;
}

/**
 * Gets a query param value as a string (takes first value if array)
 * @param value - Query param value (string | string[] | undefined)
 * @param defaultValue - Default value if param is empty (default: '')
 * @returns String value
 */
export function getParamAsString(
  value: QueryParamValue,
  defaultValue = ''
): string {
  if (!value) return defaultValue;
  return Array.isArray(value) ? value[0] || defaultValue : value;
}

/**
 * Gets a query param value as an array
 * @param value - Query param value (string | string[] | undefined)
 * @param defaultValue - Default value if param is empty (default: [])
 * @returns Array of strings
 */
export function getParamAsArray(
  value: QueryParamValue,
  defaultValue: string[] = []
): string[] {
  if (!value) return defaultValue;
  return Array.isArray(value) ? value : [value];
}
