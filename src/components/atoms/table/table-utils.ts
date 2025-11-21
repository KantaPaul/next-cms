import type { RowSelectionState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

interface UseTableSelectionOptions<T> {
  data: T[];
  getRowId: (row: T) => string;
  onSelectionChange?: (selectedItems: T[]) => void;
}

function useTableSelection<T>({ data, getRowId, onSelectionChange }: UseTableSelectionOptions<T>) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const selectedItemsMap = useMemo(() => {
    return selectedItems.reduce<Record<string, boolean>>((acc, item) => {
      acc[getRowId(item)] = true;
      return acc;
    }, {});
  }, [selectedItems, getRowId]);

  const handleRowSelectionChange = useCallback(
    (updaterOrValue: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      setSelectedItems((prev) => {
        const prevSelectionState = prev.reduce<RowSelectionState>((acc, item) => {
          acc[getRowId(item)] = true;
          return acc;
        }, {});

        const newSelectionState =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prevSelectionState)
            : updaterOrValue;

        const newSelection = data.filter((item) => newSelectionState[getRowId(item)]);

        // Schedule the onSelectionChange callback to run after the state update
        queueMicrotask(() => {
          if (onSelectionChange) {
            onSelectionChange(newSelection);
          }
        });

        return newSelection;
      });
    },
    [data, getRowId, onSelectionChange]
  );

  return {
    selectedItems,
    selectedItemsMap,
    handleRowSelectionChange,
  };
}

export { useTableSelection };
