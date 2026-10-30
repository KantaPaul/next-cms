/**
 * Adopt the shared editor-ui shell (B15 E6): wraps the existing editor content
 * (block list, canvas, inspector) in `@nextcms/editor-ui`'s EditorShell,
 * TopBar, Panel, Breadcrumb, and StatusBar. Behind a flag so both shells
 * coexist during rollout.
 */

import {
  type BlockDefinition,
  type BuilderConfig,
  type BuilderDocument,
  defaultProps,
  emptyDocument,
  fieldsOf,
} from '@nextcms/builder-core';
import {
  Breadcrumb,
  CommandPalette,
  type CommandPaletteItem,
  EditorShell,
  Panel,
  StatusBar,
  TopBar,
} from '@nextcms/editor-ui';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import type { EditorAdapters } from './adapters';
import { BlockList } from './block-list';
import { EditorCanvas } from './canvas';
import { EditorProvider, useEditorStore } from './context';
import { useDragController } from './drag';
import { Inspector } from './inspector';
import { LayersPanel } from './layers';
import { createEditorStore } from './store';

/** `useEditorStore`, under the name the small public API uses. */
export const useBuilderShell = useEditorStore;

export type BuilderEditorShellProps = {
  config: BuilderConfig;
  value?: BuilderDocument;
  onChange?: (doc: BuilderDocument) => void;
  /** When true (or `NEXT_PUBLIC_USE_EDITOR_UI_SHELL` is set), use the shared editor-ui shell. */
  useSharedShell?: boolean;
  /** Adapter bundle for storage, media, data, permissions, AI, etc. (R759). */
  adapters?: EditorAdapters;
  style?: CSSProperties;
};

export function inspectorBlocksOfShell(
  blocks: Record<string, BlockDefinition>
): Record<
  string,
  {
    label: string;
    fields: Record<string, any>;
    defaultProps: Record<string, unknown>;
  }
> {
  const result: Record<
    string,
    {
      label: string;
      fields: Record<string, any>;
      defaultProps: Record<string, unknown>;
    }
  > = {};
  for (const [type, block] of Object.entries(blocks)) {
    result[type] = {
      label: block.label,
      fields: fieldsOf(block) as Record<string, any>,
      defaultProps: defaultProps(block),
    };
  }
  return result;
}

function SharedShellEditor({
  config,
  onChange,
  style,
}: {
  config: BuilderConfig;
  onChange?: (doc: BuilderDocument) => void;
  style?: CSSProperties;
}) {
  const store = useBuilderShell();
  const drag = useDragController(store);
  const inspectorBlocks = useMemo(
    () => inspectorBlocksOfShell(config.blocks) as Record<string, any>,
    [config.blocks]
  );
  const [panel, setPanel] = useState<'blocks' | 'layers'>('blocks');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The shell owns no shortcut; this editor opens its own palette (R712).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!onChange) return;
    const unsubscribe = store.subscribe(() => onChange(store.getState().doc));
    return () => {
      unsubscribe();
    };
  }, [store, onChange]);

  const paletteItems: CommandPaletteItem[] = useMemo(
    () => [
      ...Object.entries(config.blocks).map(([type, block]) => ({
        id: `insert-${type}`,
        label: `Insert ${block.label}`,
        group: 'Insert',
        onSelect: () => {},
      })),
      {
        id: 'undo',
        label: 'Undo',
        shortcut: '⌘Z',
        group: 'Edit',
        onSelect: () => store.undo(),
      },
      {
        id: 'redo',
        label: 'Redo',
        shortcut: '⌘⇧Z',
        group: 'Edit',
        onSelect: () => store.redo(),
      },
    ],
    [config.blocks, store]
  );

  const breadcrumbItems = useMemo(() => {
    const selected = store.getState().selection;
    if (!selected || selected.length === 0) return [{ label: 'Page' }];
    return [{ label: 'Page' }, { label: selected[0] }];
  }, [store.getState().selection]);

  return (
    <EditorShell
      topBar={
        <TopBar
          title="Untitled"
          saveStatus="saved"
          canUndo={store.canUndo()}
          canRedo={store.canRedo()}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
      }
      library={
        <Panel
          side="left"
          title="Library"
          defaultWidth={260}
          storageKey="editor-ui-left-panel"
        >
          <div style={{ padding: 8 }}>
            <div
              role="tablist"
              aria-label="Left panel"
              style={{ display: 'flex', gap: 4, marginBottom: 8 }}
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
        </Panel>
      }
      canvas={
        <div
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <Breadcrumb items={breadcrumbItems} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <EditorCanvas
              components={config.components}
              drag={drag}
              insertGroups={config.groups}
            />
          </div>
        </div>
      }
      inspector={
        <Panel
          side="right"
          title="Inspector"
          defaultWidth={300}
          storageKey="editor-ui-right-panel"
        >
          <div style={{ padding: 16 }}>
            <Inspector blocks={inspectorBlocks as any} />
          </div>
        </Panel>
      }
      statusBar={
        <StatusBar
          left={<span>Ready</span>}
          right={
            <span>{Object.keys(store.getState().doc.nodes).length} blocks</span>
          }
        />
      }
      commandPalette={
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={paletteItems}
        />
      }
      style={style}
    />
  );
}

export function BuilderEditorWithSharedShell({
  config,
  value,
  onChange,
  useSharedShell,
  adapters,
  style,
}: BuilderEditorShellProps) {
  const store = useMemo(
    () =>
      createEditorStore({
        document: value ?? emptyDocument(),
        schemas: config.schemas,
      }),
    [config]
  );

  const flagEnabled =
    useSharedShell ??
    (typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_USE_EDITOR_UI_SHELL === '1');

  if (!flagEnabled) {
    return null;
  }

  return (
    <EditorProvider store={store}>
      <SharedShellEditor config={config} onChange={onChange} style={style} />
    </EditorProvider>
  );
}
