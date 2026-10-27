'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type FormActionState = {
  isPending: boolean;
  error: string | null;
};

/**
 * Wraps a server action with consistent loading and error state.
 *
 * Server actions are expected to return `{ ok: true }` on success or
 * `{ ok: false, error: string }` on failure.
 *
 * @param action - The server action to call. Receives the parsed form values.
 * @param options - Optional configuration.
 * @returns { submit, isPending, error, clearError }
 */
export function useFormAction<TInput, TOutput extends Record<string, unknown>>(
  action: (input: TInput) => Promise<TOutput>,
  options?: {
    onSuccess?: (result: TOutput) => void;
    onError?: (message: string) => void;
    resetOnSuccess?: boolean;
  }
): {
  submit: (input: TInput) => Promise<void>;
  isPending: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, resetOnSuccess = true } = options ?? {};

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submit = useCallback(
    async (input: TInput) => {
      setIsPending(true);
      setError(null);

      try {
        const result = await action(input);

        if ('ok' in result && !result.ok) {
          const message = (result as { error?: string }).error ?? 'An error occurred';
          setError(message);
          onError?.(message);
          toast.error(message);
          return;
        }

        onSuccess?.(result as TOutput);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        onError?.(message);
        toast.error(message);
      } finally {
        setIsPending(false);
      }
    },
    [action, onSuccess, onError, resetOnSuccess]
  );

  return { submit, isPending, error, clearError };
}
