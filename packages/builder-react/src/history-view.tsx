/**
 * History view (E12 / R726): timeline of actions with undo/redo steps,
 * autosave status, and jump-to-step history traversal.
 */

import { CheckCircle2, Clock, RotateCcw, RotateCw } from 'lucide-react';
import type React from 'react';
import { useEditor, useEditorStore } from './context';
import type { SaveQueue } from './save';

export interface HistoryViewProps {
  queue?: SaveQueue;
  className?: string;
}

function relativeTime(at: number): string {
  const seconds = (Date.now() - at) / 1000;
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function HistoryView({ queue, className }: HistoryViewProps) {
  const store = useEditorStore();
  const history = useEditor(state => state.history);
  const isDirty = store.isDirty();
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();

  // Combine past entries, present, and future entries
  const pastEntries = history.past || [];
  const futureEntries = history.future || [];

  const jumpToPast = (reverseIndex: number) => {
    // reverseIndex = 0 is 1 step back, 1 is 2 steps back, etc.
    for (let i = 0; i <= reverseIndex; i++) {
      store.undo();
    }
  };

  const jumpToFuture = (forwardIndex: number) => {
    for (let i = 0; i <= forwardIndex; i++) {
      store.redo();
    }
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 12,
        font: 'var(--ne-text-body)',
        color: 'var(--ne-text)',
      }}
    >
      {/* Header & Undo/Redo quick bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
          borderBottom: '1px solid var(--ne-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} style={{ color: 'var(--ne-text-muted)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>History Timeline</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => store.undo()}
            aria-label="Undo"
            title="Undo"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid var(--ne-border)',
              background: canUndo ? 'var(--ne-surface)' : 'transparent',
              color: canUndo ? 'var(--ne-text)' : 'var(--ne-text-muted)',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              opacity: canUndo ? 1 : 0.4,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCcw size={12} /> Undo
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => store.redo()}
            aria-label="Redo"
            title="Redo"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid var(--ne-border)',
              background: canRedo ? 'var(--ne-surface)' : 'transparent',
              color: canRedo ? 'var(--ne-text)' : 'var(--ne-text-muted)',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              opacity: canRedo ? 1 : 0.4,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCw size={12} /> Redo
          </button>
        </div>
      </div>

      {/* Dirty / Autosave status banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          margin: '10px 0',
          borderRadius: 6,
          background: 'var(--ne-surface-subtle)',
          border: '1px solid var(--ne-border)',
          fontSize: 11,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isDirty ? 'var(--ne-warning)' : 'var(--ne-success)',
          }}
        />
        <span style={{ fontWeight: 500 }}>
          {isDirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>

      {/* History Steps List */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }} className="ne-scrollbar">
        {/* Future entries (redo available) */}
        {futureEntries.map((entry, idx) => (
          <button
            key={`future-${idx}`}
            type="button"
            onClick={() => jumpToFuture(idx)}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px dashed var(--ne-border)',
              background: 'transparent',
              color: 'var(--ne-text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: 10, width: 16 }}>+{idx + 1}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{entry.label}</span>
            <span style={{ fontSize: 10, fontStyle: 'italic' }}>Redo</span>
          </button>
        ))}

        {/* Current State Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 6,
            background: 'var(--ne-primary-soft)',
            border: '1px solid var(--ne-primary)',
            color: 'var(--ne-primary)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={14} />
          <span style={{ flex: 1 }}>{history.present.label || 'Current State'}</span>
          <span style={{ fontSize: 10 }}>Active</span>
        </div>

        {/* Past entries (undo available) */}
        {pastEntries.slice().reverse().map((entry, idx) => (
          <button
            key={`past-${idx}`}
            type="button"
            onClick={() => jumpToPast(idx)}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-text)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--ne-text-muted)', width: 16 }}>
              -{idx + 1}
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>{entry.label}</span>
            <span style={{ fontSize: 10, color: 'var(--ne-text-muted)' }}>Undo</span>
          </button>
        ))}

        {pastEntries.length === 0 && futureEntries.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ne-text-muted)', margin: '24px 0' }}>
            No history recorded yet. Make changes to see undo steps.
          </p>
        )}
      </div>
    </div>
  );
}
