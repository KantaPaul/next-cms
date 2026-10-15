'use client';

import { format } from 'date-fns';
import { Eye, History, LayoutTemplate, PanelsTopLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type RefObject,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import slugify from 'react-slugify';
import toast from 'react-hot-toast';
import { BackButton } from '@/components/atoms/buttons/back-button';
import { FormFactory } from '@/components/atoms/forms/factory';
import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import { StatusBadge } from '@/components/atoms/status-badge';
import { MediaField } from '@/components/media/media-picker';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MESSAGES } from '@/config/messages';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  pageStatusOptions,
  pageVisibilityStatusOptions,
  SUPPORTED_LANGUAGES,
} from '@/db/schema';
import {
  createPostSchema,
  type CreatePostInput,
} from '@/db/validations/posts.validation';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import { useDataProvider } from '@/providers/data.provider';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import { SeoPanel } from '@/app/(admin)/dashboard/(shell)/pages/_components/seo-panel';
import { PreviewLinksSection } from '@/app/(admin)/dashboard/(shell)/pages/_components/share-panel';
import type { TaxonomyOptions } from '@/app/(admin)/dashboard/(shell)/pages/_components/sidebar-editor';
import {
  AutosaveIndicator,
  useAutosave,
  useUnsavedChangesGuard,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import {
  createPost,
  savePostDraft,
  updatePost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import { POST_REVISION_ACTIONS } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-revision-actions';
import type { PostDetail } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import {
  layoutLabel,
  SetTemplateDialog,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';

type PostFormData = {
  initialValues?: PostDetail | null;
  taxonomy: TaxonomyOptions;
  templates: PostTemplateListItem[];
};

const toDateTimeLocal = (value?: Date | string | null) =>
  value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : null;

const draftSnapshot = (title: unknown, body: unknown) =>
  JSON.stringify({ title, body });

export default function PostForm({ id }: { id: string }) {
  const { initialValues } = useDataProvider<PostFormData>();
  return <PostFormInner key={initialValues?.id ?? 'new'} id={id} />;
}

function PostFormInner({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { initialValues, taxonomy } = useDataProvider<PostFormData>();
  const markSavedRef = useRef<(snapshot: string) => void>(() => {});

  const defaultValues = useMemo<CreatePostInput>(
    () => ({
      title: initialValues?.title ?? '',
      slug: initialValues?.slug ?? '',
      excerpt: initialValues?.excerpt ?? '',
      featuredImage: initialValues?.featuredImage ?? '',
      status: initialValues?.status ?? 'draft',
      visibility: initialValues?.visibility ?? 'public',
      language: initialValues?.language ?? 'en',
      scheduledAt: toDateTimeLocal(initialValues?.scheduledAt),
      body: initialValues?.body ?? '',
      categories: initialValues?.categories ?? [],
      tags: initialValues?.tags ?? [],
      seo: {
        title: initialValues?.seo?.title ?? '',
        description: initialValues?.seo?.description ?? '',
        keywords: initialValues?.seo?.keywords ?? '',
        canonicalUrl: initialValues?.seo?.canonicalUrl ?? '',
        ogTitle: initialValues?.seo?.ogTitle ?? '',
        ogDescription: initialValues?.seo?.ogDescription ?? '',
        ogImage: initialValues?.seo?.ogImage ?? '',
        ogType: initialValues?.seo?.ogType ?? 'article',
        twitterCard: initialValues?.seo?.twitterCard ?? 'summary_large_image',
        noIndex: initialValues?.seo?.noIndex ?? false,
        structuredDataType:
          initialValues?.seo?.structuredDataType ?? 'BlogPosting',
      },
    }),
    [initialValues]
  );

  function onSubmit(inputs: CreatePostInput) {
    startTransition(async () => {
      const response = initialValues
        ? await updatePost({ ...inputs, id: initialValues.id })
        : await createPost(inputs);
      await handleActionResponse(response, post => {
        toast.success(
          MESSAGES.MODULE_ACTION_SUCCESSFULLY(
            'Post',
            initialValues ? 'updated' : 'created'
          )
        );

        if (!initialValues) {
          router.push(PAGES.DASHBOARD.POSTS.EDIT((post as { id: string }).id));
          return;
        }

        markSavedRef.current(draftSnapshot(inputs.title, inputs.body));
        router.refresh();
      });
    });
  }

  return (
    <FormFactory<CreatePostInput>
      onSubmit={onSubmit}
      id={id}
      defaultValues={defaultValues}
      schema={createPostSchema as never}
      className="flex h-full flex-col gap-0 lg:gap-0"
    >
      <PostToolbar id={id} isPending={isPending} markSavedRef={markSavedRef} />
      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <div className="flex-1 lg:overflow-auto">
          <PostMainEditor isCreate={!initialValues} />
        </div>
        <aside className="w-full border-t border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50 lg:w-96 lg:overflow-auto lg:border-l lg:border-t-0">
          <Tabs defaultValue="post" className="gap-0">
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="post">Post</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="share" disabled={!initialValues}>
                Share
              </TabsTrigger>
            </TabsList>
            <TabsContent value="post">
              <PostSidebar taxonomy={taxonomy} post={initialValues ?? null} />
            </TabsContent>
            <TabsContent value="seo">
              <SeoPanel kind="post" />
            </TabsContent>
            {initialValues && (
              <TabsContent value="share">
                <div className="px-4 pb-6">
                  <PreviewLinksSection postId={initialValues.id} />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </aside>
      </div>
    </FormFactory>
  );
}

function PostMainEditor({ isCreate }: { isCreate: boolean }) {
  const { setValue, register, control } = useFormContext<CreatePostInput>();
  const excerpt = useWatch({ control, name: 'excerpt' });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-12">
      <FieldFactory<CreatePostInput>
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

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_16rem]">
        <FieldShell
          htmlFor="post-excerpt"
          label={
            <>
              Excerpt{' '}
              <span className="text-xs font-normal text-steel-400">
                {excerpt?.length ?? 0}/300
              </span>
            </>
          }
          hint="Shown under the title and on post cards."
        >
          <textarea
            id="post-excerpt"
            rows={5}
            className={textareaClass}
            {...register('excerpt')}
          />
        </FieldShell>
        <Controller
          control={control}
          name="featuredImage"
          render={({ field }) => (
            <FieldShell label="Featured image">
              <MediaField value={field.value ?? ''} onChange={field.onChange} />
            </FieldShell>
          )}
        />
      </div>

      <div className="mt-6">
        <FieldFactory<CreatePostInput>
          variant="default"
          className="sm:grid-cols-1 2xl:grid-cols-1"
          fields={[
            [
              {
                name: 'body',
                type: 'textEditor',
                placeholder: 'Write your post…',
              },
            ],
          ]}
        />
      </div>
    </div>
  );
}

function PostSidebar({
  taxonomy,
  post,
}: {
  taxonomy: TaxonomyOptions;
  post: PostDetail | null;
}) {
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const { register, control, formState } = useFormContext<CreatePostInput>();
  const status = useWatch({ control, name: 'status' });
  const statusOptions = canPublish
    ? pageStatusOptions
    : pageStatusOptions.filter(
        o => ['draft', 'review'].includes(o.value) || o.value === post?.status
      );

  return (
    <div className="pb-4">
      {post && <LayoutSection post={post} />}
      <FieldFactory<CreatePostInput>
        variant="default"
        className="gap-0 space-y-4 divide-y sm:grid-cols-1 xl:gap-0 2xl:grid-cols-1 [&>div]:px-4 [&>div]:pt-4"
        fields={[
          [
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              options: statusOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'visibility',
              label: 'Visibility',
              type: 'select',
              options: pageVisibilityStatusOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'slug',
              label: 'Slug',
              type: 'text',
              placeholder: 'my-post',
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
            hint="The post goes live automatically at this time."
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
          Your role can save drafts and submit posts for review. An editor
          publishes them.
        </p>
      )}
    </div>
  );
}

function LayoutSection({ post }: { post: PostDetail }) {
  const { templates } = useDataProvider<PostFormData>();
  const canManageTemplates = useCan(PERMISSIONS.PAGES_PUBLISH);
  const [open, setOpen] = useState(false);
  const isCustom = post.layout === 'custom';
  const templateId =
    post.templateId ?? templates.find(t => t.isDefault)?.id ?? null;
  const Icon = isCustom ? PanelsTopLeft : LayoutTemplate;

  return (
    <div className="px-4 pt-1">
      <p className="mb-2 text-sm font-medium text-steel-700 dark:text-steel-200">
        Layout
      </p>
      <div className="flex items-start gap-3 rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <Icon className="mt-0.5 size-4 shrink-0 text-indigo-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {layoutLabel(post, templates)}
          </span>
          <span className="block text-xs text-steel-500">
            {isCustom
              ? 'This post has its own canvas.'
              : post.templateId
                ? 'Renders through this template.'
                : 'Follows the default template.'}
          </span>
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Set post template
        </Button>
        {isCustom ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={PAGES.DASHBOARD.POSTS.BUILDER(post.id)}>
              Open layout builder
            </Link>
          </Button>
        ) : (
          canManageTemplates &&
          templateId && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={PAGES.DASHBOARD.POSTS.TEMPLATE_BUILDER(templateId)}>
                Edit template
              </Link>
            </Button>
          )
        )}
      </div>
      <SetTemplateDialog
        key={`${post.layout}-${post.templateId}`}
        post={post}
        templates={templates}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function PostToolbar({
  id,
  isPending,
  markSavedRef,
}: {
  id: string;
  isPending: boolean;
  markSavedRef: RefObject<(snapshot: string) => void>;
}) {
  const { initialValues } = useDataProvider<PostFormData>();
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const { control, setValue, getValues } = useFormContext<CreatePostInput>();
  const [title, body] = useWatch({ control, name: ['title', 'body'] });
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const { status, savedAt, isDirty, markSaved } = useAutosave({
    pageId: initialValues?.id,
    value: draftSnapshot(title, body),
    enabled: !!initialValues,
    toPayload: () => ({
      title: getValues('title') || undefined,
      body: getValues('body') ?? '',
    }),
    save: savePostDraft,
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
          <AutosaveIndicator status={status} savedAt={savedAt} />
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
                href={PAGES.SITE.PREVIEW_POST(initialValues.id)}
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
              ? 'Update live post'
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
          actions={POST_REVISION_ACTIONS}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  );
}
