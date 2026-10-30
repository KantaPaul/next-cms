/**
 * State styles UI (R725 / UXE-15): a switch in the inspector to edit hover,
 * focus, and active styles, previewed on the canvas.
 */

import { type CSSProperties, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { getStateStyles, propsForState, setStateStyles, type StateStyle } from './state-styles';

const smallButton: CSSProperties = {
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '12px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

/** Toggle in the inspector: switch between base editing and a state (hover/focus/active). */
export function StateStyleSwitch({
  nodeId,
  onChange,
}: {
  nodeId: string;
  onChange: (state: StateStyle | null) => void;
}) {
  const store = useEditorStore();
  const node = store.getState().doc.nodes[nodeId as never as string];
  const active = getStateStyles(node);
  const currentState = Object.keys(active).find(s => s !== 'base') as StateStyle | null;

  return (
    <div style={{ display: 'flex', gap: 6, font: '13px/1.4 system-ui, sans-serif' }}>
      <span style={{ font: '600 11px/1.4 system-ui, sans-serif', opacity: 0.7 }}>Edit state:</span>
      <button
        type="button"
        aria-pressed={!currentState}
        onClick={() => onChange(null)}
        style={{
          all: 'unset',
          padding: '2px 8px',
          borderRadius: 4,
          border: `1px solid ${!currentState ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
          background: !currentState ? 'rgba(79,70,229,.15)' : 'transparent',
          color: 'inherit',
          font: '600 11px/1.4 system-ui, sans-serif',
          cursor: 'pointer',
        }}
      >
        Base
      </button>
      {[
        { id: 'hover' as StateStyle, label: 'Hover', icon: '☁' },
        { id: 'focus' as StateStyle, label: 'Focus', icon: '⌨' },
        { id: 'active' as StateStyle, label: 'Active', icon: '✦' },
      ].map(s => (
        <button
          key={s.id}
          type="button"
          aria-pressed={currentState === s.id}
          onClick={() => onChange(s.id)}
          style={{
            all: 'unset',
            padding: '2px 8px',
            borderRadius: 4,
            border: `1px solid ${currentState === s.id ? '#4f46e5' : 'rgba(127,127,127,.35)'}`,
            background: currentState === s.id ? 'rgba(79,70,229,.15)' : 'transparent',
            color: 'inherit',
            font: '600 11px/1.4 system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          {s.icon} {s.label}
        </button>
      ))}
    </div>
  );
}

/** Canvas overlay: renders a "state badge" on blocks that have state styles. */
export function StateStyleBadge({
  id,
  state,
}: {
  id: string;
  state: StateStyle | null;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -20,
        left: 0,
        zIndex: 10,
        padding: '2px 6px',
        borderRadius: 4,
        background: state ? '#4f46e5' : 'transparent',
        color: state ? '#fff' : 'rgba(127,127,127,.6)',
        font: '600 10px/1.4 system-ui, sans-serif',
        pointerEvents: 'none',
      }}
    >
      {state ? state.toUpperCase() : 'Base'}
    </div>
  );
}

/** Applies a prop change to the currently edited state (or base props). */
export function updatePropsForState({
  store,
  nodeId,
  state,
  patch,
}: {
  store: ReturnType<typeof useEditorStore>;
  nodeId: string;
  state: StateStyle | null;
  patch: Record<string, unknown>;
}) {
  const doc = store.getState().doc;
  const node = doc.nodes[nodeId as never as string];
  if (!node) return;
  const baseProps = propsForState(node, null);
  const nextProps = state ? { ...baseProps, ...patch } : { ...baseProps, ...patch };
  store.updateProps(nodeId as never as string, nextProps);
  if (state) {
    const stateStyles = { ...getStateStyles(node), [state]: { ...(getStateStyles(node)[state] ?? {}), ...patch } };
    // Use updateMeta to store stateStyles as a node meta change (undoable).
    store.updateMeta(nodeId as never as string, { stateStyles } as never);
  }
}
