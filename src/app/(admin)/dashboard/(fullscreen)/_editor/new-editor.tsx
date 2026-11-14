'use client';

/**
 * The new editor for every builder kind (R698, R699, R700, R797, R798): the
 * same props, adapters, and actions as the Puck builder, on
 * @nextcms/builder-react. Pages save versioned patches; other kinds save
 * through their adapter. Global blocks, contact forms, and page templates
 * save only on request, because saving them updates the live site.
 */

import {
  MegaMenuPanel,
  type MegaMenuPanelSettings,
  type MegaMenuWidth,
} from '@/builder/blocks/mega-menu';
import {
  applyPatch,
  type BreakpointConfig,
  type BuilderDocument,
  type BuilderNode,
  cloneSubtree,
  createNodeId,
  DEFAULT_BREAKPOINTS,
  DOCUMENT_VERSION,
  diffDocuments,
  documentProblems,
  documentToPuck,
  enabledDevices,
  extractSubtree,
  findPosition,
  insertSubtree,
  type NodeId,
  normalizeBreakpointConfig,
  puckToDocument,
  removeNode,
  repairDocument,
  compileStyleClasses,
  type StyleClass,
} from '@nextcms/builder-core';
import {
  type BlockAction,
  BlockList,
  BlockNotice,
  Breadcrumb,
  type Command,
  CommandPalette,
  CommentsPanel,
  type CommentThread,
  createEditorStore,
  DeviceSwitch,
  EditorCanvas,
  DynamicRefsProvider,
  DynamicSourcesProvider,
  type DynamicSourcesValue,
  EditorProvider,
  type EditorStore,
  Inspector,
  HistoryPanel,
  indexedDbStorage,
  ClassesView,
  ForcedStatePreview,
  importLegacyStyleClasses,
  SelectedClassStyles,
  useStyleClasses,
  initStyleClassStore,
  isTypingTarget,
  type LocalCopy,
  type StyleClassAdapter,
  LayersPanel,
  LiveChecksPanel,
  PresencePanel,
  ResizablePanel,
  StateStyleSwitch,
  type SaveInput,
  type SaveQueue,
  type SaveResult,
  SHORTCUTS,
  useDragController,
  useEditor,
  useEditorKeyboard,
  useEditorStore,
  useSaveQueue,
  useSaveState,
  VersionCompare,
  StartScreen,
  createPreferencesStore,
  getPreferencesStore,
  setPreferencesStore,
  SinglePanel,
  type TemplateItem,
  E12ControlsProvider,
} from '@nextcms/builder-react';
import { PreferencesPanel } from '@nextcms/builder-react';
import {
  readOverlayLayout,
  resolveBackdropColor,
  resolveOverlayPanelStyle,
} from '@/lib/overlays/layout-style';
import { cn } from '@/lib/utils/cn';
import {
  Button as ChromeButton,
  IconButton as ChromeIconButton,
  type PublishState,
  ShortcutHelpDialog,
  Tabs as ChromeTabs,
} from '@nextcms/editor-ui';
import {
  ArrowLeft,
  CommandIcon,
  Columns2,
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
import Link from '@/components/atoms/next/link';
import { useAdminHref } from '@/providers/site-locales';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import { collectLoopBlocks, findTargetLoop } from '@/builder/query-filter-target';
import { getResponsiveCss } from '@/builder/responsive-css';
import { supportsStyleClasses } from '@/builder/style-class-blocks';
import { styleClassTagSchema } from '@/schemas/style-classes.schema';
import { buildCustomFontsCss, type CustomFont } from '@/builder/fonts';
import {
  convertBlogBlockToQueryLoop,
  toLoopItemContext,
} from '@/builder/blocks/query-loop';
import { resolveEffectiveFieldKind } from '@/builder/blocks/loop-item-field';
import { LoopItemProvider } from '@/builder/blocks/query-loop-client';
import { useLiveLoaded } from './use-live-loaded';
import {
  entryDynamicSources,
  LoopPreviewProvider,
  loopItemDynamicSources,
  pickPreviewItem,
} from '@/builder/controls/loop-preview';
import {
  APPROVED_DYNAMIC_SOURCES,
  CURRENT_ITEM_REF,
  collectDynamicRefs,
  type NormalizedListingItem,
} from '@nextcms/builder-core';
import { loadExternalApiRecords } from '@/server/actions/external-api-records.actions';
import type { BuilderData } from '@/builder/data';
import { editorSetup } from '@/builder/definitions';
import {
  ALL_PARTS,
  BUTTON_PARTS,
  styleControl,
  VISUAL_MEDIA_PARTS,
} from '@/builder/definitions/fields';
import { cmsInlineProps, cmsResizeHandles } from '@/builder/editor-handles';
import { SAMPLE_POST, toDynamicPostRecord } from '@/builder/post-template';
import type {
  DynamicRefItem,
  DynamicRefOptions,
} from '@/server/services/dynamic-refs.service';
// Shared editor chrome styles (B15 E1), built by `pnpm --filter @nextcms/editor-ui build:css`.
import '@nextcms/editor-ui/editor-ui.css';
import { EntryProvider } from '@/components/analytics/entry-context';
import {
  cmsTransformProps,
  rendererComponents,
  SiteRoot,
} from '@/builder/renderer';
import {
  PluginFormActionsProvider,
  type SerializedPluginFormAction,
} from '@/builder/fields/plugin-editor-context';
import {
  pluginFormActionFields,
  pluginInspectorFields,
} from '@/plugins/client-blocks';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import { maybeOfferRedirect } from '@/components/dashboard/redirect-offer';
import { Button } from '@/components/ui/button';
import { PERMISSIONS } from '@/config/permissions';
import {
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
} from '@/config/post-types';
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
import { styleClassesActions } from '../pages/[id]/builder/_components/style-classes.client';
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
  breakpoints?: BreakpointConfig;
  /** Pages: version of the stored draft, for conflict checks (R738). */
  draftVersion?: number;
  /** Problems found in the stored document (R797). */
  issues?: string[];
  /** Block manager: block types left out of the insert panel. */
  hiddenBlocks?: string[];
  /** Enabled plugin ids for this site. */
  enabledPluginIds?: string[];
  /** Block types owned by disabled plugins (`blockType -> pluginName`). */
  disabledPluginBlocks?: Record<string, string>;
  /** Enabled plugin-contributed form actions for ContactForm. */
  pluginFormActions?: SerializedPluginFormAction[];
  /** Collection-scoped block presets for the insert panel. */
  collectionBlocks?: { id: string; name: string }[];
  /** Pages and posts for "Specific Page/Blog Post" bindings. */
  dynamicRefs?: DynamicRefOptions;
  /** Editor chrome: the current one, or the shared @nextcms/editor-ui shell (B15 E6). */
  shell?: 'legacy' | 'shared';
  /** Layout mode: single dockable panel vs split two-panel layout. */
  layout?: 'single' | 'split';
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

/** Canvas class map while style classes are off (stable, so memos keep). */
const NO_STYLE_CLASSES: Record<string, StyleClass> = {};

/** Where to edit an entry that uses a style class (Classes manager links). */
function styleClassUsageHref(hit: { entryId: string; kind?: string }): string | undefined {
  const id = encodeURIComponent(hit.entryId);
  switch (hit.kind) {
    case 'page':
      return `/dashboard/pages/${id}/builder`;
    case 'global-block':
      return `/dashboard/templates/globals/${id}`;
    case 'page-template':
      return `/dashboard/templates/${id}`;
    case 'post-template':
      return `/dashboard/posts/templates/${id}/builder`;
    case 'loop-template':
      return `/dashboard/templates/loop/${id}`;
    default:
      // Collection templates and blocks are edited under their collection's slug.
      return undefined;
  }
}

function EditorSiteRoot({
  metadata,
  collectionEntry,
  loopPreviewItem,
  megaMenu,
  overlayKind,
  children,
}: {
  metadata: Record<string, unknown>;
  collectionEntry?: any;
  /** Mega menus preview as a dropdown panel under a mock header bar. */
  megaMenu?: boolean;
  /** Popups and Drawers preview docked to sides or centered over a mock dimmed page. */
  overlayKind?: 'popup' | 'drawer' | null;
  /** Loop Item templates: the item the canvas renders, in a card-sized frame. */
  loopPreviewItem?: NormalizedListingItem | null;
  children: ReactNode;
}) {
  const rootProps = useEditor(state => state.doc.root.props);
  const width = Number(rootProps?.previewWidth) || 400;
  const layout = ((rootProps as any)?.layout ?? {}) as Record<string, any>;
  const overlayCategory = overlayKind === 'drawer' ? 'Drawer' : 'Popup';
  const overlayLayout = overlayKind
    ? readOverlayLayout(layout, overlayCategory)
    : null;
  return (
    <EntryProvider entry={collectionEntry ?? null}>
      <SiteRoot rootProps={rootProps} metadata={{ ...metadata, editing: true }}>
        {loopPreviewItem ? (
          <LoopItemProvider item={loopPreviewItem}>
            <div
              data-loop-item-frame
              style={{ maxWidth: width, margin: '40px auto', minHeight: 120 }}
            >
              {children}
            </div>
          </LoopItemProvider>
        ) : megaMenu ? (
          <div data-mega-menu-frame className="min-h-[70vh] px-4 pb-16">
            <div className="s-border mx-auto flex h-14 w-full max-w-[var(--site-max-width,72rem)] items-center gap-6 border-b text-sm">
              <span className="font-semibold">Logo</span>
              <span className="s-primary-text font-medium underline underline-offset-4">Menu item ▾</span>
              <span className="s-muted">Another item</span>
              <span className="s-muted">Contact</span>
            </div>
            <div className="mt-2">
              <MegaMenuPanel
                settings={rootProps as MegaMenuPanelSettings}
                width={(rootProps?.previewWidth as MegaMenuWidth) || 'container'}
              >
                {children}
              </MegaMenuPanel>
            </div>
          </div>
        ) : overlayKind ? (
          <div
            data-overlay-frame
            className="relative min-h-[85vh] w-full overflow-hidden bg-muted/40 p-4"
          >
            {/* Dimmed fake background page */}
            <div className="pointer-events-none select-none opacity-20 filter blur-[1px]">
              <div className="s-border mx-auto flex h-14 w-full max-w-5xl items-center justify-between border-b px-4 text-sm">
                <span className="font-bold text-lg">Acme Corp</span>
                <div className="flex gap-6">
                  <span>Home</span>
                  <span>Products</span>
                  <span>About</span>
                  <span>Contact</span>
                </div>
              </div>
              <div className="mx-auto mt-12 max-w-4xl space-y-6 px-4">
                <div className="h-10 w-2/3 rounded bg-current opacity-30" />
                <div className="h-5 w-full rounded bg-current opacity-20" />
                <div className="h-5 w-4/5 rounded bg-current opacity-20" />
                <div className="grid grid-cols-3 gap-6 pt-8">
                  <div className="h-36 rounded-lg border border-current opacity-20 p-4" />
                  <div className="h-36 rounded-lg border border-current opacity-20 p-4" />
                  <div className="h-36 rounded-lg border border-current opacity-20 p-4" />
                </div>
              </div>
            </div>

            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor:
                  layout.overlay !== false
                    ? resolveBackdropColor(overlayLayout?.overlayColor)
                    : 'transparent',
              }}
            />

            {/* Overlay preview container */}
            <div
              className={cn(
                's-ov-panel absolute z-20 max-w-full overflow-y-auto shadow-2xl transition-all',
                overlayKind === 'drawer'
                  ? layout.position === 'left'
                    ? 'top-0 start-0 bottom-0 h-full border-e'
                    : layout.position === 'top'
                      ? 'top-0 start-0 end-0 w-full border-b'
                      : layout.position === 'bottom'
                        ? 'bottom-0 start-0 end-0 w-full border-t'
                        : 'top-0 end-0 bottom-0 h-full border-s'
                  : layout.position === 'top-left'
                    ? 'top-6 start-6 border'
                    : layout.position === 'top-right'
                      ? 'top-6 end-6 border'
                      : layout.position === 'bottom-left'
                        ? 'bottom-6 start-6 border'
                        : layout.position === 'bottom-right'
                          ? 'bottom-6 end-6 border'
                          : layout.position === 'top'
                            ? 'top-6 start-1/2 -translate-x-1/2 border'
                            : layout.position === 'bottom'
                              ? 'bottom-6 start-1/2 -translate-x-1/2 border'
                              : 'top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 border'
              )}
              style={{
                ...(overlayLayout
                  ? resolveOverlayPanelStyle(
                      overlayLayout,
                      overlayCategory,
                      layout.position
                    )
                  : undefined),
                backgroundColor: overlayLayout?.background,
              }}
            >
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </SiteRoot>
    </EntryProvider>
  );
}

/** Gives the CMS inspector controls this editor's device, selection, and theme tokens. */
function NewEditorBridge({
  themeTokens,
  customFonts,
  breakpoints,
  children,
}: {
  themeTokens: unknown;
  customFonts?: CustomFont[];
  breakpoints: BreakpointConfig;
  children: ReactNode;
}) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const node = useEditor(state =>
    state.selection.length === 1
      ? state.doc.nodes[state.selection[0]]
      : undefined
  );
  const parentNode = useEditor(state => {
    if (state.selection.length !== 1) return undefined;
    const pos = findPosition(state.doc, state.selection[0]);
    return pos?.parentId ? state.doc.nodes[pos.parentId] : undefined;
  });
  // Returns the loop node's own props object, so the selector stays stable.
  const targetLoopProps = useEditor(state => {
    if (state.selection.length !== 1) return undefined;
    const selected = state.doc.nodes[state.selection[0]];
    if (selected?.type !== 'QueryFilter') return undefined;
    return findTargetLoop(collectLoopBlocks(state.doc.nodes), selected.props)
      ?.props;
  });
  const value = useMemo(
    () => ({
      device,
      setDevice: store.setDevice,
      breakpoints,
      selectedType: node?.type,
      selectedProps: node?.props,
      parentType: parentNode?.type,
      parentProps: parentNode?.props,
      targetLoopProps,
      themeTokens: themeTokens as Record<string, string> | undefined,
      customFonts,
    }),
    [
      device,
      store,
      breakpoints,
      node,
      parentNode,
      targetLoopProps,
      themeTokens,
      customFonts,
    ]
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

const NO_DYNAMIC_REFS: DynamicRefOptions = { pages: [], posts: [] };

const NO_PREVIEW_ITEMS: NormalizedListingItem[] = [];
const NO_HIDDEN_BLOCKS: string[] = [];
const NO_DISABLED_PLUGIN_BLOCKS: Record<string, string> = {};
const NO_PLUGIN_FORM_ACTIONS: SerializedPluginFormAction[] = [];
const NO_COLLECTION_BLOCKS: { id: string; name: string }[] = [];

const DEFAULT_DYNAMIC_SOURCES: DynamicSourcesValue = {
  sources: APPROVED_DYNAMIC_SOURCES,
  defaultSource: 'page',
  defaultPath: 'title',
};

const NO_CUSTOM_FONTS: CustomFont[] = [];

const recordsById = (items: DynamicRefItem[]) =>
  Object.fromEntries(items.map(item => [item.id, item]));

export function NewEditor({
  page,
  themeTokens,
  breakpoints: rawBreakpoints,
  customFonts = NO_CUSTOM_FONTS,
  kind = 'page',
  post,
  category,
  collectionEntry,
  collectionBlocks = NO_COLLECTION_BLOCKS,
  previewItems = NO_PREVIEW_ITEMS,
  loopItemFields,
  document,
  loaded,
  draftVersion = 0,
  issues = [],
  hiddenBlocks = NO_HIDDEN_BLOCKS,
  enabledPluginIds,
  disabledPluginBlocks = NO_DISABLED_PLUGIN_BLOCKS,
  pluginFormActions = NO_PLUGIN_FORM_ACTIONS,
  dynamicRefs = NO_DYNAMIC_REFS,
  shell = 'legacy',
  layout,
}: NewEditorProps) {
  const toAdminHref = useAdminHref();
  const pageSettingsHref =
    kind === 'page' ? toAdminHref(`/dashboard/pages/${page.id}/edit`) : undefined;
  const hiddenFromInsert = useMemo(() => {
    const omitted = [...hiddenBlocks, ...Object.keys(disabledPluginBlocks)];
    if (
      (kind === 'entry' || kind === 'entry-template') &&
      collectionBlocks.length === 0
    ) {
      omitted.push('CollectionBlock');
    }
    return omitted;
  }, [hiddenBlocks, disabledPluginBlocks, kind, collectionBlocks]);
  const baseSetup = useMemo(() => editorSetup(kind), [kind]);
  // Block manager: hidden blocks leave the insert panel only, so content that
  // already uses them still renders and edits normally.
  const setup = useMemo(() => {
    let next = baseSetup;
    const omittedFromInsert = new Set([
      ...hiddenBlocks,
      ...Object.keys(disabledPluginBlocks),
    ]);
    if (omittedFromInsert.size > 0) {
      next = {
        ...next,
        groups: next.groups
          .map(group => ({
            ...group,
            types: group.types.filter(type => !omittedFromInsert.has(type)),
          }))
          .filter(group => group.types.length > 0),
      };
    }
    if (pluginFormActions.length > 0 && next.inspectorBlocks.ContactForm) {
      const extraFields: Record<string, any> = {};
      for (const action of pluginFormActions) {
        const clientOverride = pluginFormActionFields[action.id];
        if (clientOverride) {
          for (const [key, fieldDef] of Object.entries(clientOverride)) {
            extraFields[key] = {
              ...fieldDef,
              when:
                fieldDef.when ??
                ((p: Record<string, unknown>) =>
                  Array.isArray(p.actions) && p.actions.includes(action.id)),
            };
          }
        }
        if (action.fields) {
          for (const [key, meta] of Object.entries(action.fields)) {
            if (extraFields[key]) continue;
            const customRender = meta.fieldKey
              ? pluginInspectorFields[meta.fieldKey]
              : undefined;
            extraFields[key] = {
              label: meta.label,
              description: meta.description,
              placeholder: meta.placeholder,
              tab: 'content',
              section: 'Actions',
              group: 'Actions',
              type: customRender ? 'custom' : meta.type,
              ...(customRender ? { render: customRender } : {}),
              ...(meta.options ? { options: meta.options } : {}),
              when: (p: Record<string, unknown>) =>
                Array.isArray(p.actions) && p.actions.includes(action.id),
            };
          }
        }
      }
      if (Object.keys(extraFields).length > 0) {
        next = {
          ...next,
          inspectorBlocks: {
            ...next.inspectorBlocks,
            ContactForm: {
              ...next.inspectorBlocks.ContactForm,
              fields: {
                ...next.inspectorBlocks.ContactForm.fields,
                ...extraFields,
              },
            },
          },
        };
      }
    }
    if (kind === 'entry' || kind === 'entry-template') {
      const collectionName =
        collectionEntry?.collection?.name ?? 'Collection';
      if (collectionBlocks.length) {
        next = {
          ...next,
          schemas: {
            ...next.schemas,
            CollectionBlock: {
              ...next.schemas.CollectionBlock,
              presets: Object.fromEntries(
                collectionBlocks.map(block => [
                  block.name,
                  { collectionBlockId: block.id },
                ])
              ),
            },
          },
          groups: next.groups.map(group =>
            group.title === 'Collection blocks'
              ? {
                  ...group,
                  title: `${collectionName} blocks`,
                  listPresets: true,
                }
              : group
          ),
        };
      } else {
        // No blocks for this collection: keep the type renderable, but leave
        // it out of the insert panel (which lists every known schema).
        const inUse = Object.values(document.nodes).some(
          node => node.type === 'CollectionBlock'
        );
        const { CollectionBlock: _none, ...schemas } = next.schemas;
        next = {
          ...next,
          schemas: inUse ? next.schemas : schemas,
          groups: next.groups.filter(
            group => group.title !== 'Collection blocks'
          ),
        };
      }
    }
    if (next.inspectorBlocks.CollectionItem) {
      const rawCollectionFields = (collectionEntry?.collection?.fields ??
        []) as Array<{
        key?: string;
        type?: string;
        config?: unknown;
      }>;
      const mediaFieldKeys = new Set(
        rawCollectionFields
          .filter(f => f.type === 'media' && typeof f.key === 'string')
          .map(f => f.key as string)
      );
      const multiMediaFieldKeys = new Set(
        rawCollectionFields
          .filter(
            f =>
              f.type === 'media' &&
              typeof f.key === 'string' &&
              readMediaFieldConfig(f.config).multiple
          )
          .map(f => f.key as string)
      );
      const featuredMediaFieldKeys = new Set(
        rawCollectionFields
          .filter(
            f =>
              f.type === 'media' &&
              typeof f.key === 'string' &&
              readMediaFieldConfig(f.config).isFeatured
          )
          .map(f => f.key as string)
      );
      const videoFieldKeys = new Set(
        rawCollectionFields
          .filter(
            f =>
              typeof f.key === 'string' &&
              ((f.type === 'text' &&
                readTextFieldMode(f.config) === 'video') ||
                (f.type === 'url' && readUrlFieldMode(f.config) === 'video'))
          )
          .map(f => f.key as string)
      );
      const embedFieldKeys = new Set(
        rawCollectionFields
          .filter(
            f =>
              f.type === 'text' &&
              typeof f.key === 'string' &&
              readTextFieldMode(f.config) === 'embed'
          )
          .map(f => f.key as string)
      );
      const urlFieldKeys = new Set(
        rawCollectionFields
          .filter(
            f =>
              f.type === 'url' &&
              typeof f.key === 'string' &&
              readUrlFieldMode(f.config) === 'other'
          )
          .map(f => f.key as string)
      );
      const ci = next.inspectorBlocks.CollectionItem;
      const itemsField = ci.fields.items;
      next = {
        ...next,
        inspectorBlocks: {
          ...next.inspectorBlocks,
          CollectionItem: {
            ...ci,
            fields: {
              ...ci.fields,
              ...(itemsField?.type === 'list' && itemsField.item
                ? {
                    items: {
                      ...itemsField,
                      item: {
                        ...itemsField.item,
                        ...(itemsField.item.textSize
                          ? {
                              textSize: {
                                ...itemsField.item.textSize,
                                when: (item: Record<string, unknown>) => {
                                  if (typeof item?.field !== 'string') return true;
                                  if (
                                    mediaFieldKeys.has(item.field) ||
                                    videoFieldKeys.has(item.field) ||
                                    embedFieldKeys.has(item.field)
                                  ) {
                                    return false;
                                  }
                                  if (
                                    urlFieldKeys.has(item.field) &&
                                    item?.urlDisplay !== 'text'
                                  ) {
                                    return false;
                                  }
                                  return true;
                                },
                              },
                            }
                          : {}),
                        ...(itemsField.item.popupTrigger
                          ? {
                              popupTrigger: {
                                ...itemsField.item.popupTrigger,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  (mediaFieldKeys.has(item.field) ||
                                    videoFieldKeys.has(item.field)),
                              },
                            }
                          : {}),
                        ...(itemsField.item.overlayId
                          ? {
                              overlayId: {
                                ...itemsField.item.overlayId,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  (mediaFieldKeys.has(item.field) ||
                                    videoFieldKeys.has(item.field)) &&
                                  Boolean(item?.popupTrigger),
                              },
                            }
                          : {}),
                        ...(itemsField.item.posterUrl
                          ? {
                              posterUrl: {
                                ...itemsField.item.posterUrl,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  videoFieldKeys.has(item.field) &&
                                  Boolean(item?.popupTrigger),
                              },
                            }
                          : {}),
                        ...(itemsField.item.urlDisplay
                          ? {
                              urlDisplay: {
                                ...itemsField.item.urlDisplay,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  urlFieldKeys.has(item.field),
                              },
                            }
                          : {}),
                        ...(itemsField.item.urlLinkText
                          ? {
                              urlLinkText: {
                                ...itemsField.item.urlLinkText,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  urlFieldKeys.has(item.field) &&
                                  item?.urlDisplay !== 'text',
                              },
                            }
                          : {}),
                        ...(itemsField.item.urlNewTab
                          ? {
                              urlNewTab: {
                                ...itemsField.item.urlNewTab,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  urlFieldKeys.has(item.field) &&
                                  item?.urlDisplay !== 'text',
                              },
                            }
                          : {}),
                        ...(itemsField.item.galleryStyle
                          ? {
                              galleryStyle: {
                                ...itemsField.item.galleryStyle,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  multiMediaFieldKeys.has(item.field),
                              },
                            }
                          : {}),
                        ...(itemsField.item.galleryAspect
                          ? {
                              galleryAspect: {
                                ...itemsField.item.galleryAspect,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  multiMediaFieldKeys.has(item.field),
                              },
                            }
                          : {}),
                        ...(itemsField.item.excludeFeaturedImage
                          ? {
                              excludeFeaturedImage: {
                                ...itemsField.item.excludeFeaturedImage,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  multiMediaFieldKeys.has(item.field) &&
                                  !featuredMediaFieldKeys.has(item.field),
                              },
                            }
                          : {}),
                        ...(itemsField.item.motion
                          ? {
                              motion: {
                                ...itemsField.item.motion,
                                when: (item: Record<string, unknown>) =>
                                  typeof item?.field === 'string' &&
                                  featuredMediaFieldKeys.has(item.field),
                              },
                            }
                          : {}),
                        ...(itemsField.item.style?.type === 'custom'
                          ? {
                              style: {
                                ...itemsField.item.style,
                                render: styleControl(ALL_PARTS, item =>
                                  typeof item?.field === 'string' &&
                                  (mediaFieldKeys.has(item.field) ||
                                    videoFieldKeys.has(item.field) ||
                                    embedFieldKeys.has(item.field))
                                    ? VISUAL_MEDIA_PARTS
                                    : ALL_PARTS
                                ),
                              },
                            }
                          : {}),
                      },
                    },
                  }
                : {}),
            },
          },
        },
      };
    }
    if (next.inspectorBlocks.LoopItemField) {
      const lif = next.inspectorBlocks.LoopItemField;
      const itemsField = lif.fields.items;
      const byPath = new Map(
        (loopItemFields ?? []).map(f => [f.path, f] as const)
      );
      const rowKind = (item: Record<string, unknown> | undefined) => {
        const key =
          typeof item?.customKey === 'string' ? item.customKey.trim() : '';
        const meta = key ? byPath.get(key) : undefined;
        return resolveEffectiveFieldKind((item ?? {}) as any, meta);
      };
      if (itemsField?.type === 'list' && itemsField.item) {
        const itemDefs = itemsField.item;
        next = {
          ...next,
          inspectorBlocks: {
            ...next.inspectorBlocks,
            LoopItemField: {
              ...lif,
              fields: {
                ...lif.fields,
                items: {
                  ...itemsField,
                  item: {
                    ...itemDefs,
                    ...(itemDefs.textSize
                      ? {
                          textSize: {
                            ...itemDefs.textSize,
                            when: (item: Record<string, unknown>) =>
                              ['title', 'text', 'number', 'select'].includes(
                                rowKind(item)
                              ),
                          },
                        }
                      : {}),
                    ...(itemDefs.linkToItem
                      ? {
                          linkToItem: {
                            ...itemDefs.linkToItem,
                            when: (item: Record<string, unknown>) =>
                              ['title', 'image', 'gallery', 'text'].includes(
                                rowKind(item)
                              ) && !item?.popupTrigger,
                          },
                        }
                      : {}),
                    ...(itemDefs.urlDisplay
                      ? {
                          urlDisplay: {
                            ...itemDefs.urlDisplay,
                            when: (item: Record<string, unknown>) =>
                              ['permalink', 'url'].includes(rowKind(item)),
                          },
                        }
                      : {}),
                    ...(itemDefs.readMoreLabel
                      ? {
                          readMoreLabel: {
                            ...itemDefs.readMoreLabel,
                            when: (item: Record<string, unknown>) =>
                              ['permalink', 'url'].includes(rowKind(item)) &&
                              item?.urlDisplay !== 'text',
                          },
                        }
                      : {}),
                    ...(itemDefs.showArrow
                      ? {
                          showArrow: {
                            ...itemDefs.showArrow,
                            when: (item: Record<string, unknown>) =>
                              ['permalink', 'url'].includes(rowKind(item)) &&
                              item?.urlDisplay !== 'text',
                          },
                        }
                      : {}),
                    ...(itemDefs.urlConfig
                      ? {
                          urlConfig: {
                            ...itemDefs.urlConfig,
                            when: (item: Record<string, unknown>) =>
                              ['permalink', 'url'].includes(rowKind(item)) &&
                              item?.urlDisplay !== 'text',
                          },
                        }
                      : {}),
                    ...(itemDefs.dateFormat
                      ? {
                          dateFormat: {
                            ...itemDefs.dateFormat,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'date',
                          },
                        }
                      : {}),
                    ...(itemDefs.datePrefix
                      ? {
                          datePrefix: {
                            ...itemDefs.datePrefix,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'date',
                          },
                        }
                      : {}),
                    ...(itemDefs.authorDisplay
                      ? {
                          authorDisplay: {
                            ...itemDefs.authorDisplay,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'author',
                          },
                        }
                      : {}),
                    ...(itemDefs.authorPrefix
                      ? {
                          authorPrefix: {
                            ...itemDefs.authorPrefix,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'author' &&
                              item?.authorDisplay !== 'avatar',
                          },
                        }
                      : {}),
                    ...(itemDefs.termsDisplay
                      ? {
                          termsDisplay: {
                            ...itemDefs.termsDisplay,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'terms',
                          },
                        }
                      : {}),
                    ...(itemDefs.termsTaxonomy
                      ? {
                          termsTaxonomy: {
                            ...itemDefs.termsTaxonomy,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'terms' &&
                              item?.customKey !== 'category' &&
                              item?.customKey !== 'tags',
                          },
                        }
                      : {}),
                    ...(itemDefs.maxLines
                      ? {
                          maxLines: {
                            ...itemDefs.maxLines,
                            when: (item: Record<string, unknown>) =>
                              ['richtext', 'excerpt'].includes(rowKind(item)),
                          },
                        }
                      : {}),
                    ...(itemDefs.stripHtml
                      ? {
                          stripHtml: {
                            ...itemDefs.stripHtml,
                            when: (item: Record<string, unknown>) =>
                              ['richtext', 'excerpt'].includes(rowKind(item)),
                          },
                        }
                      : {}),
                    ...(itemDefs.imageAspect
                      ? {
                          imageAspect: {
                            ...itemDefs.imageAspect,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'image',
                          },
                        }
                      : {}),
                    ...(itemDefs.galleryViewMode
                      ? {
                          galleryViewMode: {
                            ...itemDefs.galleryViewMode,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'gallery',
                          },
                        }
                      : {}),
                    ...(itemDefs.galleryAspect
                      ? {
                          galleryAspect: {
                            ...itemDefs.galleryAspect,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'gallery',
                          },
                        }
                      : {}),
                    ...(itemDefs.excludeFeaturedImage
                      ? {
                          excludeFeaturedImage: {
                            ...itemDefs.excludeFeaturedImage,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'gallery',
                          },
                        }
                      : {}),
                    ...(itemDefs.showGalleryBadge
                      ? {
                          showGalleryBadge: {
                            ...itemDefs.showGalleryBadge,
                            when: (item: Record<string, unknown>) =>
                              ['image', 'gallery'].includes(rowKind(item)),
                          },
                        }
                      : {}),
                    ...(itemDefs.galleryBadgePosition
                      ? {
                          galleryBadgePosition: {
                            ...itemDefs.galleryBadgePosition,
                            when: (item: Record<string, unknown>) =>
                              ['image', 'gallery'].includes(rowKind(item)) &&
                              item?.showGalleryBadge !== false,
                          },
                        }
                      : {}),
                    ...(itemDefs.popupTrigger
                      ? {
                          popupTrigger: {
                            ...itemDefs.popupTrigger,
                            when: (item: Record<string, unknown>) =>
                              ['image', 'gallery', 'video'].includes(
                                rowKind(item)
                              ),
                          },
                        }
                      : {}),
                    ...(itemDefs.overlayId
                      ? {
                          overlayId: {
                            ...itemDefs.overlayId,
                            when: (item: Record<string, unknown>) =>
                              ['image', 'gallery', 'video'].includes(
                                rowKind(item)
                              ) && Boolean(item?.popupTrigger),
                          },
                        }
                      : {}),
                    ...(itemDefs.posterUrl
                      ? {
                          posterUrl: {
                            ...itemDefs.posterUrl,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'video' &&
                              Boolean(item?.popupTrigger),
                          },
                        }
                      : {}),
                    ...(itemDefs.motion
                      ? {
                          motion: {
                            ...itemDefs.motion,
                            when: (item: Record<string, unknown>) =>
                              rowKind(item) === 'image',
                          },
                        }
                      : {}),
                    ...(itemDefs.style?.type === 'custom'
                      ? {
                          style: {
                            ...itemDefs.style,
                            render: styleControl(ALL_PARTS, item => {
                              const k = rowKind(item);
                              if (
                                [
                                  'image',
                                  'gallery',
                                  'video',
                                  'embed',
                                ].includes(k)
                              ) {
                                return VISUAL_MEDIA_PARTS;
                              }
                              if (
                                ['permalink', 'url', 'terms'].includes(k)
                              ) {
                                return BUTTON_PARTS;
                              }
                              return ALL_PARTS;
                            }),
                          },
                        }
                      : {}),
                    ...(itemDefs.badgeStyle
                      ? {
                          badgeStyle: {
                            ...itemDefs.badgeStyle,
                            when: (item: Record<string, unknown>) =>
                              ['image', 'gallery'].includes(rowKind(item)) &&
                              item?.showGalleryBadge !== false,
                          },
                        }
                      : {}),
                  },
                },
              },
            },
          },
        };
      }
    }
    return next;
  }, [
    baseSetup,
    hiddenBlocks,
    disabledPluginBlocks,
    pluginFormActions,
    kind,
    collectionBlocks,
    collectionEntry,
    loopItemFields,
    document,
  ]);
  const adapter = useMemo(
    () => adapterFor(kind, page, category),
    [kind, page, category]
  );
  const canPublishPermission = useCan(PERMISSIONS.PAGES_PUBLISH);
  const savesGoLive =
    kind === 'global' ||
    kind === 'contact-form' ||
    kind === 'page-template';
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

  const breakpoints = useMemo(
    () => normalizeBreakpointConfig(rawBreakpoints ?? DEFAULT_BREAKPOINTS),
    [rawBreakpoints]
  );
  const deviceSwitchOptions = useMemo(() => {
    const byDevice = new Map(breakpoints.map(b => [b.device, b]));
    return enabledDevices(breakpoints).map(d => {
      const entry = byDevice.get(d);
      const label = entry?.label ?? d;
      const tooltip =
        d === 'desktop'
          ? 'Desktop view'
          : d === 'widescreen'
            ? `${label} (≥ ${entry?.width ?? 2400}px)`
            : `${label} (≤ ${entry?.width ?? 1023}px)`;
      return { id: d, label, tooltip };
    });
  }, [breakpoints]);
  // One store per open document. A save revalidates the route and delivers a
  // fresh `document` prop; rebuilding from it would wipe undo and the selection.
  // Deliberate content changes (restore, templates, AI) use `replaceDocument`.
  const storeKey = `${kind}:${page.id}:${page.language}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: see the comment above.
  const store = useMemo(
    () => createEditorStore({ document, schemas: setup.schemas, breakpoints }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeKey]
  );
  useEffect(() => {
    store.setBreakpoints(breakpoints);
  }, [store, breakpoints]);
  // Style classes (KRK-01): database-backed store for this site.
  const styleClassStore = useMemo(() => {
    const adapter: StyleClassAdapter = {
      list: () => styleClassesActions.list(page.siteId),
      create: input => styleClassesActions.create(page.siteId, input),
      // Kind, tag and combo base are fixed after creation; only name and variants change.
      update: (id, patch) => styleClassesActions.update(page.siteId, id, patch),
      remove: (id, opts) => styleClassesActions.remove(page.siteId, id, opts?.force),
      usage: id => styleClassesActions.usage(page.siteId, id),
      usageCounts: () => styleClassesActions.usageCounts(page.siteId),
    };
    // Loaded from the effect below, not during render (it calls a server action).
    return initStyleClassStore(adapter, undefined, { load: false });
  }, [page.siteId]);
  useEffect(() => {
    void styleClassStore?.load();
  }, [styleClassStore]);
  // Style classes are off unless the site turns them on (Settings → Blocks).
  const [styleClassesOn, setStyleClassesOn] = useState(false);
  useEffect(() => {
    let live = true;
    styleClassesActions
      .isEnabled(page.siteId)
      .then(on => live && setStyleClassesOn(on))
      .catch(() => live && setStyleClassesOn(false));
    return () => {
      live = false;
    };
  }, [page.siteId]);
  useEffect(() => {
    if (!styleClassStore) return;
    // One-time import of class names from the old localStorage store, once
    // loaded, and only when classes are on (creating is refused otherwise).
    const unsubscribe = styleClassStore.subscribe(() => {
      if (!styleClassesOn || styleClassStore.getState().status !== 'ready') return;
      unsubscribe();
      void importLegacyStyleClasses(styleClassStore);
    });
    // Save queued class edits before the page closes.
    const onPageHide = () => {
      void styleClassStore.flush();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', onPageHide);
      void styleClassStore.flush().finally(() => styleClassStore.dispose());
    };
  }, [styleClassStore, styleClassesOn]);
  useMemo(() => {
    setPreferencesStore(createPreferencesStore());
  }, []);
  const drag = useDragController(store);
  const liveLoaded = useLiveLoaded(
    store,
    loaded,
    page.language,
    typeof collectionEntry?.id === 'string' ? collectionEntry.id : undefined
  );

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
      const result = await adapter.saveDraft(
        documentToPuck(next, { slots: 'zones', ids: 'always' }),
        true
      );
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
  // How the last go-live action ended; drives the top bar's success/error flash.
  const [liveOutcome, setLiveOutcome] = useState<'success' | 'error' | null>(
    null
  );
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [motionPreview, setMotionPreview] = useState(false);
  const [frameWindow, setFrameWindow] = useState<Window | null>(null);
  const [panel, setPanel] = useState<'blocks' | 'layers'>('blocks');
  const [focusMode, setFocusMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isPreview, setIsPreview] = useState(false);
  const rootTitle = useSyncExternalStore(
    store.subscribe,
    () => store.getState().doc.root?.props?.title as string | undefined,
    () => store.getState().doc.root?.props?.title as string | undefined
  );
  const documentTitle = rootTitle || page.title;

  const handleRenameDocument = useCallback(
    (name: string) => {
      page.title = name;
      store.updateRootProps({ title: name });
    },
    [page, store]
  );
  const [singlePanelSide, setSinglePanelSide] = useState<'left' | 'right'>('right');
  const [currentLayout, setCurrentLayout] = useState<'single' | 'split'>(() => {
    if (layout) return layout;
    if (
      typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_USE_SINGLE_PANEL === '0'
    ) {
      return 'split';
    }
    return 'single';
  });
  // Saved layout and dock side apply after mount (the server has no
  // localStorage); an explicit `?layout=` or the env default still wins.
  useEffect(() => {
    const prefs = getPreferencesStore()?.getState();
    if (!prefs) return;
    setSinglePanelSide(prefs.panelDock);
    if (!layout && process.env.NEXT_PUBLIC_USE_SINGLE_PANEL !== '0') {
      setCurrentLayout(prefs.layout);
    }
  }, [layout]);
  const changeLayout = useCallback((next: 'single' | 'split') => {
    setCurrentLayout(next);
    getPreferencesStore()?.set('layout', next);
  }, []);
  const changeDockSide = useCallback((next: 'left' | 'right') => {
    setSinglePanelSide(next);
    getPreferencesStore()?.set('panelDock', next);
  }, []);
  const isSinglePanel = currentLayout === 'single';
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<TemplateItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('nextcms-user-templates');
      return raw ? (JSON.parse(raw) as TemplateItem[]) : [];
    } catch {
      return [];
    }
  });

  const handleSaveTemplate = useCallback((tpl: Omit<TemplateItem, 'id'>) => {
    const fresh: TemplateItem = {
      ...tpl,
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    setCustomTemplates(prev => {
      const next = [fresh, ...prev];
      try {
        localStorage.setItem('nextcms-user-templates', JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
    toast.success(`Saved template "${tpl.name}"`);
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    setCustomTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      try {
        localStorage.setItem('nextcms-user-templates', JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
    toast.success('Template deleted');
  }, []);
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

  // Style classes (KRK-01): names resolve classIds on the canvas, and their
  // compiled CSS goes into the frame with the responsive CSS, updating live.
  // When classes are off the canvas matches the published page: no class
  // names and no class CSS.
  const { classes: loadedClasses } = useStyleClasses();
  const classes = styleClassesOn ? loadedClasses : NO_STYLE_CLASSES;
  const canvasCss = useMemo(() => {
    const responsive = getResponsiveCss(breakpoints);
    const list = Object.values(classes);
    if (list.length === 0) return responsive;
    return `${responsive}\n${compileStyleClasses({ classes: list, breakpoints, forceStates: true })}`;
  }, [breakpoints, classes]);
  const metadata = useMemo(
    () => ({
      themeTokens,
      breakpoints,
      motionPreview,
      language: page.language,
      classes,
      ...(setup.renderKind === 'post' && { post: post ?? SAMPLE_POST }),
    }),
    [themeTokens, breakpoints, motionPreview, page.language, setup.renderKind, post, classes]
  );
  const components = useMemo(
    () => rendererComponents(setup.renderKind, enabledPluginIds),
    [setup.renderKind, enabledPluginIds]
  );
  const renderUnknownBlock = useCallback(
    (node: { type: string }) => {
      const disabledPlugin = disabledPluginBlocks[node.type];
      if (disabledPlugin) {
        return (
          <BlockNotice
            title="Plugin disabled"
            detail={`This block belongs to the "${disabledPlugin}" plugin, which is currently disabled. Enable it under Dashboard → Plugins or remove this block.`}
          />
        );
      }
      return (
        <BlockNotice
          title={`Unknown block: ${node.type}`}
          detail="This block type is not installed. It is kept in the page; delete it or install the block."
        />
      );
    },
    [disabledPluginBlocks]
  );
  const transformProps = useMemo(
    () => cmsTransformProps(metadata, setup.renderKind),
    [metadata, setup.renderKind]
  );
  const isLoopItem = kind === 'loop-item';
  const previewItemId = useSyncExternalStore(
    store.subscribe,
    () => store.getState().doc.root.props?.previewItemId,
    () => store.getState().doc.root.props?.previewItemId
  );
  const loopPreviewItem = useMemo(
    () => (isLoopItem ? pickPreviewItem(previewItems, previewItemId) : null),
    [isLoopItem, previewItems, previewItemId]
  );
  const dynamicSources = useMemo<DynamicSourcesValue>(() => {
    if (isLoopItem) {
      return {
        sources: loopItemDynamicSources(loopItemFields ?? []),
        defaultSource: 'loopItem',
        defaultPath: 'title',
      };
    }
    if (
      (kind === 'entry' || kind === 'entry-template') &&
      collectionEntry?.collection
    ) {
      const fields = (collectionEntry.collection.fields ?? []) as {
        key: string;
        label: string;
        type: string;
      }[];
      return {
        sources: entryDynamicSources(
          collectionEntry.collection.name ?? '',
          fields
        ),
        defaultSource: fields.length > 0 ? 'custom' : 'post',
        defaultPath: fields[0]?.key ?? 'title',
      };
    }
    if (kind === 'post' || kind === 'post-template') {
      return {
        sources: APPROVED_DYNAMIC_SOURCES,
        defaultSource: 'post',
        defaultPath: 'title',
      };
    }
    return DEFAULT_DYNAMIC_SOURCES;
  }, [isLoopItem, loopItemFields, kind, collectionEntry]);
  // Preview records for "External API Item" bindings: loaded on open for
  // presets the document uses, then fetched once for each newly picked one.
  const [apiRecords, setApiRecords] = useState<Record<string, Record<string, unknown>>>(
    () => dynamicRefs.externalApiRecords ?? {}
  );
  const requestedApiRecords = useRef(
    new Set(Object.keys(dynamicRefs.externalApiRecords ?? {}))
  );
  useEffect(() => {
    const check = () => {
      const ids = collectDynamicRefs(store.getState().doc).externalApi ?? [];
      const missing = ids.filter(id => !requestedApiRecords.current.has(id));
      if (missing.length === 0) return;
      for (const id of missing) requestedApiRecords.current.add(id);
      loadExternalApiRecords({ presetIds: missing, draft: true })
        .then(records => {
          if (records && Object.keys(records).length > 0) {
            setApiRecords(prev => ({ ...prev, ...records }));
          }
        })
        .catch(() => {});
    };
    check();
    const unsubscribe = store.subscribe(check);
    return () => {
      unsubscribe();
    };
  }, [store]);
  const dynamicContext = useMemo(
    () => ({
      ...(loopPreviewItem && {
        loopItem: toLoopItemContext(loopPreviewItem),
        custom: loopPreviewItem.raw ?? {},
      }),
      externalApi: {
        ...apiRecords,
        // In a Loop Item template the preview item is "the current item".
        ...(loopPreviewItem?.source === 'external-api' && {
          [CURRENT_ITEM_REF]: toLoopItemContext(loopPreviewItem),
        }),
      },
      language: page.language,
      page: { title: page.title, slug: page.slug, language: page.language },
      ...(setup.renderKind === 'post' && {
        post: toDynamicPostRecord(post ?? SAMPLE_POST),
      }),
      ...(collectionEntry && {
        entry: collectionEntry.data,
        custom: collectionEntry.data,
        collection: collectionEntry.collection,
      }),
      pageRef: recordsById(dynamicRefs.pages),
      postRef: recordsById(dynamicRefs.posts),
    }),
    [page.title, page.slug, page.language, setup.renderKind, post, collectionEntry, dynamicRefs, loopPreviewItem, apiRecords]
  );
  const refChoices = useMemo(
    () => ({
      page: dynamicRefs.pages,
      post: dynamicRefs.posts,
      externalApi: dynamicRefs.externalApis ?? [],
    }),
    [dynamicRefs]
  );
  const customFontsCss = useMemo(
    () => buildCustomFontsCss(customFonts),
    [customFonts]
  );
  const renderRoot = useCallback(
    (children: ReactNode) => (
      <EditorSiteRoot
        metadata={metadata}
        collectionEntry={collectionEntry}
        loopPreviewItem={loopPreviewItem}
        megaMenu={kind === 'mega-menu'}
        overlayKind={kind === 'popup' || kind === 'drawer' ? kind : null}
      >
        {customFontsCss ? (
          <style
            // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped by buildCustomFontsCss
            dangerouslySetInnerHTML={{ __html: customFontsCss }}
          />
        ) : null}
        {children}
      </EditorSiteRoot>
    ),
    [metadata, collectionEntry, loopPreviewItem, kind, customFontsCss]
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
      ...(node.type === 'BlogPosts' || node.type === 'RelatedPosts'
        ? [
            {
              id: 'convert-query-loop',
              label: 'Convert to Query Loop',
              icon: '⇄',
              run: () => {
                const next = convertBlogBlockToQueryLoop(
                  store.getState().doc,
                  node.id
                );
                store.replaceDocument(next, {
                  label: 'Convert to Query Loop',
                });
                toast.success('Converted block to Query Loop');
              },
            },
          ]
        : []),
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
    [aiEnabled, savesGoLive, store]
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
      if (savesGoLive) setLiveOutcome(null);
      if (!(await saveNow())) {
        if (savesGoLive) setLiveOutcome('error');
        return;
      }
      if (savesGoLive) {
        setLiveOutcome('success');
        toast.success(
          kind === 'contact-form'
            ? 'Contact form saved. Pages embedding it show this version.'
            : kind === 'global'
              ? 'Global block saved. Every page using it now shows this version.'
              : 'Template layout saved'
        );
        return;
      }
      if (
        kind === 'header' ||
        kind === 'footer' ||
        kind === 'mega-menu' ||
        kind === 'popup' ||
        kind === 'drawer'
      ) {
        const noun =
          kind === 'header'
            ? 'Header'
            : kind === 'footer'
              ? 'Footer'
              : kind === 'mega-menu'
                ? 'Mega menu'
                : kind === 'popup'
                  ? 'Popup'
                  : 'Drawer';
        toast.success(`${noun} draft saved`);
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
      setLiveOutcome(null);
      if (!(await saveNow())) {
        setLiveOutcome('error');
        return;
      }
      const ok = await handleActionResponse((await adapter.publish()) as never, data => {
        void maybeOfferRedirect(data);
        setStatus('published');
        toast.success(
          kind === 'page'
            ? 'Page published'
            : kind === 'post'
              ? 'Post published'
              : kind === 'popup'
                ? 'Popup published'
                : kind === 'drawer'
                  ? 'Drawer published'
                  : kind === 'mega-menu'
                    ? 'Mega menu published'
                    : kind === 'collection-block'
                      ? 'Block published'
                      : 'Template published'
        );
      });
      setLiveOutcome(ok ? 'success' : 'error');
    });

  const submitForReview = () =>
    run('review', async () => {
      if (!adapter.submitForReview) return;
      setLiveOutcome(null);
      if (!(await saveNow())) {
        setLiveOutcome('error');
        return;
      }
      const ok = await handleActionResponse(
        (await adapter.submitForReview()) as never,
        () => {
          setStatus('review');
          toast.success('Submitted for review');
        }
      );
      setLiveOutcome(ok ? 'success' : 'error');
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
    <>
    {/* Previews the class state chosen in the inspector on the selected block. */}
    <ForcedStatePreview frameDoc={frameWindow?.document} />
    <EditorCanvas
      components={components}
      drag={drag}
      transformProps={transformProps}
      loaded={liveLoaded}
      responsiveCss={canvasCss}
      renderRoot={renderRoot}
      onFrame={onFrame}
      resizeHandles={cmsResizeHandles}
      inlineProps={cmsInlineProps}
      blockActions={blockActions}
      insertGroups={setup.groups}
      stateStyle={stateStyle}
      dynamicContext={dynamicContext}
      isPreview={isPreview}
      renderUnknown={renderUnknownBlock}
      previewAddress={
        adapter.previewHref
          ? adapter.previewHref.replace(/^https?:\/\//, '')
          : `preview.site/${(page as any).slug || 'home'}`
      }
    />
    </>
  );
  const rightPanelContent = (
    <section aria-label="Settings" className="p-4">
      <NewEditorBridge
        themeTokens={themeTokens}
        customFonts={customFonts}
        breakpoints={breakpoints}
      >
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
          <div className="mb-4 border-b border-[var(--ne-border)] pb-4 empty:hidden">
            {styleClassesOn && <SelectedClassStyles supports={supportsStyleClasses} />}
          </div>
        )}
        {rightPanel === 'settings' && (
          <Inspector
            rootLabel={adapter.label ?? 'Page'}
            blocks={setup.inspectorBlocks}
            rootFields={setup.rootFields}
            rootDefaultProps={kind === 'page' ? { title: page.title } : undefined}
            settingsHref={pageSettingsHref}
            empty={
              <p className="mb-2 text-xs text-steel-500">
                Select a block to edit it.
                {Object.keys(setup.rootFields).length
                  ? ` ${adapter.label ?? 'Page'} settings:`
                  : ''}
              </p>
            }
          />
        )}
        {rightPanel === 'style-classes' && (
          <div className="p-3">
            {styleClassesOn ? (
              <ClassesView hrefFor={styleClassUsageHref} tags={styleClassTagSchema.options} />
            ) : (
              <p className="text-xs text-steel-500">
                Style classes are off for this site.{' '}
                <Link className="underline" href="/dashboard/settings/blocks">
                  Turn them on in Settings → Blocks
                </Link>
                .
              </p>
            )}
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
        getContent={() =>
          documentToPuck(store.getState().doc, {
            slots: 'zones',
            ids: 'always',
          })
        }
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
    const liveState = (action: string): PublishState =>
      busy === action ? 'publishing' : (liveOutcome ?? 'idle');
    const primaryAction: PrimaryAction | null = savesGoLive
      ? {
          label: adapter.liveLabel,
          disabled: busy !== null,
          run: saveSnapshot,
          state: liveState('save'),
          successLabel: 'Saved',
        }
      : canPublish
        ? {
            label: adapter.liveLabel,
            disabled: busy !== null,
            run: publish,
            state: liveState('publish'),
            successLabel: 'Live',
          }
        : adapter.submitForReview
          ? {
              label: 'Submit for review',
              disabled: busy !== null || status === 'review',
              run: submitForReview,
              state: liveState('review'),
              successLabel: 'Submitted',
            }
          : null;
    const selection = store.getState().selection;
    const singlePanelElement = (
      <SinglePanel
        blocks={setup.inspectorBlocks}
        rootFields={setup.rootFields}
        rootLabel={adapter.label ?? 'Page'}
        rootDefaultProps={kind === 'page' ? { title: page.title } : undefined}
        settingsHref={pageSettingsHref}
        categories={setup.groups}
        hiddenTypes={hiddenFromInsert}
        templates={customTemplates}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        drag={drag}
        queue={queue}
        dockSide={singlePanelSide}
        onDockSideChange={changeDockSide}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />
    );
    return (
      <PluginFormActionsProvider actions={pluginFormActions}>
      <E12ControlsProvider value={true}>
        <EditorProvider store={store}>
          <DynamicRefsProvider value={refChoices}>
          <DynamicSourcesProvider value={dynamicSources}>
          <LoopPreviewProvider items={previewItems} fields={loopItemFields ?? []}>
            <EntryProvider entry={collectionEntry ?? null}>
              <NewEditorBridge
        themeTokens={themeTokens}
        customFonts={customFonts}
        breakpoints={breakpoints}
      >
                <SharedChrome
          queue={queue}
          title={documentTitle}
          onRenameDocument={handleRenameDocument}
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
          zoom={zoom}
          onZoomChange={setZoom}
          isPreview={isPreview}
          onTogglePreview={() => setIsPreview(prev => !prev)}
          layout={currentLayout}
          onLayoutChange={changeLayout}
          onDockSideChange={changeDockSide}
          devices={deviceSwitchOptions}
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
          singlePanel={isSinglePanel ? singlePanelElement : undefined}
          singlePanelDockSide={singlePanelSide}
          commandPalette={commandPalette}
        />
        {dialogs}
              </NewEditorBridge>
            </EntryProvider>
          </LoopPreviewProvider>
          </DynamicSourcesProvider>
          </DynamicRefsProvider>
        </EditorProvider>
      </E12ControlsProvider>
      </PluginFormActionsProvider>
    );
  }

  return (
    <PluginFormActionsProvider actions={pluginFormActions}>
    <E12ControlsProvider value={true}>
      <EditorProvider store={store}>
        <DynamicRefsProvider value={refChoices}>
          <DynamicSourcesProvider value={dynamicSources}>
          <LoopPreviewProvider items={previewItems} fields={loopItemFields ?? []}>
          <EntryProvider entry={collectionEntry ?? null}>
            <NewEditorBridge
        themeTokens={themeTokens}
        customFonts={customFonts}
        breakpoints={breakpoints}
      >
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
          {collectionEntry?.collection && (
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
              Collection: {collectionEntry.collection.name}
            </span>
          )}
          <div className="ms-auto flex items-center gap-2">
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
              aria-label={
                isSinglePanel
                  ? 'Switch to split layout'
                  : 'Switch to single-panel layout'
              }
              title={isSinglePanel ? 'Split layout' : 'Single-panel layout'}
              onClick={() =>
                changeLayout(isSinglePanel ? 'split' : 'single')
              }
            >
              <Columns2 className="size-4" />
            </Button>
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
          {isSinglePanel ? (
            <>
              {!focusMode && singlePanelSide === 'left' && (
                <SinglePanel
                  blocks={setup.inspectorBlocks}
                  rootFields={setup.rootFields}
                  rootLabel={adapter.label ?? 'Page'}
                  rootDefaultProps={kind === 'page' ? { title: page.title } : undefined}
                  settingsHref={pageSettingsHref}
                  categories={setup.groups}
                  hiddenTypes={hiddenFromInsert}
                  templates={customTemplates}
                  onSaveTemplate={handleSaveTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  drag={drag}
                  queue={queue}
                  dockSide="left"
                  onDockSideChange={changeDockSide}
                />
              )}
              <main className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-9 shrink-0 items-center border-b border-steel-200 bg-white px-3 dark:border-dark-300 dark:bg-dark-100">
                  <Breadcrumb />
                </div>
                <div className="min-h-0 flex-1">{canvas}</div>
              </main>
              {!focusMode && singlePanelSide === 'right' && (
                <SinglePanel
                  blocks={setup.inspectorBlocks}
                  rootFields={setup.rootFields}
                  rootLabel={adapter.label ?? 'Page'}
                  rootDefaultProps={kind === 'page' ? { title: page.title } : undefined}
                  settingsHref={pageSettingsHref}
                  categories={setup.groups}
                  hiddenTypes={hiddenFromInsert}
                  templates={customTemplates}
                  onSaveTemplate={handleSaveTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  drag={drag}
                  queue={queue}
                  dockSide="right"
                  onDockSideChange={changeDockSide}
                />
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      {commandPalette}
      {dialogs}
            </NewEditorBridge>
          </EntryProvider>
        </LoopPreviewProvider>
          </DynamicSourcesProvider>
          </DynamicRefsProvider>
      </EditorProvider>
    </E12ControlsProvider>
    </PluginFormActionsProvider>
  );
}
