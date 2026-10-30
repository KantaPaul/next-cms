/**
 * History panel (R726 / UXE-16): lists undo/redo steps you can jump back to,
 * shows autosave status, and offers recovery of unsaved work after a crash or
 * closed tab. Receives the save queue for save status and local-copy recovery.
 */

import { type CSSProperties, useEffect, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import type { SaveQueue, SaveState } from './save';

export function HistoryPanel({ queue }: { queue: SaveQueue }) {
  const store = useEditorStore();
  const history = useEditor(state => state.history);
  const saveState = useEditor(() => queue.getState());
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const isDirty = store.isDirty();
  const [localCopy, setLocalCopy] = useState<{ at: number } | null>(null);

  useEffect(() => {
    queue.readLocalCopy().then(copy => {
      if (copy) setLocalCopy({ at: copy.at });
    });
  }, [queue]);

  const steps = history.past.slice().reverse();

  return (
    <div style={{ display: 'grid', gap: 10, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>History</div>

      {/* Autosave status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(127,127,127,.06)', border: '1px solid rgba(127,127,127,.15)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isDirty ? '#f59e0b' : '#22c55e' }} />
        <span style={{ font: '13px/1.4 system-ui, sans-serif' }}>
          {isDirty ? 'Unsaved changes' : 'All saved'}
        </span>
        {saveState.savedAt && (
          <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6, marginLeft: 6 }}>
            Saved {relativeTime(saveState.savedAt)}
          </span>
        )}
        {saveState.status === 'conflict' && (
          <span style={{ font: '11px/1 system-ui, sans-serif', color: '#dc2626', marginLeft: 6 }}>Conflict — reload or compare</span>
        )}
        {saveState.status === 'offline' && (
          <span style={{ font: '11px/1 system-ui, sans-serif', color: '#dc2626', marginLeft: 6 }}>Offline — queued</span>
        )}
      </div>

      {/* Recovery banner */}
      {localCopy && (
        <div style={{ display: 'flex', alignItems: 'start', gap: 8, padding: '8px 10px', borderRadius: 6, background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div style={{ flex: 1, font: '13px/1.4 system-ui, sans-serif' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Unsaved work recovered</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>From {relativeTime(localCopy.at)}. Restore it to continue editing.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              queue.takeTheirs?.();
              setLocalCopy(null);
            }}
            style={{ ...buttonStyle(), background: '#4f46e5', color: '#fff' }}
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              queue.discardLocalCopy?.();
              setLocalCopy(null);
            }}
            style={{ ...buttonStyle(), color: '#dc2626' }}
          >
            Discard
          </button>
        </div>
      )}

      <div style={{ font: '600 11px/1.4 system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.6, marginTop: 8 }}>Undo steps</div>
      <div style={{ display: 'grid', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
        {steps.length === 0 && (
          <p style={{ margin: 0, opacity: 0.6, font: '13px/1.4 system-ui, sans-serif' }}>No history yet.</p>
        )}
        {steps.map((entry, index) => (
          <button
            key={index}
            type="button"
            onClick={() => jumpTo(index)}
            disabled={index === 0}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(127,127,127,.2)',
              background: index === 0 ? 'rgba(79,70,229,.1)' : 'transparent',
              color: 'inherit',
              font: '13px/1.4 system-ui, sans-serif',
              cursor: index === 0 ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.5 }}>{steps.length - index}</span>
            <span style={{ flex: 1, fontSize: 12, opacity: index === 0 ? 0.5 : 1 }}>{entry.label}</span>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: index === 0 ? '#4f46e5' : 'transparent',
                border: index === 0 ? 'none' : '1px solid rgba(127,127,127,.3)',
              }}
            />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => store.undo()}
          style={{
            ...buttonStyle(),
            flex: 1,
            opacity: canUndo ? 1 : 0.5,
            background: canUndo ? 'rgba(79,70,229,.15)' : 'transparent',
            color: canUndo ? '#4f46e5' : 'rgba(127,127,127,.4)',
          }}
        >
          ↶ Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => store.redo()}
          style={{
            ...buttonStyle(),
            flex: 1,
            opacity: canRedo ? 1 : 0.5,
            background: canRedo ? 'rgba(79,70,229,.15)' : 'transparent',
            color: canRedo ? '#4f46e5' : 'rgba(127,127,127,.4)',
          }}
        >
          Redo ↷
        </button>
      </div>
    </div>
  );

  function jumpTo(index: number) {
    for (let i = 0; i < index; i++) store.undo();
  }

  function buttonStyle(): CSSProperties {
    return {
      padding: '2px 8px',
      borderRadius: 4,
      border: '1px solid rgba(127,127,127,.35)',
      background: 'transparent',
      color: 'inherit',
      font: '12px/1.4 system-ui, sans-serif',
      cursor: 'pointer',
    };
  }

  function relativeTime(at: number): string {
    const seconds = (Date.now() - at) / 1000;
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${Math.round(seconds)}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }
}
