'use client';

import type { BuilderDocument, NodeId } from '@nextcms/builder-core';
import {
  BlockList,
  createEditorStore,
  DeviceSwitch,
  EditorCanvas,
  EditorProvider,
  Inspector,
  SHORTCUTS,
  useDragController,
  useEditor,
  useEditorKeyboard,
  useEditorStore,
} from '@nextcms/builder-react';
import { ArrowLeft, Redo2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { EditorBridgeProvider } from '@/builder/controls/editor-bridge';
import {
  pageBlockGroups,
  pageInspectorBlocks,
  pageRootFields,
  pageSchemas,
} from '@/builder/definitions';
import { cmsTransformProps, rendererComponents, SiteRoot } from '@/builder/renderer';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';

type Props = {
  page: { id: string; title: string };
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

function HistoryButtons() {
  const store = useEditorStore();
  const history = useEditor(state => state.history);
  const dirty = useEditor(state => state.doc !== state.savedDoc);
  return (
    <div className="flex items-center gap-1">
      {dirty && (
        <span className="mr-2 text-xs text-steel-500">Unsaved changes</span>
      )}
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
  const [frameWindow, setFrameWindow] = useState<Window | null>(null);
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
            New editor preview · changes are not saved yet
          </span>
          <div className="ml-auto flex items-center gap-3">
            <DeviceSwitch />
            <HistoryButtons />
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="w-60 shrink-0 overflow-y-auto border-r border-steel-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100">
            <BlockList groups={pageBlockGroups} drag={drag} />
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
