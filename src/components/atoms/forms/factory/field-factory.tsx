import { Fragment } from 'react';
import type { FieldValues } from 'react-hook-form';
import { Title } from '@/components/atoms/content';
import { Box, Flex } from '@/components/atoms/layout';
import { cn } from '@/lib/utils/cn';
import type { FormFieldDef } from '@/components/atoms/forms/factory/types';
import { Card } from '@/components/ui/card';
import { FieldError } from '@/components/atoms/forms/error';
import { FieldArray } from '@/components/atoms/forms/factory/field-array';
import { FieldArrayInput } from '@/components/atoms/forms/factory/field-array-input';
import { FormFieldWrapper } from '@/components/atoms/forms/factory/methods';

export type FieldFactoryProps<TFields> = {
  title?: string;
  error?: string;
  titleClassName?: string;
  errorClassName?: string;
  action?: React.ReactNode;
  fields: TFields;
  variant?: 'card' | 'default';
  className?: string;
  prefix?: string;
};

export function FieldFactory<TFieldValues extends FieldValues>({
  title,
  error,
  action,
  variant = 'card',
  titleClassName,
  errorClassName,
  ...rest
}: FieldFactoryProps<Array<Array<FormFieldDef<TFieldValues>>>>) {
  //divide-x divide-y border

  // console.log('rest', rest);
  const headerContent = (
    <>
      {title && <Title className={cn('text-base 2xl:text-lg', titleClassName)}>{title}</Title>}
      {action}
    </>
  );

  return variant === 'card' ? (
    <Card
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:gap-6 2xl:grid-cols-3',
        rest.className
      )}
    >
      {(title || action) && <Flex className="col-span-full">{headerContent}</Flex>}

      <FieldRenderer {...rest} />
      {error && <FieldError error={error} className={cn('mt-0', errorClassName)} />}
    </Card>
  ) : (
    <Box
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:gap-6 2xl:grid-cols-3',
        rest.className
      )}
    >
      {(title || action) && <Flex className="col-span-full">{headerContent}</Flex>}
      <FieldRenderer {...rest} />
    </Box>
  );
}

function FieldRenderer<TFieldValues extends FieldValues>({
  fields,
}: FieldFactoryProps<Array<Array<FormFieldDef<TFieldValues>>>>) {
  // console.log('fields', fields);
  return fields.map((row, index) => {
    // const id = useId();
    return (
      <Fragment key={index}>
        {row.map((column, idx) => {
          // console.log('column', column);

          if (column.type === 'fieldArray') {
            return (
              <Fragment key={column.name as string}>
                <FieldArray column={column} />
              </Fragment>
            );
          }

          if (column.type === 'fieldArrayInput') {
            return (
              <Fragment key={column.name as string}>
                <FieldArrayInput column={column} />
              </Fragment>
            );
          }

          return (
            <Fragment key={column.name as string}>
              <FormFieldWrapper index={idx} {...column} />
            </Fragment>
          );
        })}
      </Fragment>
    );
  });
}
