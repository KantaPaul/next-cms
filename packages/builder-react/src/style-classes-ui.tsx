/**
 * Reusable style classes UI (R724 / UXE-14): save a block's style as a named
 * class, apply it to other blocks, see where it is used, and detach it.
 */

import { type CSSProperties, useState } from 'react';
import { useEditorStore } from './context';
import {
  createStyleClassStore,
  getStyleClassStore,
  setStyleClassStore,
  type StyleClassStore,
} from './style-classes';
import type { BuilderNode } from '@nextcms/builder-core';

const smallButton: CSSProperties = {
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '12px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

/** Save a block's style as a named class, or apply an existing class. */
export function StyleClassControl({
  nodeId,
  styles,
}: {
  nodeId: string;
  /** Current style values captured from the block, to save as a class. */
  styles: Record<string, unknown>;
}) {
  const classes = getClasses();
  const blockClass = classes.blockClasses[nodeId as never as string];
  const [className, setClassName] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAsClass = () => {
    const sc = getStyleClassStore();
    if (!sc) return;
    const name = className.trim() || `Class ${Object.keys(classes.classes).length + 1}`;
    setSaving(true);
    sc.saveClass(name, styles);
    sc.applyClass(nodeId as never as string, name);
    setSaving(false);
    setClassName('');
  };

  const usedBy = blockClass
    ? classes.classes[blockClass as never as string]?.usedBy.length ?? 0
    : 0;

  return (
    <div style={{ display: 'grid', gap: 8, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>
        Style class
      </div>
      {blockClass ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ font: '13px/1.4 system-ui, sans-serif', color: '#4f46e5' }}>
            {blockClass}
          </span>
          <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6 }}>
            {usedBy} block(s)
          </span>
          <button
            type="button"
            aria-label="Detach style class"
            onClick={() => {
              const store = getStyleClassStore();
              if (store) store.detachClass(nodeId as never as string);
            }}
            style={{
              ...smallButton,
              color: '#dc2626',
            }}
          >
            Detach
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="Class name"
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(127,127,127,.35)',
              background: 'transparent',
              color: 'inherit',
              font: '13px/1.4 system-ui, sans-serif',
            }}
          />
          <button
            type="button"
            disabled={!className.trim() || saving}
            onClick={saveAsClass}
            style={{
              ...smallButton,
              background: saving ? 'rgba(127,127,127,.3)' : 'rgba(79,70,229,.15)',
              color: saving ? 'rgba(127,127,127,.6)' : '#4f46e5',
            }}
          >
            Save as class
          </button>
        </div>
      )}
    </div>
  );
}

/** Gets style class state, or defaults. */
function getClasses() {
  const sc = getStyleClassStore();
  return sc ? sc.getState() : { classes: {}, blockClasses: {} };
}

/** A list of all style classes with apply/detach/delete actions. */
export function StyleClassList({
  onApply,
  onDetach,
}: {
  onApply: (blockId: string, className: string) => void;
  onDetach: (blockId: string) => void;
}) {
  const store = useEditorStore();
  const classes = getClasses();
  const selectedId = store.getState().selection[0];

  return (
    <div style={{ display: 'grid', gap: 8, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>
        Style classes
      </div>
      {Object.keys(classes.classes).length === 0 && (
        <p style={{ margin: 0, opacity: 0.6, font: '13px/1.4 system-ui, sans-serif' }}>
          No style classes yet. Save a block&apos;s style as a class to reuse it.
        </p>
      )}
      {Object.entries(classes.classes).map(([name, klass]) => (
        <div
          key={name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid rgba(127,127,127,.25)',
            background: 'rgba(127,127,127,.05)',
          }}
        >
          <span style={{ flex: 1, font: '13px/1.4 system-ui, sans-serif', color: '#4f46e5' }}>
            {name}
          </span>
          <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6 }}>
            {klass.usedBy.length} block(s) · updated{' '}
            {new Date(klass.updatedAt).toLocaleDateString()}
          </span>
          {selectedId && (
            <button
              type="button"
              aria-label={`Apply "${name}" to selection`}
              onClick={() => onApply(selectedId, name)}
              style={{
                ...smallButton,
                background: 'rgba(79,70,229,.15)',
                color: '#4f46e5',
              }}
            >
              Apply
            </button>
          )}
          <button
            type="button"
            aria-label={`Delete "${name}"`}
            onClick={() => {
              const sc = getStyleClassStore();
              if (sc) sc.deleteClass(name);
            }}
            style={{
              ...smallButton,
              color: '#dc2626',
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

/** Sets the global style class store (called by the host editor shell). */
export function initStyleClassStore(): StyleClassStore {
  const store = createStyleClassStore();
  setStyleClassStore(store);
  return store;
}

/** Captures style-relevant props from a block for saving as a class. */
export function captureStyles(node: BuilderNode): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  for (const key of Object.keys(node.props)) {
    if (/^(align|margin|padding|gap|width|height|color|background|border|radius|section)$/.test(key)) {
      style[key] = node.props[key];
    }
  }
  return style;
}
