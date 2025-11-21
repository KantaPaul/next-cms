import type { VisibilityState } from '@tanstack/react-table';
import type { PersonalizationDataset } from '@/db/schema';

export type PersonalizedProps = {
  id?: number | string | null;
  columnVisibility?: VisibilityState;
  pathname: string;
  limit?: number | string | null;
  dataset: PersonalizationDataset;
  columnControl?: boolean;
};
