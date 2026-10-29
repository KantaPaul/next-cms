'use client';

import type { BuilderDocument, NodeId } from '@nextcms/builder-core';
import {
  BlockList,
  createEditorStore,
  DeviceSwitch,
  EditorCanvas,
  EditorProvider,
  Inspector,
  LayersPanel,
  SHORTCUTS,
  useDragController,
  useEditor,
  useEditorKeyboard,
  useEditorStore,
  indexedDbStorage,
  type LocalCopy,
  type SaveInput,
  type SaveQueue,
  type SaveResult,
  useSaveQueue,
  useSaveState,
} from '@nextcms/builder-react';
import { ArrowLeft, Redo2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { EditorBridgeProvider } from '@/builder/controls/editor-bridge';
import { cmsInlineProps, cmsResizeHandles } from '@/builder/editor-handles';
import {
  pageBlockGroups,
  pageInspectorBlocks,
  pageRootFields,
  pageSchemas,
} from '@/builder/definitions';
import { cmsTransformProps, rendererComponents, SiteRoot } from '@/builder/renderer';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { saveEditorDraft } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';

type Props = {
  page: { id: string; title: string; draftVersion: number };
  document: BuilderDocument;
  loaded: Record<NodeId, Record<string, unknown>>;
  themeTokens: unknown;
};

const components = rendererComponents('page');

function EditorSiteRoot({
  themeTokens,
  children,
}: {
  themeTokens: unknown;
  children: ReactNode;
}) {
  const rootProps = useEditor(state => state.doc.root.props);
  return (
    <SiteRoot rootProps={rootProps} metadata={{ themeTokens, editing: true }}>
      {children}
    </SiteRoot>
  );
}

/** Gives the CMS inspector controls this editor's device, selection, and theme tokens. */
function NewEditorBridge({
  themeTokens,
  children,
}: {
  themeTokens: unknown;
  children: ReactNode;
}) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const node = useEditor(state =>
    state.selection.length === 1 ? state.doc.nodes[state.selection[0]] : undefined
  );
  const value = useMemo(
    () => ({
      device,
      setDevice: store.setDevice,
      selectedType: node?.type,
      selectedProps: node?.props,
      themeTokens: themeTokens as Record<string, string> | undefined,
    }),
    [device, store, node, themeTokens]
  );
  return <EditorBridgeProvider value={value}>{children}</EditorBridgeProvider>;
}

const STATUS_TEXT: Record<string, string> = {
  saved: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  offline: 'Offline · will retry',
  error: 'Save failed · retrying',
  conflict: 'Someone else saved this page',
};

/** Save state in the header (R740). */
function SaveIndicator({ queue }: { queue: SaveQueue }) {
  const save = useSaveState(queue);
  const tone =
    save.status === 'error' || save.status === 'conflict'
      ? 'text-red-600'
      : save.status === 'offline'
        ? 'text-amber-600'
        : 'text-steel-500';
  return (
    <span role="status" aria-live="polite" className={`text-xs ${tone}`} title={save.error ?? undefined}>
      {STATUS_TEXT[save.status]}
    </span>
  );
}

/** Choices when another save happened first (R738). */
function ConflictBanner({ queue }: { queue: SaveQueue }) {
  const save = useSaveState(queue);
  if (save.status !== 'conflict') return null;
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
      This page was saved somewhere else (for example in the Puck builder) after you opened it.
      <Button size="sm" variant="outline" onClick={() => queue.takeTheirs()}>
        Use the saved version
      </Button>
      <Button size="sm" onClick={() => void queue.keepMine()}>
        Keep my changes
      </Button>
    </div>
  );
}

/** Offers unsaved work kept in this browser from an earlier visit (R740). */
function LocalCopyBanner({ queue, version }: { queue: SaveQueue; version: number }) {
  const store = useEditorStore();
  const [copy, setCopy] = useState<LocalCopy | null>(null);
  useEffect(() => {
    queue.readLocalCopy().then(found => {
      if (found) setCopy(found);
    });
  }, [queue]);
  if (!copy) return null;
  const close = () => {
    setCopy(null);
    void queue.discardLocalCopy();
  };
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Unsaved changes from {new Date(copy.at).toLocaleString()} were kept in this browser
      {copy.baseVersion !== version ? ', and the page has been saved since' : ''}.
      <Button
        size="sm"
        onClick={() => {
          store.replaceDocument(copy.document, { label: 'Restore unsaved changes' });
          setCopy(null);
        }}
      >
        Restore
      </Button>
      <Button size="sm" variant="outline" onClick={close}>
        Discard
      </Button>
    </div>
  );
}

function HistoryButtons() {
  const store = useEditorStore();
  const history = useEditor(state => state.history);
  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Undo"
        title="Undo (Mod + Z)"
        disabled={history.past.length === 0}
        onClick={() => store.undo()}
      >
        <Undo2 />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Redo"
        title="Redo (Mod + Shift + Z)"
        disabled={history.future.length === 0}
        onClick={() => store.redo()}
      >
        <Redo2 />
      </Button>
    </div>
  );
}

export function NewEditor({ page, document, loaded, themeTokens }: Props) {
  const store = useMemo(
    () => createEditorStore({ document, schemas: pageSchemas }),
    [document]
  );
  const drag = useDragController(store);
  const save = useCallback(
    async (input: SaveInput): Promise<SaveResult> => {
      const result = await saveEditorDraft({ id: page.id, ...input });
      if (result && 'ok' in result) return result as SaveResult;
      const message =
        result && 'message' in result ? String(result.message) : 'Could not save';
      throw new Error(message);
    },
    [page.id]
  );
  const storage = useMemo(() => indexedDbStorage('nextcms-editor'), []);
  const queue = useSaveQueue({
    store,
    save,
    version: page.draftVersion,
    localKey: `page:${page.id}`,
    storage,
  });
  const [frameWindow, setFrameWindow] = useState<Window | null>(null);
  const [panel, setPanel] = useState<'blocks' | 'layers'>('blocks');
  useEditorKeyboard(store, [
    typeof window === 'undefined' ? null : window,
    frameWindow,
  ]);

  const transformProps = useMemo(() => cmsTransformProps({}, 'page'), []);
  const renderRoot = useCallback(
    (children: ReactNode) => (
      <EditorSiteRoot themeTokens={themeTokens}>{children}</EditorSiteRoot>
    ),
    [themeTokens]
  );
  const onFrame = useCallback(
    (frame: HTMLIFrameElement) => setFrameWindow(frame.contentWindow),
    []
  );

  return (
    <EditorProvider store={store}>
      <div className="flex h-screen flex-col bg-steel-50 dark:bg-dark-50">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-steel-200 bg-white px-3 dark:border-dark-300 dark:bg-dark-100">
          <Button asChild size="icon" variant="ghost" aria-label="Back to the builder">
            <Link href={PAGES.DASHBOARD.PAGES.BUILDER(page.id)}>
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="truncate text-sm font-semibold">{page.title}</h1>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            New editor preview · saves drafts, publish in the builder
          </span>
          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator queue={queue} />
            <DeviceSwitch />
            <HistoryButtons />
          </div>
        </header>
        <ConflictBanner queue={queue} />
        <LocalCopyBanner queue={queue} version={page.draftVersion} />
        <div className="flex min-h-0 flex-1">
          <aside className="w-60 shrink-0 overflow-y-auto border-r border-steel-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100">
            <div role="tablist" aria-label="Left panel" className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-steel-100 p-1 dark:bg-dark-200">
              {(['blocks', 'layers'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={panel === tab}
                  onClick={() => setPanel(tab)}
                  className={`rounded px-2 py-1 text-xs font-medium capitalize ${panel === tab ? 'bg-white shadow-sm dark:bg-dark-100' : 'text-steel-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {panel === 'blocks' ? (
              <BlockList groups={pageBlockGroups} drag={drag} />
            ) : (
              <LayersPanel />
            )}
            <details className="mt-6 text-xs text-steel-500">
              <summary className="cursor-pointer font-medium">Keyboard shortcuts</summary>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
                {SHORTCUTS.map(([action, keys]) => (
                  <div key={action} className="contents">
                    <dt>{action.replace('-', ' ')}</dt>
                    <dd className="font-mono">{keys}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </aside>
          <main className="min-w-0 flex-1">
            <EditorCanvas
              components={components}
              drag={drag}
              transformProps={transformProps}
              loaded={loaded}
              renderRoot={renderRoot}
              onFrame={onFrame}
              resizeHandles={cmsResizeHandles}
              inlineProps={cmsInlineProps}
            />
          </main>
          <aside
            aria-label="Settings"
            className="w-80 shrink-0 overflow-y-auto border-l border-steel-200 bg-white p-4 dark:border-dark-300 dark:bg-dark-100"
          >
            <NewEditorBridge themeTokens={themeTokens}>
              <Inspector
                blocks={pageInspectorBlocks}
                rootFields={pageRootFields}
                empty={
                  <p className="mb-2 text-xs text-steel-500">
                    Select a block on the page to edit it. Page settings:
                  </p>
                }
              />
            </NewEditorBridge>
          </aside>
        </div>
      </div>
    </EditorProvider>
  );
}
