/**
 * A utility for safely accessing nested object properties via string paths
 */

// Simple key path string type (e.g., 'user.address.street')
export type DotNotationPath = string;

/**
 * Gets a value from an object by a dot-notation path
 * Returns undefined if any part of the path doesn't exist
 */
export function getValueByKey<T extends Record<string, any>, V = unknown>(
  obj: T,
  path: DotNotationPath
): V | undefined {
  if (!(obj && path)) return;

  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result === undefined || result === null) {
      return;
    }

    result = result[key];
  }

  return result as V;
}

/**
 * Type-safe getter with explicit return type
 * Example: get<User, string>(user, 'profile.name')
 */
export function get<T extends Record<string, any>, V>(
  obj: T,
  path: DotNotationPath
): V | undefined {
  return getValueByKey<T, V>(obj, path);
}

/**
 * Sets a value at the specified path in an object
 * Creates nested objects along the path if they don't exist
 */
export function setValueByKey<T extends Record<string, any>, V>(
  obj: T,
  path: DotNotationPath,
  value: V
): T {
  if (!(obj && path)) return obj;

  const keys = path.split('.');
  let current: any = obj;

  // Navigate to the second-to-last key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Create the path if it doesn't exist
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }

    current = current[key];
  }

  // Set the final property
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return obj;
}
