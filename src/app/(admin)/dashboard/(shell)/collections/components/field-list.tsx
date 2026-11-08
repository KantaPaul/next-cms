'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput as Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  updateCollectionField,
  deleteCollectionField,
} from '../_modules/collections.actions';
import {
  FIELD_TYPES,
  type UpdateFieldInput,
  updateFieldSchema,
} from '../_modules/collections.schemas';
import { objectToFormData } from '../_modules/form-helpers';
import { useFormAction } from '@/hooks/use-form-action';

export type FieldRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
};

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
      {fields.map(field => (
        <FieldRowForm
          key={field.id}
          field={field}
          collectionId={collectionId}
        />
      ))}
    </div>
  );
}

function FieldRowForm({
  field,
  collectionId,
}: {
  field: FieldRow;
  collectionId: string;
}) {
  const form = useForm<UpdateFieldInput>({
    resolver: zodResolver(updateFieldSchema),
    defaultValues: {
      label: field.label,
      type: field.type,
      required: field.required,
    },
  });

  const { submit, isPending, error } = useFormAction(updateCollectionField, {
    onSuccess: () => {
      form.reset(form.getValues());
    },
  });

  const onSubmit = (data: UpdateFieldInput) => {
    submit(
      objectToFormData({
        collectionId,
        fieldId: field.id,
        label: data.label,
        type: data.type,
        required: data.required ? 'on' : 'off',
      })
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
        >
          <FormField
            control={form.control}
            name="label"
            render={({ field: f }) => (
              <FormItem className="flex-1">
                <FormLabel>
                  Label{' '}
                  <code className="text-xs font-normal text-muted-foreground">
                    {field.key}
                  </code>
                </FormLabel>
                <FormControl>
                  <Input {...f} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={f.value} onValueChange={f.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FIELD_TYPES.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="required"
            render={({ field: f }) => (
              <FormItem className="flex h-9 items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={f.value}
                    onCheckedChange={value => f.onChange(value === true)}
                  />
                </FormControl>
                <FormLabel className="text-xs font-normal">Required</FormLabel>
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Form>
      <form
        action={async () => {
          const fd = new FormData();
          fd.append('fieldId', field.id);
          fd.append('collectionId', collectionId);
          await deleteCollectionField(fd);
        }}
      >
        <Button type="submit" variant="destructive" size="sm">
          Delete
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
