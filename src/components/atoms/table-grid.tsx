'use client';

import { useSize } from 'ahooks';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { useRef, useState } from 'react';
import type { Paths } from 'type-fest';
// import { Card } from '@/components/atoms/card';
import { Title } from '@/components/atoms/content';
import { Box, Flex } from '@/components/atoms/layout';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface FooterCell {
  render: React.ReactNode;
  className?: string;
}

export interface Column<T> {
  size?: number;
  sticky?: 'left' | 'right';
  accessorKey: Paths<T>;
  // className?: string;
  className?: string | ((row?: T) => string);
  headerClassName?: string;
  cellClassName?: string;
  header: React.ReactNode;
  cell?: ({
    row,
    toggleExpansion,
    isExpanded,
  }: {
    row: T;
    toggleExpansion?: () => void;
    isExpanded?: boolean;
  }) => React.ReactNode;
  footer?: ({ row }: { row: T }) => FooterCell[];
}

// Enhanced column interface
export interface EnhancedColumn<T> extends Column<T> {
  getStart: (side?: 'left') => number;
  getAfter: (side?: 'right') => number;
  getSize: () => number;
}

export const baseStyles = 'px-4 py-3 whitespace-nowrap text-left text-sm';
export const centerCell = 'flex items-center';
export const headerStyles =
  'px-4 py-3 whitespace-nowrap text-left text-sm font-medium';
export const borderColor = 'border-steel-100 dark:border-dark-300';
export const headerClassNames = 'font-medium text-steel-400 dark:text-dark-600';
export const cellClassNames = 'align-middle text-steel-700 dark:text-dark-800';
const stickyBorder =
  'before:w-[1px] before:absolute before:h-full before:content-[""] before:bg-steel-100 dark:before:bg-dark-300 before:top-0';
const stickyClassNames = cn(
  'right-0 bg-white md:sticky dark:bg-dark-100',
  stickyBorder
);
const stickyLeftClassNames = 'before:-right-px';
const stickyRightClassNames = 'before:-left-px';
const defaultColumnSize = 200;

function calculateTemplateColumns<T>(columns: Column<T>[]) {
  const template = [];

  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    let currentTemplate: string;

    if (column.size) {
      // Use exact size if specified
      currentTemplate = `${column.size}px`;
    } else {
      // Allow expansion to fill space
      currentTemplate = `minmax(${defaultColumnSize}px, 1fr)`;
    }

    // Group consecutive identical templates
    let count = 1;

    while (i + count < columns.length) {
      const nextColumn = columns[i + count];
      let nextTemplate: string;

      if (nextColumn.size) {
        nextTemplate = `${nextColumn.size}px`;
      } else {
        nextTemplate = `minmax(${defaultColumnSize}px, 1fr)`;
      }

      if (nextTemplate === currentTemplate) {
        count++;
      } else {
        break;
      }
    }

    // Add to template
    template.push(
      count > 1 ? `repeat(${count}, ${currentTemplate})` : currentTemplate
    );

    // Skip the grouped columns
    i += count - 1;
  }

  return {
    gridTemplateColumns: template.join(' '),
  };
}

// Function to enhance columns with position methods
function enhanceColumnsWithMethods<T>(
  columns: Column<T>[]
): EnhancedColumn<T>[] {
  return columns.map((column, currentIndex) => ({
    ...column,

    // Get the left offset (start position) for this column
    getStart: (side?: 'left') => {
      if (side === 'left') {
        // Sum all preceding columns
        return columns.slice(0, currentIndex).reduce((sum, col) => {
          return sum + (col.size ?? defaultColumnSize);
        }, 0);
      }

      return 0;
    },

    // Get the right offset for this column (useful for right-sticky)
    getAfter: (side?: 'right') => {
      if (side === 'right') {
        // Sum all columns after this one
        return columns.slice(currentIndex + 1).reduce((sum, col) => {
          return sum + (col.size ?? defaultColumnSize);
        }, 0);
      }

      return 0;
    },

    // Get the size of this column
    getSize: () => {
      return column.size ?? defaultColumnSize;
    },
  }));
}

function getStickyStyles<T>(column: EnhancedColumn<T>) {
  return {
    left: column.sticky === 'left' ? `${column.getStart('left')}px` : undefined,
    right:
      column.sticky === 'right' ? `${column.getAfter('right')}px` : undefined,
    opacity: column.sticky ? 0.95 : 1,
    zIndex: column.sticky ? 1 : 0,
  };
}

interface TableGridProps<TData> {
  columns: Column<TData>[];
  data: TData[];
  rowKeyExtractor?: (item: TData, index: number) => string | number;
  title?: string;
  action?: React.ReactNode;
  titleClassName?: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  caption?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  // New props for expandable rows
  renderSubComponent?: (props: { row: TData }) => React.ReactElement;
  getRowCanExpand?: (row: TData) => boolean;
  expandedRows?: Set<string | number>;
  onExpandedRowsChange?: (expandedRows: Set<string | number>) => void;
}

export function TableGrid<TData>({
  title,
  data,
  action,
  titleClassName,
  columns,
  rowKeyExtractor,
  className = '',
  tableClassName = '',
  headerClassName = '',
  caption,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  // New props
  renderSubComponent,
  getRowCanExpand,
  expandedRows: controlledExpandedRows,
  onExpandedRowsChange,
}: TableGridProps<TData>) {
  const containerRef = useRef(null);
  const containerSize = useSize(containerRef);
  const innerContainerRef = useRef(null);
  const innerContainerSize = useSize(innerContainerRef);

  // Internal state for expanded rows (used when not controlled)
  const [internalExpandedRows, setInternalExpandedRows] = useState<
    Set<string | number>
  >(new Set());

  // Use controlled or internal expanded rows
  const expandedRows = controlledExpandedRows ?? internalExpandedRows;
  const setExpandedRows = onExpandedRowsChange ?? setInternalExpandedRows;

  const style = calculateTemplateColumns<TData>(columns);

  // Enhance columns with helper methods
  const enhancedColumns = enhanceColumnsWithMethods(columns);

  if (!columns?.length) {
    return null;
  }

  const renderCell = (
    row: TData,
    column: Column<TData>,
    rowIndex: number
  ): React.ReactNode => {
    const rowKey = rowKeyExtractor ? rowKeyExtractor(row, rowIndex) : rowIndex;
    const isExpanded = expandedRows.has(rowKey);
    const canExpand = getRowCanExpand
      ? getRowCanExpand(row)
      : !!renderSubComponent;

    const toggleExpansion = () => {
      if (!canExpand) return;

      const newExpandedRows = new Set(expandedRows);

      if (isExpanded) {
        newExpandedRows.delete(rowKey);
      } else {
        newExpandedRows.add(rowKey);
      }

      setExpandedRows(newExpandedRows);
    };

    if (column.cell) {
      return column.cell({
        row,
        toggleExpansion: canExpand ? toggleExpansion : undefined,
        isExpanded: canExpand ? isExpanded : undefined,
      });
    }

    const value = get(row, column.accessorKey, '');

    // Handle null, undefined, or empty values
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return String(value);
  };

  const containerWidth =
    containerSize?.width && Math.trunc(containerSize?.width);
  const innerContainerWidth =
    innerContainerSize?.width && Math.trunc(innerContainerSize?.width);
  const isScrollable = containerWidth !== innerContainerWidth;

  const footerRows: Array<Array<FooterCell | null>> = [];
  enhancedColumns.forEach(col => {
    const footers = col.footer?.({ row: {} as TData }) ?? [];

    footers.forEach((footerCell, i) => {
      if (!footerRows[i]) {
        footerRows[i] = new Array(enhancedColumns.length).fill(null);
      }

      const columnIndex = enhancedColumns.indexOf(col);
      footerRows[i][columnIndex] = footerCell;
    });
  });

  const headerContent = (
    <>
      {title && (
        <Title className={cn('mb-4 text-base md:mb-0', titleClassName)}>
          {title}
        </Title>
      )}
      {action}
    </>
  );
  const RenderSubComponent = renderSubComponent;
  return (
    <Card className={cn('grid grid-cols-1 4xl:p-0 md:p-0', className)}>
      {(title || action) && (
        <Flex
          className={cn('col-span-full px-0 md:px-5 md:py-4', headerClassName)}
        >
          {headerContent}
        </Flex>
      )}
      <div
        ref={containerRef}
        role="grid"
        aria-rowcount={data.length + 1} // +1 for header row
        aria-colcount={columns.length}
        className={cn(
          'scrollbar grid overflow-x-auto',
          title && 'border-t',
          borderColor,
          tableClassName
        )}
        style={style}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {caption && (
          <div className="sr-only" role="caption">
            {caption}
          </div>
        )}

        {/* Header Row */}
        <div role="row" aria-rowindex={1} className="contents">
          {enhancedColumns.map((column, index) => (
            <div
              key={String(column.accessorKey) || index}
              role="columnheader"
              aria-colindex={index + 1}
              style={getStickyStyles(column)}
              className={cn(
                headerStyles,
                headerClassNames,
                index < columns.length - 1 && `border-r ${borderColor}`,
                column.sticky && stickyClassNames,
                column.sticky === 'left' && stickyLeftClassNames,
                column.sticky === 'right' && stickyRightClassNames,
                // column.className,
                typeof column.className === 'function'
                  ? column.className(undefined)
                  : column.className,
                column.headerClassName
              )}
            >
              {column.header}
            </div>
          ))}
        </div>

        {isEmpty(data) && (
          <Box
            className={cn(
              baseStyles,
              borderColor,
              'col-span-full border-t py-8 text-center text-steel-500'
            )}
          >
            No Records Found
          </Box>
        )}

        {/* Data Rows */}
        {data.map((item, rowIndex, itemArray) => {
          const rowKey = rowKeyExtractor
            ? rowKeyExtractor(item, rowIndex)
            : rowIndex;
          const isExpanded = expandedRows.has(rowKey);
          const canExpand = getRowCanExpand
            ? getRowCanExpand(item)
            : !!renderSubComponent;

          return (
            <div key={`row-group-${rowKey}`} className="contents">
              {/* Main Row */}
              <div
                ref={innerContainerRef}
                role="row"
                aria-rowindex={rowIndex + 2} // +2 because header row is index 1
                aria-expanded={canExpand ? isExpanded : undefined}
                className={cn(
                  'col-span-full grid border-t',
                  isScrollable &&
                    !isExpanded &&
                    rowIndex === itemArray.length - 1 &&
                    'last:border-b',
                  borderColor
                )}
                style={style}
              >
                {enhancedColumns.map((column, colIndex) => {
                  const columnsLength = columns.length;
                  return (
                    <div
                      key={`${rowKey}-${String(column.accessorKey)}`}
                      role="gridcell"
                      aria-colindex={colIndex + 1}
                      data-sticky-position={column.sticky}
                      style={getStickyStyles(column)}
                      className={cn(
                        baseStyles,
                        cellClassNames,
                        colIndex < columnsLength - 1 &&
                          `border-r ${borderColor}`,
                        column.sticky && stickyClassNames,
                        column.sticky === 'left' && stickyLeftClassNames,
                        column.sticky === 'right' && stickyRightClassNames,
                        centerCell,
                        typeof column.className === 'function'
                          ? column.className(item)
                          : column.className,
                        column.cellClassName
                      )}
                    >
                      {renderCell(item, column, rowIndex)}
                    </div>
                  );
                })}
              </div>

              {/* Expanded Sub-Component Row */}
              {isExpanded && RenderSubComponent && (
                <div
                  role="row"
                  aria-rowindex={rowIndex + 2.5} // Between main row and next row
                  className={cn(
                    'col-span-full grid border-t bg-steel-50 dark:bg-dark-50',
                    isScrollable &&
                      rowIndex === itemArray.length - 1 &&
                      'border-b',
                    borderColor
                  )}
                >
                  <div
                    role="gridcell"
                    className={cn('col-span-full', borderColor)}
                  >
                    <RenderSubComponent row={item} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer Rows */}
        {footerRows.map((footerRow, rowIndex) => (
          <div
            key={`footer-${rowIndex}`}
            role="row"
            aria-rowindex={data.length + 2 + rowIndex}
            className={cn(
              'col-span-full grid border-t',
              isScrollable && 'last:border-b',
              borderColor
            )}
            style={style}
          >
            {footerRow.map((cell, colIndex) => {
              const column = enhancedColumns[colIndex];

              return (
                <div
                  key={`footer-cell-${rowIndex}-${colIndex}`}
                  role="gridcell"
                  aria-colindex={colIndex + 1}
                  style={getStickyStyles(column)}
                  className={cn(
                    baseStyles,
                    cell &&
                      colIndex < enhancedColumns.length - 1 &&
                      `border-r ${borderColor}`,
                    column.sticky && stickyClassNames,
                    column.sticky === 'left' && stickyLeftClassNames,
                    column.sticky === 'right' && stickyRightClassNames,
                    columns[colIndex]?.className,
                    cell?.className
                  )}
                >
                  {cell?.render}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
