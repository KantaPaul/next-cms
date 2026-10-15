'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import {
  pageStatusOptions,
  pageVisibilityStatusOptions,
  SUPPORTED_LANGUAGES,
} from '@/db/schema';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import { cn } from '@/lib/utils/cn';
import { FieldShell, inputClass } from './field-shell';

export type TaxonomyOptions = {
  categories: { label: string; value: string }[];
  tags: { label: string; value: string }[];
};

export const SidebarEditor = ({
  className,
  taxonomy,
  currentStatus,
}: {
  className?: string;
  taxonomy: TaxonomyOptions;
  currentStatus?: string;
}) => {
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const { register, control, formState } = useFormContext<CreatePagesInput>();
  const status = useWatch({ control, name: 'status' });

  const statusOptions = canPublish
    ? pageStatusOptions
    : pageStatusOptions.filter(
        o => ['draft', 'review'].includes(o.value) || o.value === currentStatus
      );

  return (
    <div className={cn('pb-4', className)}>
      <FieldFactory<CreatePagesInput>
        variant="default"
        className="gap-0 space-y-4 divide-y sm:grid-cols-1 xl:gap-0 2xl:grid-cols-1 [&>div]:px-4 [&>div]:pt-4"
        fields={[
          [
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              placeholder: 'Select status',
              options: statusOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'visibility',
              label: 'Visibility',
              type: 'select',
              placeholder: 'Select visibility',
              options: pageVisibilityStatusOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'slug',
              label: 'Slug',
              type: 'text',
              placeholder: 'my-page',
              isRequired: true,
            },
            {
              name: 'language',
              label: 'Language',
              type: 'select',
              options: SUPPORTED_LANGUAGES.map(l => ({
                label: l.label,
                value: l.value,
              })),
              isClearable: false,
            },
            {
              name: 'isHome',
              label: 'Use as home page',
              type: 'switch',
            },
            {
              name: 'isBlogIndex',
              label: 'Use as blog page',
              type: 'switch',
            },
            {
              name: 'categories',
              label: 'Categories',
              type: 'multiselect',
              placeholder: taxonomy.categories.length
                ? 'Select categories'
                : 'No categories yet',
              options: taxonomy.categories,
            },
            {
              name: 'tags',
              label: 'Tags',
              type: 'multiselect',
              placeholder: taxonomy.tags.length ? 'Select tags' : 'No tags yet',
              options: taxonomy.tags,
            },
          ],
        ]}
      />
      {status === 'scheduled' && (
        <div className="px-4 pt-4">
          <FieldShell
            label="Publish at"
            htmlFor="scheduledAt"
            hint="The page goes live automatically at this time."
            error={formState.errors.scheduledAt?.message as string | undefined}
          >
            <input
              id="scheduledAt"
              type="datetime-local"
              className={inputClass}
              {...register('scheduledAt')}
            />
          </FieldShell>
        </div>
      )}
      {!canPublish && (
        <p className="mx-4 mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Your role can save drafts and submit pages for review. An editor
          publishes them.
        </p>
      )}
    </div>
  );
};
