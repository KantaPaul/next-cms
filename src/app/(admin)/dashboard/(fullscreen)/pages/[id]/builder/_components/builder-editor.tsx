'use client';

import '@measured/puck/puck.css';
import { Puck, type Config, type Data } from '@measured/puck';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  builderConfig,
  postBuilderConfig,
  BUILDER_VIEWPORTS,
} from '@/builder/config';
import { SAMPLE_POST, type PostView } from '@/builder/post-template';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type { ThemeTokens } from '@/db/schemas/pages.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import {
  publishPage,
  saveDraft,
  updatePage,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import {
  publishPost,
  publishPostTemplate,
  savePostDraft,
  savePostTemplateDraft,
  updatePost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import { POST_REVISION_ACTIONS } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-revision-actions';
import {
  useAutosave,
  useUnsavedChangesGuard,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import {
  BuilderContext,
  type BuilderContextValue,
  type BuilderKind,
  type BuilderTarget,
} from './builder-context';
import { BuilderActionBar } from './builder-chrome';
import { BuilderShell } from './builder-shell';
import { InspectorFields } from './selection-card';

export type BuilderPageProps = {
  page: {
    id: string;
    title: string;
    slug: string;
    language: string;
    isHome: boolean;
    status: string;
    hasUnpublishedChanges: boolean;
    content: unknown;
  };
  themeTokens: ThemeTokens;
  /** Defaults to `page`. Post kinds use the post blocks and post actions. */
  kind?: BuilderKind;
  /** Post rendered by post-bound blocks; the template builder falls back to sample content. */
  post?: PostView;
};

const overrides = {
  fields: InspectorFields,
  actionBar: ({
    children,
    label,
    parentAction,
  }: {
    children: React.ReactNode;
    label?: string;
    parentAction: React.ReactNode;
  }) => (
    <BuilderActionBar label={label} parentAction={parentAction}>
      {children}
    </BuilderActionBar>
  ),
};

type Adapter = {
  config: Config;
  label: string;
  backHref: string;
  backLabel: string;
  headerPath: string;
  previewHref: string | null;
  liveLabel: string;
  saveDraft: (content: Data, autosave: boolean) => Promise<unknown>;
  publish: () => Promise<unknown>;
  submitForReview: (() => Promise<unknown>) | null;
};

function adapterFor(
  kind: BuilderKind,
  page: BuilderPageProps['page']
): Adapter {
  if (kind === 'post') {
    return {
      config: postBuilderConfig as Config,
      label: 'Post layout',
      backHref: PAGES.DASHBOARD.POSTS.EDIT(page.id),
      backLabel: 'Post settings',
      headerPath: PAGES.SITE.post(page.slug, page.language),
      previewHref: PAGES.SITE.PREVIEW_POST(page.id),
      liveLabel: 'Update live post',
      saveDraft: (content, autosave) =>
        savePostDraft({ id: page.id, canvas: content, autosave }),
      publish: () => publishPost({ id: page.id }),
      submitForReview: () => updatePost({ id: page.id, status: 'review' }),
    };
  }

  if (kind === 'post-template') {
    return {
      config: postBuilderConfig as Config,
      label: `Post template: ${page.title}`,
      backHref: PAGES.DASHBOARD.POSTS.TEMPLATES,
      backLabel: 'Post templates',
      headerPath: PAGES.SITE.post('…', 'en'),
      previewHref: null,
      liveLabel: 'Update live template',
      saveDraft: content => savePostTemplateDraft({ id: page.id, content }),
      publish: () => publishPostTemplate({ id: page.id }),
      submitForReview: null,
    };
  }

  return {
    config: builderConfig as Config,
    label: 'Page builder',
    backHref: PAGES.DASHBOARD.PAGES.EDIT(page.id),
    backLabel: 'Page settings',
    headerPath: PAGES.SITE.page(page.slug, page.language, page.isHome),
    previewHref: PAGES.SITE.PREVIEW(page.id),
    liveLabel: 'Update live page',
    saveDraft: (content, autosave) =>
      saveDraft({ id: page.id, content, autosave }),
    publish: () => publishPage({ id: page.id }),
    submitForReview: () => updatePage({ id: page.id, status: 'review' }),
  };
}

export function BuilderEditor({
  page,
  themeTokens,
  kind = 'page',
  post,
}: BuilderPageProps) {
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const aiAvailable = !!useAiEnabled();
  const aiEnabled = kind === 'page' && aiAvailable;
  const adapter = useMemo(() => adapterFor(kind, page), [kind, page]);
  const initialData = useMemo(() => page.content as Data, [page.id]);
  const dataRef = useRef<Data>(initialData);
  const [serialized, setSerialized] = useState(() =>
    JSON.stringify(initialData)
  );
  const [status, setStatus] = useState(page.status);
  const [busy, setBusy] = useState<BuilderContextValue['busy']>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [rewriteTarget, setRewriteTarget] = useState<BuilderTarget | null>(
    null
  );
  const [globalTarget, setGlobalTarget] = useState<BuilderTarget | null>(null);
  const [motionPreview, setMotionPreview] = useState(false);
  const metadata = useMemo(
    () => ({
      themeTokens,
      motionPreview,
      language: page.language,
      ...(kind !== 'page' && { post: post ?? SAMPLE_POST }),
    }),
    [themeTokens, motionPreview, page.language, kind, post]
  );

  useEffect(() => {
    if (!aiEnabled) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('ai') !== 'generate') return;
    url.searchParams.delete('ai');
    window.history.replaceState(null, '', url);
    setAiGenerateOpen(true);
  }, [aiEnabled]);

  const autosave = useAutosave<{ content: Data }>({
    pageId: page.id,
    value: serialized,
    enabled: busy === null,
    toPayload: () => ({ content: dataRef.current }),
    save: ({ content }) => adapter.saveDraft(content, true),
  });
  useUnsavedChangesGuard(autosave.isDirty);

  const onChange = useCallback((data: Data) => {
    dataRef.current = data;
    setSerialized(JSON.stringify(data));
  }, []);

  const save = useCallback(async () => {
    const snapshot = JSON.stringify(dataRef.current);
    const response = await adapter.saveDraft(dataRef.current, false);
    return handleActionResponse(response as never, () =>
      autosave.markSaved(snapshot)
    );
  }, [adapter, autosave]);

  const run = useCallback(
    async (
      kind: NonNullable<BuilderContextValue['busy']>,
      fn: () => Promise<void>
    ) => {
      setBusy(kind);

      try {
        await fn();
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const value: BuilderContextValue = {
    kind,
    label: adapter.label,
    backHref: adapter.backHref,
    backLabel: adapter.backLabel,
    previewHref: adapter.previewHref,
    liveLabel: adapter.liveLabel,
    hasRevisions: kind !== 'post-template',
    pageId: page.id,
    pageTitle: page.title,
    status,
    canPublish,
    busy,
    autosaveStatus: autosave.status,
    savedAt: autosave.savedAt,
    aiEnabled,
    save: async () => {
      let ok = false;
      await run('save', async () => {
        ok = await save();
        if (ok) toast.success('Draft saved');
      });
      return ok;
    },
    publish: () =>
      run('publish', async () => {
        if (!(await save())) return;
        await handleActionResponse((await adapter.publish()) as never, () => {
          setStatus('published');
          toast.success(
            kind === 'page'
              ? 'Page published'
              : kind === 'post'
                ? 'Post published'
                : 'Template published'
          );
        });
      }),
    submitForReview: () =>
      run('review', async () => {
        if (!adapter.submitForReview || !(await save())) return;
        await handleActionResponse(
          (await adapter.submitForReview()) as never,
          () => {
            setStatus('review');
            toast.success('Submitted for review');
          }
        );
      }),
    openRevisions: () => setRevisionsOpen(true),
    aiGenerateOpen,
    setAiGenerateOpen,
    rewriteTarget,
    setRewriteTarget,
    globalTarget,
    setGlobalTarget,
    motionPreview,
    setMotionPreview,
  };

  return (
    <BuilderContext.Provider value={value}>
      <div
        data-theme="light"
        className="h-screen overflow-hidden bg-white text-steel-700 [color-scheme:light]"
      >
        <Puck
          config={adapter.config}
          data={initialData}
          onChange={onChange}
          overrides={overrides as never}
          headerTitle={page.title}
          headerPath={adapter.headerPath}
          viewports={BUILDER_VIEWPORTS}
          metadata={metadata}
          iframe={{ enabled: true }}
        >
          <BuilderShell />
        </Puck>
      </div>
      {value.hasRevisions && (
        <RevisionsDrawer
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
          pageId={page.id}
          actions={kind === 'post' ? POST_REVISION_ACTIONS : undefined}
          onRestored={() => {
            autosave.markSaved(serialized);
            window.location.reload();
          }}
        />
      )}
    </BuilderContext.Provider>
  );
}
