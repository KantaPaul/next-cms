import type { Replace } from 'type-fest';

export type SentenceCase<T extends string> = Replace<
  Capitalize<Lowercase<T>>,
  '_',
  ' '
>;

export type PromiseResult<T extends (...args: any) => any> = Awaited<
  ReturnType<T>
>;
