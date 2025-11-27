import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { cn } from '@/lib/utils/cn';
import {
  PageStatus,
  pageStatusOptions,
  pageVisibilityStatusOptions,
} from '@/db/schema';

export const SidebarEditor = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  return (
    <div className={cn('pb-4', className)} {...props}>
      <FieldFactory<CreatePagesInput>
        variant="default"
        className="gap-0 space-y-4 divide-y sm:grid-cols-1 xl:gap-0 2xl:grid-cols-1 [&>div]:px-4 [&>div]:pt-4"
        fields={[
          [
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              placeholder: 'Select Status',
              options: pageStatusOptions,
              isRequired: true,
            },
            {
              name: 'visibility',
              label: 'Visibility',
              type: 'select',
              placeholder: 'Select Visibility',
              options: pageVisibilityStatusOptions,
              isRequired: true,
            },
            {
              name: 'slug',
              label: 'Slug',
              type: 'text',
              disabled: true,
            },
            // {
            //   name: 'categories',
            //   label: 'Categories',
            //   type: 'multiselect',
            //   options: [],
            // },
            // {
            //   name: 'tags',
            //   label: 'Tags',
            //   type: 'multiselect',
            //   options: [],
            // },
          ],
        ]}
      />
    </div>
  );
};
