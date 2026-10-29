/**
 * Right-click menu on a selected block (R720 / UXE-10): the same actions as
 * the floating toolbar, plus copy, cut, and paste, each with its shortcut.
 */

import { type CSSProperties, useEffect, useRef } from 'react';

export type ContextMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  /** Draws a separator above this item. */
  separator?: boolean;
  run: () => void;
};

export type ContextMenuTarget = {
  x: number;
  y: number;
  items: ContextMenuItem[];
};

export function ContextMenu({
  target,
  onClose,
}: {
  target: ContextMenuTarget | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const left = Math.min(target.x, window.innerWidth - 200);
  const top = Math.min(
    target.y,
    window.innerHeight - target.items.length * 30 - 16
  );

  const style: CSSProperties = {
    position: 'fixed',
    left,
    top,
    minWidth: 180,
    padding: 4,
    background: '#1c1c1f',
    color: '#fff',
    borderRadius: 8,
    boxShadow: '0 12px 32px rgba(0,0,0,.35)',
    zIndex: 2147483647,
    font: '13px/1.4 system-ui, sans-serif',
  };

  return (
    <>
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: closes on outside click (including over the canvas iframe); Escape is the keyboard path */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: same as above */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 2147483646 }}
        onClick={onClose}
        onContextMenu={event => {
          event.preventDefault();
          onClose();
        }}
      />
      <div ref={ref} role="menu" aria-label="Block actions" style={style}>
        {target.items.map(item => (
          <div key={item.id}>
            {item.separator && (
              <div
                style={{
                  height: 1,
                  margin: '4px 2px',
                  background: 'rgba(255,255,255,.1)',
                }}
              />
            )}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.run();
                onClose();
              }}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
                padding: '6px 10px',
                borderRadius: 5,
                cursor: item.disabled ? 'default' : 'pointer',
                opacity: item.disabled ? 0.4 : 1,
              }}
              onMouseEnter={event => {
                if (!item.disabled)
                  event.currentTarget.style.background = 'rgba(79,70,229,.3)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span
                  style={{
                    opacity: 0.5,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
                >
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
