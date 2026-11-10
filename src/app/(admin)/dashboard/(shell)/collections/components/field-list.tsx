'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput as Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
} from '@/config/post-types';
import { TextModeSwitches, UrlModeSwitches } from './field-mode-switches';
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
  config?: unknown;
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
  const router = useRouter();
  const mediaMeta = readMediaFieldConfig(field.config);
  const initialTextMode = readTextFieldMode(field.config);
  const initialUrlMode = readUrlFieldMode(field.config);
  const form = useForm<UpdateFieldInput>({
    resolver: zodResolver(updateFieldSchema),
    defaultValues: {
      label: field.label,
      type: field.type,
      required: field.required,
      multiple: !mediaMeta.isFeatured && Boolean(mediaMeta.multiple),
      isFeatured: Boolean(mediaMeta.isFeatured),
      textMode: initialTextMode,
      urlMode: initialUrlMode,
    },
  });

  useEffect(() => {
    const nextMeta = readMediaFieldConfig(field.config);
    form.reset({
      label: field.label,
      type: field.type,
      required: field.required,
      multiple: !nextMeta.isFeatured && Boolean(nextMeta.multiple),
      isFeatured: Boolean(nextMeta.isFeatured),
      textMode: readTextFieldMode(field.config),
      urlMode: readUrlFieldMode(field.config),
    });
  }, [field.label, field.type, field.required, field.config, form]);

  const currentType = form.watch('type');
  const multiple = form.watch('multiple');
  const isFeatured = form.watch('isFeatured');
  const textMode = form.watch('textMode') ?? 'plain';
  const urlMode = form.watch('urlMode') ?? 'other';

  const { submit, isPending, error } = useFormAction(updateCollectionField, {
    onSuccess: () => {
      form.reset(form.getValues());
      router.refresh();
    },
  });

  const onSubmit = (data: UpdateFieldInput) => {
    const featured = data.type === 'media' && Boolean(data.isFeatured);
    const multi = data.type === 'media' && !featured && Boolean(data.multiple);
    submit(
      objectToFormData({
        collectionId,
        fieldId: field.id,
        label: data.label,
        type: data.type,
        required: data.required ? 'on' : 'off',
        ...(data.type === 'media'
          ? {
              multiple: multi ? 'on' : 'off',
              isFeatured: featured ? 'on' : 'off',
            }
          : data.type === 'text'
            ? { textMode: data.textMode ?? 'plain' }
            : data.type === 'url'
              ? { urlMode: data.urlMode ?? 'other' }
              : {}),
      })
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-3"
          >
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
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
                    <FormLabel className="text-xs font-normal">
                      Required
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {currentType === 'media' && (
              <div className="flex flex-wrap items-center gap-6 rounded-md bg-muted/30 px-3 py-2 text-xs">
                <FormField
                  control={form.control}
                  name="multiple"
                  render={({ field: f }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={!isFeatured && f.value === true}
                          disabled={isFeatured === true}
                          onChange={value => {
                            const checked = value === true;
                            f.onChange(checked);
                            if (checked) form.setValue('isFeatured', false);
                          }}
                        />
                      </FormControl>
                      <FormLabel
                        className={
                          isFeatured
                            ? 'text-xs font-normal text-muted-foreground cursor-not-allowed'
                            : 'text-xs font-normal cursor-pointer'
                        }
                      >
                        Multiple image upload
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field: f }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={!multiple && f.value === true}
                          disabled={multiple === true}
                          onChange={value => {
                            const checked = value === true;
                            f.onChange(checked);
                            if (checked) form.setValue('multiple', false);
                          }}
                        />
                      </FormControl>
                      <FormLabel
                        className={
                          multiple
                            ? 'text-xs font-normal text-muted-foreground cursor-not-allowed'
                            : 'text-xs font-normal cursor-pointer'
                        }
                      >
                        Featured image (one at a time)
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}
            {currentType === 'text' && (
              <TextModeSwitches
                compact
                value={textMode}
                onChange={next => form.setValue('textMode', next)}
              />
            )}
            {currentType === 'url' && (
              <UrlModeSwitches
                compact
                value={urlMode}
                onChange={next => form.setValue('urlMode', next)}
              />
            )}
          </form>
        </Form>
        <form
          action={async () => {
            const fd = new FormData();
            fd.append('fieldId', field.id);
            fd.append('collectionId', collectionId);
            await deleteCollectionField(fd);
            router.refresh();
          }}
        >
          <Button type="submit" variant="destructive" size="sm">
            Delete
          </Button>
        </form>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
