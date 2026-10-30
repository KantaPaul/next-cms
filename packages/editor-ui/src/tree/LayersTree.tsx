import {
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
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
}

export interface LayersTreeProps {
  nodes: LayerNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggleHide?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  /** Accessible name for the tree. */
  label?: string;
  className?: string;
}

type VisibleRow = { node: LayerNode; depth: number; parentId: string | null };

function visibleRows(
  nodes: LayerNode[],
  expanded: Record<string, boolean>
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  const walk = (list: LayerNode[], depth: number, parentId: string | null) => {
    for (const node of list) {
      rows.push({ node, depth, parentId });
      if (node.children?.length && (expanded[node.id] ?? true))
        walk(node.children, depth + 1, node.id);
    }
  };
  walk(nodes, 0, null);
  return rows;
}

/**
 * Generic layers tree (B15 E4, gap G8). WAI-ARIA tree with one tab stop:
 * arrows move focus (Right/Left expand, collapse, or step in and out),
 * Home/End jump, Enter or Space selects, F2 renames, Alt+Up/Down call the
 * move callbacks. Drag behavior stays in the builder that renders it.
 */

export const LayersTree: React.FC<LayersTreeProps> = ({
  nodes,
  selectedId,
  onSelect,
  onToggleHide,
  onToggleLock,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  label = 'Layers',
  className = '',
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => visibleRows(nodes, expandedIds),
    [nodes, expandedIds]
  );
  // One tab stop: the focused row, else the selected one, else the first.
  const tabStopId =
    (focusedId && rows.some(r => r.node.id === focusedId) && focusedId) ||
    (selectedId && rows.some(r => r.node.id === selectedId) && selectedId) ||
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

  const onTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingId) return;
    const index = rows.findIndex(r => r.node.id === tabStopId);
    const row = rows[index];
    if (!row) return;
    const { node } = row;
    const hasChildren = !!node.children?.length;
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
      if (hasChildren && !expanded) toggleExpand(node.id);
      else if (node.children?.[0]) focusRow(node.children[0].id);
      else return;
    } else if (key === 'ArrowLeft') {
      if (hasChildren && expanded) toggleExpand(node.id);
      else if (row.parentId) focusRow(row.parentId);
      else return;
    } else if (key === 'Enter' || key === ' ') onSelect(node.id);
    else if (key === 'F2' && onRename) startRename(node);
    else return;
    event.preventDefault();
  };

  const startRename = (node: LayerNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const commitRename = (id: string) => {
    if (editName.trim() && onRename) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  const renderNode = (
    node: LayerNode,
    depth = 0,
    setSize = 1,
    posInSet = 1
  ) => {
    const isSelected = selectedId === node.id;
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
        <div
          onClick={() => {
            setFocusedId(node.id);
            onSelect(node.id);
          }}
          style={{ paddingInlineStart: `${depth * 14 + 6}px` }}
          className={`group flex items-center justify-between h-7 pe-2 rounded-[var(--ne-radius-sm)] text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium'
              : 'hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text)]'
          } ${node.hidden ? 'opacity-40' : ''}`}
        >
          {/* Left: Expand, Icon, Name */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={e => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="w-4 h-4 flex items-center justify-center p-0 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] cursor-pointer"
              >
                <ChevronRight
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isExpanded ? 'rotate-90' : 'rtl:-scale-x-100'
                  }`}
                />
              </button>
            ) : (
              <span className="w-4" />
            )}

            <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[var(--ne-text-muted)]">
              {node.icon || <Folder className="w-3 h-3" />}
            </span>

            {isEditing ? (
              <div
                className="flex items-center gap-1 flex-1"
                onClick={e => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  aria-label={`Rename ${node.name}`}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') commitRename(node.id);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      focusRow(node.id);
                    }
                  }}
                  autoFocus
                  className="h-5 px-1 text-xs bg-[var(--ne-surface)] border border-[var(--ne-primary)] rounded-[var(--ne-radius-sm)] text-[var(--ne-text)] w-full"
                />
                <button
                  type="button"
                  onClick={() => commitRename(node.id)}
                  className="p-0.5 text-[var(--ne-success)] hover:opacity-80"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span
                onDoubleClick={e => {
                  e.stopPropagation();
                  startRename(node);
                }}
                className="truncate font-sans select-none"
                title={`${node.name} (${node.type})`}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* Right: Actions (Hide, Lock, Menu) */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            {onRename && !isEditing && (
              <button
                type="button"
                tabIndex={-1}
                title="Rename (Double-click)"
                onClick={() => startRename(node)}
                className="p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            )}

            {onToggleHide && (
              <button
                type="button"
                tabIndex={-1}
                title={node.hidden ? 'Show' : 'Hide'}
                onClick={() => onToggleHide(node.id)}
                className={`p-0.5 ${node.hidden ? 'opacity-100 text-[var(--ne-text-subtle)]' : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'}`}
              >
                {node.hidden ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
            )}

            {onToggleLock && (
              <button
                type="button"
                tabIndex={-1}
                title={node.locked ? 'Unlock' : 'Lock'}
                onClick={() => onToggleLock(node.id)}
                className={`p-0.5 ${node.locked ? 'opacity-100 text-[var(--ne-warning)]' : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'}`}
              >
                {node.locked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </button>
            )}

            {onDuplicate && (
              <button
                type="button"
                tabIndex={-1}
                title="Duplicate"
                onClick={() => onDuplicate(node.id)}
                className="p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                tabIndex={-1}
                title="Delete"
                onClick={() => onDelete(node.id)}
                className="p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-danger)]"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div role="group" className="border-s border-[var(--ne-border)] ms-3">
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
      onKeyDown={onTreeKeyDown}
      className={`p-2 space-y-0.5 overflow-y-auto ne-scrollbar h-full ${className}`}
    >
      {nodes.map((node, i, list) => renderNode(node, 0, list.length, i + 1))}
    </div>
  );
};
