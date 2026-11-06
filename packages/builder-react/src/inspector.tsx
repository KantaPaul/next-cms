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
  type InspectorTabDef,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
  layoutFields,
  fieldChanged,
  DEFAULT_TABS,
} from '@nextcms/builder-core';
import {
  FieldRow as FieldRowFrame,
  IconButton,
  InspectorTabs as InspectorTabsBar,
  SlidingIndicator,
  useSlidingIndicator,
} from '@nextcms/editor-ui';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import {
  DeviceProvider,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
  fieldValueAccess,
} from './fields';
import { PartOrderField } from './part-order-field';

export type InspectorBlock = {
  label: string;
  fields: Record<string, FieldDef>;
  /** Custom inspector tabs for this block. */
  tabs?: InspectorTabDef[];
  /** Default props for changed-field dots and reset (R722). */
  defaultProps?: Record<string, unknown>;
};

const DEVICE_ICONS: Record<Device, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/** Desktop, tablet, and mobile buttons; switches the canvas and per-device fields. */
export function DeviceSwitch({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const groupRef = useRef<HTMLFieldSetElement>(null);
  useSlidingIndicator(groupRef, device);
  return (
    <fieldset
      ref={groupRef}
      aria-label="Edit for device"
      style={
        {
          position: 'relative',
          display: 'inline-flex',
          gap: 2,
          border: 0,
          margin: 0,
          padding: 0,
          '--ne-ind-bg': 'var(--ne-primary-soft)',
          '--ne-ind-shadow': 'none',
          ...style,
        } as CSSProperties
      }
    >
      <SlidingIndicator />
      {DEVICES.map(d => {
        const Icon = DEVICE_ICONS[d];
        const label = d[0].toUpperCase() + d.slice(1);
        return (
          <IconButton
            key={d}
            size="sm"
            // The sliding indicator draws the active background.
            style={device === d ? { color: 'var(--ne-primary)' } : undefined}
            data-ne-active={device === d ? 'true' : undefined}
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

/** One field row with a changed-field dot and reset controls (R722), drawn by editor-ui's FieldRow. */
function FieldRow({
  name,
  field,
  props,
  defaultProps = {},
  device,
  onChange,
  readOnly,
}: {
  name: string;
  field: FieldDef;
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  device: Device;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  if (field.when && !field.when(props)) return null;
  const access = fieldValueAccess(field, name);
  const value = access.read(props);
  const defaultValue = access.read(defaultProps);
  const changed = fieldChanged(field, value, defaultValue, device);
  const responsive = !!field.responsive;
  const source = responsive ? inheritedFrom(value, device) : null;
  const isContainer = field.type === 'list' || field.type === 'object';

  return (
    <FieldRowFrame
      layout="vertical"
      label={field.label ?? name}
      htmlFor={isContainer ? undefined : fieldControlId(name)}
      description={field.description}
      changed={changed}
      onReset={
        readOnly
          ? undefined
          : () =>
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
  rootLabel = 'Page',
}: {
  blocks: Record<string, InspectorBlock>;
  /** Page settings shown when nothing is selected. */
  rootFields?: Record<string, FieldDef>;
  /** Defaults for root fields, for changed-field dots and reset. */
  rootDefaultProps?: Record<string, unknown>;
  fieldTypes?: Record<string, FieldComponent>;
  /** Shown above page settings when nothing is selected. */
  empty?: ReactNode;
  /** Label for the root document (e.g. 'Page', 'Header', 'Footer'). */
  rootLabel?: string;
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

  const rootBlock = useMemo<InspectorBlock>(
    () => ({
      label: rootLabel,
      fields: rootFields,
      defaultProps: rootDefaultProps,
    }),
    [rootLabel, rootFields, rootDefaultProps]
  );

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
                  : rootLabel}
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
                key="root"
                block={rootBlock}
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

/**
 * Document (root) settings on their own, whatever is selected: for views
 * like Page Settings that always edit the document.
 */
export function RootInspector({
  fields,
  defaultProps = {},
  label = 'Page',
  fieldTypes,
}: {
  fields: Record<string, FieldDef>;
  defaultProps?: Record<string, unknown>;
  label?: string;
  fieldTypes?: Record<string, FieldComponent>;
}) {
  const device = useEditor(state => state.device);
  const rootProps = useEditor(state => state.doc.root.props);
  const block = useMemo<InspectorBlock>(
    () => ({ label, fields, defaultProps }),
    [label, fields, defaultProps]
  );
  if (Object.keys(fields).length === 0) return null;
  return (
    <FieldTypesProvider types={fieldTypes}>
      <DeviceProvider value={device}>
        <InspectorTabs
          key="root"
          block={block}
          node={null as any}
          props={rootProps}
          defaultProps={defaultProps}
          device={device}
          readOnly={false}
          isRoot
        />
      </DeviceProvider>
    </FieldTypesProvider>
  );
}

type InspectorTabsProps = {
  block: InspectorBlock;
  node: { id: string; type?: string } | null;
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
  defaultProps = {},
  device,
  readOnly,
  isRoot = false,
}: InspectorTabsProps) {
  const store = useEditorStore();
  const [query, setQuery] = useState('');
  const [pickedTab, setPickedTab] = useState<string | null>(null);
  const reorder =
    !isRoot && node?.type ? store.schemas[node.type]?.reorder : undefined;

  const layoutResult = useMemo(
    () =>
      layoutFields({
        fields: block.fields,
        props,
        defaultProps,
        device,
        tabs: block.tabs,
        query,
      }),
    [block, props, defaultProps, device, query]
  );

  const availableTabIds = useMemo(
    () => layoutResult.tabs.map(t => t.def.id),
    [layoutResult.tabs]
  );

  const activeTab =
    pickedTab && availableTabIds.includes(pickedTab)
      ? pickedTab
      : availableTabIds[0] ?? 'content';

  const currentTab = layoutResult.tabs.find(t => t.def.id === activeTab);
  const sections = query.trim()
    ? layoutResult.tabs.flatMap(t => t.sections)
    : currentTab?.sections ?? [];

  const shownFields = sections.flatMap(s => s.fields);

  const tabs = layoutResult.tabs.map(t => {
    const totalFields = t.sections.reduce((sum, s) => sum + s.fields.length, 0);
    return {
      id: t.def.id,
      label: t.def.label,
      badge: totalFields || undefined,
      changed: t.changedCount > 0,
      ariaLabel: `${t.def.label} (${totalFields}${t.changedCount > 0 ? ', changed' : ''})`,
    };
  });

  return (
    <div
      style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0, 1fr)' }}
    >
      <InspectorTabsBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={id => setPickedTab(id)}
        searchQuery={query}
        onSearchChange={setQuery}
      />
      <div
        role="tabpanel"
        aria-label={currentTab?.def.label ?? activeTab}
        style={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        {reorder && activeTab === 'content' && !query.trim() && node && (
          <PartOrderField
            nodeId={node.id}
            reorder={reorder}
            props={props}
            readOnly={readOnly}
          />
        )}
        {shownFields.length === 0 && !reorder && (
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
        {shownFields.map(([name, field]) => {
          const access = fieldValueAccess(field, name);
          const targetPath = access.path;
          return (
            <FieldRow
              key={name}
              name={`${isRoot ? 'root' : (node?.id ?? 'root')}.${name}`}
              field={field}
              props={props}
              defaultProps={defaultProps}
              device={device}
              onChange={value => {
                const patch = access.write(props, value);
                if (isRoot) {
                  store.updateRootProps(patch, `root.${targetPath}`);
                } else if (node) {
                  store.updateProps(
                    node.id,
                    patch,
                    `${node.id}.${targetPath}`
                  );
                }
              }}
              readOnly={readOnly}
            />
          );
        })}
      </div>
    </div>
  );
}
