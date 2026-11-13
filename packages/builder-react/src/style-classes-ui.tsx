/**
 * Reusable style classes UI (R724 / UXE-14 → KRK-01): save a block's style as a
 * named class, apply it to other blocks, see where it is used, and detach it.
 * Classes live in the host adapter; nodes reference them by id via
 * `node.props.classIds`.
 */

import { type CSSProperties, useState } from 'react';
import { useEditorStore } from './context';
import {
  createStyleClassStore,
  getStyleClassStore,
  setStyleClassStore,
  slugifyClassName,
  type StyleClassAdapter,
  type StyleClassStore,
  type StyleClassStoreOptions,
  uniqueClassName,
  useStyleClasses,
} from './style-classes';
import type { BuilderNode, NodeId } from '@nextcms/builder-core';

const smallButton: CSSProperties = {
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '12px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

/**
 * Creates a named class and applies it to the block. The class starts empty:
 * its styles are edited in the Style tab once a class is selected (KRK-03).
 */
export function StyleClassControl({ nodeId }: { nodeId: NodeId }) {
  const editor = useEditorStore();
  const store = getStyleClassStore();
  const { classes, error } = useStyleClasses(store);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const slug = slugifyClassName(name);

  const create = async () => {
    if (!store || !slug) return;
    setSaving(true);
    try {
      const unique = uniqueClassName(slug, Object.values(classes).map(cls => cls.name));
      const created = await store.createClass({ name: unique, kind: 'class', variants: {} });
      editor.addNodeClass(nodeId, created.id);
      setName('');
    } catch {
      /* the store sets `error`, shown below */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8, font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ font: '600 12px/1.4 system-ui, sans-serif', opacity: 0.8 }}>
        Style class
      </div>
      <form
        style={{ display: 'flex', gap: 6 }}
        onSubmit={event => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Class name"
          aria-label="New class name"
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
          type="submit"
          disabled={!store || !slug || saving}
          style={{
            ...smallButton,
            background: saving ? 'rgba(127,127,127,.3)' : 'rgba(79,70,229,.15)',
            color: saving ? 'rgba(127,127,127,.6)' : '#4f46e5',
          }}
        >
          {saving ? 'Creating…' : 'Create class'}
        </button>
      </form>
      {name && slug && slug !== name && (
        <p style={{ margin: 0, opacity: 0.6, font: '12px/1.4 system-ui, sans-serif' }}>
          Will be named <code>.{slug}</code>
        </p>
      )}
      {error && (
        <p role="alert" style={{ margin: 0, color: '#dc2626', font: '12px/1.4 system-ui, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** A list of all style classes with apply/detach actions for the selected node. */
export function StyleClassList({
  onApply,
  onDetach,
}: {
  onApply: (blockId: string, classId: string) => void;
  onDetach: (blockId: string, classId: string) => void;
}) {
  const store = useEditorStore();
  const classes = useStyleClasses();
  const selectedId = store.getState().selection[0];
  const currentClasses =
    selectedId &&
    store.getState().doc.nodes[selectedId as never as string]?.props?.classIds;

  const current = Array.isArray(currentClasses) ? new Set(currentClasses) : new Set<string>();

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
      {Object.entries(classes.classes).map(([classId, klass]) => {
        const applied = current.has(classId);
        return (
          <div
            key={classId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(127,127,127,.25)',
              background: applied ? 'rgba(79,70,229,.15)' : 'rgba(127,127,127,.05)',
            }}
          >
            <span style={{ flex: 1, font: '13px/1.4 system-ui, sans-serif', color: '#4f46e5' }}>
              {klass.name}
            </span>
            {selectedId && (
              <button
                type="button"
                disabled={applied}
                aria-label={applied ? 'Already applied' : `Apply "${klass.name}"`}
                onClick={() => onApply(selectedId as never as string, classId)}
                style={{
                  ...smallButton,
                  background: 'rgba(79,70,229,.15)',
                  color: '#4f46e5',
                }}
              >
                Apply
              </button>
            )}
            {selectedId && applied && (
              <button
                type="button"
                aria-label={`Detach "${klass.name}"`}
                onClick={() => onDetach(selectedId as never as string, classId)}
                style={{
                  ...smallButton,
                  color: '#dc2626',
                }}
              >
                Detach
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Creates the editor's style class store for the host adapter, makes it the
 * global store, and starts loading. Call `store.flush()` before leaving the
 * editor so queued edits are saved.
 */
export function initStyleClassStore(
  adapter?: StyleClassAdapter,
  options?: StyleClassStoreOptions
): StyleClassStore | null {
  if (!adapter) {
    setStyleClassStore(null);
    return null;
  }
  getStyleClassStore()?.dispose();
  const store = createStyleClassStore(adapter, options);
  setStyleClassStore(store);
  void store.load();
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
