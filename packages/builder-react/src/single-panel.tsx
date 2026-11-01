/**
 * SinglePanel (E12): unified single-panel editor layout, as in the
 * single-panel prototype. One EditorPanel hosts ElementsView, LayersView,
 * SettingsView, TemplateLibraryView, PageSettingsView, and HistoryView; a
 * header with back-stack breadcrumbs and a footer tool rail (undo/redo, view
 * routes, change count, command palette) navigate between them. Selecting a
 * block opens its settings; clearing the selection returns to the library.
 */

import { ancestorIds } from '@nextcms/builder-core';
import {
  EditorPanel,
  type PanelDockSide,
  PinnedBlockStrip,
  ToolRail,
  type ToolRailItem,
} from '@nextcms/editor-ui';
import {
  Command,
  FileText,
  History,
  LayoutGrid,
  LayoutTemplate,
  Layers,
  Pin,
  PinOff,
  Redo2,
  Undo2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumb } from './breadcrumb';
import { useEditor, useEditorStore } from './context';
import type { DragController } from './drag';
import { type BlockCategory, ElementsView } from './elements-view';
import { HistoryView } from './history-view';
import type { InspectorBlock } from './inspector';
import { LayersView } from './layers-view';
import { PageSettingsView } from './page-settings-view';
import type { SaveQueue } from './save';
import { SettingsView } from './settings-view';
import {
  TemplateLibraryView,
  type TemplateItem,
} from './template-library-view';

export { type TemplateItem };

export type SinglePanelViewMode =
  | 'elements'
  | 'layers'
  | 'templates'
  | 'settings'
  | 'page'
  | 'history';

export interface SinglePanelProps {
  blocks: Record<string, InspectorBlock>;
  categories?: BlockCategory[];
  templates?: TemplateItem[];
  onApplyTemplate?: (template: TemplateItem) => void;
  onSaveTemplate?: (template: Omit<TemplateItem, 'id'>) => Promise<void> | void;
  onDeleteTemplate?: (id: string) => Promise<void> | void;
  drag?: DragController;
  queue?: SaveQueue;
  defaultMode?: SinglePanelViewMode;
  dockSide?: PanelDockSide;
  onDockSideChange?: (side: PanelDockSide) => void;
  /** Shows the footer tool rail (undo/redo, views, changes, ⌘K). */
  showToolRail?: boolean;
  onOpenCommandPalette?: () => void;
  className?: string;
}

const VIEW_LABELS: Record<Exclude<SinglePanelViewMode, 'settings'>, string> = {
  elements: 'Blocks',
  layers: 'Layers',
  templates: 'Template Library',
  page: 'Page Settings',
  history: 'History',
};

const isMac =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';

/** Props on a node whose value differs from its block's defaults. */
function countChanged(
  props: Record<string, unknown>,
  defaults: Record<string, unknown> | undefined
): number {
  if (!defaults) return 0;
  let count = 0;
  for (const key of Object.keys(defaults)) {
    if (!(key in props)) continue;
    if (JSON.stringify(props[key]) !== JSON.stringify(defaults[key])) count++;
  }
  return count;
}

export function SinglePanel({
  blocks,
  categories,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  drag,
  queue,
  defaultMode,
  dockSide = 'right',
  onDockSideChange,
  showToolRail = true,
  onOpenCommandPalette,
  className,
}: SinglePanelProps) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const history = useEditor(state => state.history);
  const selectedId =
    selection.length === 1 && doc.nodes[selection[0]] ? selection[0] : null;
  const selectedNode = selectedId ? doc.nodes[selectedId] : null;

  const [activeMode, setActiveMode] = useState<SinglePanelViewMode>(
    () => defaultMode ?? (selection.length ? 'settings' : 'elements')
  );
  const [pinned, setPinned] = useState(false);

  // Selecting a block opens its settings; clearing the selection while in
  // settings goes back to the library (the prototype's back-stack).
  const selectionKey = selection.join(',');
  const lastSelection = useRef(selectionKey);
  useEffect(() => {
    if (lastSelection.current === selectionKey) return;
    lastSelection.current = selectionKey;
    setActiveMode(mode =>
      selectionKey ? 'settings' : mode === 'settings' ? 'elements' : mode
    );
  }, [selectionKey]);

  const nodeLabel = (id: string) => {
    const node = doc.nodes[id];
    if (!node) return id;
    return node.meta?.name || blocks[node.type]?.label || node.type;
  };

  // Top-level blocks have no ancestors, so Back from them returns to the library.
  const parentId = selectedId ? (ancestorIds(doc, selectedId)[0] ?? null) : null;
  const parentIsRoot = !parentId;

  const { selectedChanges, pageChanges } = useMemo(() => {
    let page = 0;
    let selected = 0;
    for (const node of Object.values(doc.nodes)) {
      const changed = countChanged(node.props, blocks[node.type]?.defaultProps);
      page += changed;
      if (node.id === selectedId) selected = changed;
    }
    return { selectedChanges: selected, pageChanges: page };
  }, [doc, blocks, selectedId]);

  const goBack = () => {
    if (activeMode === 'settings') {
      if (selectedId && !parentIsRoot) {
        store.select(parentId);
      } else {
        store.select(null);
        setActiveMode('elements');
      }
      return;
    }
    setActiveMode('elements');
  };

  const isRootView = activeMode === 'elements';
  const isSettings = activeMode === 'settings';

  const route = (
    id: Exclude<SinglePanelViewMode, 'settings'>,
    label: string,
    icon: React.ReactNode,
    shortcut?: string
  ): ToolRailItem => ({
    id,
    label,
    icon,
    shortcut,
    active: activeMode === id,
    onClick: () => setActiveMode(mode => (mode === id && id !== 'elements' ? 'elements' : id)),
  });

  const toolRailItems: ToolRailItem[] = [
    route('elements', 'Elements', <LayoutGrid size={15} />),
    route('layers', 'Layers', <Layers size={15} />),
    route('history', 'History', <History size={15} />),
    route('page', 'Page Settings', <FileText size={15} />),
    route('templates', 'Templates', <LayoutTemplate size={15} />),
  ];

  const railButton =
    'flex h-7 w-7 items-center justify-center rounded-[var(--ne-radius-md)] text-[var(--ne-text)] transition-colors hover:bg-[var(--ne-surface-hover)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]';

  const footer = showToolRail ? (
    <ToolRail
      orientation="horizontal"
      ariaLabel="Panel footer toolbar"
      items={toolRailItems}
      leading={
        <>
          <button
            type="button"
            className={railButton}
            disabled={history.past.length === 0}
            onClick={() => store.undo()}
            aria-label="Undo"
            title={`Undo (${MOD}Z)`}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            className={railButton}
            disabled={history.future.length === 0}
            onClick={() => store.redo()}
            aria-label="Redo"
            title={`Redo (${MOD}Shift+Z)`}
          >
            <Redo2 size={15} />
          </button>
        </>
      }
      trailing={
        <>
          {selectedId && selectedChanges > 0 ? (
            <button
              type="button"
              onClick={() => setActiveMode('settings')}
              title={`${selectedChanges} modified properties on the selected block`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--ne-primary-soft-hover)] bg-[var(--ne-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ne-primary)] hover:bg-[var(--ne-primary-soft-hover)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ne-primary)] animate-pulse" />
              {selectedChanges} modified
            </button>
          ) : pageChanges > 0 ? (
            <span
              title={`${pageChanges} customized properties across the page`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--ne-text-muted)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ne-text-subtle)]" />
              {pageChanges} changes
            </span>
          ) : null}
          {onOpenCommandPalette && (
            <button
              type="button"
              className={railButton}
              onClick={onOpenCommandPalette}
              aria-label="Command palette"
              title={`Command Palette (${MOD}K)`}
            >
              <Command size={15} />
            </button>
          )}
        </>
      }
    />
  ) : null;

  const headerIconButton =
    'cursor-pointer rounded-[var(--ne-radius-sm)] p-1 text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)] hover:text-[var(--ne-text)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]';

  const headerAction =
    isSettings && selectedId ? (
      <>
        <button
          type="button"
          onClick={() => setPinned(value => !value)}
          aria-pressed={pinned}
          aria-label={pinned ? 'Unpin block strip' : 'Pin block strip'}
          title={pinned ? 'Unpin block strip' : 'Pin block strip'}
          className={
            pinned
              ? `${headerIconButton} bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]`
              : headerIconButton
          }
        >
          {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
        <button
          type="button"
          onClick={() => store.select(null)}
          aria-label="Close inspector"
          title="Close inspector (Esc)"
          className={headerIconButton}
        >
          <X size={13} />
        </button>
      </>
    ) : null;

  const breadcrumbs = isSettings ? (
    selection.length > 1 ? (
      <span className="truncate text-xs font-semibold text-[var(--ne-text)]">
        {selection.length} Blocks Selected
      </span>
    ) : selectedId ? (
      <Breadcrumb />
    ) : (
      <span className="truncate text-xs font-semibold text-[var(--ne-text)]">
        Block Settings
      </span>
    )
  ) : (
    <span className="truncate text-xs font-semibold text-[var(--ne-text)]">
      {VIEW_LABELS[activeMode]}
    </span>
  );

  const subheader =
    isSettings && pinned && selectedNode ? (
      <PinnedBlockStrip
        blockName={nodeLabel(selectedNode.id)}
        blockType={blocks[selectedNode.type]?.label ?? selectedNode.type}
        parentName={parentIsRoot || !parentId ? undefined : nodeLabel(parentId)}
        onSelectParent={
          parentIsRoot || !parentId ? undefined : () => store.select(parentId)
        }
        isLocked={!!selectedNode.meta?.locked}
        onToggleLock={() =>
          store.updateMeta(selectedNode.id, { locked: !selectedNode.meta?.locked })
        }
        isHidden={!!selectedNode.meta?.hidden}
        onToggleHide={() =>
          store.updateMeta(selectedNode.id, { hidden: !selectedNode.meta?.hidden })
        }
        onDuplicate={() => store.duplicate([selectedNode.id])}
        onDelete={() => store.remove([selectedNode.id])}
      />
    ) : null;

  return (
    <div className={className} style={{ display: 'flex', height: '100%' }}>
      <EditorPanel
        side={dockSide}
        onSideChange={onDockSideChange}
        breadcrumbs={breadcrumbs}
        onBack={isRootView ? undefined : goBack}
        backLabel={
          isSettings && selectedId && !parentIsRoot && parentId
            ? `Jump up to ${nodeLabel(parentId)}`
            : 'Back to blocks'
        }
        headerAction={headerAction}
        subheader={subheader}
        footer={footer}
        defaultWidth={340}
        minWidth={300}
        storageKey="ne-builder-single-panel"
      >
        {activeMode === 'elements' && (
          <ElementsView categories={categories} drag={drag} />
        )}
        {activeMode === 'layers' && <LayersView />}
        {activeMode === 'templates' && (
          <TemplateLibraryView
            templates={templates}
            onApplyTemplate={onApplyTemplate}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        )}
        {activeMode === 'settings' && <SettingsView blocks={blocks} />}
        {activeMode === 'page' && <PageSettingsView />}
        {activeMode === 'history' && <HistoryView queue={queue} />}
      </EditorPanel>
    </div>
  );
}
