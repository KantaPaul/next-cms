'use client';

import { LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { useFormContext, useWatch } from 'react-hook-form';
import slugify from 'react-slugify';
import { isBuilderData } from '@/builder/data';
import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { cn } from '@/lib/utils/cn';
import { type TemplateOption, TemplatePicker } from './template-picker';

export const MainEditor = ({
  pageId,
  isCreate,
  templates,
  builderContent,
  className,
}: {
  pageId?: string;
  isCreate: boolean;
  templates: TemplateOption[];
  builderContent?: unknown;
  className?: string;
}) => {
  const { setValue, control } = useFormContext<CreatePagesInput>();
  const editorType = useWatch({ control, name: 'editorType' });
  const blockCount = isBuilderData(builderContent)
    ? builderContent.content.length
    : 0;

  return (
    <div
      className={cn('mx-auto w-full max-w-4xl px-6 py-8 lg:px-12', className)}
    >
      <FieldFactory<CreatePagesInput>
        variant="default"
        className="sm:grid-cols-1 2xl:grid-cols-1"
        fields={[
          [
            {
              name: 'title',
              type: 'text',
              placeholder: 'Add title',
              className:
                '[&>div]:max-w-full [&>div>input]:text-4xl [&>div>input]:h-auto [&>div>input]:p-0 [&>div>input]:shadow-none [&>div>input]:border-0 [&>div>input]:outline-none [&>div>input]:focus-visible:outline-none [&>div>input]:focus-visible:ring-0 font-bold',
              callback: value => {
                if (isCreate)
                  setValue('slug', value ? slugify(value) : '', {
                    shouldDirty: true,
                  });
              },
            },
          ],
        ]}
      />

      {isCreate && <TemplatePicker templates={templates} />}

      {editorType === 'builder' ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed border-steel-300 px-6 py-14 text-center dark:border-dark-300">
          <LayoutTemplate className="size-10 text-indigo-500" />
          <div>
            <h3 className="text-lg font-semibold">
              This page uses the visual builder
            </h3>
            <p className="mt-1 max-w-md text-sm text-steel-500">
              {isCreate
                ? 'Create the page first, then you will be taken to the drag-and-drop builder.'
                : `The draft has ${blockCount} block${blockCount === 1 ? '' : 's'}. Layout and content are edited in the full-screen builder.`}
            </p>
          </div>
          {pageId && (
            <Button asChild>
              <Link href={PAGES.DASHBOARD.PAGES.BUILDER(pageId)}>
                Open visual builder
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <FieldFactory<CreatePagesInput>
            variant="default"
            className="sm:grid-cols-1 2xl:grid-cols-1"
            fields={[
              [
                {
                  name: 'content',
                  type: 'textEditor',
                  placeholder: 'Start writing…',
                },
              ],
            ]}
          />
        </div>
      )}
    </div>
  );
};
