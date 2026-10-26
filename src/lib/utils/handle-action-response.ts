import { toast } from 'sonner';
import type { ValidationError } from '@/lib/types/procedure-types';
import { showErrorToast } from './error';

type ErrorResponse = {
  hasError: boolean;
  message: string;
  errorType: 'Unknown' | 'ZodError' | 'ApplicationException' | 'Error';
};

// More flexible response type that includes void
type ServerResponse<T> =
  | T
  | ValidationError
  | ErrorResponse
  | (T | ValidationError | ErrorResponse)[];

/**
 * Handles API response processing with consistent error handling and success callbacks
 *
 * @param responsePromise - Promise or direct response from server API call
 * @param onSuccess - Callback function to execute when response is valid
 * @param onError - Optional custom error handler
 * @returns Promise resolving to boolean indicating success/failure
 */
export const handleActionResponse = async <T>(
  responsePromise: Promise<ServerResponse<T> | void> | ServerResponse<T> | void,
  onSuccess: (data: T) => unknown,
  onError?: (error: ErrorResponse | ValidationError) => unknown
): Promise<boolean> => {
  try {
    // Resolve promise if needed
    const response = await Promise.resolve(responsePromise);

    // Handle undefined or void responses
    if (response === undefined || response === null) {
      // Don't call onSuccess for void responses to maintain existing behavior
      return false;
    }

    // Handle array responses
    if (Array.isArray(response)) {
      for (const res of response) {
        if (!res || typeof res !== 'object') continue;

        if ('hasError' in res) {
          if (onError) {
            await onError(res);
          } else {
            showErrorToast(res.message);
          }

          return false;
        }

        if ('errors' in res) {
          Object.values(res.errors).forEach(errorMessages => {
            errorMessages?.forEach(message => {
              showErrorToast(message);
            });
          });
          return false;
        }

        await onSuccess(res as T);
        return true;
      }

      return false;
    }

    // Handle object responses
    if (typeof response === 'object') {
      if ('hasError' in response) {
        if (onError) {
          await onError(response);
        } else {
          showErrorToast(response.message);
        }

        return false;
      }

      if ('errors' in response) {
        Object.values(response.errors).forEach(errorMessages => {
          errorMessages?.forEach(message => {
            showErrorToast(message);
          });
        });
        return false;
      }

      await onSuccess(response as T);
      return true;
    }

    return false;
  } catch (error) {
    showErrorToast(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
    return false;
  }
};
