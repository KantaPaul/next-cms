/**
 * Settings view (E12 / R693, R722): inspector with Content / Style / Advanced
 * tabs (⌥C / ⌥S / ⌥A), SettingsSearch, ChangedFilter ("Show only changed"),
 * collapsible sections with a modified dot, and device switching.
 */

import {
  type Device,
  type FieldDef,
  fieldChanged,
  fieldSectionTitle,
  fieldTabId,
  layoutFields,
  type LayoutSection,
} from '@nextcms/builder-core';
import { Copy, Trash2 } from 'lucide-react';
import React from 'react';
import { useEditor, useEditorStore } from './context';
import type { FieldComponent } from './fields';
import type { InspectorBlock } from './inspector';
import type { SettingsTabId } from './keyboard';
import { PartOrderField } from './part-order-field';
import { SettingsPanel } from './settings-panel';

export { fieldChanged, fieldSectionTitle, fieldTabId };

export interface SettingsViewProps {
  blocks: Record<string, InspectorBlock>;
  fieldTypes?: Record<string, FieldComponent>;
  className?: string;
  /**
   * "Show only changed", controlled. Pass with onChangedOnlyChange to drive
   * the filter from outside (e.g. a footer chip); omit to keep it internal.
   */
  changedOnly?: boolean;
  defaultChangedOnly?: boolean;
  onChangedOnlyChange?: (changedOnly: boolean) => void;
  /** Reports how many settings of the selected block differ from defaults. */
  onChangedCountChange?: (count: number) => void;
  /** Hides the built-in "Show only changed" button when a host drives it. */
  hideChangedFilter?: boolean;
}

export type SettingsSection = LayoutSection;

/**
 * Filter and lay out sections for a block using builder-core layoutFields.
 */
export function filterSettingsFields({
  fields,
  props,
  defaultProps = {},
  device,
  query = '',
  changedOnly = false,
  tab,
}: {
  fields: Record<string, FieldDef>;
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  device: Device;
  query?: string;
  changedOnly?: boolean;
  tab?: SettingsTabId;
}): SettingsSection[] {
  const result = layoutFields({
    fields,
    props,
    defaultProps,
    device,
    query,
    changedOnly,
  });
  if (query.trim()) {
    return result.tabs.flatMap(t => t.sections);
  }
  if (tab) {
    const matched = result.tabs.find(t => t.def.id === tab);
    return matched ? matched.sections : [];
  }
  return result.tabs.flatMap(t => t.sections);
}

export function SettingsView({
  blocks,
  fieldTypes,
  className,
  changedOnly,
  defaultChangedOnly = false,
  onChangedOnlyChange,
  onChangedCountChange,
  hideChangedFilter = false,
}: SettingsViewProps) {
  const store = useEditorStore();
  const selection = useEditor(state => state.selection);
  const selectedId = selection.length === 1 ? selection[0] : null;
  const count = selection.length;
  const node = useEditor(state =>
    selectedId ? state.doc.nodes[selectedId] : null
  );

  // Multiple blocks selected view
  if (count > 1) {
    return (
      <div
        className={className}
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--ne-text)',
          }}
        >
          {count} blocks selected
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ne-text-muted)' }}>
          Select a single block to configure properties, or perform batch
          actions below.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => store.duplicate(selection)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-text)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Copy size={13} /> Duplicate All
          </button>
          <button
            type="button"
            onClick={() => store.remove(selection)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-danger)',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Trash2 size={13} /> Delete All
          </button>
        </div>
      </div>
    );
  }

  // No block selected
  if (!node || !blocks[node.type]) {
    return (
      <div
        className={className}
        style={{
          padding: 16,
          textAlign: 'center',
          color: 'var(--ne-text-muted)',
          fontSize: 12,
        }}
      >
        <p style={{ margin: '16px 0 8px' }}>No block selected.</p>
        <p style={{ margin: 0 }}>
          Click an element on the canvas to configure its properties.
        </p>
      </div>
    );
  }

  const block = blocks[node.type];
  const reorder = store.schemas[node.type]?.reorder;
  const props = node.props;
  const defaultProps = block.defaultProps ?? {};
  const isLocked = !!node.meta?.locked;

  return (
    <SettingsPanel
      className={className}
      panelKey={node.id}
      label={block.label ?? node.type}
      fields={block.fields}
      tabs={block.tabs}
      props={props}
      defaultProps={defaultProps}
      readOnly={isLocked}
      fieldTypes={fieldTypes}
      changedOnly={changedOnly}
      defaultChangedOnly={defaultChangedOnly}
      onChangedOnlyChange={onChangedOnlyChange}
      onChangedCountChange={onChangedCountChange}
      hideChangedFilter={hideChangedFilter}
      onPatch={(patch, path) => {
        store.updateProps(node.id, patch, `${node.id}.${path}`);
      }}
      renderSectionExtras={({
        tab,
        sectionIndex,
        isSearching,
        changedOnly: onlyChanged,
      }) =>
        reorder &&
        tab === 'content' &&
        sectionIndex === 0 &&
        !isSearching &&
        !onlyChanged ? (
          <PartOrderField
            nodeId={node.id}
            reorder={reorder}
            props={props}
            readOnly={isLocked}
          />
        ) : null
      }
    />
  );
}
