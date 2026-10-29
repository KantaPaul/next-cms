/**
 * The inspector (R693): fields for the selected block, grouped into sections,
 * or page settings when nothing is selected. Edits go through the store, so
 * they are undoable, and typing in one field becomes one undo step.
 */

import { DEVICES, type Device, type FieldDef } from '@nextcms/builder-core';
import type { CSSProperties, ReactNode } from 'react';
import { useEditor, useEditorStore } from './context';
import { DeviceProvider, type FieldComponent, FieldControl, FieldTypesProvider } from './fields';

export type InspectorBlock = { label: string; fields: Record<string, FieldDef> };

const DEVICE_ICONS: Record<Device, string> = { desktop: '🖥', tablet: '▭', mobile: '▯' };

/** Desktop, tablet, and mobile buttons; switches the canvas and per-device fields. */
export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  return (
    <fieldset aria-label="Edit for device" style={{ display: 'inline-flex', gap: 2, border: 0, margin: 0, padding: 0, ...style }}>
      {DEVICES.map(d => (
        <button
          key={d}
          type="button"
          aria-pressed={device === d}
          aria-label={d[0].toUpperCase() + d.slice(1)}
          title={d[0].toUpperCase() + d.slice(1)}
          onClick={() => store.setDevice(d)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid rgba(127,127,127,.3)',
            background: device === d ? 'rgba(79,70,229,.15)' : 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            font: '13px/1 system-ui, sans-serif',
          }}
        >
          {DEVICE_ICONS[d]}
        </button>
      ))}
    </fieldset>
  );
}

function groupFields(fields: Record<string, FieldDef>): [string, [string, FieldDef][]][] {
  const groups = new Map<string, [string, FieldDef][]>();
  for (const entry of Object.entries(fields)) {
    const group = entry[1].group ?? 'Settings';
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  return [...groups.entries()];
}

function FieldGroups({
  fields,
  props,
  scope,
  onChange,
}: {
  fields: Record<string, FieldDef>;
  props: Record<string, unknown>;
  scope: string;
  onChange: (name: string, value: unknown) => void;
}) {
  const groups = groupFields(fields);
  return (
    <>
      {groups.map(([group, entries]) => (
        <details key={group} open style={{ borderTop: '1px solid rgba(127,127,127,.2)', padding: '10px 0' }}>
          <summary style={{ cursor: 'pointer', font: '600 11px/1.4 system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.7 }}>
            {group}
          </summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {entries.map(([name, field]) => (
              <FieldControl
                key={`${scope}.${name}`}
                name={`${scope}.${name}`}
                field={field}
                value={props[name]}
                props={props}
                onChange={value => onChange(name, value)}
              />
            ))}
          </div>
        </details>
      ))}
    </>
  );
}

export function Inspector({
  blocks,
  rootFields = {},
  fieldTypes,
  empty,
}: {
  blocks: Record<string, InspectorBlock>;
  /** Page settings shown when nothing is selected. */
  rootFields?: Record<string, FieldDef>;
  fieldTypes?: Record<string, FieldComponent>;
  /** Shown above page settings when nothing is selected. */
  empty?: ReactNode;
}) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const selectedId = useEditor(state => (state.selection.length === 1 ? state.selection[0] : null));
  const count = useEditor(state => state.selection.length);
  const node = useEditor(state => (selectedId ? state.doc.nodes[selectedId] : undefined));
  const rootProps = useEditor(state => state.doc.root.props);
  const block = node ? blocks[node.type] : undefined;
  const responsive = Object.values(node ? (block?.fields ?? {}) : rootFields).some(field => field.responsive);

  return (
    <FieldTypesProvider types={fieldTypes}>
      <DeviceProvider value={device}>
        <div style={{ display: 'grid', gap: 4, font: '13px/1.4 system-ui, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 8 }}>
            <h2 style={{ margin: 0, font: '600 14px/1.3 system-ui, sans-serif' }}>
              {count > 1 ? `${count} blocks selected` : node ? (block?.label ?? node.type) : 'Page'}
            </h2>
            {responsive && <DeviceSwitch />}
          </div>
          {count > 1 && <p style={{ margin: 0, opacity: 0.7 }}>Select one block to edit its settings.</p>}
          {node && block && (
            <FieldGroups
              key={node.id}
              scope={node.id}
              fields={block.fields}
              props={node.props}
              onChange={(name, value) => store.updateProps(node.id, { [name]: value }, `${node.id}.${name}`)}
            />
          )}
          {node && !block && <p style={{ margin: 0, opacity: 0.7 }}>No settings for this block.</p>}
          {!node && count === 0 && (
            <>
              {empty}
              <FieldGroups
                scope="root"
                fields={rootFields}
                props={rootProps}
                onChange={(name, value) => store.updateRootProps({ [name]: value }, `root.${name}`)}
              />
            </>
          )}
        </div>
      </DeviceProvider>
    </FieldTypesProvider>
  );
}
