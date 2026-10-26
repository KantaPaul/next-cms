'use client';

import { Minus, Plus } from 'lucide-react';

// import { Loader } from 'rizzui';

import { Spinner } from '@/components/atoms/icons/loader/spinner';
import { Flex } from '@/components/atoms/layout';
import { statusColors } from '@/components/atoms/status-badge';
import { focusOutline } from '@/components/atoms/utils';
import { cn } from '@/lib/utils/cn';

export interface FieldArrayActionsProps {
  onAdd?: () => void;
  showAddAction?: boolean;
  onRemove?: () => void;
  showRemoveAction?: boolean;
  className?: string;
  isRemoveLoading?: boolean;
}

export function FieldArrayActions({
  className,
  onAdd,
  onRemove,
  showRemoveAction,
  showAddAction,
  isRemoveLoading,
}: FieldArrayActionsProps) {
  return (
    <Flex justify="start" className={cn('gap-3', className)}>
      {showAddAction && (
        <button
          type="button"
          className={cn(
            'field-append-button dark:bg-emerald-500/60 dark:text-white/80 flex h-6 min-w-[24px] items-center justify-center rounded-md p-0 shadow-button',
            statusColors.success,
            focusOutline,
            'focus-visible:outline-offset-2'
          )}
          onClick={onAdd}
        >
          <Plus strokeWidth={1.5} className="h-4 w-4" />
        </button>
      )}
      {showRemoveAction && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'field-remove-button dark:text-white/80 flex h-6 min-w-[24px] items-center justify-center rounded-md p-0 shadow-button',
            statusColors.danger,
            focusOutline,
            'focus-visible:outline-offset-2'
          )}
        >
          {isRemoveLoading ? (
            <Spinner />
          ) : (
            <Minus strokeWidth={1.5} className="h-4 w-4" />
          )}
        </button>
      )}
    </Flex>
  );
}
