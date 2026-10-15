'use client';

import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
  type ColumnDef,
  type ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type Header,
  type Row,
  type Table as TableInstance,
  type Table as TableType,
  useReactTable,
} from '@tanstack/react-table';
import isEmpty from 'lodash/isEmpty';
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from 'lucide-react';
import { Fragment, Suspense } from 'react';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { Box } from '@/components/atoms/layout';
import { NotFound } from '@/components/atoms/not-found';
import {
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
import { focusOutline } from '@/components/atoms/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { useTableControls } from '@/components/atoms/data-table/hooks/use-table-controls';
import { usePinningStyles } from '@/components/atoms/data-table/lib/get-common-pinning-styles';
import type { DrawerFiltersProps } from '@/components/atoms/data-table/table-drawer-filters';
import { TablePagination } from '@/components/atoms/data-table/table-pagination';
import {
  SearchFallback,
  TableSearch,
} from '@/components/atoms/data-table/table-search';
import { TableToolbar } from '@/components/atoms/data-table/table-toolbar';
import type { PersonalizedProps } from '@/components/atoms/data-table/types';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount?: number;
  pageSizeOptions?: number[];
  filters?: FilterConfig[];
  drawerFiltersProps?: DrawerFiltersProps;
  personalizedProps?: PersonalizedProps;
  columnPinning?: ColumnPinningState;
  searchPlaceHolder?: string;
  renderActions?: (table: TableType<TData>) => React.ReactNode;
  inlineSearch?: boolean;
  disableSearch?: boolean;
  isPublic?: boolean;
  getRowStyles?: (row: Row<TData>) => void;
  showFooter?: boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  showClearButton?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  toolBarClassName?: string;
  searchBarClassName?: string;
  hidePagination?: boolean;
  showLayoutToggle?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

const _def = {
  data: [],
};

export function DataTable<TData, TValue>({
  columns = [],
  data,
  totalCount,
  pageSizeOptions,
  filters,
  drawerFiltersProps,
  personalizedProps,
  columnPinning,
  inlineSearch,
  disableSearch = false,
  searchPlaceHolder,
  renderActions,
  isPublic,
  getRowStyles,
  showFooter = false,
  renderSubComponent,
  showClearButton,
  showRefreshButton,
  className,
  toolBarClassName,
  searchBarClassName,
  hidePagination = false,
  showLayoutToggle,
  rowSelection,
  onRowSelectionChange,
}: Readonly<DataTableProps<TData, TValue>>) {
  const {
    onPaginationChange,
    pagination,
    onSortingChange,
    sorting,
    columnFilters,
    onColumnFiltersChange,
  } = useTableControls({
    personalizedProps,
  });
  const { getCommonPinningStyles, getPinnedColumnStyles } = usePinningStyles();

  // console.log('renderSubComponent', typeof renderSubComponent);

  // console.log('getRowCanExpand', getRowCanExpand);

  // This will not cause an infinite loop of re-renders because `columns` is a stable reference
  // const columns = useMemo(() => [
  //     // ...
  //   ], []);
  // This will not cause an infinite loop of re-renders because `data` is a stable reference
  // const [data, setData] = useState(() => [
  //     // ...
  //   ]);
  const table = useReactTable({
    data: data ?? _def.data,
    columns,
    // getSubRows: (row) => row.children, // return the children array as sub-rows
    getCoreRowModel: getCoreRowModel(),
    ...(typeof renderSubComponent === 'function' && {
      getRowCanExpand: () => true,
      getExpandedRowModel: getExpandedRowModel(),
    }),
    rowCount: totalCount,
    // manualExpanding: true,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    // enableSorting: false,
    defaultColumn: {
      enableSorting: false, // This disables sorting for all columns by default
    },
    onColumnFiltersChange,
    onSortingChange,
    onPaginationChange,
    ...(onRowSelectionChange && {
      onRowSelectionChange,
    }),
    initialState: {
      ...(!isEmpty(personalizedProps?.columnVisibility) && {
        columnVisibility: personalizedProps.columnVisibility,
      }),
      columnPinning: {
        // left: ["expand-column"],
        // right: ["actions"],
        ...columnPinning,
      },
    },
    state: {
      pagination,
      sorting,
      columnFilters,
      ...(rowSelection && {
        rowSelection,
      }),
    },
    meta: {
      getRowStyles: (row: Row<TData>) => {
        return getRowStyles?.(row) || '';
      },
    },
  });

  const noData = data?.length === 0;

  return (
    <div className={cn('grid grid-cols-1 gap-4', className)}>
      {!(inlineSearch || disableSearch) && (
        <Suspense fallback={<SearchFallback />}>
          <TableSearch
            placeholder={searchPlaceHolder}
            formClassName={cn('mb-4 md:mb-6')}
          />
        </Suspense>
      )}
      <Box className="Table--Content-Wrapper border-steel-200 dark:border-dark-400 dark:bg-dark-100 w-full rounded-xl border bg-white">
        <TableToolbar
          table={table}
          filters={filters}
          isPublic={isPublic}
          totalCount={totalCount}
          inlineSearch={inlineSearch}
          disableSearch={disableSearch}
          drawerFiltersProps={drawerFiltersProps}
          personalizedProps={personalizedProps}
          searchPlaceHolder={searchPlaceHolder}
          renderActions={renderActions}
          showClearButton={showClearButton}
          showRefreshButton={showRefreshButton}
          className={toolBarClassName}
          showLayoutToggle={showLayoutToggle}
          searchBarClassName={searchBarClassName}
        />
        <ScrollArea>
          <TableRoot
            className="relative"
            // style={{
            //   width: table.getTotalSize(),
            // }}
          >
            <TableHead>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map(header => {
                    return (
                      <TableHeaderCell
                        key={header.id}
                        data-id={header.id}
                        // colSpan={header.colSpan}
                        className={cn(
                          getPinnedColumnStyles(header.column),
                          header.column.columnDef.meta?.className
                        )}
                        style={getCommonPinningStyles(header.column)}
                      >
                        {header.isPlaceholder ? null : (
                          <ColumnHeader header={header} />
                        )}
                      </TableHeaderCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              <TableBodyContent
                table={table}
                colSpan={columns.length}
                RenderSubComponent={renderSubComponent}
              />
            </TableBody>

            {showFooter && (
              <TableFoot
                className={cn(
                  'border-border border-t'
                )}
              >
                {table.getFooterGroups().map(footerGroup => (
                  <TableRow
                    key={footerGroup.id}
                    className="hover:bg-inherit dark:hover:bg-inherit"
                  >
                    {footerGroup.headers.map(footer => {
                      return (
                        <TableCell
                          key={footer.id}
                          data-sticky-position={footer.column.getIsPinned()}
                          className={cn(
                            getPinnedColumnStyles(footer.column),
                            footer.column.columnDef.meta?.className
                          )}
                          style={getCommonPinningStyles(footer.column)}
                        >
                          {flexRender(
                            footer.column.columnDef.footer,
                            footer.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableFoot>
            )}
          </TableRoot>
          {/* <ScrollBar orientation="horizontal" /> */}
        </ScrollArea>
        {/* footer tag may use */}

        {!(noData || hidePagination) && (
          <TablePagination
            totalCount={totalCount}
            pageSizes={pageSizeOptions}
            className="py-4 ps-5 pe-6"
          />
        )}
        {noData && <NotFound />}
      </Box>
    </div>
  );
}

interface TableBodyContentProps<TData> {
  table: TableInstance<TData>;
  colSpan: number;
  RenderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
}

function TableBodyContent<TData>({
  table,
  colSpan,
  RenderSubComponent,
}: Readonly<TableBodyContentProps<TData>>) {
  const { getCommonPinningStyles, getPinnedColumnStyles } = usePinningStyles();
  return table.getRowModel().rows.map(row => (
    <Fragment key={row.id}>
      <TableRow
        data-state={row.getIsSelected() && 'selected'}
        className={cn(table.options.meta?.getRowStyles?.(row))}
        // className={row.getIsSelected() ? 'selected' : null}
        // onClick={row.getToggleSelectedHandler()}
      >
        {row.getVisibleCells().map(cell => {
          return (
            <TableCell
              key={cell.id}
              data-sticky-position={cell.column.getIsPinned()}
              className={cn(
                getPinnedColumnStyles(cell.column),
                cell.column.columnDef.meta?.className
              )}
              style={getCommonPinningStyles(cell.column)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
      {/* {row.getIsExpanded() && renderSubComponent && (
        <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
          <TableCell colSpan={row.getVisibleCells().length} className="">
            {renderSubComponent({ row })}
          </TableCell>
        </TableRow>
      )} */}
      {row.getIsExpanded() && RenderSubComponent && (
        <TableRow hoverStyle={false}>
          {/* 2nd row is a custom 1 cell row */}
          <TableCell colSpan={row.getVisibleCells().length} className="p-0">
            <RenderSubComponent row={row} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  ));
}

interface ColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLButtonElement> {
  header: Header<TData, TValue>;
}

const SortingUIIndicatorMap = {
  asc: ArrowUpWideNarrow,
  desc: ArrowDownWideNarrow,
  none: ArrowDownUp,
};

function ColumnHeader<TData, TValue>({
  header,
}: Readonly<ColumnHeaderProps<TData, TValue>>) {
  // console.log('getCanSort', header.column.id, header.column.getCanSort());

  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext());
  }

  const SortingUIIndicator =
    SortingUIIndicatorMap[
      header.column.getIsSorted() as keyof typeof SortingUIIndicatorMap
    ] ?? SortingUIIndicatorMap.none;
  return (
    <button
      onClick={header.column.getToggleSortingHandler()}
      className={cn(
        'flex w-full cursor-pointer items-center select-none',
        header?.column?.columnDef?.meta?.className?.includes('text-right') &&
          'justify-end',
        focusOutline,
        'focus-visible:outline-offset-2'
      )}
      title={
        {
          asc: 'Sort ascending',
          desc: ' Sort descending',
        }[header.column.getNextSortingOrder() as string] ?? 'Clear sort'
      }
      type="button"
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortingUIIndicator className="ml-2 h-4 w-4" />
    </button>
  );
}
