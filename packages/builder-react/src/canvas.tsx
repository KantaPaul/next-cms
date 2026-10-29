/**
 * The editing canvas (R689): the page rendered in an iframe with the host's
 * block components, plus an overlay in the editor page for hover, selection,
 * the block toolbar, and the drop line. Overlays are never part of the block
 * markup, so blocks render exactly as on the published page.
 */

import {
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
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { useEditor, useEditorStore } from './context';
import { NODE_ATTR, nodeRect, SLOT_ATTR, SLOT_NAME_ATTR, SLOT_PARENT_ATTR } from './dom';
import type { DragController } from './drag';
import { useDragState } from './drag';
import type { Rect } from './drop';
import { CanvasFrame } from './frame';
import { type InlinePropsFor, useInlineEditing } from './inline';
import { ResizeHandles, type ResizeHandlesFor } from './resize';

const ACCENT = '#4f46e5';

export type BlockAction = { id: string; label: string; icon: string; run: () => void };
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
  style?: CSSProperties;
};

function EmptySlot({ root }: { root: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: root ? 240 : 72,
        font: '500 12px/1.4 system-ui, sans-serif',
        color: '#6b7280',
        pointerEvents: 'none',
      }}
    >
      {root ? 'Drag a block here, or click one in the block list' : 'Drop blocks here'}
    </div>
  );
}

function renderSlot({ parentId, slot, className, style, empty, children }: SlotRenderArgs) {
  return (
    <div
      {...{ [SLOT_ATTR]: '', [SLOT_PARENT_ATTR]: parentId ?? '', [SLOT_NAME_ATTR]: slot }}
      className={className}
      style={
        empty
          ? { ...style, outline: `1px dashed ${ACCENT}66`, outlineOffset: -4 }
          : style
      }
    >
      {children}
      {empty && <EmptySlot root={parentId === null} />}
    </div>
  );
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
    console.error(`[builder] ${this.props.type} failed to render`, error, info.componentStack);
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
}: Pick<EditorCanvasProps, 'components' | 'transformProps' | 'loaded' | 'renderRoot'> & {
  /** Bumped per block after inline editing, so its DOM is rebuilt by React. */
  remount: Record<NodeId, number>;
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
    renderSlot,
    transformProps: (node, props) => {
      const merged = loaded?.[node.id] ? { ...props, ...loaded[node.id] } : props;
      return transformProps ? transformProps(node, merged) : merged;
    },
  });
  return <>{renderRoot ? renderRoot(content) : content}</>;
}

/** Re-renders when the frame scrolls, resizes, or its content changes size. */
function useFrameLayoutTick(frame: HTMLIFrameElement | null) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const win = frame?.contentWindow;
    const body = frame?.contentDocument?.body;
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
  }, [frame]);
  return tick;
}

const box = (rect: Rect, style: CSSProperties): CSSProperties => ({
  position: 'absolute',
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
  boxSizing: 'border-box',
  pointerEvents: 'none',
  ...style,
});

const buttonStyle: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 4,
  color: '#fff',
  font: '600 13px/1 system-ui, sans-serif',
};

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
  const label = name || ((type && store.schemas[type]?.label) ?? type);
  const above = rect.top >= 30;
  const actions: [string, string, () => void][] = locked
    ? [
        ['Select parent', '↖', () => store.selectParent()],
        ['Unlock', '🔒', () => store.updateMeta(id, { locked: false })],
      ]
    : [
        ['Select parent', '↖', () => store.selectParent()],
        ['Move up', '▲', () => store.nudge(id, -1)],
        ['Move down', '▼', () => store.nudge(id, 1)],
        ['Duplicate', '⧉', () => store.duplicate([id])],
        ['Delete', '✕', () => store.remove([id])],
      ];
  return (
    <div
      role="toolbar"
      aria-label={`${label} actions`}
      style={{
        position: 'absolute',
        left: rect.left,
        top: above ? rect.top - 28 : rect.top + 4,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 4px',
        borderRadius: 6,
        background: ACCENT,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        pointerEvents: 'auto',
        zIndex: 2,
      }}
    >
      {!locked && (
        <button
          type="button"
          aria-label={`Drag ${label}`}
          title="Drag to move"
          style={{ ...buttonStyle, cursor: 'grab' }}
          onPointerDown={event => drag.start({ kind: 'move', id }, event)}
        >
          ⠿
        </button>
      )}
      <span style={{ color: '#fff', font: '600 12px/1 system-ui, sans-serif', padding: '0 6px' }}>
        {label}
      </span>
      {actions.map(([title, icon, run]) => (
        <button key={title} type="button" aria-label={title} title={title} style={buttonStyle} onClick={run}>
          {icon}
        </button>
      ))}
      {node &&
        !locked &&
        blockActions?.(node).map(action => (
          <button key={action.id} type="button" aria-label={action.label} title={action.label} style={buttonStyle} onClick={action.run}>
            {action.icon}
          </button>
        ))}
    </div>
  );
}

function CanvasOverlay({
  frame,
  drag,
  resizeHandles,
  blockActions,
}: {
  frame: HTMLIFrameElement;
  drag: DragController;
  resizeHandles?: ResizeHandlesFor;
  blockActions?: BlockActionsFor;
}) {
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const hovered = useEditor(state => state.hovered);
  const dragState = useDragState(drag);
  const tick = useFrameLayoutTick(frame);
  const [rects, setRects] = useState<{ hovered: Rect | null; selected: [NodeId, Rect][] }>({
    hovered: null,
    selected: [],
  });

  // Measure after each commit, once the frame shows the new document.
  useLayoutEffect(() => {
    const frameDoc = frame.contentDocument;
    if (!frameDoc) return;
    setRects({
      hovered: hovered && !selection.includes(hovered) ? nodeRect(frameDoc, hovered) : null,
      selected: selection.flatMap(id => {
        const rect = nodeRect(frameDoc, id);
        return rect ? [[id, rect] as [NodeId, Rect]] : [];
      }),
    });
  }, [frame, doc, selection, hovered, tick]);

  const primary = rects.selected[0];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {rects.hovered && !dragState.active && (
        <div style={box(rects.hovered, { border: `1px dashed ${ACCENT}` })} />
      )}
      {rects.selected.map(([id, rect]) => (
        <div key={id} style={box(rect, { border: `2px solid ${ACCENT}` })} />
      ))}
      {primary && !dragState.active && (
        <Toolbar id={primary[0]} rect={primary[1]} drag={drag} blockActions={blockActions} />
      )}
      {primary && !dragState.active && resizeHandles && rects.selected.length === 1 && (
        <ResizeHandles id={primary[0]} rect={primary[1]} frame={frame} handlesFor={resizeHandles} />
      )}
      {dragState.active && dragState.target && (
        <>
          <div style={box(dragState.target.slot, { background: `${ACCENT}0f`, border: `1px solid ${ACCENT}55` })} />
          <div style={box(dragState.target.line, { background: ACCENT, borderRadius: 2 })} />
        </>
      )}
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
  style,
}: EditorCanvasProps) {
  const store = useEditorStore();
  const [remount, setRemount] = useState<Record<NodeId, number>>({});
  const dragState = useDragState(drag);
  const device = useEditor(state => state.device);
  const width = { ...DEVICE_WIDTHS, ...deviceWidths }[device];
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);

  const onReady = useCallback(
    (next: HTMLIFrameElement) => {
      setFrame(next);
      drag.setFrame(next);
      onFrame?.(next);
    },
    [drag, onFrame]
  );

  const onInlineDone = useCallback(
    (id: NodeId) => setRemount(current => ({ ...current, [id]: (current[id] ?? 0) + 1 })),
    []
  );
  useInlineEditing({ frame, store, inlineProps, onDone: onInlineDone });

  useEffect(() => {
    const doc = frame?.contentDocument;
    if (!doc) return;
    const nodeAt = (target: EventTarget | null) =>
      (target as Element | null)?.closest?.(`[${NODE_ATTR}]`)?.getAttribute(NODE_ATTR) ?? null;
    const onClick = (event: MouseEvent) => {
      // Links and buttons inside blocks must not navigate or submit while editing.
      if ((event.target as Element | null)?.closest?.('a, button, [role="button"]')) {
        event.preventDefault();
      }
      // A locked block is not selectable on the canvas; its nearest unlocked parent is.
      let element = (event.target as Element | null)?.closest?.(`[${NODE_ATTR}]`) ?? null;
      while (element && store.isLocked(element.getAttribute(NODE_ATTR) ?? '')) {
        element = element.parentElement?.closest(`[${NODE_ATTR}]`) ?? null;
      }
      store.select(element?.getAttribute(NODE_ATTR) ?? null, {
        additive: event.shiftKey || event.metaKey,
      });
    };
    let pending = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => store.hover(nodeAt(event.target)));
    };
    const onLeave = () => store.hover(null);
    const onSubmit = (event: Event) => event.preventDefault();
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('pointermove', onMove);
    doc.documentElement.addEventListener('pointerleave', onLeave);
    doc.addEventListener('submit', onSubmit, true);
    return () => {
      cancelAnimationFrame(pending);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('pointermove', onMove);
      doc.documentElement.removeEventListener('pointerleave', onLeave);
      doc.removeEventListener('submit', onSubmit, true);
    };
  }, [frame, store]);

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
          boxShadow: width ? '0 0 0 1px rgba(127,127,127,.25), 0 8px 24px rgba(0,0,0,.08)' : undefined,
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
          />
        </CanvasFrame>
        {frame && (
          <CanvasOverlay frame={frame} drag={drag} resizeHandles={resizeHandles} blockActions={blockActions} />
        )}
      </div>
      {dragState.active && (
        <div
          aria-hidden
          style={{ position: 'fixed', inset: 0, zIndex: 2147483647, cursor: 'grabbing' }}
        />
      )}
    </div>
  );
}
