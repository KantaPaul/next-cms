'use client';

import isEmpty from 'lodash/isEmpty';
import { X } from 'lucide-react';
import { type JSX, useMemo } from 'react';
import { Flex } from '@/components/atoms/layout';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';
import { FilterItem } from './filter-item';
import { TableDrawerFilters } from './table-drawer-filters';
import type { FilterToolbarProps } from './types';

export function FilterToolbar({
  size = 'md',
  filters,
  className,
  drawerFilters,
  hideClearButton = false,
}: FilterToolbarProps): JSX.Element {
  const isDesktop = useMediaQuery('(min-width: 1600px)');
  const { queryParams, isPending, removeParams } = useQueryParams();

  const filterNames = useMemo(
    () => filters.map(filter => filter.name),
    [filters]
  );

  const hasFilters = useMemo(
    () => Object.keys(queryParams).some(param => filterNames.includes(param)),
    [queryParams, filterNames]
  );

  const combinedFilters = useMemo(
    () =>
      isDesktop
        ? { ...drawerFilters }
        : {
            ...drawerFilters,
            filters: [...(filters ?? []), ...(drawerFilters?.filters || [])],
          },
    [isDesktop, drawerFilters, filters]
  );

  return (
    <Flex className={cn('gap-4', className)} justify="end">
      {isDesktop &&
        (!isEmpty(filters) || hasFilters) &&
        filters.map(filter => (
          <FilterItem key={filter.name} size={size} {...filter} />
        ))}

      <TableDrawerFilters isDesktop={isDesktop} {...combinedFilters} />

      {!hideClearButton && (
        <Button
          disabled={!hasFilters}
          // isLoading={isPending}
          onClick={() => removeParams(filterNames)}
          variant="outline"
        >
          Clear
          <X size={15} />
        </Button>
      )}
    </Flex>
  );
}
