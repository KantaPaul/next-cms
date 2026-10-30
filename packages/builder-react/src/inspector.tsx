/**
 * The inspector (R693, R722): fields for the selected block, grouped into
 * Content / Style / Advanced tabs, or page settings when nothing is selected.
 * Edits go through the store, so they are undoable. Changed fields show a dot
 * and can be reset per field or per device (R722, R694).
 */

import { DEVICES, type Device, type FieldDef, inheritedFrom, resetDeviceValue, valueForDevice, withDeviceValue } from '@nextcms/builder-core';
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { DeviceProvider, type FieldComponent, FieldControl, FieldTypesProvider } from './fields';

export type InspectorBlock = {
  label: string;
  fields: Record<string, FieldDef>;
  /** Default props for changed-field dots and reset (R722). */
  defaultProps?: Record<string, unknown>;
};

const DEVICE_ICONS: Record<Device, string> = { desktop: '🖥', tablet: '▭', mobile: '▯' };

const TAB_LABELS: Record<string, string> = { content: 'Content', style: 'Style', advanced: 'Advanced' };

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

/** Which tab a field belongs to: Content, Style, or Advanced. */
function fieldTab(field: FieldDef): 'content' | 'style' | 'advanced' {
  const group = (field.group ?? '').toLowerCase();
  if (group === 'content' || group === 'contents') return 'content';
  if (group === 'style' || group === 'style & layout' || group === 'layout' || group === 'spacing' || group === 'typography' || group === 'color') return 'style';
  // Infer from field type when no group is set.
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'image':
    case 'custom':
      return 'content';
    case 'number':
    case 'toggle':
    case 'select':
    case 'radio':
    case 'object':
    case 'list':
      return 'style';
    default:
      return 'advanced';
  }
}

/** Whether a field's shown value differs from its default. */
function fieldChanged(field: FieldDef, value: unknown, defaultValue: unknown, device: Device): boolean {
  const shown = field.responsive ? valueForDevice(value, device) : value;
  const defaultShown = field.responsive ? valueForDevice(defaultValue, device) : defaultValue;
  if (shown === undefined && defaultShown === undefined) return false;
  return JSON.stringify(shown) !== JSON.stringify(defaultShown);
}

/** One field row with a changed-field dot and reset controls (R722). */
function FieldRow({
  name,
  field,
  value,
  defaultValue,
  props,
  device,
  onChange,
  readOnly,
}: {
  name: string;
  field: FieldDef;
  value: unknown;
  defaultValue: unknown;
  props: Record<string, unknown>;
  device: Device;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const changed = fieldChanged(field, value, defaultValue, device);
  const responsive = !!field.responsive;
  const shown = responsive ? valueForDevice(value, device) : value;
  const source = responsive ? inheritedFrom(value, device) : null;

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {field.label && (
          <label
            htmlFor={`field-${name.replace(/[^\w-]/g, '-')}`}
            style={{ font: '600 12px/1.4 system-ui, sans-serif', flex: 1 }}
          >
            {field.label}
          </label>
        )}
        {responsive && (
          <span style={{ font: '11px/1 system-ui, sans-serif', opacity: 0.6 }}>
            {device[0].toUpperCase() + device.slice(1)}
            {source && source !== device ? ` · from ${source[0].toUpperCase() + source.slice(1).slice(1)}` : ''}
          </span>
        )}
        {changed && (
          <span
            title="Changed from default"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4f46e5',
              flexShrink: 0,
            }}
          />
        )}
        {!readOnly && changed && (
          <button
            type="button"
            aria-label={`Reset ${field.label}`}
            title="Reset to default"
            onClick={() => {
              const next = responsive ? resetDeviceValue(value, device) : undefined;
              onChange(next);
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '1px 6px',
              borderRadius: 4,
              border: '1px solid rgba(127,127,127,.35)',
              background: 'transparent',
              color: 'inherit',
              font: '11px/1.4 system-ui, sans-serif',
            }}
          >
            Reset
          </button>
        )}
      </div>
      <FieldControl
        name={name}
        field={field}
        value={value}
        props={props}
        onChange={next => onChange(responsive ? withDeviceValue(value, device, next) : next)}
        readOnly={readOnly || field.readOnly}
      />
      {field.description && (
        <p style={{ margin: 0, font: '11px/1.4 system-ui, sans-serif', opacity: 0.65 }}>{field.description}</p>
      )}
    </div>
  );
}

function FieldGroups({
  fields,
  props,
  defaultProps,
  scope,
  device,
  onChange,
  readOnly,
}: {
  fields: Record<string, FieldDef>;
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  scope: string;
  device: Device;
  onChange: (name: string, value: unknown) => void;
  readOnly?: boolean;
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
              <FieldRow
                key={name}
                name={`${scope}.${name}`}
                field={field}
                value={props[name]}
                defaultValue={defaultProps?.[name]}
                props={props}
                device={device}
                onChange={value => onChange(name, value)}
                readOnly={readOnly}
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
  rootDefaultProps = {},
  fieldTypes,
  empty,
}: {
  blocks: Record<string, InspectorBlock>;
  /** Page settings shown when nothing is selected. */
  rootFields?: Record<string, FieldDef>;
  /** Defaults for root fields, for changed-field dots and reset. */
  rootDefaultProps?: Record<string, unknown>;
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
            <InspectorTabs
              block={block}
              node={node}
              props={node.props}
              defaultProps={block.defaultProps}
              device={device}
              readOnly={!!node.meta?.locked}
            />
          )}
          {node && !block && <p style={{ margin: 0, opacity: 0.7 }}>No settings for this block.</p>}
          {!node && count === 0 && (
            <>
              {empty}
              <InspectorTabs
                block={{ label: 'Page', fields: rootFields, defaultProps: rootDefaultProps }}
                node={null as any}
                props={rootProps}
                defaultProps={rootDefaultProps}
                device={device}
                readOnly={false}
                isRoot
              />
            </>
          )}
        </div>
      </DeviceProvider>
    </FieldTypesProvider>
  );
}

type InspectorTabsProps = {
  block: InspectorBlock;
  node: { id: string } | null;
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  device: Device;
  readOnly?: boolean;
  isRoot?: boolean;
};

function InspectorTabs({
  block,
  node,
  props,
  defaultProps,
  device,
  readOnly,
  isRoot = false,
}: InspectorTabsProps) {
  const store = useEditorStore();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'advanced'>('content');

  const tabFields = (tab: 'content' | 'style' | 'advanced') =>
    Object.entries(block.fields).filter(([, field]) => fieldTab(field) === tab);

  const filtered = (tab: 'content' | 'style' | 'advanced') => {
    const q = query.toLowerCase().trim();
    if (!q) return tabFields(tab);
    return tabFields(tab).filter(([name, field]) =>
      (field.label ?? name).toLowerCase().includes(q) || name.toLowerCase().includes(q)
    );
  };

  const changedCount = Object.entries(block.fields).filter(
    ([name, field]) => fieldChanged(field, props[name], defaultProps?.[name], device)
  ).length;

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        role="tablist"
        aria-label="Inspector tabs"
        style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(127,127,127,.2)', marginBottom: 6 }}
      >
        {(['content', 'style', 'advanced'] as const).map(tab => {
          const fields = tabFields(tab);
          const hasChanged = fields.some(([name, field]) =>
            fieldChanged(field, props[name], defaultProps?.[name], device)
          );
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={`${TAB_LABELS[tab]} (${fields.length}${hasChanged ? ', changed' : ''})`}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                border: 0,
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                background: activeTab === tab ? 'rgba(79,70,229,.08)' : 'transparent',
                color: activeTab === tab ? '#4f46e5' : 'rgba(127,127,127,.8)',
                font: '600 11px/1.4 system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                padding: '6px 0',
                cursor: 'pointer',
              }}
            >
              {TAB_LABELS[tab]}
              {fields.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    font: '10px/1 system-ui, sans-serif',
                    opacity: 0.6,
                    background: hasChanged ? 'rgba(79,70,229,.15)' : 'rgba(127,127,127,.15)',
                    padding: '1px 5px',
                    borderRadius: 9,
                    color: hasChanged ? '#4f46e5' : 'inherit',
                  }}
                >
                  {fields.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search settings…"
          aria-label="Search inspector settings"
          style={{
            boxSizing: 'border-box',
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(127,127,127,.35)',
            background: 'transparent',
            color: 'inherit',
            font: '13px/1.4 system-ui, sans-serif',
          }}
        />
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={{ display: 'grid', gap: 12 }}
      >
        {filtered(activeTab).length === 0 && (
          <p style={{ margin: 0, opacity: 0.6, font: '13px/1.4 system-ui, sans-serif' }}>
            No {activeTab} settings{query ? ` matching “${query}”` : ''}.
          </p>
        )}
        {filtered(activeTab).map(([name, field]) => (
          <FieldRow
            key={name}
            name={`${isRoot ? 'root' : node?.id ?? 'root'}.${name}`}
            field={field}
            value={props[name]}
            defaultValue={defaultProps?.[name]}
            props={props}
            device={device}
            onChange={value => {
              if (isRoot) {
                store.updateRootProps({ [name]: value }, `root.${name}`);
              } else if (node) {
                store.updateProps(node.id, { [name]: value }, `${node.id}.${name}`);
              }
            }}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
