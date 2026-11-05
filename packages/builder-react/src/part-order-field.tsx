/**
 * Sidebar sortable control for reordering a block's parts (e.g. Hero's badge,
 * title, subtitle, buttons). Rendered at the top of the Content tab whenever a
 * block's schema declares `reorder`.
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type BlockReorder,
  type BlockReorderPart,
  type NodeId,
  reorderParts,
} from '@nextcms/builder-core';
import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from 'lucide-react';
import React, { useRef } from 'react';
import { useFlip } from '@nextcms/editor-ui';
import { useEditorStore } from './context';

/** Checks whether a part currently has no content in the block's props. */
export function isPartEmpty(
  partId: string,
  props: Record<string, unknown>
): boolean {
  if (partId === 'buttons') {
    const primary = props.primaryButtonText;
    const secondary = props.secondaryButtonText;
    const single = props.buttonText;
    const hasPrimary =
      typeof primary === 'string' ? primary.trim().length > 0 : Boolean(primary);
    const hasSecondary =
      typeof secondary === 'string'
        ? secondary.trim().length > 0
        : Boolean(secondary);
    const hasSingle =
      typeof single === 'string' ? single.trim().length > 0 : Boolean(single);
    return !hasPrimary && !hasSecondary && !hasSingle;
  }

  if (partId in props) {
    const val = props[partId];
    if (typeof val === 'string') return val.trim().length === 0;
    return val === null || val === undefined || val === false;
  }

  if (Array.isArray(props.items) && props.items.length > 0) {
    const anyHasPartId = props.items.some(
      item => item && typeof item === 'object' && partId in item
    );
    if (anyHasPartId) {
      return !props.items.some(item => {
        if (!item || typeof item !== 'object') return false;
        const val = (item as Record<string, unknown>)[partId];
        return typeof val === 'string' ? val.trim().length > 0 : Boolean(val);
      });
    }
  }

  return false;
}

function SortablePartRow({
  part,
  index,
  total,
  muted,
  readOnly,
  onMove,
}: {
  part: BlockReorderPart;
  index: number;
  total: number;
  muted: boolean;
  readOnly?: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: part.id,
    disabled: readOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '5px 8px',
    borderRadius: 'var(--ne-radius-sm, 6px)',
    border: '1px solid var(--ne-border, #e2e8f0)',
    background: isDragging
      ? 'var(--ne-primary-soft, #eff6ff)'
      : 'var(--ne-surface, #ffffff)',
    opacity: isDragging ? 0.85 : muted ? 0.55 : 1,
    boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.08)' : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: 'var(--ne-text-muted, #64748b)',
    cursor: readOnly ? 'not-allowed' : 'pointer',
    padding: 0,
  };

  return (
    <div ref={setNodeRef} style={style} data-part-row={part.id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
          flex: 1,
        }}
      >
        <button
          type="button"
          aria-label={`Drag ${part.label}`}
          disabled={readOnly}
          {...attributes}
          {...listeners}
          style={{
            ...btnStyle,
            cursor: readOnly ? 'not-allowed' : 'grab',
            touchAction: 'none',
          }}
        >
          <GripVertical size={13} />
        </button>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ne-text, #0f172a)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {part.label}
        </span>
        {muted && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--ne-text-muted, #64748b)',
              fontStyle: 'italic',
            }}
          >
            (empty)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          type="button"
          aria-label={`Move ${part.label} up`}
          title={`Move ${part.label} up`}
          disabled={readOnly || index === 0}
          onClick={() => onMove(index, index - 1)}
          style={{
            ...btnStyle,
            opacity: readOnly || index === 0 ? 0.3 : 1,
            cursor: readOnly || index === 0 ? 'default' : 'pointer',
          }}
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          aria-label={`Move ${part.label} down`}
          title={`Move ${part.label} down`}
          disabled={readOnly || index === total - 1}
          onClick={() => onMove(index, index + 1)}
          style={{
            ...btnStyle,
            opacity: readOnly || index === total - 1 ? 0.3 : 1,
            cursor: readOnly || index === total - 1 ? 'default' : 'pointer',
          }}
        >
          <ArrowDown size={12} />
        </button>
      </div>
    </div>
  );
}

export function PartOrderField({
  nodeId,
  reorder,
  props,
  readOnly,
}: {
  nodeId: NodeId;
  reorder: BlockReorder;
  props: Record<string, unknown>;
  readOnly?: boolean;
}) {
  const store = useEditorStore();
  const propName = reorder.prop ?? 'partOrder';
  const defaultIds = reorder.parts.map(p => p.id);
  const rawOrder = Array.isArray(props[propName])
    ? (props[propName] as string[])
    : undefined;
  const orderedIds = reorderParts(rawOrder, defaultIds);
  const partById = new Map(reorder.parts.map(p => [p.id, p]));
  const orderedPartsList = orderedIds
    .map(id => partById.get(id))
    .filter((p): p is BlockReorderPart => !!p);
  // Keys must match the rendered rows, so take them from the filtered list.
  const listRef = useRef<HTMLDivElement | null>(null);
  useFlip(
    listRef,
    orderedPartsList.map(p => p.id)
  );

  const isCustomOrder =
    rawOrder !== undefined &&
    orderedIds.some((id, idx) => id !== defaultIds[idx]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commitOrder = (nextOrder: string[] | undefined) => {
    store.updateProps(
      nodeId,
      { [propName]: nextOrder },
      `${nodeId}.${propName}`
    );
  };

  const handleMove = (from: number, to: number) => {
    if (readOnly || to < 0 || to >= orderedIds.length || from === to) return;
    commitOrder(arrayMove(orderedIds, from, to));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    commitOrder(arrayMove(orderedIds, oldIndex, newIndex));
  };

  return (
    <div
      data-testid="part-order-field"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingBottom: 8,
        marginBottom: 4,
        borderBottom: '1px solid var(--ne-border, #e2e8f0)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ne-text-muted, #64748b)',
          }}
        >
          {reorder.label ?? 'Layout order'}
        </span>
        {(isCustomOrder || rawOrder !== undefined) && !readOnly && (
          <button
            type="button"
            onClick={() => commitOrder(undefined)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'none',
              padding: 0,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ne-primary, #2563eb)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} />
            <span>Reset order</span>
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedIds}
          strategy={verticalListSortingStrategy}
        >
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orderedPartsList.map((part, index) => (
              <SortablePartRow
                key={part.id}
                part={part}
                index={index}
                total={orderedPartsList.length}
                muted={isPartEmpty(part.id, props)}
                readOnly={readOnly}
                onMove={handleMove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
