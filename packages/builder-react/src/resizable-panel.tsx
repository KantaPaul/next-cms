/**
 * A resizable, collapsible side panel (R711 / UXE-01). Width is dragged from
 * the inner edge and remembered per browser under `storageKey`; a header
 * button collapses it to a thin strip. Focus mode (hiding every panel) is
 * the host's concern — it just stops rendering panels — so this component
 * only needs to handle one panel's own size and collapse state.
 */

import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

export type ResizablePanelProps = {
  side: 'left' | 'right';
  title: string;
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** localStorage key for the remembered width and collapsed state; omit to not persist. */
  storageKey?: string;
  style?: CSSProperties;
};

function readStored(
  key: string | undefined,
  fallback: { width: number; collapsed: boolean }
) {
  if (!key || typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      width: typeof parsed.width === 'number' ? parsed.width : fallback.width,
      collapsed: !!parsed.collapsed,
    };
  } catch {
    return fallback;
  }
}

export function ResizablePanel({
  side,
  title,
  children,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 480,
  storageKey,
  style,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  // Read localStorage after mount so the server-rendered HTML and the first
  // client render agree (R711) — reading it during render causes hydration
  // attribute mismatches.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = readStored(storageKey, { width: defaultWidth, collapsed: false });
    setWidth(stored.width);
    setCollapsed(stored.collapsed);
    setHydrated(true);
  }, [storageKey, defaultWidth]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
    } catch {
      // Private browsing or a full quota; the panel still works this session.
    }
  }, [storageKey, width, collapsed, hydrated]);

  const onHandleDown = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      const onMove = (move: PointerEvent) => {
        const delta =
          side === 'left' ? move.clientX - startX : startX - move.clientX;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [side, width, minWidth, maxWidth]
  );

  const handleStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    [side === 'left' ? 'right' : 'left']: -3,
    width: 6,
    cursor: 'ew-resize',
    touchAction: 'none',
    zIndex: 1,
  };

  if (collapsed) {
    return (
      <div
        style={{
          width: 32,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          borderInline: '1px solid rgba(127,127,127,.2)',
          ...style,
        }}
      >
        <button
          type="button"
          aria-label={`Expand ${title}`}
          title={`Expand ${title}`}
          onClick={() => setCollapsed(false)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: 6,
            writingMode: 'vertical-rl',
            font: '11px/1.4 system-ui, sans-serif',
          }}
        >
          {title}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, flexShrink: 0, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px 6px',
        }}
      >
        <span
          style={{
            font: '600 11px/1.4 system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            opacity: 0.6,
          }}
        >
          {title}
        </span>
        <button
          type="button"
          aria-label={`Collapse ${title}`}
          title={`Collapse ${title}`}
          onClick={() => setCollapsed(true)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '2px 4px',
            opacity: 0.6,
            font: '12px/1 system-ui, sans-serif',
          }}
        >
          {side === 'left' ? '«' : '»'}
        </button>
      </div>
      <div style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}>
        {children}
      </div>
      <div aria-hidden style={handleStyle} onPointerDown={onHandleDown} />
    </div>
  );
}
