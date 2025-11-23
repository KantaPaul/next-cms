import type { Row, VisibilityState } from '@tanstack/react-table';
import type { PersonalizationDataset } from '@/db/schema';

export type PersonalizedProps = {
  id?: number | string | null;
  columnVisibility?: VisibilityState;
  pathname: string;
  limit?: number | string | null;
  dataset: PersonalizationDataset;
  columnControl?: boolean;
};

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    className?: string;
    isSticky?: boolean;
    stickyPosition?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';
  }

  interface TableMeta<TData> {
    getRowStyles?: (row: Row<TData>) => string;
  }
}
