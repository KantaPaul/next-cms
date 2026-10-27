/**
 * Converts a plain object to FormData for use with server actions that accept
 * FormData. Skips undefined/null values.
 */
export function objectToFormData(obj: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  return formData;
}

/**
 * Converts an object with nested data fields (e.g., { slug, 'data-title': '...' })
 * to FormData, preserving all keys as-is.
 */
export function objectWithNestedToFormData(
  obj: Record<string, unknown>
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  return formData;
}
