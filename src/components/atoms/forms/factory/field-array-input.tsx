import isEmpty from 'lodash/isEmpty';
import { Fragment } from 'react';
import { type FieldValues, type Path, useFieldArray } from 'react-hook-form';
// import { Button } from '@/components/atoms/button/button';
import { Box, Grid } from '@/components/atoms/layout';
// import { FieldArrayActions } from '@/components/atoms/table/field-array-actions';
// import { cn } from '@/lib/utils';
import { FormFieldWrapper } from './methods';
import type { FormFieldDef } from './types';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { FieldArrayActions } from '@/components/atoms/table/field-array-actions';

export function FieldArrayInput<TFieldValues extends FieldValues>({
  // variant = 'text',
  column,
}: {
  variant?: 'text' | 'flat' | 'outline' | undefined;
  column: FormFieldDef<TFieldValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    name: column.name as string,
  });

  function addField() {
    append(column.defaultValues);
  }

  if (isEmpty(fields)) {
    return (
      <Box className={cn(column.className)}>
        <Button onClick={addField}>
          {column.label ?? 'Add Record'}
        </Button>
      </Box>
    );
  }

  return (
    <Grid className={cn('gap-4', column.className)}>
      {/* <Label className="mb-0">{column?.fields?.[0]?.header}</Label> */}
      {fields.map((field, fieldIndex, fieldArray) => {
        if (!column.fields) return null;

        // console.log('field', field);

        return (
          <Fragment key={field.id}>
            {column.fields.map((cell, index, array) => {
              // console.log('cell', cell);
              const cellConfig = {
                ...cell,
                // fieldArray: true,
                ...(cell?.header && {
                  label: `${cell.header} #${fieldIndex + 1}`,
                }),
                className: cn('col-span-1', cell.className),
                // variant: 'outline',
              };

              return (
                <Grid
                  key={cell.name as string}
                  className={cn('grid-cols-[1fr_61px] items-start gap-4')}
                >
                  <FormFieldWrapper
                    {...cellConfig}
                    index={fieldIndex}
                    name={[column.name, fieldIndex, cell.name].join('.') as Path<TFieldValues>}
                  />

                  <FieldArrayActions
                    className={cn(cell?.header ? 'mt-10' : 'mt-2.5')}
                    onAdd={addField}
                    onRemove={() => remove(fieldIndex)}
                    showAddAction={fields.length - 1 === fieldIndex}
                    showRemoveAction={true}
                  />
                </Grid>
              );
            })}
          </Fragment>
        );
      })}
    </Grid>
  );
}
