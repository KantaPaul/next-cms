/**
 * Quick insert (R713 / UXE-03): a small searchable popover for placing one
 * block at a specific position — opened from the "+" shown between blocks on
 * hover, or by pressing "/" anywhere the page itself is focused (not inside a
 * field or inline text edit).
 */

import type { SlotPosition } from '@nextcms/builder-core';
import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BlockGroup } from './block-list';
import { useEditorStore } from './context';

export type QuickInsertTarget = {
  /** Screen point to anchor the popover near (the `+` button, or the caret). */
  point: { x: number; y: number };
  /** Where the chosen block goes; omit to use the editor's default position. */
  position?: SlotPosition;
};

export function QuickInsertPopover({
  target,
  onClose,
  groups,
}: {
  target: QuickInsertTarget | null;
  onClose: () => void;
  groups: BlockGroup[];
}) {
  const store = useEditorStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (target) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [target]);

  const types = useMemo(() => {
    const all = groups.flatMap(group => group.types);
    const q = query.toLowerCase();
    return q
      ? all.filter(type =>
          (store.schemas[type]?.label ?? type).toLowerCase().includes(q)
        )
      : all;
  }, [groups, query, store]);

  useEffect(() => setActive(0), [types.length === 0]);

  if (!target) return null;

  const insert = (type: string | undefined) => {
    if (!type) return;
    store.insertBlock(type, target.position);
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(i => Math.min(i + 1, types.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      insert(types[active]);
    }
  };

  // Clamp so the popover stays on screen near the click point.
  const left = Math.min(target.point.x, window.innerWidth - 240);
  const top = Math.min(target.point.y, window.innerHeight - 300);

  const style: CSSProperties = {
    position: 'fixed',
    left,
    top,
    width: 220,
    maxHeight: 260,
    display: 'flex',
    flexDirection: 'column',
    background: '#1c1c1f',
    color: '#fff',
    borderRadius: 8,
    boxShadow: '0 12px 32px rgba(0,0,0,.35)',
    zIndex: 2147483647,
    font: '13px/1.4 system-ui, sans-serif',
    overflow: 'hidden',
  };

  return (
    <>
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: closes on outside click; Escape is the keyboard path */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: same as above */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Insert a block"
        style={style}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Insert a block…"
          aria-label="Search blocks"
          style={{
            all: 'unset',
            boxSizing: 'border-box',
            width: '100%',
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,.1)',
          }}
        />
        <div
          role="listbox"
          aria-label="Blocks"
          style={{ overflowY: 'auto', padding: 4 }}
        >
          {types.length === 0 && (
            <p style={{ margin: 0, padding: '8px 8px', opacity: 0.6 }}>
              No matches.
            </p>
          )}
          {types.map((type, index) => (
            <button
              key={type}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => insert(type)}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                display: 'block',
                width: '100%',
                padding: '6px 8px',
                borderRadius: 5,
                cursor: 'pointer',
                background:
                  index === active ? 'rgba(79,70,229,.3)' : 'transparent',
              }}
            >
              {store.schemas[type]?.label ?? type}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
