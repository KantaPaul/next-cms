/**
 * The editing canvas (R689): the page rendered in an iframe with the host's
 * block components, plus an overlay in the editor page for hover, selection,
 * the block toolbar, and the drop line. Overlays are never part of the block
 * markup, so blocks render exactly as on the published page.
 */

import {
  ancestorIds,
  type BlockComponents,
  type BuilderNode,
  type Device,
  type NodeId,
  type RenderOptions,
  renderDocument,
  type SlotRenderArgs,
} from '@nextcms/builder-core';
import {
  Component,
  type CSSProperties,
  type ErrorInfo,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  DropLine,
  DropZone,
  FloatingToolbar,
  HoverBox,
  InsertPoint,
  MarqueeBox,
  OverlayNotice,
  SelectionBox,
  type ToolbarAction,
} from '@nextcms/editor-ui';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  CornerLeftUp,
  Group,
  LockOpen,
  Trash2,
} from 'lucide-react';
import { useEditorAnnouncements } from './announcements';
import type { BlockGroup } from './block-list';
import { useEditor, useEditorStore } from './context';
import {
  ContextMenu,
  type ContextMenuItem,
  type ContextMenuTarget,
} from './context-menu';
import {
  allNodeRects,
  hoverInsertTarget,
  NODE_ATTR,
  nodeRect,
  SLOT_ATTR,
  SLOT_NAME_ATTR,
  SLOT_PARENT_ATTR,
} from './dom';
import type { DragController } from './drag';
import { useDragState } from './drag';
import {
  type Point,
  type Rect,
  rectFromPoints,
  rectsIntersect,
  unionRect,
} from './drop';
import { CanvasFrame } from './frame';
import { type InlinePropsFor, useInlineEditing } from './inline';
import { isTypingTarget } from './keyboard';
import { propsForState } from './state-styles';
import { QuickInsertPopover, type QuickInsertTarget } from './quick-insert';
import { ResizeHandles, type ResizeHandlesFor } from './resize';

// Used inside the canvas iframe, where editor-ui's CSS is not loaded; matches --ne-primary.
const ACCENT = '#2563eb';

export type BlockAction = {
  id: string;
  label: string;
  icon: string;
  run: () => void;
};
export type BlockActionsFor = (node: BuilderNode) => BlockAction[];

/** Canvas width per device; desktop fills the available space. */
export const DEVICE_WIDTHS: Record<Device, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 375,
};

/**
 * Desktop never renders narrower than the desktop breakpoint, so the page's
 * media queries match the device being edited; small windows scroll instead.
 */
export const DESKTOP_MIN_WIDTH = 1024;

export type EditorCanvasProps = {
  components: BlockComponents;
  drag: DragController;
  /** Host prop changes per block, applied after loaded data (see builder-core `transformProps`). */
  transformProps?: RenderOptions['transformProps'];
  /** Data loaded on the server per node; shown but never stored in the document. */
  loaded?: Record<NodeId, Record<string, unknown>>;
  /** Wraps the page, for example with the site's theme root. */
  renderRoot?: (children: ReactNode) => ReactNode;
  /** Gives the editor page the iframe, for keyboard listeners. */
  onFrame?: (frame: HTMLIFrameElement) => void;
  /** Overrides canvas widths per device. */
  deviceWidths?: Partial<Record<Device, number | null>>;
  /** Resize handles for a block (R695). */
  resizeHandles?: ResizeHandlesFor;
  /** Props of a block type that can be edited as text on the canvas (R696). */
  inlineProps?: InlinePropsFor;
  /** Extra actions on a selected block's toolbar, such as host dialogs. */
  blockActions?: BlockActionsFor;
  /** Block groups for the quick-insert popover's search (R713); omit to disable quick insert. */
  insertGroups?: BlockGroup[];
  /** Current state style being edited (hover/focus/active) for preview (R725). */
  stateStyle?: 'hover' | 'focus' | 'active' | null;
  style?: CSSProperties;
};

function EmptySlot({
  root,
  onInsert,
}: {
  root: boolean;
  /** Opens the quick-insert popover anchored on this empty slot (R713, R721). */
  onInsert?: (event: ReactMouseEvent) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: root ? 240 : 72,
        font: '500 12px/1.4 system-ui, sans-serif',
        color: '#6b7280',
      }}
    >
      <span aria-hidden style={{ pointerEvents: 'none' }}>
        {root
          ? 'Drag a block here, or click one in the block list'
          : 'Drop blocks here'}
      </span>
      {onInsert && (
        <button
          type="button"
          aria-label="Insert a block here"
          title="Insert a block here"
          onClick={onInsert}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: ACCENT,
            color: '#fff',
            font: '600 14px/1 system-ui, sans-serif',
          }}
        >
          +
        </button>
      )}
    </div>
  );
}

/** Builds the `renderSlot` hook, wiring the empty-slot "+" button to the quick-insert popover. */
function makeRenderSlot(
  onInsertHere?: (
    position: { parentId: NodeId | null; slot: string },
    event: ReactMouseEvent
  ) => void
) {
  return function renderSlot({
    parentId,
    slot,
    className,
    style,
    empty,
    children,
  }: SlotRenderArgs) {
    return (
      <div
        {...{
          [SLOT_ATTR]: '',
          [SLOT_PARENT_ATTR]: parentId ?? '',
          [SLOT_NAME_ATTR]: slot,
        }}
        className={className}
        style={
          empty
            ? { ...style, outline: `1px dashed ${ACCENT}66`, outlineOffset: -4 }
            : style
        }
      >
        {children}
        {empty && (
          <EmptySlot
            root={parentId === null}
            onInsert={
              onInsertHere
                ? event => onInsertHere({ parentId, slot }, event)
                : undefined
            }
          />
        )}
      </div>
    );
  };
}

/** Editor-only notice in place of a block (R797). */
function BlockNotice({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      role="note"
      style={{
        margin: 8,
        padding: '12px 14px',
        borderRadius: 8,
        border: '1px dashed #dc2626',
        background: '#fef2f2',
        color: '#991b1b',
        font: '13px/1.4 system-ui, sans-serif',
      }}
    >
      <strong>{title}</strong>
      {detail && <div style={{ marginTop: 4, opacity: 0.8 }}>{detail}</div>}
    </div>
  );
}

/** Keeps one failing block from breaking the canvas; the rest of the page still edits (R797). */
class BlockErrorBoundary extends Component<
  { type: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[builder] ${this.props.type} failed to render`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <BlockNotice
          title={`This ${this.props.type} block could not be shown.`}
          detail={`${this.state.error.message}. Its settings are kept; edit or delete it to continue.`}
        />
      );
    }
    return this.props.children;
  }
}

const renderUnknown = (node: BuilderNode) => (
  <BlockNotice
    title={`Unknown block: ${node.type}`}
    detail="This block type is not installed. It is kept in the page; delete it or install the block."
  />
);

function CanvasDocument({
  components,
  transformProps,
  loaded,
  renderRoot,
  remount,
  onInsertHere,
  stateStyle,
}: Pick<
  EditorCanvasProps,
  'components' | 'transformProps' | 'loaded' | 'renderRoot'
> & {
  /** Bumped per block after inline editing, so its DOM is rebuilt by React. */
  remount: Record<NodeId, number>;
  /** Opens the quick-insert popover for an empty slot's "+" button (R713). */
  onInsertHere?: (
    position: { parentId: NodeId | null; slot: string },
    event: ReactMouseEvent
  ) => void;
  /** Current state style being edited (hover/focus/active) for preview (R725). */
  stateStyle?: 'hover' | 'focus' | 'active' | null;
}) {
  const doc = useEditor(state => state.doc);
  // Hidden blocks are hidden on the canvas only; the wrapper adds no box.
  const wrapNode = (node: BuilderNode, element: ReactNode) => (
    <div
      key={remount[node.id] ?? 0}
      {...{ [NODE_ATTR]: node.id }}
      style={{ display: node.meta?.hidden ? 'none' : 'contents' }}
    >
      <BlockErrorBoundary type={node.type}>{element}</BlockErrorBoundary>
    </div>
  );
  const content = renderDocument(doc, {
    components,
    editing: true,
    wrapNode,
    renderUnknown,
    renderSlot: makeRenderSlot(onInsertHere),
    transformProps: (node, props) => {
      const merged = loaded?.[node.id]
        ? { ...props, ...loaded[node.id] }
        : props;
      // Apply state style overrides for preview (R725).
      if (stateStyle) {
        const stateOverrides = propsForState(node, stateStyle);
        return transformProps
          ? transformProps(node, { ...merged, ...stateOverrides })
          : { ...merged, ...stateOverrides };
      }
      return transformProps ? transformProps(node, merged) : merged;
    },
  });
  return <>{renderRoot ? renderRoot(content) : content}</>;
}

/** Re-renders when the frame scrolls, resizes, or its content changes size. */
function useFrameLayoutTick(
  frame: HTMLIFrameElement | null,
  frameDoc?: Document | null
) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const win = frame?.contentWindow;
    const doc = frameDoc ?? frame?.contentDocument;
    const body = doc?.body;
    if (!win || !body) return;
    let pending = 0;
    const bump = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => setTick(t => t + 1));
    };
    win.addEventListener('scroll', bump, { passive: true });
    win.addEventListener('resize', bump);
    const observer = new ResizeObserver(bump);
    observer.observe(body);
    return () => {
      cancelAnimationFrame(pending);
      win.removeEventListener('scroll', bump);
      win.removeEventListener('resize', bump);
      observer.disconnect();
    };
  }, [frame, frameDoc]);
  return tick;
}

function Toolbar({
  id,
  rect,
  drag,
  blockActions,
}: {
  id: NodeId;
  rect: Rect;
  drag: DragController;
  blockActions?: BlockActionsFor;
}) {
  const store = useEditorStore();
  const node = useEditor(state => state.doc.nodes[id]);
  const type = useEditor(state => state.doc.nodes[id]?.type);
  const name = useEditor(state => state.doc.nodes[id]?.meta?.name);
  const locked = useEditor(state => !!state.doc.nodes[id]?.meta?.locked);
  const label = name || ((type && store.schemas[type]?.label) ?? type) || '';
  const icon = 'h-3.5 w-3.5';
  const parent: ToolbarAction = {
    id: 'parent',
    label: 'Select parent',
    icon: <CornerLeftUp className={icon} />,
    onClick: () => store.selectParent(),
  };
  const actions: ToolbarAction[] = locked
    ? [
        parent,
        {
          id: 'unlock',
          label: 'Unlock',
          icon: <LockOpen className={icon} />,
          onClick: () => store.updateMeta(id, { locked: false }),
        },
      ]
    : [
        parent,
        {
          id: 'up',
          label: 'Move up',
          shortcut: 'Alt+↑',
          icon: <ArrowUp className={icon} />,
          onClick: () => store.nudge(id, -1),
        },
        {
          id: 'down',
          label: 'Move down',
          shortcut: 'Alt+↓',
          icon: <ArrowDown className={icon} />,
          onClick: () => store.nudge(id, 1),
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          shortcut: '⌘D',
          icon: <Copy className={icon} />,
          onClick: () => store.duplicate([id]),
        },
        ...(node
          ? (blockActions?.(node) ?? []).map(action => ({
              id: action.id,
              label: action.label,
              icon: <span aria-hidden>{action.icon}</span>,
              onClick: action.run,
            }))
          : []),
        {
          id: 'delete',
          label: 'Delete',
          shortcut: 'Del',
          icon: <Trash2 className={icon} />,
          onClick: () => store.remove([id]),
          danger: true,
        },
      ];
  return (
    <FloatingToolbar
      top={rect.top}
      left={rect.left}
      placement={rect.top >= 34 ? 'above' : 'below'}
      label={label}
      tone={locked ? 'locked' : 'default'}
      dragHandle={
        locked
          ? undefined
          : {
              label: `Drag ${label}`,
              onPointerDown: event => drag.start({ kind: 'move', id }, event),
            }
      }
      actions={actions}
    />
  );
}

/** Toolbar shown above a multi-block selection (R719): duplicate, delete, and group. */
function MultiSelectToolbar({ ids, rect }: { ids: NodeId[]; rect: Rect }) {
  const store = useEditorStore();
  const canGroup =
    !!store.schemas.Container?.slots &&
    Object.keys(store.schemas.Container.slots ?? {}).length > 0;
  const icon = 'h-3.5 w-3.5';
  return (
    <FloatingToolbar
      top={rect.top}
      left={rect.left}
      placement={rect.top >= 34 ? 'above' : 'below'}
      label={`${ids.length} selected`}
      ariaLabel={`${ids.length} blocks selected`}
      actions={[
        ...(canGroup
          ? [
              {
                id: 'group',
                label: 'Group in a container',
                icon: <Group className={icon} />,
                onClick: () => store.wrap('Container', ids),
              },
            ]
          : []),
        {
          id: 'duplicate',
          label: 'Duplicate selection',
          icon: <Copy className={icon} />,
          onClick: () => store.duplicate(ids),
        },
        {
          id: 'delete',
          label: 'Delete selection',
          icon: <Trash2 className={icon} />,
          onClick: () => store.remove(ids),
          danger: true,
        },
      ]}
    />
  );
}

/** DropLine props from the drop target's line rect: wide is horizontal, tall is vertical. */
function dropLineProps(line: Rect) {
  const horizontal = line.width >= line.height;
  return {
    orientation: horizontal ? ('horizontal' as const) : ('vertical' as const),
    position: {
      top: horizontal ? line.top + line.height / 2 - 1 : line.top,
      left: horizontal ? line.left : line.left + line.width / 2 - 1,
      length: horizontal ? line.width : line.height,
    },
  };
}

function CanvasOverlay({
  frame,
  frameDoc,
  drag,
  resizeHandles,
  blockActions,
  marquee,
}: {
  frame: HTMLIFrameElement;
  frameDoc?: Document | null;
  drag: DragController;
  resizeHandles?: ResizeHandlesFor;
  blockActions?: BlockActionsFor;
  /** The drag-select rectangle in progress, if any (R719). */
  marquee: Rect | null;
}) {
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const hovered = useEditor(state => state.hovered);
  const dragState = useDragState(drag);
  const tick = useFrameLayoutTick(frame, frameDoc);
  const store = useEditorStore();
  const labelOf = (id: NodeId) => {
    const node = doc.nodes[id];
    return (
      node?.meta?.name ||
      store.schemas[node?.type ?? '']?.label ||
      node?.type ||
      ''
    );
  };
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visibleLeft, setVisibleLeft] = useState(0);
  const inView = (rect: Rect): Rect => ({
    ...rect,
    left: Math.max(rect.left, visibleLeft + 8),
  });
  const [rects, setRects] = useState<{
    hovered: Rect | null;
    selected: [NodeId, Rect][];
  }>({
    hovered: null,
    selected: [],
  });

  // Measure after each commit, once the frame shows the new document.
  useLayoutEffect(() => {
    const activeDoc = frameDoc ?? frame.contentDocument;
    if (!activeDoc) return;
    setRects({
      hovered:
        hovered && !selection.includes(hovered)
          ? nodeRect(activeDoc, hovered)
          : null,
      selected: selection.flatMap(id => {
        const rect = nodeRect(activeDoc, id);
        return rect ? [[id, rect] as [NodeId, Rect]] : [];
      }),
    });
    // The canvas can be wider than its viewport (desktop width in a narrow
    // window) and overflow on the left; keep toolbars where they can be seen.
    const overlay = overlayRef.current;
    let clip = overlay?.parentElement ?? null;
    while (clip && getComputedStyle(clip).overflowX === 'visible')
      clip = clip.parentElement;
    if (overlay && clip) {
      setVisibleLeft(
        Math.max(
          0,
          clip.getBoundingClientRect().left -
            overlay.getBoundingClientRect().left
        )
      );
    }
  }, [frame, frameDoc, doc, selection, hovered, tick]);

  const primary = rects.selected[0];
  const multi = rects.selected.length > 1;
  const groupRect = multi
    ? unionRect(rects.selected.map(([, rect]) => rect))
    : null;
  return (
    <div
      // `.ne-ui`: editor-ui's styling scope, so these parts look the same in
      // the old chrome, where the canvas is not inside EditorShell.
      ref={overlayRef}
      className="ne-ui"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {rects.hovered && hovered && !dragState.active && (
        <HoverBox bounds={rects.hovered} label={labelOf(hovered)} />
      )}
      {rects.selected.map(([id, rect]) => (
        <SelectionBox
          key={id}
          bounds={rect}
          showHandles={false}
          locked={!!doc.nodes[id]?.meta?.locked}
        />
      ))}
      {primary && !multi && !dragState.active && (
        <Toolbar
          key={primary[0]}
          id={primary[0]}
          rect={inView(primary[1])}
          drag={drag}
          blockActions={blockActions}
        />
      )}
      {groupRect && !dragState.active && (
        <MultiSelectToolbar
          ids={rects.selected.map(([id]) => id)}
          rect={inView(groupRect)}
        />
      )}
      {primary && !multi && !dragState.active && resizeHandles && (
        <ResizeHandles
          id={primary[0]}
          rect={primary[1]}
          frame={frame}
          handlesFor={resizeHandles}
        />
      )}
      {dragState.active && dragState.target && (
        <>
          <DropZone bounds={dragState.target.slot} />
          <DropLine {...dropLineProps(dragState.target.line)} />
        </>
      )}
      {dragState.active && dragState.blockedReason && (
        <OverlayNotice tone="danger">{dragState.blockedReason}</OverlayNotice>
      )}
      {marquee && <MarqueeBox bounds={marquee} />}
    </div>
  );
}

/** The canvas: frame, overlay, and pointer handling. */
export function EditorCanvas({
  components,
  drag,
  transformProps,
  loaded,
  renderRoot,
  onFrame,
  deviceWidths,
  resizeHandles,
  inlineProps,
  blockActions,
  insertGroups,
  stateStyle,
  style,
}: EditorCanvasProps) {
  const store = useEditorStore();
  useEditorAnnouncements(store);
  const [remount, setRemount] = useState<Record<NodeId, number>>({});
  const dragState = useDragState(drag);
  const device = useEditor(state => state.device);
  const width = { ...DEVICE_WIDTHS, ...deviceWidths }[device];
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [frameDoc, setFrameDoc] = useState<Document | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [hoverInsert, setHoverInsert] = useState<{
    point: Point;
    position: { parentId: NodeId | null; slot: string; index: number };
  } | null>(null);
  const [quickInsert, setQuickInsert] = useState<QuickInsertTarget | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(
    null
  );

  const onReady = useCallback(
    (next: HTMLIFrameElement, nextDoc?: Document) => {
      setFrame(next);
      setFrameDoc(nextDoc ?? next.contentDocument);
      drag.setFrame(next);
      onFrame?.(next);
    },
    [drag, onFrame]
  );

  const onInlineDone = useCallback(
    (id: NodeId) =>
      setRemount(current => ({ ...current, [id]: (current[id] ?? 0) + 1 })),
    []
  );
  useInlineEditing({ frame, frameDoc, store, inlineProps, onDone: onInlineDone });

  /** Viewport point (fixed-position coordinates) for a point relative to the iframe. */
  const toViewportPoint = useCallback(
    (point: Point): Point => {
      const box = frame?.getBoundingClientRect();
      return box ? { x: point.x + box.left, y: point.y + box.top } : point;
    },
    [frame]
  );

  const onInsertHere = useCallback(
    (
      position: { parentId: NodeId | null; slot: string },
      event: ReactMouseEvent
    ) => {
      store.select(null);
      setQuickInsert({
        point: { x: event.clientX, y: event.clientY },
        position: { ...position, index: 0 },
      });
    },
    [store]
  );

  useEffect(() => {
    const doc = frameDoc ?? frame?.contentDocument;
    if (!doc) return;
    const nodeAt = (target: EventTarget | null) =>
      (target as Element | null)
        ?.closest?.(`[${NODE_ATTR}]`)
        ?.getAttribute(NODE_ATTR) ?? null;
    const lockedAncestorOrSelf = (target: EventTarget | null) => {
      let element =
        (target as Element | null)?.closest?.(`[${NODE_ATTR}]`) ?? null;
      while (element && store.isLocked(element.getAttribute(NODE_ATTR) ?? '')) {
        element = element.parentElement?.closest(`[${NODE_ATTR}]`) ?? null;
      }
      return element;
    };
    const onClick = (event: MouseEvent) => {
      // Links and buttons inside blocks must not navigate or submit while editing.
      if (
        (event.target as Element | null)?.closest?.(
          'a, button, [role="button"]'
        )
      ) {
        event.preventDefault();
      }
      // A locked block is not selectable on the canvas; its nearest unlocked parent is.
      const element = lockedAncestorOrSelf(event.target);
      store.select(element?.getAttribute(NODE_ATTR) ?? null, {
        additive: event.shiftKey || event.metaKey,
      });
    };
    let pending = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        store.hover(nodeAt(event.target));
        if (insertGroups && !dragState.active && !marqueeRef.current) {
          const hit = hoverInsertTarget(doc, {
            x: event.clientX,
            y: event.clientY,
          });
          setHoverInsert(
            hit ? { point: hit.buttonPoint, position: hit.position } : null
          );
        }
      });
    };
    const onLeave = () => {
      store.hover(null);
      setHoverInsert(null);
    };
    const onSubmit = (event: Event) => event.preventDefault();

    // Marquee selection: press on empty canvas (not a block, link, or button) and drag.
    let marqueeStart: Point | null = null;
    const marqueeRef = { current: false };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (target?.closest?.(`[${NODE_ATTR}], a, button, [role="button"]`))
        return;
      marqueeStart = { x: event.clientX, y: event.clientY };
    };
    const onMarqueeMove = (event: PointerEvent) => {
      if (!marqueeStart) return;
      const current = { x: event.clientX, y: event.clientY };
      const rect = rectFromPoints(marqueeStart, current);
      if (!marqueeRef.current && rect.width < 4 && rect.height < 4) return;
      // A real drag is underway: stop the browser from turning it into a text selection.
      event.preventDefault();
      doc.getSelection()?.removeAllRanges();
      marqueeRef.current = true;
      setHoverInsert(null);
      setMarquee(rect);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!marqueeStart) return;
      if (marqueeRef.current) {
        const rect = rectFromPoints(marqueeStart, {
          x: event.clientX,
          y: event.clientY,
        });
        const hits = allNodeRects(doc).filter(entry =>
          rectsIntersect(rect, entry.rect)
        );
        // Keep only the outermost matches: a selected container's own children are redundant.
        const ids = hits.filter(
          entry =>
            !hits.some(
              other =>
                other.id !== entry.id &&
                ancestorIds(store.getState().doc, entry.id).includes(other.id)
            )
        );
        store.select(
          ids.map(entry => entry.id),
          { additive: event.shiftKey || event.metaKey }
        );
      }
      marqueeStart = null;
      marqueeRef.current = false;
      setMarquee(null);
    };

    const onContextMenu = (event: MouseEvent) => {
      const element = lockedAncestorOrSelf(event.target);
      const id = element?.getAttribute(NODE_ATTR);
      if (!id) return;
      event.preventDefault();
      if (!store.getState().selection.includes(id)) store.select(id);
      const node = store.getState().doc.nodes[id];
      const locked = store.isLocked(id);
      const label =
        node?.meta?.name ||
        store.schemas[node?.type ?? '']?.label ||
        node?.type ||
        'Block';
      const items: ContextMenuItem[] = locked
        ? [
            {
              id: 'unlock',
              label: 'Unlock',
              run: () => store.updateMeta(id, { locked: false }),
            },
          ]
        : [
            {
              id: 'cut',
              label: 'Cut',
              shortcut: 'Mod+X',
              run: () => store.cut(),
            },
            {
              id: 'copy',
              label: 'Copy',
              shortcut: 'Mod+C',
              run: () => store.copy(),
            },
            {
              id: 'paste',
              label: 'Paste',
              shortcut: 'Mod+V',
              disabled: !store.getState().clipboard,
              run: () => store.paste(),
            },
            {
              id: 'duplicate',
              label: 'Duplicate',
              shortcut: 'Mod+D',
              separator: true,
              run: () => store.duplicate([id]),
            },
            {
              id: 'delete',
              label: 'Delete',
              shortcut: 'Del',
              run: () => store.remove([id]),
            },
            {
              id: 'lock',
              label: 'Lock',
              separator: true,
              run: () => store.updateMeta(id, { locked: true }),
            },
          ];
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          { id: 'label', label, disabled: true, run: () => {} },
          ...items,
        ],
      });
    };

    doc.addEventListener('click', onClick, true);
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerdown', onPointerDown);
    doc.addEventListener('pointermove', onMarqueeMove);
    doc.addEventListener('pointerup', onPointerUp);
    doc.addEventListener('contextmenu', onContextMenu);
    doc.documentElement.addEventListener('pointerleave', onLeave);
    doc.addEventListener('submit', onSubmit, true);
    return () => {
      cancelAnimationFrame(pending);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerdown', onPointerDown);
      doc.removeEventListener('pointermove', onMarqueeMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('contextmenu', onContextMenu);
      doc.documentElement?.removeEventListener('pointerleave', onLeave);
      doc.removeEventListener('submit', onSubmit, true);
    };
  }, [frame, frameDoc, store, insertGroups, dragState.active]);

  // "/" opens quick insert at the default position (after the selection, or
  // at the end of the page), matching where a click on the insert panel goes.
  useEffect(() => {
    if (!insertGroups) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || isTypingTarget(event.target)) return;
      event.preventDefault();
      const selectedId = store.getState().selection[0];
      const activeDoc = frameDoc ?? frame?.contentDocument ?? document;
      const rect = selectedId
        ? nodeRect(activeDoc, selectedId)
        : null;
      const point = rect
        ? toViewportPoint({ x: rect.left, y: rect.top + rect.height })
        : { x: window.innerWidth / 2 - 110, y: 120 };
      setQuickInsert({ point });
    };
    const doc = frameDoc ?? frame?.contentDocument;
    window.addEventListener('keydown', onKeyDown);
    doc?.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      doc?.removeEventListener('keydown', onKeyDown);
    };
  }, [frame, frameDoc, store, insertGroups, toViewportPoint]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: width ? 'rgba(127,127,127,.12)' : undefined,
        ...style,
      }}
    >
      <div
        data-device={device}
        style={{
          position: 'relative',
          flex: width ? `0 0 ${width}px` : '1 1 auto',
          minWidth: width ? undefined : DESKTOP_MIN_WIDTH,
          height: '100%',
          boxShadow: width
            ? '0 0 0 1px rgba(127,127,127,.25), 0 8px 24px rgba(0,0,0,.08)'
            : undefined,
          transition: 'flex-basis .2s ease',
        }}
      >
        <CanvasFrame onReady={onReady}>
          <CanvasDocument
            components={components}
            transformProps={transformProps}
            loaded={loaded}
            renderRoot={renderRoot}
            remount={remount}
            onInsertHere={insertGroups ? onInsertHere : undefined}
            stateStyle={stateStyle}
          />
        </CanvasFrame>
        {frame && (
          <CanvasOverlay
            frame={frame}
            frameDoc={frameDoc}
            drag={drag}
            resizeHandles={resizeHandles}
            blockActions={blockActions}
            marquee={marquee}
          />
        )}
        {hoverInsert && !dragState.active && !marquee && (
          // `.ne-ui`: styled by editor-ui in the old chrome too.
          <span className="ne-ui" style={{ display: 'contents' }}>
            <InsertPoint
              x={hoverInsert.point.x}
              y={hoverInsert.point.y}
              label="Insert a block here"
              onClick={event => {
                setQuickInsert({
                  point: { x: event.clientX, y: event.clientY },
                  position: hoverInsert.position,
                });
                setHoverInsert(null);
              }}
            />
          </span>
        )}
      </div>
      {dragState.active && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            cursor: 'grabbing',
          }}
        />
      )}
      {insertGroups && (
        <QuickInsertPopover
          target={quickInsert}
          onClose={() => setQuickInsert(null)}
          groups={insertGroups}
        />
      )}
      <ContextMenu target={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  );
}
