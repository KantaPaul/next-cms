import * as React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

export interface LayerNode {
  id: string;
  label: string;
  type?: string;
  children?: LayerNode[];
  hidden?: boolean;
  locked?: boolean;
  selected?: boolean;
}

export interface LayersTreeProps {
  nodes: LayerNode[];
  onSelect?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  className?: string;
}

function LayerItem({ node, depth, onSelect, onToggleVisibility, onToggleLock }: {
  node: LayerNode;
  depth: number;
  onSelect?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={node.selected}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-[var(--ne-radius-sm)] px-1 py-0.5 text-xs',
          node.selected ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]' : 'text-[var(--ne-text)] hover:bg-[var(--ne-bg)]',
          node.hidden && 'opacity-40'
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-4 w-4 items-center justify-center text-[var(--ne-text-muted)]"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <button
          type="button"
          onClick={() => onSelect?.(node.id)}
          className="flex-1 truncate text-left"
        >
          {node.label}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onToggleVisibility?.(node.id)}
            className="p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
            aria-label={node.hidden ? 'Show' : 'Hide'}
            title={node.hidden ? 'Show' : 'Hide'}
          >
            {node.hidden ? '👁‍🗨' : '👁'}
          </button>
          <button
            type="button"
            onClick={() => onToggleLock?.(node.id)}
            className="p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
            aria-label={node.locked ? 'Unlock' : 'Lock'}
            title={node.locked ? 'Unlock' : 'Lock'}
          >
            {node.locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children!.map(child => (
            <LayerItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LayersTree({ nodes, onSelect, onToggleVisibility, onToggleLock, className }: LayersTreeProps) {
  return (
    <div role="tree" aria-label="Layers" className={cn('flex flex-col', className)}>
      {nodes.map(node => (
        <LayerItem
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
        />
      ))}
    </div>
  );
}