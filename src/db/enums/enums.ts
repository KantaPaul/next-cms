export const dateFormats = {
  US_FULL: 'MMMM dd, yyyy', // October 17, 2024
  US_SHORT: 'MMM dd, yyyy', // Oct 17, 2024
  EU_FULL: 'dd MMMM yyyy', // 17 October 2024
  US_STANDARD: 'MM/dd/yyyy', // 10/17/2024
  EU_STANDARD: 'dd/MM/yyyy', // 17/10/2024
  ASIA_STANDARD: 'yyyy/MM/dd', // 2024/10/17
  ISO_DATE: 'yyyy-MM-dd', // 2024-10-17
  ISO_DATE_2: 'dd-MM-yyyy', // 17-10-2024
} as const;


/**
 * A generic type representing an asynchronous server action function.
 * @summary`We can use this generic type to define props types when a component takes server  actions as props.`
 * This type defines a function that takes a variable number of arguments of type `T`,
 * performs an asynchronous operation, and returns a `Promise` that resolves to either
 * a result of type `R`, an error of type `E`, or `undefined` if neither a result nor
 * an error is returned.
 *
 * @template T - The tuple type representing the argument types of the function.
 * @template R - The type of the result that the function returns on success.
 * @template E - The type of the error that the function returns on failure.
 *
 * @param {...T} args - The arguments that the server action function accepts.
 * @returns {Promise<R | E | undefined>}: Indicates that the function returns a promise which resolves to either a value of type `R`, an error of type `E`, or `undefined`,
 * @example
 * export const testAction:ServerAction<[string],NoteSelect,ServerError> = async (id: string) => {
    try {
      const result = await NoteService.find(id); // as NoteSelect
      revalidateTag(KEY_CACHE.NOTE_CACHE_KEY);
      return result;
    } catch (error) {
      return handleServerError(error); // as ServerError
     }
   };
 */
export type ServerAction<T extends any[], R = any, E = any> = (
  ...args: T
) => Promise<R | E | undefined>;