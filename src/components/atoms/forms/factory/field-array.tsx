import { useSize } from 'ahooks';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import { Fragment, type JSX, useRef } from 'react';
import {
  type FieldValues,
  type Path,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import { FormFieldWrapper } from '@/components/atoms/forms/factory/methods';
import type {
  FooterCell,
  FormFieldDef,
} from '@/components/atoms/forms/factory/types';
// import { Button } from '@/components/atoms/button/button';
import { Box } from '@/components/atoms/layout';
import { FieldArrayActions } from '@/components/atoms/table/field-array-actions';
import {
  baseStyles,
  borderColor,
  headerClassNames,
} from '@/components/atoms/table-grid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const stickyClassName = cn('sticky right-0 bg-white dark:bg-dark-100');

export function FieldArray<TFieldValues extends FieldValues>({
  variant = 'text',
  column,
}: {
  variant?: 'text' | 'flat' | 'outline' | undefined;
  column: FormFieldDef<TFieldValues>;
}): JSX.Element {
  const containerRef = useRef(null);
  const containerSize = useSize(containerRef);
  const innerContainerRef = useRef(null);
  const innerContainerSize = useSize(innerContainerRef);
  // console.log(column);
  const { fields, append, remove } = useFieldArray({
    name: column.name as string,
  });
  // console.log('column', column);

  const watchedValues = useWatch({ name: column.name as string });

  function addField() {
    append(column.defaultValues);
  }

  // Helper function to determine active field for conditional rendering
  const getActiveField = (
    cell: FormFieldDef<TFieldValues>,
    rowValue: unknown,
    index: number
  ) => {
    if (cell.type !== 'conditional') return cell;

    const matchedCondition = cell.conditions?.find(condition =>
      condition.when(rowValue, index)
    );

    return matchedCondition?.field || cell.defaultField || null;
  };

  function calculateTemplateColumns(
    columns: FormFieldDef<TFieldValues>[] | undefined
  ) {
    const columnsArray = columns || [];

    // Calculate total columns including expanded conditional fields
    const expandedColumns: FormFieldDef<TFieldValues>[] = [];

    columnsArray.forEach(column => {
      if (column.type === 'conditional') {
        const firstRowValue = watchedValues?.[0];
        const activeFields = getActiveField(column, firstRowValue, 0);

        if (activeFields && Array.isArray(activeFields)) {
          // Add each field in the array as a separate column
          activeFields.forEach(field => {
            expandedColumns.push({ ...field, size: field.size || 100 });
          });
        }
      } else {
        expandedColumns.push(column);
      }
    });

    // Rest of the calculation logic remains the same
    const template = [];
    let currentSize = expandedColumns[0]?.size ?? 100;
    let count = 1;

    for (let i = 1; i <= expandedColumns.length; i++) {
      const nextSize = expandedColumns[i]?.size ?? 100;

      if (nextSize === currentSize && i < expandedColumns.length) {
        count++;
      } else {
        template.push(
          count > 1
            ? `repeat(${count}, minmax(${currentSize}px, 1fr))`
            : `minmax(${currentSize}px, 1fr)`
        );
        currentSize = nextSize;
        count = 1;
      }
    }

    if (!column.disableColumnRepeat) {
      template.push('100px');
    }

    return {
      gridTemplateColumns: template.join(' '),
    };
  }

  // const gridColsClass = convertToGridCols(columnSizes);

  // const grid = `grid-cols-[${cell.size}]`;
  // console.log('gridColsClass', gridColsClass);

  const style = calculateTemplateColumns(column.fields);

  // Calculate footer rows (simple like table-grid)
  const footerRows: Array<Array<FooterCell | null>> = [];

  // Get the expanded columns (same logic as used for headers)
  const expandedColumns: FormFieldDef<TFieldValues>[] = [];

  if (column.fields) {
    column.fields.forEach(field => {
      if (field.type === 'conditional') {
        const firstRowValue = watchedValues?.[0];
        const activeFields = getActiveField(field, firstRowValue, 0);

        if (activeFields && Array.isArray(activeFields)) {
          expandedColumns.push(...activeFields);
        }
      } else {
        expandedColumns.push(field);
      }
    });
  }

  // Simple footer calculation like table-grid
  expandedColumns.forEach(col => {
    const footers = col.footer?.(watchedValues || []) ?? [];

    footers.forEach((footerCell, i) => {
      if (!footerRows[i]) {
        footerRows[i] = new Array(expandedColumns.length).fill(null);
      }

      const columnIndex = expandedColumns.indexOf(col);
      footerRows[i][columnIndex] = footerCell;
    });
  });

  const containerWidth =
    containerSize?.width && Math.trunc(containerSize?.width);
  const innerContainerWidth =
    innerContainerSize?.width && Math.trunc(innerContainerSize?.width);
  const isScrollable = containerWidth !== innerContainerWidth;

  return (
    <Box
      role="grid"
      ref={containerRef}
      className={cn(
        'scrollbar grid overflow-x-auto border-t',
        borderColor,
        // isScrollable && 'border-b',
        column.className
      )}
      style={style}
    >
      {column.fields?.map((cell, index, array) => {
        // For conditional fields, show the header based on the first row's condition
        if (cell.type === 'conditional') {
          const firstRowValue = watchedValues?.[0];
          const activeFields = getActiveField(cell, firstRowValue, 0);

          if (!(activeFields && Array.isArray(activeFields))) return null;

          // Always handle as array - much simpler!
          return activeFields.map((field, subIndex) => (
            <Box
              key={`${cell.name}-header-${subIndex}`}
              className={cn(
                baseStyles,
                'border-r',
                borderColor,
                headerClassNames,
                // Remove border-r on the last header of the last conditional field
                subIndex === activeFields.length - 1 &&
                  index === array.length - 1 &&
                  'border-r-0',
                cell.headerClassName
              )}
            >
              {field.header}{' '}
              {field.isRequired && <span className="text-red-500">*</span>}
            </Box>
          ));
        }

        return (
          <Box
            key={cell.name as string}
            className={cn(
              baseStyles,
              'border-r',
              borderColor,
              headerClassNames,
              array.length - 1 === index && 'border-r-0',
              cell.headerClassName
              // column.className
            )}
          >
            {cell.header}{' '}
            {cell.isRequired && <span className="text-red-500">*</span>}
          </Box>
        );
      })}

      {!column.disableColumnRepeat && (
        <span
          className={cn(
            baseStyles,
            borderColor,
            stickyClassName,
            'border-l bg-white/60 backdrop-blur-sm',
            headerClassNames
            // column.className
          )}
        />
      )}

      {isEmpty(fields) && (
        <Box
          className={cn(
            baseStyles,
            borderColor,
            'col-span-full border-y text-center text-steel-500'
          )}
        >
          <Button onClick={addField}>Add Record</Button>
        </Box>
      )}

      {fields.map((field, fieldIndex, fieldArray) => {
        if (!column.fields) return null;

        return (
          <div
            key={field.id}
            ref={innerContainerRef}
            className={cn(
              'col-span-full grid',
              fieldIndex + 1 === fieldArray.length && `border-b ${borderColor}`,
              column.className
            )}
            style={style}
          >
            {column.fields.map((cell, index, array) => {
              // Handle conditional field rendering
              if (cell.type === 'conditional') {
                const currentRowValue = watchedValues?.[fieldIndex];
                const activeFields = getActiveField(
                  cell,
                  currentRowValue,
                  fieldIndex
                );

                if (!(activeFields && Array.isArray(activeFields))) return null;

                // Always handle as array - much simpler!
                return activeFields.map((field, subIndex) => {
                  const cellConfig = {
                    ...omit(field, 'size', 'footer'),
                    variant,
                    className: cn(field.className, cell.className),
                    ...(field.type === 'select' &&
                      field.unique && {
                        allRowValues: watchedValues || [],
                        fieldName: field.name,
                        unique: true,
                      }),
                  };

                  return (
                    <Fragment key={`${cell.name}-${fieldIndex}-${subIndex}`}>
                      <FormFieldWrapper
                        {...cellConfig}
                        index={fieldIndex}
                        rowData={watchedValues?.[fieldIndex]}
                        className={cn(
                          'border-steel-100 border-t border-r dark:border-dark-300',
                          // Remove border-r on the last field of the conditional group
                          subIndex === activeFields.length - 1 &&
                            array.length - 1 === index &&
                            'border-r-0',
                          cell.className
                        )}
                        name={
                          [column.name, fieldIndex, field.name].join(
                            '.'
                          ) as Path<TFieldValues>
                        }
                      />
                    </Fragment>
                  );
                });
              }

              const cellConfig = {
                ...omit(cell, 'size', 'footer'),
                variant,
                // 🔥 NEW: Automatically add unique filtering for ANY select field with unique: true
                ...(cell.type === 'select' &&
                  cell.unique && {
                    allRowValues: watchedValues || [],
                    fieldName: cell.name,
                    unique: true,
                  }),
              };

              const isFieldArraySwitch =
                column.type === 'fieldArray' && cell.type === 'switch';

              // console.log('cellConfig', cellConfig);

              // console.log('array', array.length - 1, cell.name);
              return (
                <Fragment key={cell.name as string}>
                  <FormFieldWrapper
                    {...cellConfig}
                    index={fieldIndex}
                    rowData={watchedValues?.[fieldIndex]}
                    className={cn(
                      'border-steel-100 border-t border-r dark:border-dark-300',
                      array.length - 1 === index && 'border-r-0',
                      isFieldArraySwitch && 'justify-center px-3.5',
                      cell.className
                    )}
                    name={
                      [column.name, fieldIndex, cell.name].join(
                        '.'
                      ) as Path<TFieldValues>
                    }
                  />
                </Fragment>
              );
            })}

            {!column.disableColumnRepeat && (
              <FieldArrayActions
                className={cn(
                  'field-array-action flex items-center justify-start gap-2 border-steel-100 border-t border-l px-3 dark:border-dark-300',
                  stickyClassName,
                  'bg-white/60 backdrop-blur-sm'
                )}
                onAdd={addField}
                onRemove={() => remove(fieldIndex)}
                showAddAction={fields.length - 1 === fieldIndex}
                showRemoveAction={true}
                // showRemoveAction={fields.length > 1}
              />
            )}
          </div>
        );
      })}

      {/* Footer Rows */}
      {footerRows.map((footerRow, rowIndex) => (
        <div
          key={`footer-${rowIndex}`}
          className={cn(
            'col-span-full grid border-b',
            isScrollable && 'last:border-b',
            rowIndex === 0 && 'border-t',
            borderColor
          )}
          style={style}
        >
          {footerRow.map((cell, colIndex) => (
            <div
              key={`footer-cell-${rowIndex}-${colIndex}`}
              className={cn(
                baseStyles,
                cell &&
                  colIndex < footerRow.length - 1 &&
                  `border-r ${borderColor}`,
                cell?.className
              )}
            >
              {cell?.render}
            </div>
          ))}

          {!column.disableColumnRepeat && (
            <div
              className={cn(
                baseStyles,
                'border-l',
                borderColor,
                stickyClassName,
                'bg-white/60 backdrop-blur-sm'
              )}
            />
          )}
        </div>
      ))}
    </Box>
  );
}
