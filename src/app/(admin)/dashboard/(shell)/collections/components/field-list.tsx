'use client';

import { useId } from 'react';
import { useForm as useRHFForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { FormInput as Input } from '@/components/ui/input';
import { FormItem, FormMessage } from '@/components/ui/form';
import {
  updateCollectionField,
  deleteCollectionField,
} from '../_modules/collections.actions';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

export type FieldRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
};

const updateFieldSchema = z.object({
  label: z.string().min(1, 'Label is required').max(150),
  type: z.enum([
    'text',
    'richtext',
    'number',
    'boolean',
    'date',
    'select',
    'media',
    'relation',
  ]),
  required: z.boolean().default(false),
});

export function FieldList({
  fields,
  collectionId,
}: {
  fields: FieldRow[];
  collectionId: string;
}) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No fields yet. Add one above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {fields.map(field => {
        const fieldForm = useRHFForm({
          resolver: zodResolver(updateFieldSchema) as any,
          defaultValues: {
            label: field.label,
            type: field.type,
            required: field.required,
          },
        });

        const { submit, isPending } = useFormAction(
          (data: any) =>
            updateCollectionField(
              objectToFormData({
                collectionId,
                fieldId: field.id,
                label: data.label,
                type: data.type,
                ...(data.required ? { required: 'on' } : {}),
              })
            ),
          {
            onSuccess: () => {
              fieldForm.reset();
            },
          }
        );

        const onSubmit = (data: any) => {
          submit(data);
        };

        return (
          <div
            key={field.id}
            className="flex items-center gap-3 border border-input p-3 rounded-lg"
          >
            <FormProvider {...fieldForm}>
              <form
                onSubmit={fieldForm.handleSubmit(onSubmit)}
                className="flex-1"
              >
                <input type="hidden" name="fieldId" value={field.id} />
                <input
                  type="hidden"
                  name="collectionId"
                  value={collectionId}
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Controller
                    name="label"
                    render={({ field: f, fieldState }) => {
                      const id = useId();
                      return (
                        <>
                          <Label htmlFor={id}>{field.label}</Label>
                          <Input id={id} {...f} required />
                          {fieldState.error && (
                            <FormMessage>{fieldState.error.message}</FormMessage>
                          )}
                        </>
                      );
                    }}
                  />
                  <Controller
                    name="type"
                    render={({ field: f }) => {
                      const id = useId();
                      return (
                        <select
                          id={id}
                          {...f}
                          className="rounded-md border border-input bg-transparent p-2 text-sm w-auto"
                        >
                          <option value="text">Text</option>
                          <option value="richtext">Rich text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="select">Select</option>
                          <option value="media">Media</option>
                          <option value="relation">Relation</option>
                        </select>
                      );
                    }}
                  />
                  <Controller
                    name="required"
                    render={({ field: f }) => {
                      const id = useId();
                      return (
                        <div className="flex items-center gap-1">
                          <input
                            id={id}
                            {...f}
                            type="checkbox"
                          />
                          <Label htmlFor={id} className="text-xs">
                            Required
                          </Label>
                        </div>
                      );
                    }}
                  />
                  <Button type="submit" size="sm" disabled={isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </FormProvider>
            <form
              action={async () => {
                const fd = new FormData();
                fd.append('fieldId', field.id);
                fd.append('collectionId', collectionId);
                await deleteCollectionField(fd);
              }}
              className="ml-2"
            >
              <Button type="submit" variant="destructive" size="sm">
                Delete
              </Button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
