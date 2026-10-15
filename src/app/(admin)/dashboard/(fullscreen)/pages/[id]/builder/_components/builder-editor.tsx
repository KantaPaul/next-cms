'use client';

import '@measured/puck/puck.css';
import { Puck, type Data } from '@measured/puck';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { builderConfig, BUILDER_VIEWPORTS } from '@/builder/config';
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
  useAutosave,
  useUnsavedChangesGuard,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/use-autosave';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import { BuilderContext, type BuilderContextValue, type BuilderTarget } from './builder-context';
import { BuilderActionBar, BuilderHeaderActions } from './builder-chrome';

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
};

const overrides = {
  headerActions: () => <BuilderHeaderActions />,
  actionBar: ({ children, label, parentAction }: { children: React.ReactNode; label?: string; parentAction: React.ReactNode }) => (
    <BuilderActionBar label={label} parentAction={parentAction}>
      {children}
    </BuilderActionBar>
  ),
};

export function BuilderEditor({ page, themeTokens }: BuilderPageProps) {
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const aiEnabled = !!useAiEnabled();
  const initialData = useMemo(() => page.content as Data, [page.id]);  
  const dataRef = useRef<Data>(initialData);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));
  const [status, setStatus] = useState(page.status);
  const [busy, setBusy] = useState<BuilderContextValue['busy']>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [rewriteTarget, setRewriteTarget] = useState<BuilderTarget | null>(null);
  const [globalTarget, setGlobalTarget] = useState<BuilderTarget | null>(null);

  useEffect(() => {
    if (!aiEnabled) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('ai') !== 'generate') return;
    url.searchParams.delete('ai');
    window.history.replaceState(null, '', url);
    setAiGenerateOpen(true);
  }, [aiEnabled]);

  const autosave = useAutosave({
    pageId: page.id,
    value: serialized,
    enabled: busy === null,
    toPayload: () => ({ content: dataRef.current }),
  });
  useUnsavedChangesGuard(autosave.isDirty);

  const onChange = useCallback((data: Data) => {
    dataRef.current = data;
    setSerialized(JSON.stringify(data));
  }, []);

  const save = useCallback(async () => {
    const snapshot = JSON.stringify(dataRef.current);
    const response = await saveDraft({ id: page.id, content: dataRef.current, autosave: false });
    return handleActionResponse(response, () => autosave.markSaved(snapshot));
  }, [page.id, autosave]);

  const run = useCallback(
    async (kind: NonNullable<BuilderContextValue['busy']>, fn: () => Promise<void>) => {
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
        await handleActionResponse(await publishPage({ id: page.id }), () => {
          setStatus('published');
          toast.success('Page published');
        });
      }),
    submitForReview: () =>
      run('review', async () => {
        if (!(await save())) return;
        await handleActionResponse(await updatePage({ id: page.id, status: 'review' }), () => {
          setStatus('review');
          toast.success('Submitted for review');
        });
      }),
    openRevisions: () => setRevisionsOpen(true),
    aiGenerateOpen,
    setAiGenerateOpen,
    rewriteTarget,
    setRewriteTarget,
    globalTarget,
    setGlobalTarget,
  };

  return (
    <BuilderContext.Provider value={value}>
      <div data-theme="light" className="h-screen bg-white text-steel-700 [&_[class*='Puck--']]:h-full">
        <Puck
          config={builderConfig}
          data={initialData}
          onChange={onChange}
          overrides={overrides as never}
          headerTitle={page.title}
          headerPath={PAGES.SITE.page(page.slug, page.language, page.isHome)}
          viewports={BUILDER_VIEWPORTS}
          metadata={{ themeTokens }}
          iframe={{ enabled: true }}
        />
      </div>
      <RevisionsDrawer
        open={revisionsOpen}
        onOpenChange={setRevisionsOpen}
        pageId={page.id}
        onRestored={() => {
          autosave.markSaved(serialized);
          window.location.reload();
        }}
      />
    </BuilderContext.Provider>
  );
}
