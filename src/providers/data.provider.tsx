'use client';

import { createContext, useContext } from 'react';

// Initialize context with a default value that won't cause immediate errors
export const DataProviderContext = createContext<unknown>(undefined);

interface DataProviderProps<T> {
  children: React.ReactNode;
  data: T;
}

export function DataProvider<T>({ children, data }: DataProviderProps<T>) {
  return (
    <DataProviderContext.Provider value={data}>
      {children}
    </DataProviderContext.Provider>
  );
}

export function useDataProvider<T>(): T {
  const context = useContext(DataProviderContext);

  if (context === undefined) {
    throw new Error('useDataProvider must be used within a DataProvider');
  }

  // Additional check for null (during team switching)
  if (context === null) {
    throw new Error(
      'Data is temporarily unavailable during team switching. Please wait...'
    );
  }

  return context as T;
}
