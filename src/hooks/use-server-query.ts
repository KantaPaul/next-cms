// 'use client';

// import type { ServerAction } from '@/db/enums/enums';
// import {
//   type UseMutationOptions,
//   type UseMutationResult,
//   type UseQueryOptions,
//   type UseQueryResult,
//   useMutation,
//   useQuery,
//   useQueryClient,
// } from '@tanstack/react-query';
// import toast from 'react-hot-toast';

// /**
//  * Standard interface for server action results
//  */
// export interface ServerActionResult<T = any> {
//   success: boolean;
//   data?: T;
//   message?: string;
//   error?: string;
// }

// /**
//  * Configuration options for useServerQuery hook
//  */
// export interface UseServerQueryOptions<TData, TError = Error>
//   extends Omit<UseQueryOptions<ServerActionResult<TData>, TError, TData>, 'queryFn'> {
//   /**
//    * The server action function to call
//    */
//   action: ServerAction<[], ServerActionResult<TData>>;
//   /**
//    * Whether to throw an error if the server action returns success: false
//    * @default true
//    */
//   throwOnServerError?: boolean;
// }

// /**
//  * A reusable hook for server actions with React Query integration
//  *
//  * @example
//  * ```tsx
//  * const { data: users, isLoading, error } = useServerQuery({
//  *   queryKey: ['users'],
//  *   action: getUsers,
//  *   staleTime: 5 * 60 * 1000, // 5 minutes
//  * });
//  * ```
//  */
// /**
//  * useServerQuery
//  *
//  * Usage:
//  * ```tsx
//  * // Example: Fetch users with a server action
//  * const { data: users, isLoading, error } = useServerQuery({
//  *   queryKey: ['users'],
//  *   action: getUsers, // must return { success, data, ... }
//  *   staleTime: 5 * 60 * 1000,
//  * });
//  * ```
//  *
//  * - `action`: async function returning ServerActionResult<TData>
//  * - `throwOnServerError`: if true, throws on { success: false }
//  * - Returns: React Query result with unwrapped data
//  */
// export function useServerQuery<TData = any, TError = Error>({
//   action,
//   throwOnServerError = true,
//   ...queryOptions
// }: UseServerQueryOptions<TData, TError>): UseQueryResult<TData, TError> {
//   return useQuery<ServerActionResult<TData>, TError, TData>({
//     ...queryOptions,
//     queryFn: action,
//     select: (result) => {
//       if (!result.success && throwOnServerError) {
//         throw new Error(result.message || result.error || 'Server action failed');
//       }

//       if (!result.data) {
//         throw new Error('No data returned from server action');
//       }

//       return result.data;
//     },
//   });
// }

// /**
//  * Simple wrapper for server actions that just need basic query functionality
//  * with minimal configuration
//  *
//  * @param queryKey - React Query key for caching
//  * @param action - Server action function
//  * @param options - Additional query options
//  */
// export function useSimpleServerQuery<TData = any>(
//   queryKey: readonly unknown[],
//   action: () => Promise<ServerActionResult<TData>>,
//   options?: Partial<UseServerQueryOptions<TData>>
// ) {
//   return useServerQuery({
//     queryKey,
//     action,
//     staleTime: 5 * 60 * 1000, // 5 minutes default
//     ...options,
//   });
// }

// /**
//  * Hook for server actions that return data directly (not wrapped in ServerActionResult)
//  * Useful for legacy actions or actions that don't follow the standard format
//  *
//  * @param queryKey - React Query key for caching
//  * @param action - Server action function that returns data directly
//  * @param options - Additional query options
//  */
// export function useDirectServerQuery<TData, TError = Error>(
//   queryKey: readonly unknown[],
//   action: () => Promise<TData>,
//   options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>
// ) {
//   return useQuery<TData, TError>({
//     queryKey,
//     queryFn: action,
//     staleTime: 5 * 60 * 1000, // 5 minutes default
//     ...options,
//   });
// }

// // ============================================================================
// // MUTATION UTILITIES
// // ============================================================================

// /**
//  * Configuration options for useServerMutation hook
//  */
// export interface UseServerMutationOptions<TData, TVariables, TError = Error>
//   extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
//   /**
//    * The server action function to call
//    */
//   action: (variables: TVariables) => Promise<ServerActionResult<TData>>;
//   /**
//    * Query keys to invalidate on success
//    */
//   invalidateQueries?: (readonly unknown[])[];
//   /**
//    * Success message to show in toast
//    */
//   successMessage?: string;
//   /**
//    * Error message to show in toast
//    */
//   errorMessage?: string;
//   /**
//    * Whether to throw an error if the server action returns success: false
//    * @default true
//    */
//   throwOnServerError?: boolean;
// }

// /**
//  * A reusable hook for server action mutations with React Query integration
//  *
//  * @example
//  * ```tsx
//  * const createUserMutation = useServerMutation({
//  *   action: createUser,
//  *   successMessage: 'User created successfully!',
//  *   invalidateQueries: [['users']],
//  *   onSuccess: (user) => {
//  *     router.push(`/users/${user.id}`);
//  *   }
//  * });
//  *
//  * // Usage
//  * createUserMutation.mutate({ name: 'John', email: 'john@example.com' });
//  * ```
//  */
// export function useServerMutation<TData = any, TVariables = any, TError = Error>({
//   action,
//   invalidateQueries,
//   successMessage,
//   errorMessage,
//   throwOnServerError = true,
//   onSuccess,
//   onError,
//   ...mutationOptions
// }: UseServerMutationOptions<TData, TVariables, TError>): UseMutationResult<
//   TData,
//   TError,
//   TVariables
// > {
//   const queryClient = useQueryClient();

//   return useMutation<TData, TError, TVariables>({
//     ...mutationOptions,
//     mutationFn: async (variables) => {
//       const result = await action(variables);

//       if (!result.success && throwOnServerError) {
//         throw new Error(result.message || result.error || 'Server action failed');
//       }

//       return result.data as TData;
//     },
//     onSuccess: (data, variables, context) => {
//       // Invalidate specified queries
//       if (invalidateQueries) {
//         invalidateQueries.forEach((queryKey) => {
//           queryClient.invalidateQueries({ queryKey });
//         });
//       }

//       // Show success toast
//       if (successMessage) {
//         toast.success(successMessage);
//       }

//       // Call custom onSuccess handler
//       onSuccess?.(data, variables, context);
//     },
//     onError: (error, variables, context) => {
//       // Show error toast
//       const message = errorMessage || (error instanceof Error ? error.message : 'Operation failed');
//       toast.error(message);

//       // Call custom onError handler
//       onError?.(error, variables, context);
//     },
//   });
// }

// /**
//  * Hook for direct server action mutations (not wrapped in ServerActionResult)
//  * Useful for legacy actions or actions that don't follow the standard format
//  *
//  * @example
//  * ```tsx
//  * const deleteFavoriteMutation = useDirectMutation({
//  *   action: deleteFavorite,
//  *   successMessage: 'Removed from favorites',
//  *   invalidateQueries: [['favorites'], ['user-profile']],
//  * });
//  *
//  * deleteFavoriteMutation.mutate({ id: favoriteId });
//  * ```
//  */
// export function useDirectMutation<TData = any, TVariables = any, TError = Error>({
//   action,
//   invalidateQueries,
//   successMessage,
//   errorMessage,
//   onSuccess,
//   onError,
//   ...mutationOptions
// }: {
//   action: (variables: TVariables) => Promise<TData>;
//   invalidateQueries?: (readonly unknown[])[];
//   successMessage?: string;
//   errorMessage?: string;
//   onSuccess?: UseMutationOptions<TData, TError, TVariables>['onSuccess'];
//   onError?: UseMutationOptions<TData, TError, TVariables>['onError'];
// } & Omit<
//   UseMutationOptions<TData, TError, TVariables>,
//   'mutationFn' | 'onSuccess' | 'onError'
// >): UseMutationResult<TData, TError, TVariables> {
//   const queryClient = useQueryClient();

//   return useMutation<TData, TError, TVariables>({
//     ...mutationOptions,
//     mutationFn: action,
//     onSuccess: (data, variables, context) => {
//       // Invalidate specified queries
//       if (invalidateQueries) {
//         invalidateQueries.forEach((queryKey) => {
//           queryClient.invalidateQueries({ queryKey });
//         });
//       }

//       // Show success toast
//       if (successMessage) {
//         toast.success(successMessage);
//       }

//       // Call custom onSuccess handler
//       onSuccess?.(data, variables, context);
//     },
//     onError: (error, variables, context) => {
//       // Show error toast
//       const message = errorMessage || (error instanceof Error ? error.message : 'Operation failed');
//       toast.error(message);

//       // Call custom onError handler
//       onError?.(error, variables, context);
//     },
//   });
// }

// /**
//  * Simple wrapper for delete mutations with common patterns
//  *
//  * @example
//  * ```tsx
//  * const deleteMutation = useDeleteMutation({
//  *   action: deleteItem,
//  *   invalidateQueries: [['items']],
//  *   itemName: 'item', // Will show "Item deleted successfully"
//  * });
//  * ```
//  */
// export function useDeleteMutation<TVariables = { id: string }, TError = Error>({
//   action,
//   invalidateQueries,
//   itemName = 'item',
//   ...options
// }: {
//   action: (variables: TVariables) => Promise<any>;
//   invalidateQueries?: (readonly unknown[])[];
//   itemName?: string;
// } & Omit<UseMutationOptions<any, TError, TVariables>, 'mutationFn'>) {
//   return useDirectMutation({
//     action,
//     invalidateQueries,
//     successMessage: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
//     errorMessage: `Failed to delete ${itemName}`,
//     ...options,
//   });
// }
