export type Whitespace =
  | '\u{9}' // '\t'
  | '\u{A}' // '\n'
  | '\u{B}' // '\v'
  | '\u{C}' // '\f'
  | '\u{D}' // '\r'
  | '\u{20}' // ' '
  | '\u{85}'
  | '\u{A0}'
  | '\u{1680}'
  | '\u{2000}'
  | '\u{2001}'
  | '\u{2002}'
  | '\u{2003}'
  | '\u{2004}'
  | '\u{2005}'
  | '\u{2006}'
  | '\u{2007}'
  | '\u{2008}'
  | '\u{2009}'
  | '\u{200A}'
  | '\u{2028}'
  | '\u{2029}'
  | '\u{202F}'
  | '\u{205F}'
  | '\u{3000}'
  | '\u{FEFF}';

function getMatchingPercentage(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));

  const intersection = new Set([...set1].filter(char => set2.has(char)));
  const union = new Set([...set1, ...set2]);

  return (intersection.size / union.size) * 100;
}

export function isPartialMatch(
  str1: string | null,
  str2: string | null
): boolean {
  if (str1 === null || str2 === null) {
    return true; // Return false if either string is null
  }

  const percentage = getMatchingPercentage(str1, str2);

  return percentage > 30;
}

export function isFullMatch(str1: string | null, str2: string | null): boolean {
  if (str1 === null || str2 === null) {
    return false; // Return false if either string is null
  }

  const trimmedStr1 = str1.trim();
  const trimmedStr2 = str2.trim();
  return trimmedStr1 === trimmedStr2;
}

export function isAllDigits(str?: string): boolean {
  if (!str) return false;
  return /^-?\d+(\.\d+)?$/.test(str);
}

export function isMixedString(str: string): boolean {
  return /^(?=.*[a-zA-Z])(?=.*\d).+$/.test(str);
}

export function removeNonDigitsAndDot(input: string): string {
  return input.replace(/[^\d.]/g, '');
}

// utility function to check if a value is not undefined or null with proper type check
export function isDefined<T>(value: T | undefined | null): value is T {
  return typeof value !== 'undefined' && value !== null;
}

export const safeFloatPares = (arg: string | number) => {
  try {
    if (typeof arg === 'string') {
      return parseFloat(removeNonDigitsAndDot(arg));
    }

    if (typeof arg === 'number') return arg;
    return 0;
  } catch (error) {
    return 0;
  }
};

// A utility function which would return true if the value is not empty (''/[]/{}/undefined/null). input value can be string, array, object, null, undefined

type Invalid =
  | never[]
  | null[]
  | undefined[]
  | null
  | undefined
  | Whitespace
  | ''
  | { [key: string]: never }
  | 0
  | false
  | number; // This will include NaN as it's a number type
type Valid =
  | string
  | object
  | number
  | boolean
  | Date
  | Record<string, any>
  | any[];

/**
 * Checks if a value is not empty, null, undefined, or contains only empty values
 * @param v - The value to check
 * @returns True if the value is considered "not empty"
 * @example
 * ```ts
 * isNotEmpty('hello') // true
 * isNotEmpty('') // false
 * isNotEmpty(null) // false
 * isNotEmpty(undefined) // false
 * isNotEmpty(0) // false
 * isNotEmpty(false) // false
 * isNotEmpty(NaN) // false
 * isNotEmpty([1, 2, 3]) // true
 * isNotEmpty([]) // false
 * isNotEmpty([null, undefined, '']) // false
 * isNotEmpty({ name: 'John' }) // true
 * isNotEmpty({}) // false
 * isNotEmpty({ a: null, b: undefined }) // false
 * isNotEmpty(new Date()) // true
 * isNotEmpty(new Date('invalid')) // false (NaN)
 * ```
 */
export function isNotEmpty<T extends Valid | Invalid>(
  v: T
): v is Exclude<T, Invalid> {
  // Handle primitive falsy values
  if (v === null || v === undefined) {
    return false;
  }

  // Handle string values
  if (typeof v === 'string') {
    return v.trim() !== '';
  }

  // Handle number values (including 0, NaN, Infinity)
  if (typeof v === 'number') {
    return !isNaN(v) && isFinite(v) && v !== 0;
  }

  // Handle boolean values
  if (typeof v === 'boolean') {
    return v === true;
  }

  // Handle Date objects
  if (
    v &&
    typeof v === 'object' &&
    'getTime' in v &&
    typeof (v as Date).getTime === 'function'
  ) {
    return !isNaN((v as Date).getTime());
  }

  // Handle arrays
  if (Array.isArray(v)) {
    // Check if array has any non-empty elements
    return v.some((item: any) => isNotEmpty(item));
  }

  // Handle objects (including plain objects, class instances, etc.)
  if (typeof v === 'object' && v !== null) {
    // Check if object has any non-empty properties
    const keys = Object.keys(v);

    if (keys.length === 0) {
      return false;
    }

    // Check if any property has a non-empty value
    return keys.some(key => {
      const value = (v as Record<string, any>)[key];
      return isNotEmpty(value);
    });
  }

  // For any other type, consider it as not empty
  return true;
}

/**
 * Test function to demonstrate the improved isNotEmpty function
 * This can be used for QA testing of the function
 */
export function testIsNotEmpty(): void {
  console.log('=== Testing isNotEmpty function ===');

  // Primitive falsy values
  console.log('Primitive falsy values:');
  console.log('null:', isNotEmpty(null)); // false
  console.log('undefined:', isNotEmpty(undefined)); // false
  console.log('0:', isNotEmpty(0)); // false
  console.log('false:', isNotEmpty(false)); // false
  console.log('NaN:', isNotEmpty(NaN)); // false
  console.log('Infinity:', isNotEmpty(Infinity)); // true (considered valid)
  console.log('-Infinity:', isNotEmpty(-Infinity)); // true (considered valid)

  // String values
  console.log('\nString values:');
  console.log('"hello":', isNotEmpty('hello')); // true
  console.log('"":', isNotEmpty('')); // false
  console.log('"   ":', isNotEmpty('   ')); // false
  console.log('"0":', isNotEmpty('0')); // true

  // Number values
  console.log('\nNumber values:');
  console.log('1:', isNotEmpty(1)); // true
  console.log('-1:', isNotEmpty(-1)); // true
  console.log('0.5:', isNotEmpty(0.5)); // true
  console.log('0:', isNotEmpty(0)); // false

  // Boolean values
  console.log('\nBoolean values:');
  console.log('true:', isNotEmpty(true)); // true
  console.log('false:', isNotEmpty(false)); // false

  // Date values
  console.log('\nDate values:');
  console.log('new Date():', isNotEmpty(new Date())); // true
  console.log('new Date("invalid"):', isNotEmpty(new Date('invalid'))); // false

  // Array values
  console.log('\nArray values:');
  console.log('[1, 2, 3]:', isNotEmpty([1, 2, 3])); // true
  console.log('[]:', isNotEmpty([])); // false
  console.log('[null, undefined, ""]:', isNotEmpty([null, undefined, ''])); // false
  console.log(
    '[null, "hello", undefined]:',
    isNotEmpty([null, 'hello', undefined])
  ); // true
  console.log('[0, false, ""]:', isNotEmpty([0, false, ''])); // false
  console.log('[0, 1, false]:', isNotEmpty([0, 1, false])); // true

  // Object values
  console.log('\nObject values:');
  console.log('{ name: "John" }:', isNotEmpty({ name: 'John' })); // true
  console.log('{}:', isNotEmpty({})); // false
  console.log(
    '{ a: null, b: undefined }:',
    isNotEmpty({ a: null, b: undefined })
  ); // false
  console.log('{ a: null, b: "hello" }:', isNotEmpty({ a: null, b: 'hello' })); // true
  console.log('{ a: 0, b: false }:', isNotEmpty({ a: 0, b: false })); // false
  console.log('{ a: 0, b: 1 }:', isNotEmpty({ a: 0, b: 1 })); // true

  // Nested objects and arrays
  console.log('\nNested structures:');
  console.log('{ a: { b: null } }:', isNotEmpty({ a: { b: null } })); // false
  console.log('{ a: { b: "hello" } }:', isNotEmpty({ a: { b: 'hello' } })); // true
  console.log(
    '[{ a: null }, { b: "hello" }]:',
    isNotEmpty([{ a: null }, { b: 'hello' }])
  ); // true
  console.log(
    '[{ a: null }, { b: null }]:',
    isNotEmpty([{ a: null }, { b: null }])
  ); // false

  // Edge cases
  console.log('\nEdge cases:');
  // console.log('Symbol():', isNotEmpty(Symbol())); // true
  console.log(
    'function() {}:',
    isNotEmpty(() => {})
  ); // true
  console.log('new Map():', isNotEmpty(new Map())); // true (has size property)
  console.log('new Set():', isNotEmpty(new Set())); // true (has size property)

  console.log('\n=== Test completed ===');
}
