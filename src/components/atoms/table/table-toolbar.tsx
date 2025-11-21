'use client';

import type { Table } from '@tanstack/react-table';
import { TableProperties } from 'lucide-react';
import { useMemo } from 'react';
import { Box, Flex } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';
import { Text, Title } from '@/components/atoms/content';
import { Checkbox } from '@/components/atoms/forms';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TableToolbarProps<TData> {
  total?: number;
  title?: string;
  className?: string;
  showCount?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
  table?: Table<TData>;
}

export function TableToolbar<TData>({
  total,
  table,
  title,
  children,
  showCount = true,
  className,
  containerClassName,
}: TableToolbarProps<TData>) {
  const sortedColumns = useMemo(() => {
    const newTableColumns = table?.getAllLeafColumns() ?? [];
    return [...newTableColumns].sort(
      (a, b) => Number(a.columnDef.enableHiding ?? 1) - Number(b.columnDef.enableHiding ?? 1)
    );
  }, [table]);

  return (
    <Flex className={cn('mb-4', className)}>
      {showCount && (
        <Text className="font-medium text-sm text-steel-700 dark:text-steel-200">
          {total ? <>{total}</> : 'No'}
          {total && total < 2 ? ' Result Found' : ' Results Found'}
        </Text>
      )}

      {title && (
        <Title as="h3" className="font-medium text-lg">
          {title}
        </Title>
      )}

      <Flex
        className={cn(
          'ml-auto w-auto items-center justify-center gap-1 sm:gap-2',
          containerClassName
        )}
      >
        {children}

        {table && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm">
                <TableProperties className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <ScrollArea className="max-h-96">
                <Box className="grid grid-cols-1 gap-3">
                  {sortedColumns?.map((column) => {
                    return (
                      typeof column.columnDef.header === 'string' &&
                      column.columnDef.header.length > 0 && (
                        <Checkbox
                          key={column.id}
                          value={column.id}
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="shrink-0"
                          disabled={column.columnDef.enableHiding === false}
                        >
                          {column.columnDef.header}
                        </Checkbox>
                      )
                    );
                  })}
                </Box>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </Flex>
    </Flex>
  );
}
