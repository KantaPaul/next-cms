'use client';

import { Check, FileText, LayoutTemplate, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { cn } from '@/lib/utils/cn';

/** Search param that tells the create form to open the AI generator once the builder page exists. */
export const START_WITH_AI_PARAM = 'start';

function setStartWithAi(on: boolean) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set(START_WITH_AI_PARAM, 'ai');
  else url.searchParams.delete(START_WITH_AI_PARAM);
  window.history.replaceState(null, '', url);
}

export type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  editorType: 'builder' | 'richtext';
  thumbnailUrl: string | null;
  blockTypes?: string[];
};

export const isBlogIndexTemplate = (template?: TemplateOption) =>
  !!template?.blockTypes?.includes('BlogPosts');

export function TemplatePicker({ templates }: { templates: TemplateOption[] }) {
  const { setValue, getValues, control } = useFormContext<CreatePagesInput>();
  const templateId = useWatch({ control, name: 'templateId' });
  const editorType = useWatch({ control, name: 'editorType' });
  const aiEnabled = useAiEnabled();
  const startWithAi = useSearchParams().get(START_WITH_AI_PARAM) === 'ai';

  const choose = (
    id: string | null,
    type: 'builder' | 'richtext',
    withAi = false
  ) => {
    const blogIndex = isBlogIndexTemplate(templates.find(t => t.id === id));
    setValue('templateId', id, { shouldDirty: true });
    setValue('editorType', type, { shouldDirty: true });
    setValue('isBlogIndex', blogIndex, { shouldDirty: true });
    if (blogIndex && !getValues('slug'))
      setValue('slug', 'blog', { shouldDirty: true });
    setStartWithAi(withAi);
  };

  const aiSelected = startWithAi && !templateId && editorType === 'builder';

  const blankOptions = [
    {
      type: 'richtext' as const,
      name: 'Blank article',
      description: 'Rich-text editor for posts and docs',
      icon: FileText,
    },
    {
      type: 'builder' as const,
      name: 'Blank landing page',
      description: 'Drag-and-drop visual builder',
      icon: LayoutTemplate,
    },
  ];

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-steel-600 dark:text-steel-300">
        Start from
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {blankOptions.map(option => {
          const selected =
            !templateId && editorType === option.type && !aiSelected;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => choose(null, option.type)}
              className={cn(
                'relative flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition hover:border-steel-400',
                selected
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-steel-200 dark:border-dark-300'
              )}
            >
              <option.icon className="mb-1 size-5 text-indigo-500" />
              <span className="font-medium">{option.name}</span>
              <span className="text-xs text-steel-500">
                {option.description}
              </span>
              {selected && (
                <Check className="absolute right-3 top-3 size-4 text-indigo-600" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!aiEnabled}
          onClick={() => choose(null, 'builder', true)}
          className={cn(
            'relative flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition enabled:hover:border-steel-400 disabled:cursor-not-allowed disabled:opacity-60',
            aiSelected
              ? 'border-violet-500 ring-2 ring-violet-200'
              : 'border-steel-200 dark:border-dark-300'
          )}
        >
          <Sparkles className="mb-1 size-5 text-violet-500" />
          <span className="font-medium">Generate with AI</span>
          <span className="text-xs text-steel-500">
            {aiEnabled === false
              ? 'Set GEMINI_API_KEY on the server to enable AI generation'
              : 'Describe the page and review generated blocks in the builder'}
          </span>
          {aiSelected && (
            <Check className="absolute right-3 top-3 size-4 text-violet-600" />
          )}
        </button>
        {templates.map(template => {
          const selected = templateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => choose(template.id, template.editorType)}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-lg border text-left transition hover:border-steel-400',
                selected
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-steel-200 dark:border-dark-300'
              )}
            >
              {template.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={template.thumbnailUrl}
                  alt=""
                  className="h-24 w-full object-cover"
                />
              )}
              <div className="flex flex-col gap-1 p-3">
                <span className="text-[11px] uppercase tracking-wide text-indigo-600">
                  {template.category}
                </span>
                <span className="font-medium">{template.name}</span>
                {template.description && (
                  <span className="line-clamp-2 text-xs text-steel-500">
                    {template.description}
                  </span>
                )}
              </div>
              {selected && (
                <Check className="absolute right-3 top-3 size-4 rounded-full bg-white text-indigo-600" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
