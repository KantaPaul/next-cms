/**
 * The inspector (R693, R722): fields for the selected block, grouped into
 * Content / Style / Advanced tabs, or page settings when nothing is selected.
 * Edits go through the store, so they are undoable. Changed fields show a dot
 * and can be reset per field or per device (R722, R694).
 */

import {
  DEVICES,
  type Device,
  type FieldDef,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
} from '@nextcms/builder-core';
import {
  FieldRow as FieldRowFrame,
  IconButton,
  InspectorTabs as InspectorTabsBar,
} from '@nextcms/editor-ui';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { useEditor, useEditorStore } from './context';
import {
  DeviceProvider,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
} from './fields';

export type InspectorBlock = {
  label: string;
  fields: Record<string, FieldDef>;
  /** Default props for changed-field dots and reset (R722). */
  defaultProps?: Record<string, unknown>;
};

const DEVICE_ICONS: Record<Device, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const TAB_LABELS: Record<string, string> = {
  content: 'Content',
  style: 'Style',
  advanced: 'Advanced',
};

/** Desktop, tablet, and mobile buttons; switches the canvas and per-device fields. */
export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  return (
    <fieldset
      aria-label="Edit for device"
      style={{
        display: 'inline-flex',
        gap: 2,
        border: 0,
        margin: 0,
        padding: 0,
        ...style,
      }}
    >
      {DEVICES.map(d => {
        const Icon = DEVICE_ICONS[d];
        const label = d[0].toUpperCase() + d.slice(1);
        return (
          <IconButton
            key={d}
            size="sm"
            active={device === d}
            aria-pressed={device === d}
            aria-label={label}
            tooltip={label}
            onClick={() => store.setDevice(d)}
          >
            <Icon style={{ width: 14, height: 14 }} />
          </IconButton>
        );
      })}
    </fieldset>
  );
}

/** Which tab a field belongs to: Content, Style, or Advanced. */
function fieldTab(field: FieldDef): 'content' | 'style' | 'advanced' {
  const group = (field.group ?? '').toLowerCase();
  if (group === 'content' || group === 'contents') return 'content';
  if (
    group === 'style' ||
    group === 'style & layout' ||
    group === 'layout' ||
    group === 'spacing' ||
    group === 'typography' ||
    group === 'color'
  )
    return 'style';
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
function fieldChanged(
  field: FieldDef,
  value: unknown,
  defaultValue: unknown,
  device: Device
): boolean {
  const shown = field.responsive ? valueForDevice(value, device) : value;
  const defaultShown = field.responsive
    ? valueForDevice(defaultValue, device)
    : defaultValue;
  if (shown === undefined && defaultShown === undefined) return false;
  return JSON.stringify(shown) !== JSON.stringify(defaultShown);
}

/** One field row with a changed-field dot and reset controls (R722), drawn by editor-ui's FieldRow. */
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
  if (field.when && !field.when(props)) return null;
  const changed = fieldChanged(field, value, defaultValue, device);
  const responsive = !!field.responsive;
  const source = responsive ? inheritedFrom(value, device) : null;
  const isContainer = field.type === 'list' || field.type === 'object';

  return (
    <FieldRowFrame
      layout="vertical"
      label={field.label ?? ''}
      htmlFor={isContainer ? undefined : fieldControlId(name)}
      description={field.description}
      changed={changed}
      onReset={
        readOnly
          ? undefined
          : // Back to the block's default, which is what the changed dot compares against.
            () =>
              onChange(
                responsive ? resetDeviceValue(value, device) : defaultValue
              )
      }
      device={responsive ? device : undefined}
      isInherited={!!source && source !== device}
      inheritedFrom={source ?? undefined}
    >
      <FieldControl
        bare
        name={name}
        field={field}
        value={value}
        props={props}
        onChange={onChange}
        readOnly={readOnly || field.readOnly}
      />
    </FieldRowFrame>
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
  const selectedId = useEditor(state =>
    state.selection.length === 1 ? state.selection[0] : null
  );
  const count = useEditor(state => state.selection.length);
  const node = useEditor(state =>
    selectedId ? state.doc.nodes[selectedId] : undefined
  );
  const rootProps = useEditor(state => state.doc.root.props);
  const block = node ? blocks[node.type] : undefined;
  const responsive = Object.values(
    node ? (block?.fields ?? {}) : rootFields
  ).some(field => field.responsive);

  return (
    <FieldTypesProvider types={fieldTypes}>
      <DeviceProvider value={device}>
        <div
          style={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: 'minmax(0, 1fr)',
            font: '13px/1.4 system-ui, sans-serif',
            color: 'var(--ne-text, inherit)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingBottom: 8,
            }}
          >
            <h2
              style={{ margin: 0, font: '600 14px/1.3 system-ui, sans-serif' }}
            >
              {count > 1
                ? `${count} blocks selected`
                : node
                  ? (block?.label ?? node.type)
                  : 'Page'}
            </h2>
            {responsive && <DeviceSwitch />}
          </div>
          {count > 1 && (
            <p style={{ margin: 0, color: 'var(--ne-text-muted, inherit)' }}>
              Select one block to edit its settings.
            </p>
          )}
          {node && block && (
            <InspectorTabs
              key={node.id}
              block={block}
              node={node}
              props={node.props}
              defaultProps={block.defaultProps}
              device={device}
              readOnly={!!node.meta?.locked}
            />
          )}
          {node && !block && (
            <p style={{ margin: 0, color: 'var(--ne-text-muted, inherit)' }}>
              No settings for this block.
            </p>
          )}
          {!node && count === 0 && (
            <>
              {empty}
              <InspectorTabs
                block={{
                  label: 'Page',
                  fields: rootFields,
                  defaultProps: rootDefaultProps,
                }}
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
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'advanced'>(
    'content'
  );

  const tabFields = (tab: 'content' | 'style' | 'advanced') =>
    Object.entries(block.fields).filter(([, field]) => fieldTab(field) === tab);

  const filtered = (tab: 'content' | 'style' | 'advanced') => {
    const q = query.toLowerCase().trim();
    if (!q) return tabFields(tab);
    return tabFields(tab).filter(
      ([name, field]) =>
        (field.label ?? name).toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
    );
  };

  const changedCount = Object.entries(block.fields).filter(([name, field]) =>
    fieldChanged(field, props[name], defaultProps?.[name], device)
  ).length;

  const tabs = (['content', 'style', 'advanced'] as const).map(tab => {
    const fields = tabFields(tab);
    const hasChanged = fields.some(([name, field]) =>
      fieldChanged(field, props[name], defaultProps?.[name], device)
    );
    return {
      id: tab,
      label: TAB_LABELS[tab],
      badge: fields.length || undefined,
      changed: hasChanged,
      ariaLabel: `${TAB_LABELS[tab]} (${fields.length}${hasChanged ? ', changed' : ''})`,
    };
  });
  const shown = filtered(activeTab);

  return (
    <div
      style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0, 1fr)' }}
    >
      <InspectorTabsBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as typeof activeTab)}
        searchQuery={query}
        onSearchChange={setQuery}
      />
      <div
        role="tabpanel"
        aria-label={TAB_LABELS[activeTab]}
        style={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        {shown.length === 0 && (
          <p
            style={{
              margin: 0,
              color: 'var(--ne-text-muted, inherit)',
              font: '12px/1.4 system-ui, sans-serif',
            }}
          >
            No {activeTab} settings{query ? ` matching “${query}”` : ''}.
          </p>
        )}
        {shown.map(([name, field]) => (
          <FieldRow
            key={name}
            name={`${isRoot ? 'root' : (node?.id ?? 'root')}.${name}`}
            field={field}
            value={props[name]}
            defaultValue={defaultProps?.[name]}
            props={props}
            device={device}
            onChange={value => {
              if (isRoot) {
                store.updateRootProps({ [name]: value }, `root.${name}`);
              } else if (node) {
                store.updateProps(
                  node.id,
                  { [name]: value },
                  `${node.id}.${name}`
                );
              }
            }}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
