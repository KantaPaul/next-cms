/**
 * Settings view (E12 / R693, R722): inspector with Content / Style / Advanced
 * tabs (⌥C / ⌥S / ⌥A), SettingsSearch, ChangedFilter ("Show only changed"),
 * collapsible sections with a modified dot, and device switching.
 */

import {
  type Device,
  type FieldDef,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
} from '@nextcms/builder-core';
import {
  ChangedFilter,
  FieldGroup,
  FieldRow as FieldRowFrame,
  PanelTabs,
  SettingsSearch,
} from '@nextcms/editor-ui';
import { Copy, FileText, Paintbrush, Sliders, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import {
  DeviceProvider,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
} from './fields';
import { DeviceSwitch, type InspectorBlock } from './inspector';
import { SETTINGS_TAB_EVENT, type SettingsTabId } from './keyboard';

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

export function fieldChanged(
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

/** Categorize a field into an accordion group. */
function fieldSection(field: FieldDef): string {
  const g = (field.group ?? '').toLowerCase();
  if (g.includes('content') || g.includes('basic') || g.includes('main')) return 'Content';
  if (g.includes('layout') || g.includes('spacing') || g.includes('dimension')) return 'Layout & Spacing';
  if (g.includes('typo') || g.includes('font') || g.includes('text')) return 'Typography';
  if (g.includes('border') || g.includes('corner') || g.includes('radius')) return 'Borders';
  if (g.includes('back') || g.includes('color') || g.includes('shadow') || g.includes('effect')) return 'Background & Effects';
  if (g.includes('advanced') || g.includes('meta')) return 'Advanced';

  // Fallback by type
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'image':
    case 'icon':
    case 'media':
      return 'Content';
    case 'color':
    case 'shadow':
    case 'background':
      return 'Background & Effects';
    case 'typography':
      return 'Typography';
    case 'border':
      return 'Borders';
    case 'dimensions':
    case 'flex':
    case 'alignment':
      return 'Layout & Spacing';
    case 'easing':
    case 'transition':
      return 'Animation & Effects';
    default:
      return 'General';
  }
}

const SETTINGS_TABS: { id: SettingsTabId; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Content', shortcut: '⌥C', icon: <FileText size={13} /> },
  { id: 'style', label: 'Style', shortcut: '⌥S', icon: <Paintbrush size={13} /> },
  { id: 'advanced', label: 'Advanced', shortcut: '⌥A', icon: <Sliders size={13} /> },
];

/** Which tab a section lives in. */
function sectionTab(section: string): SettingsTabId {
  if (section === 'Content') return 'content';
  if (section === 'Advanced' || section === 'Animation & Effects') return 'advanced';
  return 'style';
}

export function settingsFieldTab(field: FieldDef): SettingsTabId {
  return sectionTab(fieldSection(field));
}

export type SettingsSection = {
  title: string;
  fields: Array<[string, FieldDef]>;
  changedCount: number;
};

/**
 * The visible sections for a block: fields hidden by `when` are dropped, then
 * the tab (ignored while searching), "Show only changed", and the query
 * (name, label, or description) narrow them down.
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
  const q = query.trim().toLowerCase();
  const sections = new Map<string, SettingsSection>();
  for (const [name, field] of Object.entries(fields)) {
    if (field.when && !field.when(props)) continue;
    const section = fieldSection(field);
    if (tab && !q && sectionTab(section) !== tab) continue;
    const changed = fieldChanged(field, props[name], defaultProps[name], device);
    if (changedOnly && !changed) continue;
    if (
      q &&
      !name.toLowerCase().includes(q) &&
      !(field.label ?? '').toLowerCase().includes(q) &&
      !(field.description ?? '').toLowerCase().includes(q)
    )
      continue;
    let entry = sections.get(section);
    if (!entry) {
      entry = { title: section, fields: [], changedCount: 0 };
      sections.set(section, entry);
    }
    entry.fields.push([name, field]);
    if (changed) entry.changedCount++;
  }
  return [...sections.values()];
}

export function SettingsView({
  blocks,
  fieldTypes,
  className,
  changedOnly: controlledChangedOnly,
  defaultChangedOnly = false,
  onChangedOnlyChange,
  onChangedCountChange,
  hideChangedFilter = false,
}: SettingsViewProps) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const selection = useEditor(state => state.selection);
  const selectedId = selection.length === 1 ? selection[0] : null;
  const count = selection.length;
  const node = useEditor(state => (selectedId ? state.doc.nodes[selectedId] : null));

  const [searchQuery, setSearchQuery] = useState('');
  const [uncontrolledChangedOnly, setUncontrolledChangedOnly] =
    useState(defaultChangedOnly);
  const changedOnly = controlledChangedOnly ?? uncontrolledChangedOnly;
  const setChangedOnly = (next: boolean) => {
    if (controlledChangedOnly === undefined) setUncontrolledChangedOnly(next);
    onChangedOnlyChange?.(next);
  };
  const [pickedTab, setPickedTab] = useState<SettingsTabId | null>(null);

  const block = node ? blocks[node.type] : null;
  const props = node ? node.props : {};
  const defaultProps = block?.defaultProps ?? {};
  const isLocked = !!node?.meta?.locked;

  const tabsWithFields = useMemo(() => {
    const present = new Set<SettingsTabId>();
    for (const field of Object.values(block?.fields ?? {}))
      present.add(settingsFieldTab(field));
    return present;
  }, [block]);
  // Start on the first tab that has fields; a picked tab sticks across blocks.
  const activeTab: SettingsTabId =
    pickedTab ??
    SETTINGS_TABS.find(t => tabsWithFields.has(t.id))?.id ??
    'content';

  // ⌥C / ⌥S / ⌥A from the editor keyboard (keyboard.ts).
  useEffect(() => {
    const onTab = (event: Event) => {
      const tab = (event as CustomEvent<SettingsTabId>).detail;
      if (SETTINGS_TABS.some(t => t.id === tab)) setPickedTab(tab);
    };
    window.addEventListener(SETTINGS_TAB_EVENT, onTab);
    return () => window.removeEventListener(SETTINGS_TAB_EVENT, onTab);
  }, []);

  const sections = useMemo(
    () =>
      block
        ? filterSettingsFields({
            fields: block.fields,
            props,
            defaultProps,
            device,
            query: searchQuery,
            changedOnly,
            tab: activeTab,
          })
        : [],
    [block, props, defaultProps, device, searchQuery, changedOnly, activeTab]
  );

  const changedByTab = useMemo(() => {
    const counts: Record<SettingsTabId, number> = { content: 0, style: 0, advanced: 0 };
    for (const [name, field] of Object.entries(block?.fields ?? {})) {
      if (fieldChanged(field, props[name], defaultProps[name], device))
        counts[settingsFieldTab(field)]++;
    }
    return counts;
  }, [block, props, defaultProps, device]);
  const totalChangedCount =
    changedByTab.content + changedByTab.style + changedByTab.advanced;

  useEffect(() => {
    onChangedCountChange?.(totalChangedCount);
  }, [onChangedCountChange, totalChangedCount]);

  // Multiple blocks selected view
  if (count > 1) {
    return (
      <div className={className} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ne-text)' }}>
          {count} blocks selected
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ne-text-muted)' }}>
          Select a single block to configure properties, or perform batch actions below.
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
  if (!node || !block) {
    return (
      <div className={className} style={{ padding: 16, textAlign: 'center', color: 'var(--ne-text-muted)', fontSize: 12 }}>
        <p style={{ margin: '16px 0 8px' }}>No block selected.</p>
        <p style={{ margin: 0 }}>Click an element on the canvas to configure its properties.</p>
      </div>
    );
  }

  return (
    <FieldTypesProvider types={fieldTypes}>
      <DeviceProvider value={device}>
        <div
          className={className}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', font: 'var(--ne-text-body)' }}
        >
          <PanelTabs
            ariaLabel="Settings tabs"
            variant="segmented"
            activeTab={activeTab}
            onChange={id => setPickedTab(id as SettingsTabId)}
            tabs={SETTINGS_TABS.map(t => ({
              ...t,
              changed: changedByTab[t.id] > 0,
            }))}
          />

          {/* Search & Changed Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderBottom: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
            }}
          >
            <SettingsSearch value={searchQuery} onChange={setSearchQuery} />
            {!hideChangedFilter && (
              <ChangedFilter
                checked={changedOnly}
                onChange={setChangedOnly}
                changedTotal={totalChangedCount}
              />
            )}
          </div>

          {searchQuery.trim() && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                fontSize: 11,
                background: 'var(--ne-primary-soft)',
                color: 'var(--ne-primary)',
                borderBottom: '1px solid var(--ne-border)',
              }}
            >
              <span>Searching all tabs for “{searchQuery.trim()}”</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 0, background: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Device bar if block has responsive fields */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderBottom: '1px solid var(--ne-border)',
              fontSize: 11,
              color: 'var(--ne-text-muted)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--ne-text)' }}>
              {block.label ?? node.type}
            </span>
            <DeviceSwitch />
          </div>

          {/* Accordion Sections */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }} className="ne-scrollbar">
            {sections.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ne-text-muted)', margin: '24px 0' }}>
                {searchQuery || changedOnly
                  ? 'No matching settings found.'
                  : `No ${activeTab} settings for this block.`}
              </p>
            ) : (
              sections.map(({ title: sectionTitle, fields, changedCount }) => {
                return (
                  <div key={sectionTitle} style={{ marginBottom: 8 }}>
                    <FieldGroup
                      title={sectionTitle}
                      changedCount={changedCount}
                      // Searching opens every matching section.
                      expanded={searchQuery.trim() ? true : undefined}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
                        {fields.map(([name, field]) => {
                          const val = props[name];
                          const defVal = defaultProps[name];
                          const isChanged = fieldChanged(field, val, defVal, device);
                          const isResp = !!field.responsive;
                          const source = isResp ? inheritedFrom(val, device) : null;
                          const isContainer = field.type === 'list' || field.type === 'object';

                          return (
                            <FieldRowFrame
                              key={name}
                              label={field.label ?? name}
                              htmlFor={isContainer ? undefined : fieldControlId(name)}
                              description={field.description}
                              changed={isChanged}
                              onReset={
                                isLocked || field.readOnly
                                  ? undefined
                                  : () =>
                                      store.updateProps(
                                        node.id,
                                        {
                                          [name]: isResp
                                            ? resetDeviceValue(val, device)
                                            : defVal,
                                        },
                                        `${node.id}.${name}`
                                      )
                              }
                              device={isResp ? device : undefined}
                              isInherited={!!source && source !== device}
                              inheritedFrom={source ?? undefined}
                            >
                              <FieldControl
                                bare
                                name={`${node.id}.${name}`}
                                field={field}
                                value={val}
                                props={props}
                                onChange={next =>
                                  store.updateProps(
                                    node.id,
                                    { [name]: next },
                                    `${node.id}.${name}`
                                  )
                                }
                                readOnly={isLocked || field.readOnly}
                              />
                            </FieldRowFrame>
                          );
                        })}
                      </div>
                    </FieldGroup>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DeviceProvider>
    </FieldTypesProvider>
  );
}
