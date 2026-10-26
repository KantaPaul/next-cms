'use client';

import type { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  buildQueryString,
  cleanParams,
  mergeParams,
  removeParamKeys,
} from '@/lib/utils/query-params';
import { isNotEmpty } from '@/lib/utils/string-manipulations';

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
function deepMergeObjects(
  target: QueryParams,
  source: Partial<QueryParams>
): QueryParams {
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
  const [isPending, startTransition] = useTransition();
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
   * Updates (merges) query parameters
   *
   * @param updates - Object containing parameter updates
   * @param options - Optional Next.js navigation options
   *
   * @example
   * updateParams({ type: 'sick', status: 'approved' })
   * updateParams({ page: '2' })
   */
  const updateParams = useCallback(
    (updates: Partial<T>, options?: NavigateOptions) => {
      startTransition(() => {
        const newParams = mergeParams(
          initialParams,
          updates as Partial<QueryParams>
        );
        const cleaned = cleanParams(newParams);
        const searchString = buildQueryString(cleaned);
        const newUrl = searchString ? `${pathname}?${searchString}` : pathname;

        router.push(newUrl, options);
      });
    },
    [pathname, router, initialParams]
  );

  /**
   * Sets query parameters (merge mode)
   * @deprecated Use `updateParams(data)` instead
   */
  const setQueryParams = useCallback(
    (data: Partial<T>, options?: NavigateOptions) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[useQueryParams] setQueryParams is deprecated. Use updateParams(data) instead.'
        );
      }

      updateParams(data, options);
    },
    [updateParams]
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

      keysArray.forEach(key => delete tempQuery[key]);

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
      keys.forEach(key => url.searchParams.delete(key));
      router.push(`${pathname}${url.search}`);
    },
    [pathname, router]
  );

  /**
   * Removes specified query parameters, or all if no keys provided
   *
   * @param keys - Keys to remove (string or array of strings). If not provided, removes all params
   * @param options - Optional Next.js navigation options
   *
   * @example
   * removeParams(['type', 'status'])  // Remove specific params
   * removeParams('type')               // Remove single param
   * removeParams()                     // Clear all params
   */
  const removeParams = useCallback(
    (keys?: string | string[], options?: NavigateOptions) => {
      startTransition(() => {
        // If no keys provided, clear all params
        if (!keys) {
          router.push(pathname, options);
          return;
        }

        const newParams = removeParamKeys(initialParams, keys);
        const cleaned = cleanParams(newParams);
        const searchString = buildQueryString(cleaned);
        const newUrl = searchString ? `${pathname}?${searchString}` : pathname;

        router.push(newUrl, options);
      });
    },
    [pathname, router, initialParams]
  );

  return {
    removeQueryParams,
    clearQueryParams,
    setQueryParams,
    queryParams: urlParams,
    isPending,
    updateParams,
    removeParams,
  };
}
