import {
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Folder,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

export interface LayerNode {
  id: string;
  name: string;
  type: string;
  icon?: React.ReactNode;
  children?: LayerNode[];
  locked?: boolean;
  hidden?: boolean;
  /**
   * A heading row that only groups its children (e.g. a slot of a block with
   * several slots). It is not selectable and its children keep its depth.
   */
  group?: boolean;
  /** Starting value for rename, when it differs from the shown name. */
  renameValue?: string;
}

export interface LayersTreeProps {
  nodes: LayerNode[];
  selectedId?: string;
  /** Several selected rows; takes precedence over `selectedId`. */
  selectedIds?: string[];
  onSelect: (id: string, options?: { additive: boolean }) => void;
  /** Row the canvas highlights; set with `onHover`. */
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** Host-driven drag start on a row (buttons and inputs are ignored). */
  onRowPointerDown?: (
    id: string,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  onToggleHide?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  /** Called with the trimmed name, which may be empty (meaning "use the default"). */
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  /** Drawn inside the tree's positioned container, e.g. a drop line. */
  overlay?: React.ReactNode;
  emptyLabel?: string;
  /** Accessible name for the tree. */
  label?: string;
  className?: string;
}

/** Attribute on every row (and group heading) with its id, for host hit-testing. */
export const LAYER_ROW_ATTRIBUTE = 'data-layer-row';

type VisibleRow = { node: LayerNode; depth: number; parentId: string | null };

function visibleRows(
  nodes: LayerNode[],
  expanded: Record<string, boolean>
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  const walk = (list: LayerNode[], depth: number, parentId: string | null) => {
    for (const node of list) {
      if (node.group) {
        walk(node.children ?? [], depth, parentId);
        continue;
      }
      rows.push({ node, depth, parentId });
      if (node.children?.length && (expanded[node.id] ?? true))
        walk(node.children, depth + 1, node.id);
    }
  };
  walk(nodes, 0, null);
  return rows;
}

const firstRow = (node: LayerNode): LayerNode | undefined => {
  for (const child of node.children ?? []) {
    const found = child.group ? firstRow(child) : child;
    if (found) return found;
  }
  return undefined;
};

/**
 * Generic layers tree (B15 E4, gap G8). WAI-ARIA tree with one tab stop:
 * arrows move focus (Right/Left expand, collapse, or step in and out),
 * Home/End jump, Enter or Space selects (Shift adds), F2 renames, Alt+Up/Down
 * call the move callbacks. Drag behavior stays with the host: it gets
 * `onRowPointerDown`, finds rows by `LAYER_ROW_ATTRIBUTE`, and draws its
 * drop line through `overlay`.
 */
export const LayersTree: React.FC<LayersTreeProps> = ({
  nodes,
  selectedId,
  selectedIds,
  onSelect,
  hoveredId,
  onHover,
  onRowPointerDown,
  onToggleHide,
  onToggleLock,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  overlay,
  emptyLabel = 'No layers yet.',
  label = 'Layers',
  className = '',
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => new Set(selectedIds ?? (selectedId ? [selectedId] : [])),
    [selectedIds, selectedId]
  );
  const rows = useMemo(
    () => visibleRows(nodes, expandedIds),
    [nodes, expandedIds]
  );
  // One tab stop: the focused row, else the first selected one, else the first.
  const tabStopId =
    (focusedId && rows.some(r => r.node.id === focusedId) && focusedId) ||
    rows.find(r => selected.has(r.node.id))?.node.id ||
    rows[0]?.node.id;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    const el = treeRef.current?.querySelector<HTMLElement>(
      `[data-layer-id="${CSS.escape(id)}"]`
    );
    el?.focus();
  }, []);

  const startRename = (node: LayerNode) => {
    setEditingId(node.id);
    setEditName(node.renameValue ?? node.name);
  };

  const commitRename = (node: LayerNode) => {
    const next = editName.trim();
    if (onRename && next !== (node.renameValue ?? node.name))
      onRename(node.id, next);
    setEditingId(null);
  };

  const onTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingId) return;
    const index = rows.findIndex(r => r.node.id === tabStopId);
    const row = rows[index];
    if (!row) return;
    const { node } = row;
    const child = firstRow(node);
    const expanded = expandedIds[node.id] ?? true;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const key =
      rtl && event.key === 'ArrowRight'
        ? 'ArrowLeft'
        : rtl && event.key === 'ArrowLeft'
          ? 'ArrowRight'
          : event.key;

    if (event.altKey && key === 'ArrowUp' && onMoveUp) onMoveUp(node.id);
    else if (event.altKey && key === 'ArrowDown' && onMoveDown)
      onMoveDown(node.id);
    else if (key === 'ArrowDown')
      rows[index + 1] && focusRow(rows[index + 1].node.id);
    else if (key === 'ArrowUp')
      rows[index - 1] && focusRow(rows[index - 1].node.id);
    else if (key === 'Home') rows[0] && focusRow(rows[0].node.id);
    else if (key === 'End') {
      const last = rows.at(-1);
      if (last) focusRow(last.node.id);
    } else if (key === 'ArrowRight') {
      if (node.children?.length && !expanded) toggleExpand(node.id);
      else if (child) focusRow(child.id);
      else return;
    } else if (key === 'ArrowLeft') {
      if (node.children?.length && expanded) toggleExpand(node.id);
      else if (row.parentId) focusRow(row.parentId);
      else return;
    } else if (key === 'Enter' || key === ' ')
      onSelect(node.id, { additive: event.shiftKey });
    else if (key === 'F2' && onRename) startRename(node);
    else return;
    event.preventDefault();
  };

  const actionClass = (active: boolean, tone = 'hover:text-[var(--ne-text)]') =>
    `p-0.5 ${active ? 'opacity-100' : ''} text-[var(--ne-text-muted)] ${tone}`;

  const renderGroup = (node: LayerNode, depth: number) => (
    <div key={node.id} role="group" aria-label={node.name}>
      <div
        {...{ [LAYER_ROW_ATTRIBUTE]: node.id }}
        style={{ paddingInlineStart: `${depth * 14 + 26}px` }}
        className="py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-subtle)]"
      >
        {node.name}
      </div>
      {(node.children ?? []).map((child, i, list) =>
        renderNode(child, depth, list.length, i + 1)
      )}
    </div>
  );

  const renderNode = (
    node: LayerNode,
    depth = 0,
    setSize = 1,
    posInSet = 1
  ): React.ReactNode => {
    if (node.group) return renderGroup(node, depth);
    const isSelected = selected.has(node.id);
    const isHovered = hoveredId === node.id;
    const hasChildren = !!node.children && node.children.length > 0;
    const isExpanded = expandedIds[node.id] ?? true;
    const isEditing = editingId === node.id;

    return (
      <div
        key={node.id}
        role="treeitem"
        aria-level={depth + 1}
        aria-setsize={setSize}
        aria-posinset={posInSet}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={node.name}
        className="select-none focus-visible:outline-none [&:focus-visible>div:first-child]:outline-2 [&:focus-visible>div:first-child]:outline-[var(--ne-focus-ring)]"
        tabIndex={tabStopId === node.id ? 0 : -1}
        data-layer-id={node.id}
        onFocus={e => {
          if (e.target === e.currentTarget) setFocusedId(node.id);
        }}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the treeitem handles keys for the whole tree */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: visual row of a treeitem */}
        <div
          {...{ [LAYER_ROW_ATTRIBUTE]: node.id }}
          onClick={e => {
            setFocusedId(node.id);
            onSelect(node.id, {
              additive: e.shiftKey || e.metaKey || e.ctrlKey,
            });
          }}
          onDoubleClick={() => onRename && startRename(node)}
          onPointerEnter={onHover ? () => onHover(node.id) : undefined}
          onPointerLeave={onHover ? () => onHover(null) : undefined}
          onPointerDown={
            onRowPointerDown
              ? e => {
                  if ((e.target as HTMLElement).closest('button, input'))
                    return;
                  onRowPointerDown(node.id, e);
                }
              : undefined
          }
          style={{ paddingInlineStart: `${depth * 14 + 6}px` }}
          className={`group flex h-7 cursor-pointer items-center justify-between rounded-[var(--ne-radius-sm)] pe-2 text-xs transition-colors ${
            onRowPointerDown ? 'touch-none' : ''
          } ${
            isSelected
              ? 'bg-[var(--ne-primary-soft)] font-medium text-[var(--ne-primary)]'
              : isHovered
                ? 'bg-[var(--ne-surface-hover)] text-[var(--ne-text)]'
                : 'text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)]'
          } ${node.hidden ? 'opacity-40' : ''}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {hasChildren ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={e => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="flex h-4 w-4 cursor-pointer items-center justify-center p-0 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : 'rtl:-scale-x-100'}`}
                />
              </button>
            ) : (
              <span className="w-4" />
            )}

            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--ne-text-muted)]">
              {node.icon || <Folder className="h-3 w-3" />}
            </span>

            {isEditing ? (
              // biome-ignore lint/a11y/noStaticElementInteractions: stops row clicks while renaming
              // biome-ignore lint/a11y/useKeyWithClickEvents: keys go to the input
              <div
                className="flex flex-1 items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editName}
                  placeholder={node.name}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => commitRename(node)}
                  aria-label={`Rename ${node.name}`}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') commitRename(node);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      focusRow(node.id);
                    }
                  }}
                  // biome-ignore lint/a11y/noAutofocus: rename starts from an explicit double-click or F2
                  autoFocus
                  className="h-5 w-full rounded-[var(--ne-radius-sm)] border border-[var(--ne-primary)] bg-[var(--ne-surface)] px-1 text-xs text-[var(--ne-text)] shadow-none focus:shadow-none focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  aria-label="Save name"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => commitRename(node)}
                  className="p-0.5 text-[var(--ne-success)] hover:opacity-80"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span
                className="select-none truncate"
                title={`${node.name} (${node.type})`}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* biome-ignore lint/a11y/noStaticElementInteractions: keeps action clicks from selecting the row */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: the buttons inside handle keys */}
          <div
            className={`flex items-center gap-1 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
              node.hidden || node.locked ? '' : 'opacity-0'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {onRename && !isEditing && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Rename ${node.name}`}
                title="Rename (double-click or F2)"
                onClick={() => startRename(node)}
                className={`${actionClass(false)} opacity-0 group-hover:opacity-100`}
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
            )}

            {onToggleHide && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={
                  node.hidden
                    ? `Show ${node.name}`
                    : `Hide ${node.name} in the editor`
                }
                aria-pressed={!!node.hidden}
                title={node.hidden ? 'Show' : 'Hide in the editor'}
                onClick={() => onToggleHide(node.id)}
                className={`${actionClass(!!node.hidden)} ${node.locked && !node.hidden ? 'opacity-0 group-hover:opacity-100' : ''}`}
              >
                {node.hidden ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
            )}

            {onToggleLock && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={
                  node.locked ? `Unlock ${node.name}` : `Lock ${node.name}`
                }
                aria-pressed={!!node.locked}
                title={node.locked ? 'Unlock' : 'Lock'}
                onClick={() => onToggleLock(node.id)}
                className={`${actionClass(!!node.locked)} ${node.locked ? 'text-[var(--ne-warning)]' : ''} ${node.hidden && !node.locked ? 'opacity-0 group-hover:opacity-100' : ''}`}
              >
                {node.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </button>
            )}

            {onDuplicate && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Duplicate ${node.name}`}
                title="Duplicate"
                onClick={() => onDuplicate(node.id)}
                className={actionClass(false)}
              >
                <Copy className="h-2.5 w-2.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Delete ${node.name}`}
                title="Delete"
                onClick={() => onDelete(node.id)}
                className={actionClass(false, 'hover:text-[var(--ne-danger)]')}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div
            role="group"
            className="ne-motion-enter ms-3 border-s border-[var(--ne-border)]"
          >
            {(node.children ?? []).map((child, i, list) =>
              renderNode(child, depth + 1, list.length, i + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label={label}
      aria-multiselectable={selectedIds ? true : undefined}
      onKeyDown={onTreeKeyDown}
      className={`ne-scrollbar relative h-full space-y-0.5 overflow-y-auto p-2 ${className}`}
    >
      {nodes.length === 0 && (
        <p className="m-0 px-1 text-xs text-[var(--ne-text-muted)]">
          {emptyLabel}
        </p>
      )}
      {nodes.map((node, i, list) => renderNode(node, 0, list.length, i + 1))}
      {overlay}
    </div>
  );
};
