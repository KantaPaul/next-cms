'use client';

import type { Table } from '@tanstack/react-table';
import isEmpty from 'lodash/isEmpty';
import { Grid3x3, List, X } from 'lucide-react';
import type { JSX } from 'react';
// import { ActionButton } from '@/components/atoms/action-button';
// import { Button } from '@/components/atoms/button/button';
// import { RefreshButton } from '@/components/atoms/button/refresh-button';
import { Text } from '@/components/atoms/content';
import { FilterItem } from '@/components/atoms/filter-toolbar/filter-item';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { Flex } from '@/components/atoms/layout';
import { Button } from '@/components/ui/button';
// import { ToggleFullscreenTrigger } from '@/components/ui/sidebar';
import { DEFAULT_PAGE_SIZE } from '@/config/constant';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';
import {
  type DrawerFiltersProps,
  TableDrawerFilters,
} from './table-drawer-filters';
import { TableSearch } from './table-search';
// import { TableViewOptions } from './table-view-options';
import type { PersonalizedProps } from './types';

type TableToolbarProps<TData> = {
  table?: Table<TData>;
  filters?: FilterConfig[];
  totalCount?: number;
  drawerFiltersProps?: DrawerFiltersProps;
  personalizedProps?: PersonalizedProps;
  isPublic?: boolean;
  inlineSearch?: boolean;
  disableSearch?: boolean;
  formClassName?: string;
  searchPlaceHolder?: string;
  renderActions?: (table: Table<TData>) => React.ReactNode;
  showClearButton?: boolean;
  showRefreshButton?: boolean;
  showLayoutToggle?: boolean;
  className?: string;
  toolBarClassName?: string;
  searchBarClassName?: string;
};

export function TableToolbar<TData>({
  table,
  filters,
  isPublic = false,
  totalCount,
  formClassName,
  drawerFiltersProps,
  personalizedProps,
  searchPlaceHolder,
  renderActions,
  disableSearch,
  showLayoutToggle = false,
  inlineSearch = false,
  showClearButton = true,
  showRefreshButton = true,
  className,
  toolBarClassName,
  searchBarClassName,
}: Readonly<TableToolbarProps<TData>>): JSX.Element {
  const isDesktop = useMediaQuery('(min-width: 1600px)');
  const { queryParams, updateParams, removeParams, isPending } =
    useQueryParams<{
      page?: string;
      size?: string;
      layout?: string;
    }>();
  const columnControl = personalizedProps?.columnControl ?? true;

  // Calculate pagination info for "Showing x-x of x" display
  const currentPage = Number.parseInt(queryParams.page || '1', 10) || 1;
  const currentSize =
    Number.parseInt(queryParams.size || String(DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;
  const startItem =
    totalCount && totalCount > 0 ? (currentPage - 1) * currentSize + 1 : 0;
  const endItem = totalCount
    ? Math.min(currentPage * currentSize, totalCount)
    : 0;

  const allFilters = [
    ...(filters ?? []),
    ...(drawerFiltersProps?.filters || []),
  ].map(({ name }) => name);

  const isFiltered = Object.keys(queryParams).some(key =>
    allFilters.includes(key)
  );

  const drawerFilters = isDesktop
    ? { ...drawerFiltersProps }
    : {
        ...drawerFiltersProps,
        filters: [...(filters ?? []), ...(drawerFiltersProps?.filters || [])],
      };

  function handleLayoutToggle() {
    if (queryParams.layout === 'grid') {
      removeParams('layout');
    } else {
      updateParams({ layout: 'grid' });
    }
  }

  return (
    <Flex
      className={cn(
        'Table--Toolbar-Wrapper w-auto flex-col justify-end gap-4 py-4 ps-5 pe-6 md:flex-row md:justify-between',
        inlineSearch && 'justify-end',
        className
      )}
    >
      {totalCount !== undefined && (
        <Text className="font-geist-mono text-steel-700 dark:text-steel-200 text-sm font-medium whitespace-nowrap">
          {totalCount > 0
            ? `Showing ${startItem}-${endItem} of ${totalCount}`
            : 'No Records found'}
        </Text>
      )}
      {inlineSearch && !disableSearch && (
        <TableSearch
          formClassName={cn(formClassName, 'md:min-w-96')}
          placeholder={searchPlaceHolder}
        />
      )}

      {isDesktop && (!isEmpty(filters) || isFiltered) && (
        <Flex
          className={cn('ms-auto w-auto gap-2', searchBarClassName)}
          justify="end"
        >
          {filters?.map(filter => (
            <FilterItem
              key={filter.name}
              size="sm"
              {...filter}
              name={filter.name}
            />
          ))}
        </Flex>
      )}
      <Flex
        className={cn('w-auto gap-2', toolBarClassName)}
        data-toolbar="bottom"
        justify="end"
      >
        {!isEmpty(drawerFilters.filters) && (
          <TableDrawerFilters
            isDesktop={isDesktop}
            title={isDesktop ? 'More Filters' : 'Filters'}
            {...drawerFilters}
          />
        )}

        {showClearButton && isFiltered && (
          <Button
            className="rounded-md px-2 shadow-none lg:px-3"
            // isLoading={isPending}
            onClick={() => removeParams(allFilters)}
            size="sm"
          >
            Clear
            <X size={15} />
          </Button>
        )}

        {table && renderActions?.(table)}

        {showLayoutToggle && (
          <Button
            // isLoading={isPending}
            onClick={handleLayoutToggle}
            size="sm"
            title={`Switch to ${queryParams.layout === 'grid' ? 'List' : 'Grid'}`}
            variant="outline"
          >
            {queryParams.layout === 'grid' ? (
              <List className="size-4" />
            ) : (
              <Grid3x3 className="size-4" />
            )}
          </Button>
        )}

        {/* {!isPublic && <ToggleFullscreenTrigger size="sm" variant="outline" />} */}

        {/* {showRefreshButton && <RefreshButton />} */}

        {/* {table && personalizedProps && columnControl && (
          <TableViewOptions personalizedProps={personalizedProps} table={table} />
        )} */}
      </Flex>
    </Flex>
  );
}
