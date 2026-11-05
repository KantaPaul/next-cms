'use client';

/**
 * The page editor in the shared @nextcms/editor-ui shell (B15 E6), behind the
 * `?shell=new` / NEXT_PUBLIC_EDITOR_UI_SHELL flag. NewEditor keeps every
 * behavior (save queue, lock, conflicts, revisions, AI, shortcuts); this file
 * only arranges its pieces in the shell's slots.
 */

import {
  Breadcrumb,
  getPreferencesStore,
  JsonExportButton,
  type SaveQueue,
  type SaveStatus as QueueStatus,
  useEditor,
  useEditorStore,
  useSaveState,
} from '@nextcms/builder-react';
import {
  EditorShell,
  type MotionLevel,
  type PublishState,
  RollingNumber,
  resolveMotionLevel,
  type EditorTheme,
  FloatingDeviceBar,
  Kbd,
  type MenuItem,
  Panel,
  type SaveState,
  StatusBar,
  TopBar,
} from '@nextcms/editor-ui';
import { ArrowLeft, Triangle } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import Link from 'next/link';
import { type ReactNode, useSyncExternalStore } from 'react';

const SAVE_STATE: Record<QueueStatus, SaveState> = {
  saved: 'saved',
  pending: 'unsaved',
  saving: 'saving',
  offline: 'offline',
  error: 'failed',
  conflict: 'conflict',
};

const noSubscribe = () => () => {};

/** The admin's own dark mode: `data-theme="dark"` (or `.dark`) on <html>. */
function subscribeAppTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });
  return () => observer.disconnect();
}

function appIsDark() {
  const root = document.documentElement;
  return root.dataset.theme === 'dark' || root.classList.contains('dark');
}

/** Editor theme and direction from the builder's preferences store (R733, gap G2). */
function useEditorChromePreferences(): {
  theme?: EditorTheme;
  dir: 'ltr' | 'rtl';
  motion: MotionLevel;
} {
  const store = getPreferencesStore();
  const prefs = useSyncExternalStore(
    store?.subscribe ?? noSubscribe,
    () => store?.getState() ?? null,
    () => null
  );
  const appDark = useSyncExternalStore(
    subscribeAppTheme,
    appIsDark,
    () => false
  );
  return {
    // "system" follows the admin's dark mode, so the shell and the panel
    // contents (still styled with the app's `dark:` classes) always agree.
    theme:
      prefs?.theme === 'dark' || prefs?.theme === 'light'
        ? prefs.theme
        : appDark
          ? 'dark'
          : 'light',
    dir: prefs?.rtl ? 'rtl' : 'ltr',
    motion: resolveMotionLevel(prefs),
  };
}

/**
 * Styling scope for editor-ui parts rendered outside EditorShell (the old
 * chrome's panels): the `.ne-ui` scope the package CSS targets, plus the
 * same theme and direction the new shell would use (B15 E4).
 */
export function EditorUIScopeBox({ children }: { children: ReactNode }) {
  const { theme, dir, motion } = useEditorChromePreferences();
  return (
    <div
      className="ne-ui"
      data-ne-theme={theme}
      data-ne-motion={motion}
      dir={dir}
      // The old chrome's panels are white whatever the admin theme, so paint
      // the editor surface here to keep text readable in dark mode.
      style={{
        color: 'var(--ne-text)',
        background: 'var(--ne-surface)',
        minHeight: '100%',
      }}
    >
      {children}
    </div>
  );
}

export type PrimaryAction = {
  label: string;
  disabled: boolean;
  run: () => void;
  /** Progress and outcome of the action, for the button's motion. */
  state?: PublishState;
  /** Label flashed after the action succeeds. */
  successLabel?: string;
};

export type SharedChromeProps = {
  queue: SaveQueue;
  title: string;
  onRenameDocument?: (name: string) => void;
  kindLabel: string;
  backHref: string;
  backLabel: string;
  /** Page status badge (draft, published, review); omitted for kinds that save live. */
  status?: string | null;
  previewHref?: string | null;
  primaryAction: PrimaryAction | null;
  /** Builder-specific top bar controls (state styles, AI, revisions, save draft). */
  actions: ReactNode;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts?: () => void;
  notices: ReactNode;
  library?: ReactNode;
  canvas: ReactNode;
  inspector?: ReactNode;
  singlePanel?: ReactNode;
  singlePanelDockSide?: 'left' | 'right';
  commandPalette?: ReactNode;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  isPreview?: boolean;
  onTogglePreview?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  layout?: 'single' | 'split';
  onLayoutChange?: (layout: 'single' | 'split') => void;
  onDockSideChange?: (side: 'left' | 'right') => void;
};

export function SharedChrome({
  queue,
  title,
  onRenameDocument,
  kindLabel,
  backHref,
  backLabel,
  status,
  previewHref,
  primaryAction,
  actions,
  focusMode,
  onToggleFocusMode,
  onOpenCommandPalette,
  onOpenShortcuts,
  notices,
  library,
  canvas,
  inspector,
  singlePanel,
  singlePanelDockSide = 'right',
  commandPalette,
  zoom = 100,
  onZoomChange,
  isPreview = false,
  onTogglePreview,
  onToggleTheme,
  isDark,
  layout,
  onLayoutChange,
  onDockSideChange,
}: SharedChromeProps) {
  const store = useEditorStore();
  const save = useSaveState(queue);
  const history = useEditor(state => state.history);
  const canExportSite = useCan(PERMISSIONS.SETTINGS_MANAGE);
  // Whole-site export (published content, not this document) as a Next.js
  // project ready for Vercel. Built by exportSiteService on the server.
  const siteExportItems: MenuItem[] = canExportSite
    ? [
        {
          id: 'export-vercel',
          label: 'Vercel (site .zip)',
          icon: <Triangle size={14} />,
          onClick: () => {
            const link = document.createElement('a');
            link.href = '/api/v1/export/site?target=vercel';
            link.download = 'site-vercel.zip';
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.info('Exporting your published site for Vercel', {
              description:
                'Unzip site-vercel.zip, then run `vercel --prod` in that folder, or push it to a Git repository and import it in Vercel. The README inside has the steps.',
              duration: 12000,
            });
          },
        },
      ]
    : [];
  const device = useEditor(state => state.device);
  const blockCount = useEditor(state => Object.keys(state.doc.nodes).length);
  const selected = useEditor(state => state.selection.length);
  const { theme, dir, motion } = useEditorChromePreferences();
  const isDarkCurrent = isDark !== undefined ? isDark : theme === 'dark';
  const handleToggleTheme =
    onToggleTheme ??
    (() => {
      const next = isDarkCurrent ? 'light' : 'dark';
      const prefsStore = getPreferencesStore();
      prefsStore?.set('theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

  return (
    <EditorShell
      theme={theme}
      dir={dir}
      motion={motion}
      focusMode={focusMode || isPreview}
      topBar={
        <TopBar
          title={title}
          onRenameDocument={onRenameDocument}
          brand={
            <span className="flex min-w-0 items-center gap-2">
              <Link
                href={backHref}
                aria-label={`Back to ${backLabel}`}
                title={backLabel}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ne-radius-sm)] text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)]"
              >
                <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Link>
              <span
                title={kindLabel}
                className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-[var(--ne-text)]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ne-radius-md)] bg-[var(--ne-primary)] text-xs font-bold text-white shadow-2xs">
                  N
                </span>
                <span>NextCMS</span>
              </span>
              {status && (
                <span className="rounded-[var(--ne-radius-sm)] bg-[var(--ne-surface-subtle)] px-1.5 py-0.5 text-[10px] capitalize text-[var(--ne-text-muted)]">
                  {status}
                </span>
              )}
            </span>
          }
          saveStatus={SAVE_STATE[save.status]}
          lastSavedAt={save.savedAt ? new Date(save.savedAt) : undefined}
          onRetrySave={() => void queue.flush()}
          onResolveConflict={() =>
            document
              .querySelector<HTMLElement>('[data-editor-notice="conflict"]')
              ?.scrollIntoView({ block: 'nearest' })
          }
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
          isPreview={isPreview}
          onPreview={onTogglePreview}
          isDark={isDarkCurrent}
          onToggleTheme={handleToggleTheme}
          focusMode={focusMode || isPreview}
          onToggleFocusMode={onToggleFocusMode}
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenShortcuts={onOpenShortcuts}
          layout={layout}
          onLayoutChange={onLayoutChange}
          dockSide={singlePanelDockSide}
          onDockSideChange={onDockSideChange}
          exportAction={
            <JsonExportButton
              documentName={title}
              extraItems={siteExportItems}
            />
          }
          extraActions={actions}
          onPublish={primaryAction?.run}
          publishLabel={primaryAction?.label}
          publishDisabled={primaryAction?.disabled}
          publishState={primaryAction?.state}
          publishSuccessLabel={primaryAction?.successLabel}
        />
      }
      notices={notices}
      library={
        singlePanel ? (
          singlePanelDockSide === 'left' ? (
            singlePanel
          ) : null
        ) : (
          <Panel
            side="left"
            title="Blocks"
            storageKey="nextcms-editor:left-panel"
            defaultWidth={280}
          >
            {library}
          </Panel>
        )
      }
      canvas={
        <div className="ne-canvas-bg relative flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-auto ne-scrollbar p-4 md:p-6">
          {!isPreview && onZoomChange && (
            <FloatingDeviceBar
              device={device}
              onDeviceChange={next => store.setDevice(next)}
              zoom={zoom}
              onZoomChange={onZoomChange}
            />
          )}
          <div
            className="flex flex-col items-center justify-start w-full transition-transform duration-150"
            style={{
              transform: zoom && zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: 'top center',
            }}
          >
            {canvas}
          </div>
        </div>
      }
      inspector={
        singlePanel ? (
          singlePanelDockSide === 'right' ? (
            singlePanel
          ) : null
        ) : (
          <Panel
            side="right"
            title="Settings"
            storageKey="nextcms-editor:right-panel"
            defaultWidth={320}
          >
            {inspector}
          </Panel>
        )
      }
      statusBar={
        isPreview ? null : (
          <StatusBar
            left={<Breadcrumb />}
            center={
              <>
                Palette <Kbd>⌘K</Kbd> · Undo <Kbd>⌘Z</Kbd> · Focus mode hides
                panels
              </>
            }
            right={
              <span>
                <RollingNumber value={blockCount} /> blocks
                {selected ? (
                  <>
                    {' · '}
                    <RollingNumber value={selected} /> selected
                  </>
                ) : null}
              </span>
            }
          />
        )
      }
      commandPalette={commandPalette}
    />
  );
}
