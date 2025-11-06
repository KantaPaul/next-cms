/**
 * Checks if the input is a non-empty array.
 *
 * @param items - The input to check.
 * @returns True if it's a non-empty array; otherwise, false.
 *
 * @typeParam T - Type of the array elements.
 *
 * @example
 * isArraySafe([1, 2, 3]); // true
 * isArraySafe([]);        // false
 * isArraySafe(null);      // false
 * isArraySafe("string");  // false
 */
export function isArraySafe<T>(items: any): items is T[] {
  return !!items && Array.isArray(items) && items.length > 0;
}

/**
 * Parses a value of type `boolean | null | undefined` to a boolean.
 *
 * @param value - The value to parse.
 * @returns `true` or `false`, treating `null` and `undefined` as `false`.
 *
 * @example
 * parseBoolean(true); // true
 * parseBoolean(false); // false
 * parseBoolean(null); // false
 * parseBoolean(undefined); // false
 */
export function parseBoolean<T extends boolean | null | undefined>(value: T): boolean {
  if (value === true || value === false) {
    return value; // If it's already a boolean, return as is
  } else if (value === null || value === undefined) {
    return false; // Treat null or undefined as false (or you can decide another default)
  } else {
    throw new Error('Invalid input: value is neither boolean, null, nor undefined');
  }
}

/**
 * Checks if the given string represents a finite number.
 *
 * @param value - The string to check.
 * @returns True if the string is a finite number, false otherwise.
 */
export function isNumber(value: string): boolean {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && value.trim() !== '';
}

/**
 * Checks if a string value is considered truthy.
 * Handles common string representations of boolean values.
 *
 * @param value - The string value to check.
 * @returns `true` if the string is considered truthy, `false` otherwise.
 *
 * @example
 * isStringTruthy("true");    // true
 * isStringTruthy("false");   // false
 * isStringTruthy("yes");     // true
 * isStringTruthy("no");      // false
 * isStringTruthy("hello");   // true
 * isStringTruthy("");        // false
 */
export function isStringTruthy(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (normalized === '') return false;
  if (normalized === 'false' || normalized === 'no') return false;
  if (normalized === 'true' || normalized === 'yes') return true;
  return normalized.length > 0;
}

/**
 * Type guard to check if a value is truthy.
 * Empty arrays and objects are considered false.
 *
 * @param value - The value to check.
 * @returns `true` if the value is considered truthy, `false` otherwise.
 *
 * @example
 * isTruthy(true);           // true
 * isTruthy(false);          // false
 * isTruthy(1);              // true
 * isTruthy(0);              // false
 * isTruthy("true");         // true
 * isTruthy("false");        // false
 * isTruthy("yes");          // true
 * isTruthy("no");           // false
 * isTruthy([]);             // false
 * isTruthy([1, 2, 3]);      // true
 * isTruthy({});             // false
 * isTruthy({ a: 1 });       // true
 * isTruthy(null);           // false
 * isTruthy(undefined);      // false
 * isTruthy("");             // false
 */
export function isTruthy<T>(value: T): value is NonNullable<T> {
  if (value === null || value === undefined) {
    return false;
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle numbers
  if (typeof value === 'number') {
    return value !== 0 && !Number.isNaN(value);
  }

  // Handle strings
  if (typeof value === 'string') {
    return isStringTruthy(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // Handle objects
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  // For any other type, use JavaScript's default truthy behavior
  return Boolean(value);
}

/**
 * Type guard to check if a value is falsy.
 * Empty arrays and objects are considered falsy.
 *
 * @param value - The value to check.
 * @returns `true` if the value is considered falsy, `false` otherwise.
 */
export function isFalsy<T>(value: T): boolean {
  return !isTruthy(value);
}

/**
 * Type guard to check if a value is null or undefined.
 *
 * @param value - The value to check.
 * @returns `true` if the value is null or undefined, `false` otherwise.
 */
export function isNullOrUndefined<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is not null or undefined.
 *
 * @param value - The value to check.
 * @returns `true` if the value is not null or undefined, `false` otherwise.
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return !isNullOrUndefined(value);
}
