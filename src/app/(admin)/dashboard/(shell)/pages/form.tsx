'use client';

import { format } from 'date-fns';
import { Eye, History } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type RefObject,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { BackButton } from '@/components/atoms/buttons/back-button';
import { FormFactory } from '@/components/atoms/forms/factory';
import { StatusBadge } from '@/components/atoms/status-badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MESSAGES } from '@/config/messages';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  createPagesSchema,
  type CreatePagesInput,
} from '@/db/validations/pages.validation';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import { useDataProvider } from '@/providers/data.provider';
import {
  createPage,
  updatePage,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import type { PageDetail } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { MainEditor } from '@/app/(admin)/dashboard/(shell)/pages/_components/main-editor';
import {
  SidebarEditor,
  type TaxonomyOptions,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/sidebar-editor';
import {
  isBlogIndexTemplate,
  START_WITH_AI_PARAM,
  type TemplateOption,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/template-picker';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import {
  AutosaveIndicator,
  useAutosave,
  useUnsavedChangesGuard,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import { SeoPanel } from '@/app/(admin)/dashboard/(shell)/pages/_components/seo-panel';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import {
  SharePanel,
  type PreviewTokenRow,
  type TranslationRow,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/share-panel';

type PageFormData = {
  initialValues?: PageDetail | null;
  taxonomy: TaxonomyOptions;
  templates: TemplateOption[];
  previewTokens?: PreviewTokenRow[];
  translations?: TranslationRow[];
};

const toDateTimeLocal = (value?: Date | string | null) =>
  value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : null;

const draftSnapshot = (title: unknown, content: unknown, editorType: unknown) =>
  JSON.stringify({
    title,
    content: editorType === 'richtext' ? content : null,
  });

export default function CreateOrUpdateForm({ id }: { id: string }) {
  const { initialValues } = useDataProvider<PageFormData>();

  return <PageForm key={initialValues?.id ?? 'new'} id={id} />;
}

function PageForm({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { initialValues, taxonomy, templates } =
    useDataProvider<PageFormData>();
  const isCreate = !initialValues;
  const markSavedRef = useRef<(snapshot: string) => void>(() => {});
  const searchParams = useSearchParams();
  const templateParam = searchParams.get('template');
  const presetTemplate = isCreate
    ? templates.find(t => t.id === templateParam)
    : undefined;

  const defaultValues = useMemo<CreatePagesInput>(
    () => ({
      title: initialValues?.title ?? '',
      slug:
        initialValues?.slug ??
        (isBlogIndexTemplate(presetTemplate) ? 'blog' : ''),
      status: initialValues?.status ?? 'draft',
      visibility: initialValues?.visibility ?? 'public',
      editorType:
        initialValues?.editorType ?? presetTemplate?.editorType ?? 'richtext',
      language: initialValues?.language ?? 'en',
      isHome: initialValues?.isHome ?? false,
      isBlogIndex:
        initialValues?.isBlogIndex ?? isBlogIndexTemplate(presetTemplate),
      scheduledAt: toDateTimeLocal(initialValues?.scheduledAt),
      content:
        initialValues?.editorType === 'builder'
          ? undefined
          : (initialValues?.content ?? ''),
      categories: initialValues?.categories ?? [],
      tags: initialValues?.tags ?? [],
      templateId: presetTemplate?.id ?? null,
      seo: {
        title: initialValues?.seo?.title ?? '',
        description: initialValues?.seo?.description ?? '',
        keywords: initialValues?.seo?.keywords ?? '',
        canonicalUrl: initialValues?.seo?.canonicalUrl ?? '',
        ogTitle: initialValues?.seo?.ogTitle ?? '',
        ogDescription: initialValues?.seo?.ogDescription ?? '',
        ogImage: initialValues?.seo?.ogImage ?? '',
        ogType: initialValues?.seo?.ogType ?? 'website',
        twitterCard: initialValues?.seo?.twitterCard ?? 'summary_large_image',
        noIndex: initialValues?.seo?.noIndex ?? false,
        structuredDataType: initialValues?.seo?.structuredDataType ?? 'WebPage',
      },
    }),
    [initialValues, presetTemplate]
  );

  function onSubmit(inputs: CreatePagesInput) {
    startTransition(async () => {
      const payload = {
        ...inputs,
        ...(inputs.editorType === 'builder' && { content: undefined }),
      };
      const response = initialValues
        ? await updatePage({ ...payload, id: initialValues.id })
        : await createPage(payload);

      await handleActionResponse(response, page => {
        const saved = page as {
          id: string;
          editorType: string;
          status: string;
        };
        toast.success(
          MESSAGES.MODULE_ACTION_SUCCESSFULLY(
            'Page',
            initialValues ? 'updated' : 'created'
          )
        );

        if (!initialValues) {
          const startWithAi =
            !inputs.templateId &&
            searchParams.get(START_WITH_AI_PARAM) === 'ai';
          router.push(
            saved.editorType === 'builder'
              ? `${PAGES.DASHBOARD.PAGES.BUILDER(saved.id)}${startWithAi ? '?ai=generate' : ''}`
              : PAGES.DASHBOARD.PAGES.EDIT(saved.id)
          );
          return;
        }

        markSavedRef.current(
          draftSnapshot(inputs.title, inputs.content, inputs.editorType)
        );
        router.refresh();
      });
    });
  }

  return (
    <FormFactory<CreatePagesInput>
      onSubmit={onSubmit}
      id={id}
      defaultValues={defaultValues}
      schema={createPagesSchema as never}
      className="flex h-full flex-col gap-0 lg:gap-0"
    >
      <EditorToolbar
        id={id}
        isPending={isPending}
        markSavedRef={markSavedRef}
      />
      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <div className="flex-1 lg:overflow-auto">
          <MainEditor
            pageId={initialValues?.id}
            isCreate={isCreate}
            templates={templates}
            builderContent={
              initialValues?.editorType === 'builder'
                ? initialValues.content
                : undefined
            }
          />
        </div>
        <aside className="w-full border-t border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50 lg:w-96 lg:overflow-auto lg:border-l lg:border-t-0">
          <Tabs defaultValue="page" className="gap-0">
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="page">Page</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="share" disabled={isCreate}>
                Share
              </TabsTrigger>
            </TabsList>
            <TabsContent value="page">
              <SidebarEditor
                taxonomy={taxonomy}
                currentStatus={initialValues?.status}
              />
            </TabsContent>
            <TabsContent value="seo">
              <SeoPanel pageId={initialValues?.id} />
            </TabsContent>
            {initialValues && (
              <TabsContent value="share">
                <SharePanel page={initialValues} />
              </TabsContent>
            )}
          </Tabs>
        </aside>
      </div>
    </FormFactory>
  );
}

function EditorToolbar({
  id,
  isPending,
  markSavedRef,
}: {
  id: string;
  isPending: boolean;
  markSavedRef: RefObject<(snapshot: string) => void>;
}) {
  const { initialValues } = useDataProvider<PageFormData>();
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const { control, setValue, getValues } = useFormContext<CreatePagesInput>();
  const [title, content, editorType] = useWatch({
    control,
    name: ['title', 'content', 'editorType'],
  });
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const isRichText = editorType === 'richtext';
  const snapshot = draftSnapshot(title, content, editorType);

  const { status, savedAt, isDirty, markSaved } = useAutosave({
    pageId: initialValues?.id,
    value: snapshot,
    enabled: !!initialValues && isRichText,
    toPayload: () => ({
      title: getValues('title') || undefined,
      content: getValues('content'),
    }),
  });
  useUnsavedChangesGuard(isDirty && !isPending);
  markSavedRef.current = markSaved;

  const submitWithStatus = (next: 'published' | 'review') => {
    setValue('status', next, { shouldDirty: true });
    (document.getElementById(id) as HTMLFormElement | null)?.requestSubmit();
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-steel-200 bg-white px-4 py-3 dark:border-dark-300 dark:bg-dark-50">
      <BackButton disabled={isPending} />
      {initialValues && (
        <>
          <StatusBadge
            status={initialValues.status}
            statusColor={PAGE_STATUS_COLORS[initialValues.status]}
          />
          {initialValues.hasUnpublishedChanges && (
            <span className="text-xs text-amber-600">
              Draft differs from the live version
            </span>
          )}
          {isRichText && (
            <AutosaveIndicator status={status} savedAt={savedAt} />
          )}
        </>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {initialValues && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRevisionsOpen(true)}
            >
              <History /> Revisions
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a
                href={PAGES.SITE.PREVIEW(initialValues.id)}
                target="_blank"
                rel="noreferrer"
              >
                <Eye /> Preview
              </a>
            </Button>
          </>
        )}
        <Button
          type="submit"
          form={id}
          variant="outline"
          size="sm"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {canPublish ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => submitWithStatus('published')}
          >
            {initialValues?.status === 'published'
              ? 'Update live page'
              : 'Publish'}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => submitWithStatus('review')}
          >
            Submit for review
          </Button>
        )}
      </div>
      {initialValues && (
        <RevisionsDrawer
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
          pageId={initialValues.id}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  );
}
