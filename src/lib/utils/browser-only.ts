/**
 * Utility functions for handling browser-only operations safely in a Next.js application
 * to prevent "document is not defined" and "window is not defined" errors during SSR.
 */

/**
 * Checks if the code is running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Safely access the document object
 * @returns The document object if in browser, otherwise null
 */
export const getSafeDocument = (): Document | null => {
  return isBrowser() ? document : null;
};

/**
 * Safely access the window object
 * @returns The window object if in browser, otherwise null
 */
export const getSafeWindow = (): Window | null => {
  return isBrowser() ? window : null;
};

/**
 * Safely get an element by ID
 * @param id The ID of the element to find
 * @returns The element if found in browser, otherwise null
 */
export const getSafeElementById = (id: string): HTMLElement | null => {
  const doc = getSafeDocument();
  return doc ? doc.getElementById(id) : null;
};

/**
 * Safely get the document body
 * @returns The document body if in browser, otherwise null
 */
export const getSafeDocumentBody = (): HTMLElement | null => {
  const doc = getSafeDocument();
  return doc ? doc.body : null;
};
