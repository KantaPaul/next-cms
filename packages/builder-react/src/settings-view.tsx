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
  layoutFields,
  fieldChanged,
  fieldSectionTitle,
  fieldTabId,
  DEFAULT_TABS,
  type LayoutFieldsResult,
  type LayoutSection,
} from '@nextcms/builder-core';
import {
  ChangedFilter,
  FieldGroup,
  FieldRow as FieldRowFrame,
  PanelTabs,
  SettingsSearch,
} from '@nextcms/editor-ui';
import { Copy, FileText, Paintbrush, Sliders, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import {
  DeviceProvider,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
  fieldValueAccess,
} from './fields';
import { DeviceSwitch, type InspectorBlock } from './inspector';
import { SETTINGS_TAB_EVENT, type SettingsTabId } from './keyboard';
import { PartOrderField } from './part-order-field';

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
  const [openSection, setOpenSection] = useState<string | null>(null);

  const block = node ? blocks[node.type] : null;
  const reorder = node ? store.schemas[node.type]?.reorder : undefined;
  const props = node ? node.props : {};
  const defaultProps = block?.defaultProps ?? {};
  const isLocked = !!node?.meta?.locked;

  // Lay out fields using the dynamic inspector layout engine
  const layoutResult = useMemo<LayoutFieldsResult>(() => {
    if (!block) return { tabs: [] };
    return layoutFields({
      fields: block.fields,
      props,
      defaultProps,
      device,
      tabs: block.tabs,
      query: searchQuery,
      changedOnly,
    });
  }, [block, props, defaultProps, device, searchQuery, changedOnly]);

  const availableTabIds = useMemo(
    () => layoutResult.tabs.map(t => t.def.id),
    [layoutResult.tabs]
  );

  // The picked tab stays selected when you change blocks if the new block has it;
  // otherwise the panel falls back to the first tab.
  const activeTab: SettingsTabId =
    pickedTab && availableTabIds.includes(pickedTab)
      ? pickedTab
      : availableTabIds[0] ?? 'content';

  // ⌥C / ⌥S / ⌥A from the editor keyboard (keyboard.ts) - ignores tabs current block doesn't have.
  useEffect(() => {
    const onTab = (event: Event) => {
      const tab = (event as CustomEvent<SettingsTabId>).detail;
      if (availableTabIds.includes(tab)) {
        setPickedTab(tab);
        setOpenSection(null);
      }
    };
    window.addEventListener(SETTINGS_TAB_EVENT, onTab);
    return () => window.removeEventListener(SETTINGS_TAB_EVENT, onTab);
  }, [availableTabIds]);

  // Which way the panel body slides: towards later tabs, or back.
  const tabIndex = availableTabIds.indexOf(activeTab);
  const lastTab = useRef({ index: tabIndex, block: selectedId });
  const slide =
    lastTab.current.block !== selectedId || lastTab.current.index === tabIndex
      ? 'none'
      : tabIndex > lastTab.current.index
        ? 'next'
        : 'prev';
  useEffect(() => {
    lastTab.current = { index: tabIndex, block: selectedId };
  }, [tabIndex, selectedId]);

  const currentTab = layoutResult.tabs.find(t => t.def.id === activeTab);
  const sections = searchQuery.trim()
    ? layoutResult.tabs.flatMap(t => t.sections)
    : currentTab?.sections ?? [];

  // Reset open section when activeTab or block changes
  useEffect(() => {
    setOpenSection(null);
  }, [activeTab, selectedId]);

  const totalChangedCount = useMemo(() => {
    if (!block) return 0;
    const all = layoutFields({
      fields: block.fields,
      props,
      defaultProps,
      device,
      tabs: block.tabs,
    });
    return all.tabs.reduce((sum, t) => sum + t.changedCount, 0);
  }, [block, props, defaultProps, device]);

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

  const panelTabs = layoutResult.tabs.map(t => ({
    id: t.def.id,
    label: t.def.label,
    shortcut: t.def.shortcut ?? '',
    icon:
      t.def.id === 'content' ? (
        <FileText size={13} />
      ) : t.def.id === 'style' ? (
        <Paintbrush size={13} />
      ) : t.def.id === 'advanced' ? (
        <Sliders size={13} />
      ) : undefined,
    changed: t.changedCount > 0,
  }));

  return (
    <FieldTypesProvider types={fieldTypes}>
      <DeviceProvider value={device}>
        <div
          className={className}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', font: 'var(--ne-text-body)' }}
        >
          {panelTabs.length > 0 && (
            <PanelTabs
              ariaLabel="Settings tabs"
              variant="segmented"
              activeTab={activeTab}
              onChange={id => {
                setPickedTab(id as SettingsTabId);
                setOpenSection(null);
              }}
              tabs={panelTabs}
            />
          )}

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

          {/* Accordion Sections: first section is open by default, others collapsed (Elementor style) */}
          <div
            // Remounts per block, tab and "Show only changed", so the body
            // slides in from the tab's side and its sections cascade in
            // (editor motion level applies). Search keeps it mounted.
            key={`${selectedId}:${activeTab}:${changedOnly ? 'changed' : 'all'}`}
            data-ne-slide={slide}
            style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}
            className="ne-scrollbar ne-tab-panel ne-stagger"
          >
            {sections.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ne-text-muted)', margin: '24px 0' }}>
                {searchQuery || changedOnly
                  ? 'No matching settings found.'
                  : `No ${activeTab} settings for this block.`}
              </p>
            ) : (
              sections.map(({ title: sectionTitle, fields, changedCount }, sectionIndex) => {
                const isSearching = !!searchQuery.trim();
                const isExpanded = isSearching
                  ? true
                  : openSection === null
                    ? sectionIndex === 0
                    : openSection === sectionTitle;

                return (
                  <div key={sectionTitle} style={{ marginBottom: 8 }}>
                    <FieldGroup
                      title={sectionTitle}
                      changedCount={changedCount}
                      expanded={isExpanded}
                      onExpandedChange={next => {
                        if (!isSearching) {
                          setOpenSection(next ? sectionTitle : '');
                        }
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
                        {reorder &&
                          activeTab === 'content' &&
                          sectionIndex === 0 &&
                          !isSearching &&
                          !changedOnly && (
                            <PartOrderField
                              nodeId={node.id}
                              reorder={reorder}
                              props={props}
                              readOnly={isLocked}
                            />
                          )}
                        {fields.map(([name, field]) => {
                          const access = fieldValueAccess(field, name);
                          const val = access.read(props);
                          const defVal = access.read(defaultProps);
                          const isChanged = fieldChanged(field, val, defVal, device);
                          const isResp = !!field.responsive;
                          const source = isResp ? inheritedFrom(val, device) : null;
                          const isContainer = field.type === 'list' || field.type === 'object';
                          const targetPath = access.path;

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
                                  : () => {
                                      const nextVal = isResp
                                        ? resetDeviceValue(val, device)
                                        : defVal;
                                      const patch = access.write(props, nextVal);
                                      store.updateProps(
                                        node.id,
                                        patch,
                                        `${node.id}.${targetPath}`
                                      );
                                    }
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
                                onChange={next => {
                                  const patch = access.write(props, next);
                                  store.updateProps(
                                    node.id,
                                    patch,
                                    `${node.id}.${targetPath}`
                                  );
                                }}
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
