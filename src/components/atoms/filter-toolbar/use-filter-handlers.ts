import { useCallback } from 'react';
import { RANGE_SEPARATOR } from '@/config/constant';
import { formatDate } from '@/lib/utils/format-date';
import type { DateRangeType, FilterHandlers } from './types';

const PAGE_RESET = { page: 1 } as const;

export function useFilterHandlers(
  name: string,
  updateParams: (updates: Record<string, any>) => void,
  removeParams: (keys: string | string[]) => void
): FilterHandlers {
  const clear = useCallback(() => {
    removeParams(name);
  }, [name, removeParams]);

  const setValue = useCallback(
    (value: string | string[]) => {
      updateParams({ [name]: value, ...PAGE_RESET });
    },
    [name, updateParams]
  );

  const setTextValue = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value) {
        updateParams({ [name]: value, ...PAGE_RESET });
      } else {
        removeParams(name);
      }
    },
    [name, updateParams, removeParams]
  );

  const setDateValue = useCallback(
    (date: Date) => {
      const value = date.toISOString();
      updateParams({ [name]: value, ...PAGE_RESET });
    },
    [name, updateParams]
  );

  const setDateRangeValue = useCallback(
    (dates: DateRangeType) => {
      const [start, end] = dates;

      // Only update if at least one date is provided
      if (!(start || end)) {
        removeParams(name);
        return;
      }

      const formattedRange = [
        start ? formatDate(start, 'YYYY-MM-DD') : null,
        end ? formatDate(end, 'YYYY-MM-DD') : null,
      ];
      const value = formattedRange.join(RANGE_SEPARATOR);
      updateParams({ [name]: value, ...PAGE_RESET });
    },
    [name, updateParams, removeParams]
  );

  return {
    clear,
    setValue,
    setTextValue,
    setDateValue,
    setDateRangeValue,
  };
}
