'use client';

import '@measured/puck/puck.css';
import { type Config, type Data, Puck } from '@measured/puck';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import {
  useAutosave,
  useUnsavedChangesGuard,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import {
  publishPage,
  saveDraft,
  updatePage,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import {
  getEditorLock,
  heartbeatEditorLock,
  releaseEditorLock,
  takeOverEditorLock,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/builder-lock.actions';
import { POST_REVISION_ACTIONS } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-revision-actions';
import {
  publishPost,
  publishPostTemplate,
  savePostDraft,
  savePostTemplateDraft,
  updatePost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import {
  saveGlobalBlock,
  updateTemplate,
} from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import {
  BUILDER_VIEWPORTS,
  builderConfig,
  postBuilderConfig,
} from '@/builder/config';
import type { BuilderItem } from '@/builder/data';
import { type PostView, SAMPLE_POST } from '@/builder/post-template';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type { ThemeTokens } from '@/db/schemas/pages.schema';
import { maybeOfferRedirect } from '@/components/dashboard/redirect-offer';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import { BuilderActionBar } from './builder-chrome';
import {
  BuilderContext,
  type BuilderContextValue,
  type BuilderKind,
  type BuilderTarget,
} from './builder-context';
import { BuilderShell } from './builder-shell';
import { PuckEditorBridge } from './puck-editor-bridge';
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
  /** Global block category; only used when kind is `global` or `contact-form`. */
  category?: string;
};

const overrides = {
  fields: InspectorFields,
  actionBar: ({
    children,
    label,
    parentAction,
  }: {
    children: ReactNode;
    label?: string;
    parentAction: ReactNode;
  }) => (
    <BuilderActionBar label={label} parentAction={parentAction}>
      {children}
    </BuilderActionBar>
  ),
};

/** Config for global blocks: no GlobalRef and no Global category so a global cannot nest another. */
function globalBuilderConfig(): Config {
  const { GlobalRef: _globalRef, ...components } = builderConfig.components;
  const { global: _global, ...categories } = builderConfig.categories ?? {};
  return {
    ...builderConfig,
    components,
    categories,
    // Global blocks do not store page root fields (width, theme, padding, transition).
    // Keep the site-root canvas wrapper so inputs pick up site.css (.s-input, PhoneInput).
    root: { fields: {}, render: builderConfig.root?.render },
  } as Config;
}

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
  page: BuilderPageProps['page'],
  category?: string
): Adapter {
  if (kind === 'global' || kind === 'contact-form') {
    const isContactForm = kind === 'contact-form';
    return {
      config: globalBuilderConfig(),
      label: isContactForm ? 'Contact form' : 'Global block',
      backHref: isContactForm
        ? PAGES.DASHBOARD.CONTACT_FORMS
        : PAGES.DASHBOARD.TEMPLATES,
      backLabel: isContactForm ? 'Contact forms' : 'Templates & Globals',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Save',
      saveDraft: async content => {
        const blocks = (content.content ?? []) as BuilderItem[];
        const zones = (content.zones ?? {}) as Record<string, BuilderItem[]>;
        if (!blocks.length) {
          toast.error(
            isContactForm
              ? 'A contact form needs at least one section.'
              : 'A global block needs at least one section.'
          );
          return { error: 'empty' };
        }
        return saveGlobalBlock({
          id: page.id,
          name: page.title,
          category: category ?? (isContactForm ? 'contact-form' : 'general'),
          content: { content: blocks, zones },
        });
      },
      publish: async () => null,
      submitForReview: null,
    };
  }

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

  if (kind === 'page-template') {
    return {
      config: builderConfig as Config,
      label: `Page template: ${page.title}`,
      backHref: PAGES.DASHBOARD.TEMPLATES,
      backLabel: 'Templates & Globals',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Save template',
      saveDraft: content => updateTemplate({ id: page.id, content }),
      publish: async () => null,
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
  category,
}: BuilderPageProps) {
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const aiAvailable = !!useAiEnabled();
  const aiEnabled = kind === 'page' && aiAvailable;
  const adapter = useMemo(
    () => adapterFor(kind, page, category),
    [kind, page, category]
  );
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
  const [lockStatus, setLockStatus] = useState<{
    kind: 'free' | 'locked';
    userName?: string | null;
    isStale?: boolean;
    isCurrentUser?: boolean;
  } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetType = kind === 'page' ? 'page' : kind === 'post' ? 'post' : 'page';

  /** Check the soft lock when the builder opens. */
  useEffect(() => {
    let active = true;
    getEditorLock(targetType, page.id).then(result => {
      if (!active) return;
      if (result.ok && result.lock) {
        setLockStatus({
          kind: 'locked',
          userName: result.lock.userName,
          isStale: result.lock.isStale,
          isCurrentUser: result.lock.isCurrentUser,
        });
      } else {
        setLockStatus({ kind: 'free' });
      }
    });
    return () => {
      active = false;
    };
  }, [page.id, targetType, getEditorLock]);

  /** Heartbeat every 20s while the builder is open, plus once on close. */
  useEffect(() => {
    const beat = async () => {
      const result = await heartbeatEditorLock(targetType, page.id);
      if (!result.ok && result.error !== 'unauthenticated') {
        // Heartbeat failures are non-fatal; the lock may simply be stale.
      }
    };
    beat();
    heartbeatRef.current = setInterval(beat, 20_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      void heartbeatEditorLock(targetType, page.id);
    };
  }, [page.id, targetType, heartbeatEditorLock]);
  const isGlobalLike = kind === 'global' || kind === 'contact-form';
  const metadata = useMemo(
    () => ({
      themeTokens,
      motionPreview,
      language: page.language,
      ...(kind !== 'page' &&
        !isGlobalLike &&
        kind !== 'page-template' && { post: post ?? SAMPLE_POST }),
    }),
    [themeTokens, motionPreview, page.language, kind, post, isGlobalLike]
  );

  useEffect(() => {
    if (!aiEnabled) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('ai') !== 'generate') return;
    url.searchParams.delete('ai');
    window.history.replaceState(null, '', url);
    setAiGenerateOpen(true);
  }, [aiEnabled]);

  // Globals / contact forms have no draft: autosave is off but dirty tracking still drives the leave warning.
  const autosave = useAutosave<{ content: Data }>({
    pageId: page.id,
    value: serialized,
    enabled: !isGlobalLike && kind !== 'page-template' && busy === null,
    toPayload: () => ({ content: dataRef.current }),
    save: ({ content }) => adapter.saveDraft(content, true),
  });
  useUnsavedChangesGuard(autosave.isDirty);

  const onChange = useCallback((data: Data) => {
    dataRef.current = data;
    setSerialized(JSON.stringify(data));
  }, []);

  const save = useCallback(async () => {
    // Reject saves when another editor holds a fresh lock on this document.
    if (lockStatus?.kind === 'locked' && !lockStatus.isCurrentUser) {
      toast.error(
        `${lockStatus.userName ?? 'Another editor'} is editing this page. Take over to edit.`
      );
      return false;
    }
    const snapshot = JSON.stringify(dataRef.current);
    const response = await adapter.saveDraft(dataRef.current, false);
    if (response && typeof response === 'object' && 'error' in response) {
      return false;
    }
    return handleActionResponse(response as never, () =>
      autosave.markSaved(snapshot)
    );
  }, [adapter, autosave, lockStatus]);

  const run = useCallback(
    async (
      action: NonNullable<BuilderContextValue['busy']>,
      fn: () => Promise<void>
    ) => {
      setBusy(action);

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
    hasRevisions:
      kind !== 'post-template' && !isGlobalLike && kind !== 'page-template',
    pageId: page.id,
    pageTitle: page.title,
    status,
    canPublish: isGlobalLike || kind === 'page-template' ? false : canPublish,
    busy,
    autosaveStatus: autosave.status,
    savedAt: autosave.savedAt,
    isDirty: autosave.isDirty,
    aiEnabled,
    save: async () => {
      let ok = false;
      await run('save', async () => {
        ok = await save();
        if (ok) {
          toast.success(
            kind === 'contact-form'
              ? 'Contact form saved. Pages embedding it will show this version.'
              : kind === 'global'
                ? 'Global block saved. Every page using it now shows this version.'
                : kind === 'page-template'
                  ? 'Template layout saved'
                  : 'Draft saved'
          );
        }
      });
      return ok;
    },
    publish: () =>
      run('publish', async () => {
        if (!(await save())) return;
        await handleActionResponse((await adapter.publish()) as never, data => {
          void maybeOfferRedirect(data);
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
    takeOver: async () => {
      if (lockStatus?.kind !== 'locked' || lockStatus.isCurrentUser) return;
      await run('take-over', async () => {
        const result = await takeOverEditorLock(targetType, page.id);
        if (result.ok) {
          setLockStatus({
            kind: 'locked',
            userName: null,
            isStale: false,
            isCurrentUser: true,
          });
          toast.success('You took over editing this document.');
        } else {
          toast.error(result.error ?? 'Could not take over the document.');
        }
      });
    },
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
    lockStatus,
  };

  return (
    <BuilderContext.Provider value={value}>
      <div
        data-theme="light"
        className="h-screen overflow-hidden bg-background text-foreground [color-scheme:light]"
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
          <PuckEditorBridge>
            <BuilderShell />
          </PuckEditorBridge>
        </Puck>
      </div>
      {value.hasRevisions && (
        <RevisionsDrawer
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
          pageId={page.id}
          actions={kind === 'post' ? POST_REVISION_ACTIONS : undefined}
          themeScope="light"
          onRestored={() => {
            autosave.markSaved(serialized);
            window.location.reload();
          }}
        />
      )}
    </BuilderContext.Provider>
  );
}
