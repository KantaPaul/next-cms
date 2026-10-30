/**
 * A batteries-included editor shell (R758 / PKG-04): insert panel, canvas,
 * and inspector wired to a `BuilderConfig` from `createBuilderConfig`. For
 * anything beyond "edit this document with these blocks" — save buttons,
 * history, locks, revisions, a device switcher — compose the lower-level
 * pieces directly, the way this component itself does internally; `useBuilder`
 * is just `useEditorStore`, the hook that reaches those pieces.
 */

import {
  type BlockDefinition,
  type BuilderConfig,
  type BuilderDocument,
  defaultProps as blockDefaultProps,
  emptyDocument,
  fieldsOf,
} from '@nextcms/builder-core';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { BlockList } from './block-list';
import { EditorCanvas } from './canvas';
import { EditorProvider, useEditorStore } from './context';
import { useDragController } from './drag';
import { Inspector, type InspectorBlock } from './inspector';
import { LayersPanel } from './layers';
import { createEditorStore } from './store';

/** `useEditorStore`, under the name the small public API uses (R758 / PKG-04). */
export const useBuilder = useEditorStore;

export type BuilderEditorProps = {
  config: BuilderConfig;
  /** The document to start from; defaults to an empty page. */
  value?: BuilderDocument;
  /** Called after every change, with the new document. */
  onChange?: (doc: BuilderDocument) => void;
  style?: CSSProperties;
};

/** `InspectorBlock` entries for every block, derived from its own `defineBlock` schema and fields. */
export function inspectorBlocksOf(
  blocks: Record<string, BlockDefinition>
): Record<string, InspectorBlock> {
  const result: Record<string, InspectorBlock> = {};
  for (const [type, block] of Object.entries(blocks)) {
    result[type] = {
      label: block.label,
      fields: fieldsOf(block),
      defaultProps: blockDefaultProps(block),
    };
  }
  return result;
}

export function BuilderEditor({
  config,
  value,
  onChange,
  style,
}: BuilderEditorProps) {
  // `value` only seeds the first render; the store owns the document from here.
  const store = useMemo(
    () =>
      createEditorStore({
        document: value ?? emptyDocument(),
        schemas: config.schemas,
      }),
    [config]
  );
  return (
    <EditorProvider store={store}>
      <BuilderEditorShell config={config} onChange={onChange} style={style} />
    </EditorProvider>
  );
}

function BuilderEditorShell({
  config,
  onChange,
  style,
}: {
  config: BuilderConfig;
  onChange?: (doc: BuilderDocument) => void;
  style?: CSSProperties;
}) {
  const store = useBuilder();
  const drag = useDragController(store);
  const inspectorBlocks = useMemo(
    () => inspectorBlocksOf(config.blocks),
    [config.blocks]
  );
  const [panel, setPanel] = useState<'blocks' | 'layers'>('blocks');

  useEffect(() => {
    if (!onChange) return;
    const unsubscribe = store.subscribe(() => onChange(store.getState().doc));
    return () => {
      unsubscribe();
    };
  }, [store, onChange]);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, ...style }}>
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: '1px solid rgba(127,127,127,.2)',
        }}
      >
        <div style={{ padding: 12 }}>
          <div
            role="tablist"
            aria-label="Left panel"
            style={{ display: 'flex', gap: 4, marginBottom: 10 }}
          >
            {(['blocks', 'layers'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={panel === tab}
                onClick={() => setPanel(tab)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(127,127,127,.3)',
                  background:
                    panel === tab ? 'rgba(79,70,229,.15)' : 'transparent',
                  color: 'inherit',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  font: '500 12px/1.4 system-ui, sans-serif',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          {panel === 'blocks' ? (
            <BlockList groups={config.groups} drag={drag} />
          ) : (
            <LayersPanel />
          )}
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <EditorCanvas
          components={config.components}
          drag={drag}
          insertGroups={config.groups}
        />
      </main>
      <aside
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: 'auto',
          borderLeft: '1px solid rgba(127,127,127,.2)',
        }}
      >
        <div style={{ padding: 16 }}>
          <Inspector blocks={inspectorBlocks} />
        </div>
      </aside>
    </div>
  );
}
