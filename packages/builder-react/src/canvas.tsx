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
  type DynamicContext,
  isDynamicBinding,
  type NodeId,
  type RenderOptions,
  renderDocument,
  resolveDynamicValue,
  slotChildren,
  type SlotRenderArgs,
} from '@nextcms/builder-core';
import {
  Component,
  type CSSProperties,
  type ErrorInfo,
  isValidElement,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  Globe,
  GripVertical,
  Group,
  LayoutTemplate,
  Lock,
  LockOpen,
  Move,
  Sparkles,
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
  contentsRect,
  hoverInsertTarget,
  NODE_ATTR,
  nodeElement,
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
import { PartReorderOverlay } from './part-reorder';
import { ResizeHandles, type ResizeHandlesFor } from './resize';
import {
  copyBlockStyle,
  getCopiedBlockStyles,
  hasCopiedBlockStyles,
  inspectBlock,
  pasteBlockStyle,
  resetBlockToDefaults,
} from './style-clipboard';

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
  desktop: 1400,
  tablet: 768,
  mobile: 375,
};

/**
 * Desktop never renders narrower than the desktop breakpoint, so the page's
 * media queries match the device being edited; small windows scroll instead.
 */
export const DESKTOP_MIN_WIDTH = 1400;

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
  /** Data for previewing dynamic bindings (R416); unresolved ones show `{source.path}`. */
  dynamicContext?: DynamicContext;
  /** When true, hides editing overlays (selection box, hover box, floating toolbar, etc.) for live preview. */
  isPreview?: boolean;
  /** Address displayed in the browser-style frame header. */
  previewAddress?: string;
  style?: CSSProperties;
};

/**
 * Resolves dynamic bindings for the canvas, at any depth (repeater items too),
 * so a block never receives a raw `{ $dynamic }` object as a React child.
 */
function previewDynamic(value: unknown, context: DynamicContext): unknown {
  if (isDynamicBinding(value)) {
    const resolved = resolveDynamicValue(value, context);
    return resolved === '' || resolved == null
      ? `{${value.$dynamic}${value.path ? `.${value.path}` : ''}}`
      : resolved;
  }
  if (Array.isArray(value)) return value.map(v => previewDynamic(v, context));
  if (value && typeof value === 'object' && !isValidElement(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, previewDynamic(v, context)])
    );
  }
  return value;
}

function EmptySlot({
  root,
  onInsert,
  onAddHero,
}: {
  root: boolean;
  /** Opens the quick-insert popover anchored on this empty slot (R713, R721). */
  onInsert?: (event: ReactMouseEvent) => void;
  onAddHero?: () => void;
}) {
  if (root) {
    return (
      <div
        data-empty-page
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          textAlign: 'center',
          minHeight: 400,
          gap: 16,
          font: '500 13px/1.4 system-ui, sans-serif',
          color: '#64748b',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ACCENT,
            marginBottom: 2,
          }}
        >
          <LayoutTemplate size={20} />
        </div>
        <div style={{ maxWidth: 360 }}>
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: 16,
              fontWeight: 600,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            Start building your page
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            Drag a block here, or click one in the block list, or start with a hero section.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {onAddHero && (
            <button
              type="button"
              aria-label="Add Hero Section"
              title="Add Hero Section"
              onClick={onAddHero}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                backgroundColor: ACCENT,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <Sparkles size={14} />
              <span>Add Hero Section</span>
            </button>
          )}
          {onInsert && (
            <button
              type="button"
              aria-label="Insert a block here"
              title="Insert a block here"
              onClick={onInsert}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#334155',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span>+ Browse Blocks</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        // Fill the slot even when it lays out as a flex row or a grid.
        flex: '1 1 auto',
        alignSelf: 'stretch',
        gridColumn: '1 / -1',
        minHeight: 72,
        font: '500 12px/1.4 system-ui, sans-serif',
        color: '#6b7280',
      }}
    >
      <span aria-hidden style={{ pointerEvents: 'none' }}>
        Drop blocks here
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
  ) => void,
  onAddHero?: () => void
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
            onAddHero={onAddHero}
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
  dynamicContext,
}: Pick<
  EditorCanvasProps,
  'components' | 'transformProps' | 'loaded' | 'renderRoot' | 'dynamicContext'
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
  const store = useEditorStore();
  const onAddHero = () => {
    const heroType =
      Object.keys(store.schemas).find(k => k.toLowerCase() === 'hero') || 'Hero';
    if (store.schemas[heroType]) {
      store.insertBlock(heroType);
    } else {
      const first = Object.keys(store.schemas)[0];
      if (first) store.insertBlock(first);
    }
  };
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
    renderSlot: makeRenderSlot(onInsertHere, onAddHero),
    transformProps: (node, rawProps) => {
      const props = previewDynamic(rawProps, dynamicContext ?? {}) as Record<
        string,
        unknown
      >;
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
  bounds,
  anchorRight,
  anchorBottom,
  placement,
  onRectChange,
  drag,
  blockActions,
  onEnterMoveMode,
}: {
  id: NodeId;
  rect: Rect;
  bounds?: { left: number; right: number; top?: number; bottom?: number };
  anchorRight?: number;
  anchorBottom?: number;
  placement?: 'above' | 'below' | 'inside-bottom';
  onRectChange?: (rect: Rect) => void;
  drag: DragController;
  blockActions?: BlockActionsFor;
  onEnterMoveMode?: () => void;
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
        ...(onEnterMoveMode
          ? [
              {
                id: 'move',
                label: 'Move with arrow keys',
                shortcut: 'Enter',
                icon: <Move className={icon} />,
                onClick: onEnterMoveMode,
              },
            ]
          : []),
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
        {
          id: 'lock',
          label: 'Lock',
          icon: <Lock className={icon} />,
          onClick: () => store.updateMeta(id, { locked: true }),
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
      bounds={bounds}
      anchorRight={anchorRight}
      anchorBottom={anchorBottom}
      placement={placement ?? (rect.top >= 34 ? 'above' : 'below')}
      onRectChange={onRectChange}
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
function MultiSelectToolbar({
  ids,
  rect,
  bounds,
  anchorRight,
  anchorBottom,
  placement,
  onRectChange,
}: {
  ids: NodeId[];
  rect: Rect;
  bounds?: { left: number; right: number; top?: number; bottom?: number };
  anchorRight?: number;
  anchorBottom?: number;
  placement?: 'above' | 'below' | 'inside-bottom';
  onRectChange?: (rect: Rect) => void;
}) {
  const store = useEditorStore();
  const canGroup =
    !!store.schemas.Container?.slots &&
    Object.keys(store.schemas.Container.slots ?? {}).length > 0;
  const icon = 'h-3.5 w-3.5';
  return (
    <FloatingToolbar
      top={rect.top}
      left={rect.left}
      bounds={bounds}
      anchorRight={anchorRight}
      anchorBottom={anchorBottom}
      placement={placement ?? (rect.top >= 34 ? 'above' : 'below')}
      onRectChange={onRectChange}
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
function dropLineProps(line: Rect, noop?: boolean, tooltip?: string) {
  const horizontal = line.width >= line.height;
  return {
    orientation: horizontal ? ('horizontal' as const) : ('vertical' as const),
    position: {
      top: horizontal ? line.top + line.height / 2 - 2 : line.top,
      left: horizontal ? line.left : line.left + line.width / 2 - 2,
      length: horizontal ? line.width : line.height,
    },
    noop,
    tooltip,
  };
}

function CanvasOverlay({
  frame,
  frameDoc,
  drag,
  resizeHandles,
  blockActions,
  marquee,
  isMoveMode = false,
  onEnterMoveMode,
  onChromeRectsChange,
}: {
  frame: HTMLIFrameElement;
  frameDoc?: Document | null;
  drag: DragController;
  resizeHandles?: ResizeHandlesFor;
  blockActions?: BlockActionsFor;
  /** The drag-select rectangle in progress, if any (R719). */
  marquee: Rect | null;
  isMoveMode?: boolean;
  onEnterMoveMode?: () => void;
  onChromeRectsChange?: (rects: Rect[]) => void;
}) {
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const hovered = useEditor(state => state.hovered);
  const dragState = useDragState(drag);
  const tick = useFrameLayoutTick(frame, frameDoc);
  // Blocks that weren't in the document last render (insert, paste,
  // duplicate) glow once when selected. Nothing glows on first load.
  const seenNodes = useRef<Set<string> | null>(null);
  const freshNodes = useMemo(() => {
    const seen = seenNodes.current;
    return new Set(seen ? Object.keys(doc.nodes).filter(id => !seen.has(id)) : []);
  }, [doc.nodes]);
  useEffect(() => {
    seenNodes.current = new Set(Object.keys(doc.nodes));
  }, [doc.nodes]);
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
  const [overlayBounds, setOverlayBounds] = useState<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>({ left: 0, right: 10000, top: 0, bottom: 10000 });
  const [toolbarBox, setToolbarBox] = useState<Rect | null>(null);

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
      const oRect = overlay.getBoundingClientRect();
      const cRect = clip.getBoundingClientRect();
      const vLeft = Math.max(0, cRect.left - oRect.left);
      const vRight = cRect.right - oRect.left;
      const vTop = Math.max(0, cRect.top - oRect.top);
      const vBottom = cRect.bottom - oRect.top;
      setVisibleLeft(vLeft);
      setOverlayBounds({
        left: vLeft,
        right: vRight,
        top: vTop,
        bottom: vBottom,
      });
    }
  }, [frame, frameDoc, doc, selection, hovered, tick]);

  const primary = rects.selected[0];
  const multi = rects.selected.length > 1;
  const groupRect = multi
    ? unionRect(rects.selected.map(([, rect]) => rect))
    : null;

  useLayoutEffect(() => {
    const avoidRects: Rect[] = [];
    if (primary) {
      const [, pRect] = primary;
      avoidRects.push({
        left: pRect.left + pRect.width / 2 - 14,
        top: pRect.top + pRect.height - 12,
        width: 28,
        height: 10,
      });
    }
    if (toolbarBox && !dragState.active) {
      avoidRects.push(toolbarBox);
    }
    onChromeRectsChange?.(avoidRects);
  }, [primary, toolbarBox, dragState.active, onChromeRectsChange]);

  const dropTooltip = useMemo(() => {
    if (!dragState.target) return undefined;
    const { position, noop } = dragState.target;
    if (noop) return undefined;
    const children = slotChildren(doc, position);
    if (children.length === 0) return 'Drop here';
    if (position.index < children.length) {
      return `Insert above ${labelOf(children[position.index])}`;
    }
    const last = children[children.length - 1];
    return `Insert below ${labelOf(last)}`;
  }, [dragState.target, doc]);

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
      {rects.selected.map(([id, rect], index) => {
        const isMovingSource =
          dragState.active &&
          dragState.payload?.kind === 'move' &&
          dragState.payload.id === id;
        return (
          <SelectionBox
            // Keyed by slot, not block, so one box glides to the next block
            // you select instead of a new box appearing there.
            key={index}
            className={freshNodes.has(id) ? 'ne-insert-glow' : undefined}
            bounds={rect}
            label={labelOf(id)}
            showHandles={
              !doc.nodes[id]?.meta?.locked && !isMoveMode && !isMovingSource
            }
            locked={!!doc.nodes[id]?.meta?.locked}
            isMoveMode={isMoveMode && id === primary?.[0]}
            isDragging={isMovingSource}
            hideLabel={
              (!multi && !dragState.active && id === primary?.[0]) ||
              isMovingSource
            }
          />
        );
      })}
      {primary && !multi && !dragState.active && (
        <Toolbar
          key={primary[0]}
          id={primary[0]}
          rect={inView(primary[1])}
          bounds={overlayBounds}
          anchorRight={primary[1].left + primary[1].width}
          anchorBottom={primary[1].top + primary[1].height}
          placement={
            primary[1].height > (overlayBounds.bottom - overlayBounds.top) &&
            primary[1].top < overlayBounds.top
              ? 'inside-bottom'
              : primary[1].top >= 34
                ? 'above'
                : 'below'
          }
          onRectChange={setToolbarBox}
          drag={drag}
          blockActions={blockActions}
          onEnterMoveMode={onEnterMoveMode}
        />
      )}
      {groupRect && !dragState.active && (
        <MultiSelectToolbar
          ids={rects.selected.map(([id]) => id)}
          rect={inView(groupRect)}
          bounds={overlayBounds}
          anchorRight={groupRect.left + groupRect.width}
          anchorBottom={groupRect.top + groupRect.height}
          onRectChange={setToolbarBox}
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
      {primary &&
        !multi &&
        !dragState.active &&
        !doc.nodes[primary[0]]?.meta?.locked &&
        store.schemas[doc.nodes[primary[0]]?.type ?? '']?.reorder && (
          <PartReorderOverlay
            id={primary[0]}
            reorder={store.schemas[doc.nodes[primary[0]]!.type]!.reorder!}
            frame={frame}
            frameDoc={frameDoc}
            tick={tick}
            bounds={overlayBounds}
          />
        )}
      {dragState.active && dragState.target && (
        <>
          <DropZone bounds={dragState.target.slot} />
          <DropLine
            {...dropLineProps(
              dragState.target.line,
              dragState.target.noop,
              dropTooltip
            )}
          />
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
  dynamicContext,
  isPreview = false,
  previewAddress = 'preview.site.local/home',
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
    line?: { left: number; width: number };
  } | null>(null);
  const chromeRectsRef = useRef<Rect[]>([]);
  const isOverInsertRef = useRef(false);
  const [quickInsert, setQuickInsert] = useState<QuickInsertTarget | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(
    null
  );

  const resizing = useEditor(state => state.resizing);
  const dragGhostLabel = useMemo(() => {
    if (!dragState.payload) return '';
    if (dragState.payload.kind === 'new') {
      return (
        store.schemas[dragState.payload.type]?.label || dragState.payload.type
      );
    }
    const node = store.getState().doc.nodes[dragState.payload.id];
    return (
      node?.meta?.name ||
      store.schemas[node?.type ?? '']?.label ||
      node?.type ||
      'Block'
    );
  }, [dragState.payload, store]);

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
      if (isPreview) return;
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
      if (isPreview) return;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        store.hover(nodeAt(event.target));
        if (
          insertGroups &&
          !dragState.active &&
          !marqueeRef.current &&
          !store.getState().resizing
        ) {
          const hit = hoverInsertTarget(
            doc,
            {
              x: event.clientX,
              y: event.clientY,
            },
            10,
            chromeRectsRef.current
          );

          let validHit = hit;
          const currentSelection = store.getState().selection;
          if (validHit && currentSelection.length === 1) {
            const selId = currentSelection[0];
            const isInsideSelBlock = validHit.position.parentId === selId;
            const selEl = nodeElement(doc, selId);
            if (isInsideSelBlock && selEl) {
              const el = selEl.firstElementChild ?? selEl;
              const view = doc.defaultView;
              const style = view ? view.getComputedStyle(el) : null;
              const padTop = style ? parseFloat(style.paddingTop) || 0 : 0;
              const padBottom = style ? parseFloat(style.paddingBottom) || 0 : 0;
              const selRect = contentsRect(selEl);
              if (selRect) {
                const by = validHit.buttonPoint.y;
                const insideBottomPad =
                  padBottom > 0 &&
                  by > selRect.top + selRect.height - padBottom + 2 &&
                  by < selRect.top + selRect.height - 2;
                const insideTopPad =
                  padTop > 0 &&
                  by > selRect.top + 2 &&
                  by < selRect.top + padTop - 2;
                if (insideBottomPad || insideTopPad) {
                  validHit = null;
                }
              }
            }
          }

          const nextInsert = validHit
            ? {
                point: validHit.buttonPoint,
                position: validHit.position,
                line: validHit.line,
              }
            : null;

          setHoverInsert(prev => {
            if (!nextInsert && !prev) return null;
            if (!nextInsert || !prev) return nextInsert;
            if (
              prev.position.parentId === nextInsert.position.parentId &&
              prev.position.slot === nextInsert.position.slot &&
              prev.position.index === nextInsert.position.index &&
              Math.abs(prev.point.x - nextInsert.point.x) < 1 &&
              Math.abs(prev.point.y - nextInsert.point.y) < 1 &&
              prev.line?.left === nextInsert.line?.left &&
              prev.line?.width === nextInsert.line?.width
            ) {
              return prev;
            }
            return nextInsert;
          });
        } else {
          setHoverInsert(null);
        }
      });
    };
    const onLeave = (event: PointerEvent) => {
      if (isOverInsertRef.current) return;
      const box = frame?.getBoundingClientRect();
      if (box && event) {
        const clientX = event.clientX + box.left;
        const clientY = event.clientY + box.top;
        if (
          clientX >= box.left &&
          clientX <= box.right &&
          clientY >= box.top &&
          clientY <= box.bottom
        ) {
          return;
        }
      }
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
              run: () => store.duplicate([id]),
            },
            {
              id: 'move-up',
              label: 'Move Up',
              shortcut: '⌥↑',
              run: () => store.nudge(id, -1),
            },
            {
              id: 'move-down',
              label: 'Move Down',
              shortcut: '⌥↓',
              run: () => store.nudge(id, 1),
            },
            {
              id: 'copy-style',
              label: 'Copy Style',
              shortcut: '⌥⌘C',
              separator: true,
              run: () => copyBlockStyle(store, id),
            },
            {
              id: 'paste-style',
              label: 'Paste Style',
              shortcut: '⌥⌘V',
              disabled: !hasCopiedBlockStyles(),
              run: () => pasteBlockStyle(store, id),
            },
            {
              id: 'reset-defaults',
              label: 'Reset to Defaults',
              run: () => resetBlockToDefaults(store, id),
            },
            {
              id: 'inspect',
              label: 'Inspect',
              shortcut: '⌥I',
              separator: true,
              run: () => inspectBlock(store, id),
            },
            {
              id: 'delete',
              label: 'Delete',
              shortcut: 'Del',
              separator: true,
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

  // Keyboard move mode: "Enter" toggles move mode when a single unlocked block is selected.
  // In move mode, ArrowUp/ArrowDown moves the block; Enter confirms; Escape cancels.
  const [isMoveMode, setIsMoveMode] = useState(false);
  useEffect(() => {
    if (isPreview) {
      if (isMoveMode) setIsMoveMode(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const selection = store.getState().selection;
      if (isTypingTarget(event.target)) return;
      if (selection.length !== 1) {
        if (isMoveMode) setIsMoveMode(false);
        return;
      }
      const id = selection[0];
      const isLocked = store.isLocked(id);
      if (isLocked) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        setIsMoveMode(prev => !prev);
      } else if (event.key === 'Escape' && isMoveMode) {
        event.preventDefault();
        setIsMoveMode(false);
      } else if (isMoveMode) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          store.nudge(id, -1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          store.nudge(id, 1);
        }
      }
    };
    const doc = frameDoc ?? frame?.contentDocument;
    window.addEventListener('keydown', onKeyDown);
    doc?.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      doc?.removeEventListener('keydown', onKeyDown);
    };
  }, [frame, frameDoc, store, isMoveMode, isPreview]);

  return (
    <div
      data-testid="canvas-container"
      className="ne-canvas-bg"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'auto',
        boxSizing: 'border-box',
        padding: '24px 16px',
        ...style,
      }}
    >
      {/* Browser-style frame wrapping the page */}
      <div
        data-testid="browser-frame"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: width ? `${width}px` : '100%',
          maxWidth: width ? `${width}px` : undefined,
          minWidth: width ? undefined : DESKTOP_MIN_WIDTH,
          borderRadius: 12,
          border: '1px solid var(--ne-border, #e2e8f0)',
          backgroundColor: '#ffffff',
          boxShadow:
            '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          // The page visibly narrows or widens on a device switch. Off while
          // dragging, so drop targets never move under the pointer. The
          // editor's motion level and reduced motion override this.
          transition: dragState.active
            ? 'none'
            : 'width var(--ne-duration-slow, .32s) var(--ne-ease-out, ease), max-width var(--ne-duration-slow, .32s) var(--ne-ease-out, ease)',
          flex: width ? '0 0 auto' : '1 1 auto',
          minHeight: '700px',
        }}
      >
        {/* Browser frame header bar */}
        <div
          data-testid="browser-frame-header"
          style={{
            display: 'flex',
            height: 38,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--ne-border, #e2e8f0)',
            backgroundColor: 'var(--ne-surface-subtle, #f8fafc)',
            padding: '0 12px',
            userSelect: 'none',
          }}
        >
          {/* Three dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 64 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#ff5f56',
                border: '1px solid #e0443e',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#ffbd2e',
                border: '1px solid #dea123',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#27c93f',
                border: '1px solid #1aab29',
                display: 'inline-block',
              }}
            />
          </div>

          {/* Address Bar */}
          <div
            style={{
              display: 'flex',
              flex: '1 1 auto',
              maxWidth: 360,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 6,
              border: '1px solid var(--ne-border, #e2e8f0)',
              backgroundColor: 'var(--ne-surface, #ffffff)',
              padding: '2px 10px',
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--ne-text-muted, #64748b)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>🔒</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {previewAddress}
            </span>
          </div>

          {/* Device Label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: 64,
            }}
          >
            <span
              key={device}
              className="ne-motion-enter-up"
              style={{
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--ne-text-muted, #64748b)',
                backgroundColor: 'var(--ne-surface, #ffffff)',
                border: '1px solid var(--ne-border, #e2e8f0)',
              }}
            >
              {device.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Page canvas iframe body */}
        <div
          data-device={device}
          onPointerLeave={() => {
            isOverInsertRef.current = false;
            setHoverInsert(null);
          }}
          style={{
            position: 'relative',
            width: '100%',
            flex: '1 1 auto',
            minHeight: '660px',
            backgroundColor: '#ffffff',
          }}
        >
          <CanvasFrame onReady={onReady}>
            <CanvasDocument
              components={components}
              transformProps={transformProps}
              loaded={loaded}
              renderRoot={renderRoot}
              remount={remount}
              onInsertHere={onInsertHere}
              stateStyle={stateStyle}
              dynamicContext={dynamicContext}
            />
          </CanvasFrame>
          {frame && !isPreview && (
            <CanvasOverlay
              frame={frame}
              frameDoc={frameDoc}
              drag={drag}
              resizeHandles={resizeHandles}
              blockActions={blockActions}
              marquee={marquee}
              isMoveMode={isMoveMode}
              onEnterMoveMode={() => setIsMoveMode(true)}
              onChromeRectsChange={rects => {
                chromeRectsRef.current = rects;
              }}
            />
          )}
          {hoverInsert &&
            !dragState.active &&
            !marquee &&
            !resizing &&
            !isPreview && (
              // `.ne-ui`: styled by editor-ui in the old chrome too.
              <span
                className="ne-ui"
                style={{ display: 'contents' }}
                onPointerEnter={() => {
                  isOverInsertRef.current = true;
                }}
                onPointerLeave={() => {
                  isOverInsertRef.current = false;
                }}
              >
                <InsertPoint
                  x={hoverInsert.point.x}
                  y={hoverInsert.point.y}
                  line={hoverInsert.line}
                  label="Insert a block here"
                  onMouseEnter={() => {
                    isOverInsertRef.current = true;
                  }}
                  onMouseLeave={() => {
                    isOverInsertRef.current = false;
                  }}
                  onClick={event => {
                    isOverInsertRef.current = false;
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
        >
          {dragState.pointer && (
            <div
              style={{
                position: 'fixed',
                left: dragState.pointer.x + 12,
                top: dragState.pointer.y + 12,
                pointerEvents: 'none',
              }}
              className="flex items-center gap-1.5 rounded-full border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ne-text)] shadow-lg"
            >
              <GripVertical className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span className="truncate max-w-[140px]">{dragGhostLabel}</span>
            </div>
          )}
        </div>
      )}
      {!isPreview && (
        <QuickInsertPopover
          target={quickInsert}
          onClose={() => setQuickInsert(null)}
          groups={insertGroups}
        />
      )}
      {!isPreview && (
        <ContextMenu target={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
