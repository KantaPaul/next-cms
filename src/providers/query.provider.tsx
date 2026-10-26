import { DataProvider } from '@/providers/data.provider';

export type PromiseType<T> = T extends Promise<infer U> ? U : T;
export type PromisesObject<T> = { [K in keyof T]: Promise<T[K]> };
export type ResolvedPromises<T> = { [K in keyof T]: PromiseType<T[K]> };

interface QueryProviderProps<T> {
  children: React.ReactNode;
  promises: PromisesObject<T>;
}

export type AwaitedPromisesType<T extends (...args: any[]) => any> =
  ResolvedPromises<ReturnType<T>>;

export async function QueryProvider<T>({
  children,
  promises,
}: QueryProviderProps<T>) {
  const entries = await Promise.all(
    Object.entries(promises).map(async ([key, promise]) => [key, await promise])
  );

  const resolvedData = Object.fromEntries(entries) as ResolvedPromises<T>;

  return <DataProvider data={resolvedData}>{children}</DataProvider>;
}
