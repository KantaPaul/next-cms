'use client';

/**
 * The new editor for every builder kind (R698, R699, R700, R797, R798): the
 * same props, adapters, and actions as the Puck builder, on
 * @nextcms/builder-react. Pages save versioned patches; other kinds save
 * through their adapter. Global blocks, contact forms, and page templates
 * save only on request, because saving them updates the live site.
 */

import {
  applyPatch,
  type BuilderDocument,
  type BuilderNode,
  cloneSubtree,
  createNodeId,
  DOCUMENT_VERSION,
  diffDocuments,
  documentProblems,
  documentToPuck,
  extractSubtree,
  findPosition,
  insertSubtree,
  type NodeId,
  puckToDocument,
  removeNode,
  repairDocument,
} from '@nextcms/builder-core';
import {
  type BlockAction,
  BlockList,
  Breadcrumb,
  type Command,
  CommandPalette,
  CommentsPanel,
  type CommentThread,
  createEditorStore,
  DeviceSwitch,
  EditorCanvas,
  EditorProvider,
  type EditorStore,
  Inspector,
  HistoryPanel,
  indexedDbStorage,
  initStyleClassStore,
  isTypingTarget,
  LayersPanel,
  type LocalCopy,
  LiveChecksPanel,
  PresencePanel,
  ResizablePanel,
  StyleClassControl,
  StyleClassList,
  StateStyleSwitch,
  type SaveInput,
  type SaveQueue,
  type SaveResult,
  SHORTCUTS,
  StyleClassList as StyleClassesList,
  useDragController,
  useEditor,
  useEditorKeyboard,
  useEditorStore,
  useSaveQueue,
  useSaveState,
  VersionCompare,
  StartScreen,
  createPreferencesStore,
  setPreferencesStore,
  getStyleClassStore,
  captureStyles,
} from '@nextcms/builder-react';
import { PreferencesPanel } from '@nextcms/builder-react';
import {
  Button as ChromeButton,
  IconButton as ChromeIconButton,
  ShortcutHelpDialog,
  Tabs as ChromeTabs,
} from '@nextcms/editor-ui';
import {
  ArrowLeft,
  CommandIcon,
  Eye,
  HelpCircle,
  History,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Redo2,
  Sparkles,
  Undo2,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { RevisionsDrawer } from '@/app/(admin)/dashboard/(shell)/pages/_components/revisions-drawer';
import {
  getEditorLock,
  heartbeatEditorLock,
  takeOverEditorLock,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/builder-lock.actions';
import {
  createRevision,
  saveEditorDraft,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import { POST_REVISION_ACTIONS } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-revision-actions';
import { EditorBridgeProvider } from '@/builder/controls/editor-bridge';
import type { BuilderData } from '@/builder/data';
import { editorSetup } from '@/builder/definitions';
import { cmsInlineProps, cmsResizeHandles } from '@/builder/editor-handles';
import { SAMPLE_POST } from '@/builder/post-template';
// Shared editor chrome styles (B15 E1), built by `pnpm --filter @nextcms/editor-ui build:css`.
import '@nextcms/editor-ui/editor-ui.css';
import {
  cmsTransformProps,
  rendererComponents,
  SiteRoot,
} from '@/builder/renderer';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import { maybeOfferRedirect } from '@/components/dashboard/redirect-offer';
import { Button } from '@/components/ui/button';
import { PERMISSIONS } from '@/config/permissions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import {
  AiGenerateDialogView,
  AiRewriteDialogView,
  type GenerateMode,
} from '../pages/[id]/builder/_components/ai-dialogs';
import {
  adapterFor,
  type BuilderPageProps,
} from '../pages/[id]/builder/_components/builder-adapters';
import type { BuilderTarget } from '../pages/[id]/builder/_components/builder-context';
import {
  type GlobalSection,
  SaveGlobalDialogView,
} from '../pages/[id]/builder/_components/save-global-dialog';
import { SaveTemplateDialogView } from '../pages/[id]/builder/_components/save-template-dialog';
import {
  EditorUIScopeBox,
  type PrimaryAction,
  SharedChrome,
} from './shared-chrome';

export type NewEditorProps = BuilderPageProps & {
  document: BuilderDocument;
  loaded: Record<NodeId, Record<string, unknown>>;
  /** Pages: version of the stored draft, for conflict checks (R738). */
  draftVersion?: number;
  /** Problems found in the stored document (R797). */
  issues?: string[];
  /** Editor chrome: the current one, or the shared @nextcms/editor-ui shell (B15 E6). */
  shell?: 'legacy' | 'shared';
};

/** Errors come back from actions as values; turn them into thrown errors so the queue retries. */
function actionError(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const value = result as {
    hasError?: boolean;
    message?: string;
    error?: string;
    errors?: unknown;
  };
  if (value.hasError) return value.message ?? 'Could not save';
  if (value.error)
    return value.error === 'empty'
      ? 'Add at least one section before saving.'
      : value.error;
  if (value.errors) return 'Some fields are not valid.';
  return null;
}

function EditorSiteRoot({
  metadata,
  children,
}: {
  metadata: Record<string, unknown>;
  children: ReactNode;
}) {
  const rootProps = useEditor(state => state.doc.root.props);
  return (
    <SiteRoot rootProps={rootProps} metadata={{ ...metadata, editing: true }}>
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
    state.selection.length === 1
      ? state.doc.nodes[state.selection[0]]
      : undefined
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

const RIGHT_PANEL_TABS: { key: string; label: string }[] = [
  { key: 'blocks', label: 'Blocks' },
  { key: 'layers', label: 'Layers' },
  { key: 'settings', label: 'Settings' },
  { key: 'style-classes', label: 'Classes' },
  { key: 'presence', label: 'Presence' },
  { key: 'checks', label: 'Checks' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'history', label: 'History' },
  { key: 'comments', label: 'Comments' },
];

/** Save state, with Retry now after a failure (R740, R798). */
function SaveIndicator({ queue }: { queue: SaveQueue }) {
  const save = useSaveState(queue);
  const failing = save.status === 'error' || save.status === 'offline';
  const tone =
    save.status === 'error' || save.status === 'conflict'
      ? 'text-red-600'
      : save.status === 'offline'
        ? 'text-amber-600'
        : 'text-steel-500';
  return (
    <span className="flex items-center gap-2">
      <span
        role="status"
        aria-live="polite"
        className={`text-xs ${tone}`}
        title={save.error ?? undefined}
      >
        {STATUS_TEXT[save.status]}
      </span>
      {failing && (
        <Button size="sm" variant="outline" onClick={() => void queue.flush()}>
          Retry now
        </Button>
      )}
    </span>
  );
}

function blockNames(store: EditorStore, doc: BuilderDocument, ids: string[]) {
  return ids.map(id => {
    const node = doc.nodes[id];
    return (
      node?.meta?.name ||
      store.schemas[node?.type ?? '']?.label ||
      node?.type ||
      id
    );
  });
}

/** What each side changed, then the choice (R738, R798). */
function ConflictBanner({ queue }: { queue: SaveQueue }) {
  const store = useEditorStore();
  const save = useSaveState(queue);
  const mine = useEditor(state => state.doc);
  const base = useEditor(state => state.savedDoc);
  if (save.status !== 'conflict' || !save.conflict) return null;
  const theirs = save.conflict.document;
  const changed = (to: BuilderDocument) => {
    const patch = diffDocuments(base, to);
    return [...Object.keys(patch.upsert), ...patch.remove];
  };
  const summary = (ids: string[], doc: BuilderDocument) => {
    if (!ids.length) return 'no blocks';
    const names = blockNames(store, doc, ids.slice(0, 4));
    return `${names.join(', ')}${ids.length > 4 ? ` and ${ids.length - 4} more` : ''}`;
  };
  const theirIds = changed(theirs);
  const myIds = changed(mine);
  const both = myIds.filter(id => theirIds.includes(id));
  return (
    <div
      role="alert"
      data-editor-notice="conflict"
      className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>This page was saved somewhere else after you opened it.</span>
        <Button size="sm" variant="outline" onClick={() => queue.takeTheirs()}>
          Use the saved version
        </Button>
        <Button size="sm" onClick={() => void queue.keepMine()}>
          Keep my changes
        </Button>
      </div>
      <p className="mt-1 text-xs">
        They changed {summary(theirIds, theirs)}. You changed{' '}
        {summary(myIds, mine)}.
        {both.length ? ` Both changed ${summary(both, mine)}.` : ''}
      </p>
    </div>
  );
}

/** Shown while the browser is offline; edits stay in this browser (R798). */
function OfflineBanner({ queue }: { queue: SaveQueue }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      void queue.flush();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [queue]);
  if (online) return null;
  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      You are offline. Keep editing: changes are kept in this browser and save
      when you are back online.
    </div>
  );
}

/** Offers unsaved work kept in this browser from an earlier visit (R740). */
function LocalCopyBanner({
  queue,
  version,
}: {
  queue: SaveQueue;
  version: number;
}) {
  const store = useEditorStore();
  const [copy, setCopy] = useState<LocalCopy | null>(null);
  useEffect(() => {
    queue.readLocalCopy().then(found => {
      if (found) setCopy(found);
    });
  }, [queue]);
  if (!copy) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      Unsaved changes from {new Date(copy.at).toLocaleString()} were kept in
      this browser
      {copy.baseVersion !== version
        ? ', and the page has been saved since'
        : ''}
      .
      <Button
        size="sm"
        onClick={() => {
          store.replaceDocument(copy.document, {
            label: 'Restore unsaved changes',
          });
          setCopy(null);
        }}
      >
        Restore
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setCopy(null);
          void queue.discardLocalCopy();
        }}
      >
        Discard
      </Button>
    </div>
  );
}

/** Problems in the stored document, with a repair for broken structure (R797). */
function IssuesBanner({ issues }: { issues: string[] }) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const [hidden, setHidden] = useState(false);
  if (!issues.length || hidden) return null;
  const structural = documentProblems(doc).length > 0;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900"
    >
      <span>
        This page has {issues.length} problem{issues.length > 1 ? 's' : ''}:{' '}
        {issues.slice(0, 3).join('; ')}
        {issues.length > 3 ? '…' : ''}
      </span>
      {structural && (
        <Button
          size="sm"
          onClick={() =>
            store.replaceDocument(repairDocument(store.getState().doc), {
              label: 'Repair page',
            })
          }
        >
          Repair and continue
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setHidden(true)}>
        Dismiss
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

type LockState = { userName?: string | null; isStale?: boolean } | null;

/** Puts AI-generated blocks in the editor, with fresh ids so they never clash (R700). */
function applyGenerated(
  store: EditorStore,
  data: BuilderData,
  mode: GenerateMode
) {
  const generated = puckToDocument(data);
  const current = store.getState().doc;
  let doc: BuilderDocument =
    mode === 'replace'
      ? {
          ...current,
          root: { props: { ...current.root.props, ...generated.root.props } },
          nodes: {},
          rootSlot: [],
        }
      : current;
  for (const rootId of generated.rootSlot) {
    const subtree = extractSubtree(generated, rootId);
    if (!subtree) continue;
    doc = insertSubtree(doc, cloneSubtree(subtree, createNodeId), {
      parentId: null,
      slot: 'root',
      index: doc.rootSlot.length,
    });
  }
  store.replaceDocument(doc, {
    label: mode === 'replace' ? 'Generate page' : 'Add generated blocks',
  });
}

/** A block and everything in it, as the Puck data a global block stores. */
function sectionOf(store: EditorStore, id: NodeId): GlobalSection {
  const doc = store.getState().doc;
  const subtree = extractSubtree(doc, id);
  const puck = documentToPuck({
    version: DOCUMENT_VERSION,
    root: { props: {} },
    nodes: subtree?.nodes ?? {},
    rootSlot: subtree ? [id] : [],
  });
  return { item: puck.content[0], zones: {} };
}

/** Replaces a block with a GlobalRef to the global block just saved from it. */
function linkGlobal(
  store: EditorStore,
  id: NodeId,
  saved: { id: string; name: string },
  section: GlobalSection
) {
  const doc = store.getState().doc;
  const position = findPosition(doc, id);
  if (!position) return;
  const ref: BuilderNode = {
    id: createNodeId('GlobalRef'),
    type: 'GlobalRef',
    props: {
      globalBlockId: saved.id,
      globalBlockName: saved.name,
      blocks: [section.item],
      zones: section.zones,
    },
    slots: {},
  };
  const next = insertSubtree(
    removeNode(doc, id),
    { rootId: ref.id, nodes: { [ref.id]: ref } },
    position
  );
  store.replaceDocument(next, { label: 'Link global block' });
}

/** Soft lock, the same as the Puck builder: check on open, heartbeat every 20 s (R698). */
function useEditorLock(targetType: 'page' | 'post' | null, id: string) {
  const [lockedBy, setLockedBy] = useState<LockState>(null);
  useEffect(() => {
    if (!targetType) return;
    let active = true;
    getEditorLock(targetType, id).then(result => {
      if (active && result.ok && result.lock && !result.lock.isCurrentUser) {
        setLockedBy({
          userName: result.lock.userName,
          isStale: result.lock.isStale,
        });
      }
    });
    const beat = () => void heartbeatEditorLock(targetType, id);
    beat();
    const timer = setInterval(beat, 20_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [targetType, id]);
  const takeOver = async () => {
    if (!targetType) return;
    const result = await takeOverEditorLock(targetType, id);
    if (result.ok) {
      setLockedBy(null);
      toast.success('You took over editing.');
    } else {
      toast.error(result.error ?? 'Could not take over.');
    }
  };
  return { lockedBy, takeOver };
}

export function NewEditor({
  page,
  themeTokens,
  kind = 'page',
  post,
  category,
  document,
  loaded,
  draftVersion = 0,
  issues = [],
  shell = 'legacy',
}: NewEditorProps) {
  const setup = useMemo(() => editorSetup(kind), [kind]);
  const adapter = useMemo(
    () => adapterFor(kind, page, category),
    [kind, page, category]
  );
  const canPublishPermission = useCan(PERMISSIONS.PAGES_PUBLISH);
  const savesGoLive =
    kind === 'global' || kind === 'contact-form' || kind === 'page-template';
  const canPublish = savesGoLive ? false : canPublishPermission;
  const hasRevisions = kind === 'page' || kind === 'post';
  const aiAvailable = !!useAiEnabled();
  const aiEnabled = kind === 'page' && aiAvailable;
  const [generateOpen, setGenerateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [rewriteTarget, setRewriteTarget] = useState<BuilderTarget | null>(
    null
  );
  const [globalTarget, setGlobalTarget] = useState<BuilderTarget | null>(null);

  const store = useMemo(
    () => createEditorStore({ document, schemas: setup.schemas }),
    [document, setup]
  );
  // Initialize B9 stores: style classes (R724) and preferences (R733).
  useMemo(() => initStyleClassStore(), []);
  useMemo(() => {
    setPreferencesStore(createPreferencesStore());
  }, []);
  const drag = useDragController(store);

  const save = useCallback(
    async (input: SaveInput): Promise<SaveResult> => {
      if (kind === 'page') {
        const result = await saveEditorDraft({ id: page.id, ...input });
        if (result && 'ok' in result) return result as SaveResult;
        throw new Error(actionError(result) ?? 'Could not save');
      }
      // Other kinds store whole documents through their adapter, without version checks.
      const next =
        'document' in input
          ? input.document
          : applyPatch(store.getState().savedDoc, input.patch);
      const result = await adapter.saveDraft(documentToPuck(next), true);
      const error = actionError(result);
      if (error) throw new Error(error);
      return { ok: true, version: input.baseVersion + 1 };
    },
    [kind, page.id, adapter, store]
  );
  const storage = useMemo(() => indexedDbStorage('nextcms-editor'), []);
  const queue = useSaveQueue({
    store,
    save,
    version: draftVersion,
    autosave: !savesGoLive,
    localKey: `${kind}:${page.id}`,
    storage,
  });

  const { lockedBy, takeOver } = useEditorLock(
    kind === 'page' ? 'page' : kind === 'post' ? 'post' : null,
    page.id
  );
  useEffect(() => queue.setPaused(!!lockedBy), [queue, lockedBy]);

  const [status, setStatus] = useState(page.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [motionPreview, setMotionPreview] = useState(false);
  const [frameWindow, setFrameWindow] = useState<Window | null>(null);
  const [panel, setPanel] = useState<'blocks' | 'layers'>('blocks');
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // B9: right panel tabs (R722-R733)
  const [rightPanel, setRightPanel] = useState<
    | 'blocks'
    | 'layers'
    | 'settings'
    | 'style-classes'
    | 'presence'
    | 'checks'
    | 'preferences'
    | 'history'
    | 'comments'
  >('settings');
  // B9: comments state (R728)
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  // B9: state style editing (R725)
  const [stateStyle, setStateStyle] = useState<
    'hover' | 'focus' | 'active' | null
  >(null);
  // B9: version compare (R727)
  const [versionCompareOpen, setVersionCompareOpen] = useState(false);
  // B9: first-run onboarding (R732)
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  // Shortcut help dialog (R477 / MKT-02)
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEditorKeyboard(
    store,
    [typeof window === 'undefined' ? null : window, frameWindow],
    {
      onSave: () => void saveSnapshot(),
      onHelp: () => setShortcutsOpen(true),
    }
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    frameWindow?.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      frameWindow?.removeEventListener('keydown', onKeyDown);
    };
  }, [frameWindow]);

  const metadata = useMemo(
    () => ({
      themeTokens,
      motionPreview,
      language: page.language,
      ...(setup.renderKind === 'post' && { post: post ?? SAMPLE_POST }),
    }),
    [themeTokens, motionPreview, page.language, setup.renderKind, post]
  );
  const components = useMemo(
    () => rendererComponents(setup.renderKind),
    [setup.renderKind]
  );
  const transformProps = useMemo(
    () => cmsTransformProps(metadata, setup.renderKind),
    [metadata, setup.renderKind]
  );
  const renderRoot = useCallback(
    (children: ReactNode) => (
      <EditorSiteRoot metadata={metadata}>{children}</EditorSiteRoot>
    ),
    [metadata]
  );
  const onFrame = useCallback(
    (frame: HTMLIFrameElement) => setFrameWindow(frame.contentWindow),
    []
  );

  const targetOf = (node: BuilderNode): BuilderTarget => ({
    id: node.id,
    type: node.type,
    props: { ...node.props, id: node.id },
  });
  const blockActions = useCallback(
    (node: BuilderNode): BlockAction[] => [
      ...(aiEnabled
        ? [
            {
              id: 'ai',
              label: 'Rewrite with AI',
              icon: '✦',
              run: () => setRewriteTarget(targetOf(node)),
            },
          ]
        : []),
      ...(!savesGoLive && node.type !== 'GlobalRef'
        ? [
            {
              id: 'global',
              label: 'Save as global block',
              icon: '◈',
              run: () => setGlobalTarget(targetOf(node)),
            },
          ]
        : []),
    ],
    [aiEnabled, savesGoLive]
  );

  /** Saves pending changes; false when they could not be saved. */
  const saveNow = async () => {
    if (lockedBy) {
      toast.error(
        `${lockedBy.userName ?? 'Another editor'} is editing this page. Take over to save.`
      );
      return false;
    }
    await queue.flush();
    const state = queue.getState();
    if (state.status !== 'saved') {
      toast.error(state.error ?? 'Could not save. Try again.');
      return false;
    }
    return true;
  };

  const run = async (action: string, fn: () => Promise<void>) => {
    setBusy(action);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const saveSnapshot = () =>
    run('save', async () => {
      if (!(await saveNow())) return;
      if (savesGoLive) {
        toast.success(
          kind === 'contact-form'
            ? 'Contact form saved. Pages embedding it show this version.'
            : kind === 'global'
              ? 'Global block saved. Every page using it now shows this version.'
              : 'Template layout saved'
        );
        return;
      }
      if (kind === 'page' || kind === 'post') {
        const create =
          kind === 'post' ? POST_REVISION_ACTIONS.create : createRevision;
        await handleActionResponse(
          create({ id: page.id, label: 'Saved draft' }) as never,
          () => {}
        );
      }
      toast.success('Draft saved');
    });

  const publish = () =>
    run('publish', async () => {
      if (!(await saveNow())) return;
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
    });

  const submitForReview = () =>
    run('review', async () => {
      if (!adapter.submitForReview || !(await saveNow())) return;
      await handleActionResponse(
        (await adapter.submitForReview()) as never,
        () => {
          setStatus('review');
          toast.success('Submitted for review');
        }
      );
    });

  const extraCommands = useMemo<Command[]>(
    () => [
      {
        id: 'focus-mode',
        section: 'Editor',
        label: focusMode ? 'Exit focus mode' : 'Enter focus mode',
        icon: '⛶',
        run: () => setFocusMode(value => !value),
      },
      {
        id: 'save-draft',
        section: 'Editor',
        label: 'Save draft',
        icon: '⤓',
        run: () => void saveSnapshot(),
      },
      ...(hasRevisions
        ? [
            {
              id: 'revisions',
              section: 'Editor',
              label: 'Open revisions',
              icon: '◷',
              run: () => setRevisionsOpen(true),
            },
          ]
        : []),
    ],
    [focusMode, hasRevisions]
  );

  const notices = (
    <>
      {lockedBy && (
        <div
          role="alert"
          className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          {lockedBy.userName ?? 'Another editor'} is editing this page. Changes
          here are not saved until you take over.
          <Button size="sm" onClick={() => void takeOver()}>
            Take over
          </Button>
        </div>
      )}
      <OfflineBanner queue={queue} />
      <ConflictBanner queue={queue} />
      <LocalCopyBanner queue={queue} version={draftVersion} />
      <IssuesBanner issues={issues} />
    </>
  );
  const leftPanelContent = (
    <div className="p-3">
      <div
        role="tablist"
        aria-label="Left panel"
        className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-steel-100 p-1 dark:bg-dark-200"
      >
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
        <BlockList groups={setup.groups} drag={drag} />
      ) : (
        <LayersPanel />
      )}
      <details className="mt-6 text-xs text-steel-500">
        <summary className="cursor-pointer font-medium">
          Keyboard shortcuts
        </summary>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
          {SHORTCUTS.map(([action, keys]) => (
            <div key={action} className="contents">
              <dt>{action.replace('-', ' ')}</dt>
              <dd className="font-mono">{keys}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
  const canvas = (
    <EditorCanvas
      components={components}
      drag={drag}
      transformProps={transformProps}
      loaded={loaded}
      renderRoot={renderRoot}
      onFrame={onFrame}
      resizeHandles={cmsResizeHandles}
      inlineProps={cmsInlineProps}
      blockActions={blockActions}
      insertGroups={setup.groups}
      stateStyle={stateStyle}
    />
  );
  const rightPanelContent = (
    <section aria-label="Settings" className="p-4">
      <NewEditorBridge themeTokens={themeTokens}>
        {/* Nine tabs do not fit a side panel; they scroll sideways (B15 E4). */}
        <div
          style={{ overflowX: 'auto', marginBottom: 12 }}
          className="ne-scrollbar"
        >
          <div style={{ width: 'max-content', minWidth: '100%' }}>
            <ChromeTabs
              variant="line"
              fullWidth={false}
              ariaLabel="Right panel tabs"
              activeId={rightPanel}
              onChange={key => setRightPanel(key as typeof rightPanel)}
              items={RIGHT_PANEL_TABS.map(tab => ({
                id: tab.key,
                label: tab.label,
              }))}
            />
          </div>
        </div>
        {rightPanel === 'settings' && (
          <Inspector
            blocks={setup.inspectorBlocks}
            rootFields={setup.rootFields}
            empty={
              <p className="mb-2 text-xs text-steel-500">
                Select a block to edit it.
                {Object.keys(setup.rootFields).length ? ' Page settings:' : ''}
              </p>
            }
          />
        )}
        {rightPanel === 'style-classes' && (
          <div className="p-3">
            {store.getState().selection.length === 1 && (
              <StyleClassControl
                nodeId={store.getState().selection[0]}
                styles={captureStyles(
                  store.getState().doc.nodes[
                    store.getState().selection[0] as never as string
                  ]
                )}
              />
            )}
            <StyleClassesList
              onApply={(blockId: string, className: string) => {
                const sc = getStyleClassStore();
                if (sc) sc.applyClass(blockId as never as string, className);
              }}
              onDetach={(blockId: string) => {
                const sc = getStyleClassStore();
                if (sc) sc.detachClass(blockId as never as string);
              }}
            />
          </div>
        )}
        {rightPanel === 'presence' && (
          <PresencePanel
            users={[]}
            blockLocks={[]}
            me=""
            onSelectionChange={() => {}}
            onEditingChange={() => {}}
          />
        )}
        {rightPanel === 'checks' && (
          <LiveChecksPanel issues={[]} onIssueClick={id => store.select(id)} />
        )}
        {rightPanel === 'preferences' && <PreferencesPanel />}
        {rightPanel === 'history' && <HistoryPanel queue={queue} />}
        {rightPanel === 'comments' && (
          <CommentsPanel
            threads={commentThreads}
            onAdd={(blockId, text, parentId) => {
              setCommentThreads(prev => {
                const rest = prev.filter(t => t.blockId !== blockId);
                const mine = prev.find(t => t.blockId === blockId);
                const comments = mine
                  ? [
                      ...mine.comments,
                      {
                        id: `c-${Date.now()}`,
                        blockId,
                        author: { name: 'You' },
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        text,
                        resolved: false,
                        parentId,
                      },
                    ]
                  : [
                      {
                        id: `c-${Date.now()}`,
                        blockId,
                        author: { name: 'You' },
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        text,
                        resolved: false,
                      },
                    ];
                return [...rest, { blockId, comments }];
              });
            }}
            onResolve={(blockId, resolved) => {
              setCommentThreads(prev =>
                prev.map(t =>
                  t.blockId === blockId
                    ? {
                        ...t,
                        comments: t.comments.map(c => ({ ...c, resolved })),
                      }
                    : t
                )
              );
            }}
            onDelete={commentId => {
              setCommentThreads(prev =>
                prev.map(t => ({
                  ...t,
                  comments: t.comments.filter(c => c.id !== commentId),
                }))
              );
            }}
            selectedBlock={
              store.getState().selection.length === 1
                ? store.getState().selection[0]
                : null
            }
            canEdit={true}
            onClose={() => {}}
          />
        )}
        {rightPanel === 'blocks' && (
          <BlockList groups={setup.groups} drag={drag} />
        )}
        {rightPanel === 'layers' && <LayersPanel />}
      </NewEditorBridge>
    </section>
  );
  const commandPalette = (
    <CommandPalette
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      groups={setup.groups}
      extraCommands={extraCommands}
    />
  );
  const dialogs = (
    <>
      <AiGenerateDialogView
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onApply={(data, mode) => applyGenerated(store, data, mode)}
      />
      <AiRewriteDialogView
        target={rewriteTarget}
        onClose={() => setRewriteTarget(null)}
        onApply={(target, props) =>
          store.updateProps(target.id, props) ||
          !!store.getState().doc.nodes[target.id]
        }
      />
      <SaveGlobalDialogView
        target={globalTarget}
        onClose={() => setGlobalTarget(null)}
        getSection={target => sectionOf(store, target.id)}
        linkGlobal={(target, saved, section) =>
          linkGlobal(store, target.id, saved, section)
        }
      />
      <SaveTemplateDialogView
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        pageTitle={page.title}
        getContent={() => documentToPuck(store.getState().doc)}
      />
      {hasRevisions && (
        <RevisionsDrawer
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
          pageId={page.id}
          actions={kind === 'post' ? POST_REVISION_ACTIONS : undefined}
          onRestored={() => {
            void queue.discardLocalCopy();
            window.location.reload();
          }}
        />
      )}
      {versionCompareOpen && (
        <VersionCompare
          revisions={[]}
          onRestoreBlock={() => {}}
          onClose={() => setVersionCompareOpen(false)}
        />
      )}
      {onboardingOpen && (
        <StartScreen
          options={[
            {
              id: 'blank',
              label: 'Blank page',
              description: 'Start with an empty canvas.',
              icon: '📄',
              run: () => setOnboardingOpen(false),
            },
            {
              id: 'template',
              label: 'Template',
              description: 'Start from a pre-built layout.',
              icon: '📐',
              run: () => setOnboardingOpen(false),
            },
            {
              id: 'ai',
              label: 'Generate with AI',
              description: 'Describe what you want and let AI build it.',
              icon: '✦',
              run: () => setOnboardingOpen(false),
            },
          ]}
          onComplete={() => setOnboardingOpen(false)}
        />
      )}
      <ShortcutHelpDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );

  if (shell === 'shared') {
    const primaryAction: PrimaryAction | null = savesGoLive
      ? { label: adapter.liveLabel, disabled: busy !== null, run: saveSnapshot }
      : canPublish
        ? { label: adapter.liveLabel, disabled: busy !== null, run: publish }
        : adapter.submitForReview
          ? {
              label: 'Submit for review',
              disabled: busy !== null || status === 'review',
              run: submitForReview,
            }
          : null;
    const selection = store.getState().selection;
    return (
      <EditorProvider store={store}>
        <SharedChrome
          queue={queue}
          title={page.title}
          kindLabel={adapter.label}
          backHref={adapter.backHref}
          backLabel={adapter.backLabel}
          status={savesGoLive ? null : status}
          previewHref={adapter.previewHref}
          primaryAction={primaryAction}
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode(value => !value)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          actions={
            <>
              <ChromeIconButton
                size="sm"
                active={motionPreview}
                aria-pressed={motionPreview}
                aria-label="Preview motion"
                tooltip="Preview animations"
                onClick={() => setMotionPreview(value => !value)}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </ChromeIconButton>
              {aiEnabled && (
                <ChromeButton
                  size="sm"
                  variant="secondary"
                  leftIcon={<Wand2 className="h-3.5 w-3.5" />}
                  onClick={() => setGenerateOpen(true)}
                >
                  Generate
                </ChromeButton>
              )}
              {kind === 'page' && (
                <ChromeIconButton
                  size="sm"
                  aria-label="Save as template"
                  tooltip="Save as template"
                  onClick={() => setTemplateOpen(true)}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                </ChromeIconButton>
              )}
              {hasRevisions && (
                <ChromeIconButton
                  size="sm"
                  aria-label="Revisions"
                  tooltip="Revisions"
                  onClick={() => setRevisionsOpen(true)}
                >
                  <History className="h-3.5 w-3.5" />
                </ChromeIconButton>
              )}
              {!savesGoLive && (
                <ChromeButton
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={saveSnapshot}
                >
                  Save draft
                </ChromeButton>
              )}
            </>
          }
          notices={notices}
          library={leftPanelContent}
          canvas={<div className="min-h-0 flex-1">{canvas}</div>}
          inspector={
            <>
              {/* State styles edit the selected block, so they sit with its settings. */}
              <div className="border-b border-[var(--ne-border)] px-4 py-2">
                <StateStyleSwitch
                  nodeId={selection.length === 1 ? selection[0] : ''}
                  onChange={(s: 'hover' | 'focus' | 'active' | null) =>
                    setStateStyle(s)
                  }
                />
              </div>
              {rightPanelContent}
            </>
          }
          commandPalette={commandPalette}
        />
        {dialogs}
      </EditorProvider>
    );
  }

  return (
    <EditorProvider store={store}>
      <div className="flex h-screen flex-col bg-steel-50 dark:bg-dark-50">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-steel-200 bg-white px-3 dark:border-dark-300 dark:bg-dark-100">
          <Button
            asChild
            size="icon"
            variant="ghost"
            aria-label={`Back to ${adapter.backLabel}`}
            title={adapter.backLabel}
          >
            <Link href={adapter.backHref}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wide text-steel-500">
              {adapter.label}
            </p>
            <h1 className="truncate text-sm font-semibold">{page.title}</h1>
          </div>
          {status && !savesGoLive && (
            <span className="rounded bg-steel-100 px-2 py-0.5 text-xs capitalize text-steel-700 dark:bg-dark-200">
              {status}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SaveIndicator queue={queue} />
            <DeviceSwitch />
            <StateStyleSwitch
              nodeId={
                store.getState().selection.length === 1
                  ? store.getState().selection[0]
                  : ''
              }
              onChange={(s: 'hover' | 'focus' | 'active' | null) =>
                setStateStyle(s)
              }
            />
            <HistoryButtons />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Command palette"
              title="Command palette (Mod + K)"
              onClick={() => setPaletteOpen(true)}
            >
              <CommandIcon />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={() => setShortcutsOpen(true)}
            >
              <HelpCircle className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-pressed={focusMode}
              aria-label={focusMode ? 'Exit focus mode' : 'Focus mode'}
              title={
                focusMode
                  ? 'Exit focus mode'
                  : 'Focus mode: hide the side panels'
              }
              onClick={() => setFocusMode(value => !value)}
            >
              {focusMode ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-pressed={motionPreview}
              aria-label="Preview motion"
              title="Preview animations"
              onClick={() => setMotionPreview(value => !value)}
            >
              <Sparkles />
            </Button>
            {aiEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGenerateOpen(true)}
              >
                <Wand2 /> Generate
              </Button>
            )}
            {kind === 'page' && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Save as template"
                title="Save as template"
                onClick={() => setTemplateOpen(true)}
              >
                <LayoutTemplate />
              </Button>
            )}
            {hasRevisions && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Revisions"
                title="Revisions"
                onClick={() => setRevisionsOpen(true)}
              >
                <History />
              </Button>
            )}
            {adapter.previewHref && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                aria-label="Preview"
                title="Preview"
              >
                <a
                  href={adapter.previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye />
                </a>
              </Button>
            )}
            {!savesGoLive && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={saveSnapshot}
              >
                Save draft
              </Button>
            )}
            {savesGoLive ? (
              <Button size="sm" disabled={busy !== null} onClick={saveSnapshot}>
                {adapter.liveLabel}
              </Button>
            ) : canPublish ? (
              <Button size="sm" disabled={busy !== null} onClick={publish}>
                {adapter.liveLabel}
              </Button>
            ) : adapter.submitForReview ? (
              <Button
                size="sm"
                disabled={busy !== null || status === 'review'}
                onClick={submitForReview}
              >
                Submit for review
              </Button>
            ) : null}
          </div>
        </header>
        {notices}
        <div className="flex min-h-0 flex-1">
          {!focusMode && (
            <ResizablePanel
              side="left"
              title="Blocks"
              storageKey="nextcms-editor:left-panel"
              style={{
                borderRight: '1px solid var(--steel-200, #e2e8f0)',
                background: 'var(--panel-bg, #fff)',
              }}
            >
              <EditorUIScopeBox>{leftPanelContent}</EditorUIScopeBox>
            </ResizablePanel>
          )}
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-9 shrink-0 items-center border-b border-steel-200 bg-white px-3 dark:border-dark-300 dark:bg-dark-100">
              <Breadcrumb />
            </div>
            <div className="min-h-0 flex-1">{canvas}</div>
          </main>
          {!focusMode && (
            <ResizablePanel
              side="right"
              title="Settings"
              storageKey="nextcms-editor:right-panel"
              style={{
                borderLeft: '1px solid var(--steel-200, #e2e8f0)',
                background: 'var(--panel-bg, #fff)',
              }}
            >
              <EditorUIScopeBox>{rightPanelContent}</EditorUIScopeBox>
            </ResizablePanel>
          )}
        </div>
      </div>
      {commandPalette}
      {dialogs}
    </EditorProvider>
  );
}
