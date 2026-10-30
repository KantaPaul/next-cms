import React, { useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  GripVertical,
  Edit2,
  Folder,
  Check,
} from 'lucide-react';

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
  className?: string;
}

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
  className = '',
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    root: true,
    section: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const renderNode = (node: LayerNode, depth = 0) => {
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds[node.id] ?? true;
    const isEditing = editingId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelect(node.id)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`group flex items-center justify-between h-7 pr-2 rounded-[var(--ne-radius-sm)] text-xs cursor-pointer transition-colors ${
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
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="w-4 h-4 flex items-center justify-center p-0 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] cursor-pointer"
              >
                <ChevronRight
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isExpanded ? 'rotate-90' : ''
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
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(node.id);
                    if (e.key === 'Escape') setEditingId(null);
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
                onDoubleClick={(e) => {
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
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onRename && !isEditing && (
              <button
                type="button"
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
                title={node.hidden ? 'Show' : 'Hide'}
                onClick={() => onToggleHide(node.id)}
                className={`p-0.5 ${node.hidden ? 'opacity-100 text-[var(--ne-text-subtle)]' : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'}`}
              >
                {node.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            )}

            {onToggleLock && (
              <button
                type="button"
                title={node.locked ? 'Unlock' : 'Lock'}
                onClick={() => onToggleLock(node.id)}
                className={`p-0.5 ${node.locked ? 'opacity-100 text-[var(--ne-warning)]' : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'}`}
              >
                {node.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}

            {onDuplicate && (
              <button
                type="button"
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
          <div className="border-l border-[var(--ne-border)] ml-3">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`p-2 space-y-0.5 overflow-y-auto ne-scrollbar h-full ${className}`}>
      {nodes.map((node) => renderNode(node, 0))}
    </div>
  );
};
