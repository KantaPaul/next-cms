'use client';

import {
  flexRender,
  type Table as ReactTableType,
  type Row,
} from '@tanstack/react-table';
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from 'lucide-react';
import { Fragment } from 'react';
import { Flex } from '@/components/atoms/layout';
import { NotFound } from '@/components/atoms/not-found';
import { RenderComponentWithProps } from '@/components/atoms/render-component-with-props';
import {
  TableBody,
  TableCell,
  TableContainer,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableLoader,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';

export type TableType<T extends Record<string, any>> = {
  table: ReactTableType<T>;
  total?: number;
  isLoading?: boolean;
  renderSubComponent?: (props: { row: Row<T> }) => React.ReactElement;
  expandable?: boolean;
  className?: string;
  classNames?: {
    tableClassName?: string;
    tableRootClassName?: string;
    headerClassName?: string;
    headerRowClassName?: string;
    headerCellClassName?: string;
    tableCellClassName?: string;
    tableFooterClassName?: string;
    notFoundClassName?: string;
  };
  tableFoot?: boolean | React.ReactNode;
  onRowClick?: (row: Row<T>) => void;
};

export const stickyCellBorderColor = `before:w-[1px] before:absolute before:h-full before:content-[""] before:bg-border before:top-0`;
export const stickyCellBgColor =
  'after:bg-card after:absolute after:-z-[1] after:left-0 after:top-[1px] after:bottom-0 after:right-0';

export const tableBorder = 'w-full rounded-xl border border-border bg-card';

export function Table<TData extends Record<string, any>>({
  table,
  total,
  isLoading,
  expandable,
  className,

  classNames,
  tableFoot,
  onRowClick,
  renderSubComponent,
}: TableType<TData>) {
  const isEmptyTable = table.getRowModel().rows.length === 0;

  if (isLoading) {
    return <TableLoader rows={8} />;
  }

  if (table == null) return null;

  return (
    <Flex
      align="stretch"
      direction="col"
      className={cn('w-full gap-3', className)}
    >
      <ScrollArea className={cn(classNames?.tableRootClassName)}>
        <TableRoot
          className={cn(
            expandable && 'border-separate border-spacing-y-3 border-y-0',
            classNames?.tableClassName
          )}
        >
          {table.getHeaderGroups().map(headerGroup => (
            <TableHead
              key={headerGroup.id}
              className={cn(
                expandable && 'border-b-0',
                classNames?.headerClassName
              )}
            >
              <TableRow
                className={cn(
                  'hover:bg-inherit dark:hover:bg-inherit',
                  classNames?.headerRowClassName
                )}
              >
                {headerGroup.headers.map((header, index, array) => {
                  const isSticky = header.column.columnDef?.meta?.isSticky;
                  const isStickyRight =
                    header.column.columnDef?.meta?.isSticky &&
                    header.column.columnDef.meta?.stickyPosition !== 'left';
                  const className = header.column.columnDef?.meta?.className;
                  const isStickyLeft =
                    header.column.columnDef?.meta?.isSticky &&
                    header.column.columnDef.meta?.stickyPosition === 'left';

                  return (
                    <TableHeaderCell
                      key={header.id}
                      {...{
                        colSpan: header.colSpan,
                        style: {
                          width:
                            header.getSize() === Number.MAX_SAFE_INTEGER
                              ? 'auto'
                              : header.getSize(),
                        },
                      }}
                      className={cn(
                        expandable && 'border-r-0',
                        isSticky && '2xl:sticky',
                        isSticky &&
                          cn(stickyCellBgColor, stickyCellBorderColor),
                        isStickyRight && !isEmptyTable && 'right-0',
                        isStickyLeft && !isEmptyTable && 'left-0',
                        // isStickyRight &&
                        //   isScrollable &&
                        //   !isEmptyTable &&
                        //   'sticky-table-cell-right bg-white dark:bg-dark-50',
                        isStickyLeft &&
                          !isEmptyTable &&
                          'sticky-table-cell-left left-0 border-r-0',
                        // isStickyLeft &&
                        //   isNotScroll &&
                        //   !isEmptyTable &&
                        //   'bg-transparent dark:bg-transparent',
                        header.column.columnDef.meta?.align === 'center' &&
                          'text-center',
                        header.column.columnDef.meta?.align === 'right' &&
                          'text-right',
                        // index + 1 === array.length - 1 && 'border-r-0',
                        isStickyRight &&
                          index + 1 === array.length &&
                          'sticky-table-cell-right',
                        classNames?.headerCellClassName,
                        isStickyLeft && cn('before:-right-px'),
                        isStickyRight && cn('before:-left-px'),
                        className
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: cn(
                              header.column.getCanSort()
                                ? 'flex cursor-pointer select-none items-center gap-2'
                                : '',
                              header.column.columnDef.meta?.align ===
                                'center' && 'justify-center text-center',
                              header.column.columnDef.meta?.align === 'right' &&
                                'justify-end text-right'
                            ),
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort()
                            ? ({
                                asc: (
                                  <ArrowUpWideNarrow className="h-4 w-4 shrink-0" />
                                ),
                                desc: (
                                  <ArrowDownWideNarrow className="h-4 w-4 shrink-0" />
                                ),
                              }[header.column.getIsSorted() as string] ??
                              (header.column.columnDef.header !== '' && (
                                <ArrowDownUp className="h-4 w-4 shrink-0" />
                              )))
                            : null}
                        </div>
                      )}
                    </TableHeaderCell>
                  );
                })}
              </TableRow>
            </TableHead>
          ))}

          <TableBody>
            {table.getRowModel().rows.map(row => {
              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      row.getIsSelected() && 'bg-muted/70',
                      expandable && 'rounded-lg',
                      expandable && !row.getIsExpanded() && 'shadow-button',
                      expandable &&
                        row.getIsExpanded() &&
                        'rounded-b-none bg-muted/40',
                      table.options.meta?.getRowStyles?.(row)
                    )}
                    {...(onRowClick && { onClick: () => onRowClick(row) })}
                  >
                    {row.getVisibleCells().map((cell, cellIndex, cellArray) => {
                      const isSticky = cell.column.columnDef?.meta?.isSticky;
                      const isStickyRight =
                        cell.column.columnDef?.meta?.isSticky &&
                        cell.column.columnDef.meta?.stickyPosition !== 'left';
                      const className = cell.column.columnDef?.meta?.className;
                      const isStickyLeft =
                        cell.column.columnDef?.meta?.isSticky &&
                        cell.column.columnDef.meta?.stickyPosition === 'left';

                      return (
                        <TableCell
                          key={cell.id}
                          data-cell-index={cellIndex + 1}
                          data-sticky-position={
                            cell.column.columnDef.meta?.stickyPosition
                          }
                          {...{
                            className: cn('td box-border break-words'),
                            style: {
                              width:
                                cell.column.getSize() ===
                                Number.MAX_SAFE_INTEGER
                                  ? 'auto'
                                  : cell.column.getSize(),
                            },
                          }}
                          className={cn(
                            // 'truncate',
                            expandable &&
                              'border-r-0 first:rounded-l-lg last:rounded-r-lg',
                            expandable &&
                              row.getIsExpanded() &&
                              'first:rounded-b-none last:rounded-b-none',
                            isSticky && '2xl:sticky',
                            isSticky &&
                              cn(stickyCellBgColor, stickyCellBorderColor),
                            isStickyRight && 'right-0',
                            isStickyLeft && 'left-0',
                            // isStickyRight &&
                            //   isScrollable &&
                            //   'sticky-table-cell-right bg-white dark:bg-dark-50',
                            isStickyLeft &&
                              'sticky-table-cell-left left-0 border-r-0',
                            row.getIsSelected() && isSticky && 'bg-muted/70',
                            // isStickyLeft && isNotScroll && 'bg-transparent dark:bg-transparent',
                            cell.column.columnDef.meta?.align === 'center' &&
                              'text-center',
                            cell.column.columnDef.meta?.align === 'right' &&
                              'text-right',
                            classNames?.tableCellClassName,
                            // cellIndex + 1 === cellArray.length - 1 && 'border-r-0',
                            isStickyRight &&
                              cellIndex + 1 === cellArray.length &&
                              'sticky-table-cell-right',
                            isStickyLeft && cn('before:-right-px'),
                            isStickyRight && cn('before:-left-px'),
                            className
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <tr className="!border-t-0">
                      <TableCell
                        colSpan={row.getVisibleCells().length}
                        className="p-0"
                      >
                        <RenderComponentWithProps
                          as={renderSubComponent}
                          row={row}
                        />
                      </TableCell>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </TableBody>

          {tableFoot === true ? (
            <TableFoot
              className={cn(
                classNames?.tableFooterClassName,
                'border-steel-200 border-t dark:border-steel-600'
              )}
            >
              {table.getFooterGroups().map(footerGroup => (
                <TableRow
                  key={footerGroup.id}
                  className="hover:bg-inherit dark:hover:bg-inherit"
                >
                  {footerGroup.headers.map(footer => {
                    const isSticky = footer.column.columnDef?.meta?.isSticky;
                    const isStickyRight =
                      footer.column.columnDef?.meta?.isSticky &&
                      footer.column.columnDef.meta?.stickyPosition !== 'left';
                    const metaClassName =
                      footer.column.columnDef?.meta?.className;
                    const isStickyLeft =
                      footer.column.columnDef?.meta?.isSticky &&
                      footer.column.columnDef.meta?.stickyPosition === 'left';
                    return (
                      <TableCell
                        key={footer.id}
                        {...{
                          colSpan: footer.colSpan,
                          style: {
                            width:
                              footer.getSize() === Number.MAX_SAFE_INTEGER
                                ? 'auto'
                                : footer.getSize(),
                          },
                        }}
                        className={cn(
                          metaClassName,
                          classNames?.tableCellClassName,
                          isSticky && '2xl:sticky',
                          isStickyRight && 'right-0',
                          isStickyLeft && 'left-0',
                          // isStickyRight &&
                          //   isScrollable &&
                          //   'sticky-table-cell-right bg-white dark:bg-dark-50',
                          // isStickyLeft && 'sticky-table-cell-left left-0 border-r-0'
                          // isStickyLeft && isNotScroll && 'bg-transparent dark:bg-transparent'
                          isStickyLeft && cn('before:-right-px'),
                          isStickyRight && cn('before:-left-px')
                        )}
                      >
                        {footer.isPlaceholder
                          ? null
                          : flexRender(
                              footer.column.columnDef.footer,
                              footer.getContext()
                            )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableFoot>
          ) : (
            tableFoot
          )}
        </TableRoot>
      </ScrollArea>
      {isEmptyTable && <NotFound className={classNames?.notFoundClassName} />}
    </Flex>
  );
}
