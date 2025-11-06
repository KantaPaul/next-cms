'use client';

import { isNotEmpty } from '@/lib/utils/string-manipulations';
import type { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Checks if a value is empty (null, undefined, empty string, or empty array)
 */
function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'number') return false;
  return String(value).length === 0;
}

type QueryParams = Record<string, any>;

/**
 * Deep merges two objects while handling nested properties and removing empty values
 */
function deepMergeObjects(target: QueryParams, source: Partial<QueryParams>): QueryParams {
  const result: QueryParams = {};

  // First, copy all non-empty values from target
  for (const key in target) {
    if (isNotEmpty(target[key])) {
      result[key] = target[key];
    }
  }

  // Then, add or update values from source
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];

    if (isNotEmpty(sourceValue)) {
      result[key] = String(sourceValue);
    }
    // If source value is empty, we don't add it to result (effectively removing it)
  }

  return result;
}

/**
 * A hook for managing URL query parameters with type safety and efficient updates
 * @template T - The type of query parameters object
 */
export default function useQueryParams<T extends QueryParams = QueryParams>() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize the initial state to prevent unnecessary recalculations
  const initialParams = useMemo(
    () => Object.fromEntries(searchParams.entries()) as T,
    [searchParams]
  );

  const [urlParams, setUrlParams] = useState<T>(initialParams);

  // Update state when search params change
  useEffect(() => {
    setUrlParams(Object.fromEntries(searchParams.entries()) as T);
  }, [searchParams]);

  /**
   * Updates query parameters in the URL
   * @param data - Object containing new query parameters
   * @param options - Optional navigation options
   */
  const setQueryParams = useCallback(
    (data: Partial<T>, options?: NavigateOptions) => {
      const params = deepMergeObjects(urlParams, data as Partial<QueryParams>);

      // Remove falsy values from the params
      const cleanedParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => {
          if (value === null || value === undefined) return false;
          if (value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        })
      );

      const searchString = new URLSearchParams(cleanedParams).toString();
      const newUrl = searchString ? `${pathname}?${searchString}` : pathname;

      router.push(newUrl, options);
      setUrlParams(cleanedParams as T);
    },
    [pathname, router, urlParams]
  );

  /**
   * Clears specified query parameters or all parameters if none specified
   * @param keys - Optional array of parameter keys to clear
   */
  const clearQueryParams = useCallback(
    (keys?: string[] | string | null) => {
      if (!keys) {
        router.push(pathname);
        setUrlParams({} as T);
        return;
      }

      const keysArray = Array.isArray(keys) ? keys : [keys];
      const tempQuery = { ...urlParams };

      keysArray.forEach((key) => delete tempQuery[key]);

      // Remove falsy values from the query params
      const cleanedParams = Object.fromEntries(
        Object.entries(tempQuery).filter(([_, value]) => {
          if (value === null || value === undefined) return false;
          if (value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        })
      );

      const searchString = new URLSearchParams(cleanedParams).toString();
      const newUrl = searchString ? `${pathname}?${searchString}` : pathname;

      router.push(newUrl);
      setUrlParams(cleanedParams as T);
    },
    [pathname, router, urlParams]
  );

  /**
   * Removes specified query parameters from the URL
   * @param keys - Array of parameter keys to remove
   */
  const removeQueryParams = useCallback(
    (keys: string[]) => {
      const url = new URL(window.location.href);
      keys.forEach((key) => url.searchParams.delete(key));
      router.push(`${pathname}${url.search}`);
    },
    [pathname, router]
  );

  return {
    removeQueryParams,
    clearQueryParams,
    setQueryParams,
    queryParams: urlParams,
  };
}
