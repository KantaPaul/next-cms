/**
 * SettingsPanel: shared settings renderer for both block inspector
 * and document (page/header/popup/etc.) settings.
 *
 * Includes tabs with shortcuts and modified dots, search, "Show only changed",
 * device bar, accordion sections with cascade motion, field reset, and
 * per-device inheritance.
 */

import {
  createDynamicBinding,
  type Device,
  type FieldDef,
  inheritedFrom,
  isDynamicBinding,
  resetDeviceValue,
  layoutFields,
  fieldChanged,
  type InspectorTabDef,
  type LayoutFieldsResult,
  type LayoutSection,
  valueForDevice,
  withDeviceValue,
} from '@nextcms/builder-core';
import {
  ChangedFilter,
  FieldGroup,
  FieldRow as FieldRowFrame,
  PanelTabs,
  SettingsSearch,
} from '@nextcms/editor-ui';
import { FileText, Paintbrush, Sliders } from 'lucide-react';
import React, { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from './context';
import { DeviceSwitch } from './device-switch';
import {
  BreakpointsProvider,
  DeviceProvider,
  DynamicTriggerButton,
  fieldAllowsDynamic,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
  fieldDrawsOwnLabel,
  fieldValueAccess,
  useDynamicSources,
} from './fields';
import { SETTINGS_TAB_EVENT, type SettingsTabId } from './keyboard';

export interface SettingsPanelProps {
  /** Identifier for animation slide tracking and DOM control scoping. */
  panelKey: string;
  /** Heading displayed in the device bar (e.g. block label or "Page"). */
  label: string;
  fields: Record<string, FieldDef>;
  tabs?: InspectorTabDef[];
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  readOnly?: boolean;
  onPatch: (patch: Record<string, unknown>, path: string) => void;
  renderSectionExtras?: (info: {
    tab: SettingsTabId;
    sectionIndex: number;
    isSearching: boolean;
    changedOnly: boolean;
  }) => ReactNode;
  fieldTypes?: Record<string, FieldComponent>;
  /** Optional element rendered next to the label in the device bar (e.g. SEO link). */
  headerExtras?: ReactNode;
  className?: string;

  /** "Show only changed", controlled. */
  changedOnly?: boolean;
  defaultChangedOnly?: boolean;
  onChangedOnlyChange?: (changedOnly: boolean) => void;
  /** Reports how many settings differ from defaults. */
  onChangedCountChange?: (count: number) => void;
  /** Hides the built-in "Show only changed" button when a host drives it. */
  hideChangedFilter?: boolean;
}

export function SettingsPanel({
  panelKey,
  label,
  fields,
  tabs,
  props,
  defaultProps = {},
  readOnly = false,
  onPatch,
  renderSectionExtras,
  fieldTypes,
  headerExtras,
  className,
  changedOnly: controlledChangedOnly,
  defaultChangedOnly = false,
  onChangedOnlyChange,
  onChangedCountChange,
  hideChangedFilter = false,
}: SettingsPanelProps) {
  const device = useEditor(state => state.device);
  const breakpoints = useEditor(state => state.breakpoints);
  const dynamicDefaults = useDynamicSources();

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

  // Lay out fields using the dynamic inspector layout engine
  const layoutResult = useMemo<LayoutFieldsResult>(() => {
    return layoutFields({
      fields,
      props,
      defaultProps,
      device,
      tabs,
      query: searchQuery,
      changedOnly,
    });
  }, [fields, props, defaultProps, device, tabs, searchQuery, changedOnly]);

  const availableTabIds = useMemo(
    () => layoutResult.tabs.map(t => t.def.id),
    [layoutResult.tabs]
  );

  // The picked tab stays selected when you switch items if the new item has it;
  // otherwise the panel falls back to the first tab.
  const activeTab: SettingsTabId =
    pickedTab && availableTabIds.includes(pickedTab)
      ? pickedTab
      : (availableTabIds[0] as SettingsTabId) ?? 'content';

  // ⌥C / ⌥S / ⌥A from the editor keyboard (keyboard.ts) - ignores tabs current item doesn't have.
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
  const lastTab = useRef({ index: tabIndex, block: panelKey });
  const slide =
    lastTab.current.block !== panelKey || lastTab.current.index === tabIndex
      ? 'none'
      : tabIndex > lastTab.current.index
        ? 'next'
        : 'prev';
  useEffect(() => {
    lastTab.current = { index: tabIndex, block: panelKey };
  }, [tabIndex, panelKey]);

  const currentTab = layoutResult.tabs.find(t => t.def.id === activeTab);
  const sections = searchQuery.trim()
    ? layoutResult.tabs.flatMap(t => t.sections)
    : currentTab?.sections ?? [];

  // Reset open section when activeTab or panelKey changes
  useEffect(() => {
    setOpenSection(null);
  }, [activeTab, panelKey]);

  const totalChangedCount = useMemo(() => {
    const all = layoutFields({
      fields,
      props,
      defaultProps,
      device,
      tabs,
    });
    return all.tabs.reduce((sum, t) => sum + t.changedCount, 0);
  }, [fields, props, defaultProps, device, tabs]);

  useEffect(() => {
    onChangedCountChange?.(totalChangedCount);
  }, [onChangedCountChange, totalChangedCount]);

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
      <BreakpointsProvider value={breakpoints}>
        <DeviceProvider value={device}>
        <div
          className={className}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            font: 'var(--ne-text-body)',
            minWidth: 0,
            overflow: 'hidden',
          }}
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
                style={{
                  border: 0,
                  background: 'none',
                  color: 'inherit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Device bar with label, optional extra links, and device switch */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--ne-text)' }}>
                {label}
              </span>
              {headerExtras}
            </div>
            <DeviceSwitch />
          </div>

          {/* Accordion Sections: first section is open by default, others collapsed */}
          <div
            key={`${panelKey}:${activeTab}:${changedOnly ? 'changed' : 'all'}`}
            data-ne-slide={slide}
            style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}
            className="ne-scrollbar ne-tab-panel ne-stagger"
          >
            {sections.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--ne-text-muted)',
                  margin: '24px 0',
                }}
              >
                {searchQuery || changedOnly
                  ? 'No matching settings found.'
                  : `No ${activeTab} settings.`}
              </p>
            ) : (
              sections.map(
                (
                  { title: sectionTitle, fields: sectionFields, changedCount },
                  sectionIndex
                ) => {
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
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            paddingTop: 6,
                          }}
                        >
                          {renderSectionExtras?.({
                            tab: activeTab,
                            sectionIndex,
                            isSearching,
                            changedOnly,
                          })}
                          {sectionFields.map(([name, field]) => {
                            const access = fieldValueAccess(field, name);
                            const val = access.read(props);
                            const defVal = access.read(defaultProps);
                            const isChanged = fieldChanged(
                              field,
                              val,
                              defVal,
                              device
                            );
                            const isResp = !!field.responsive;
                            const source = isResp
                              ? inheritedFrom(val, device, breakpoints)
                              : null;
                            const isContainer =
                              field.type === 'list' || field.type === 'object';
                            const targetPath = access.path;
                            const resolvedVal = isResp
                              ? valueForDevice(val, device, breakpoints)
                              : val;
                            const canDynamic =
                              fieldAllowsDynamic(field) &&
                              !isDynamicBinding(resolvedVal) &&
                              !(readOnly || field.readOnly);

                            const hideLabel = fieldDrawsOwnLabel(field);
                            const controlName = `${panelKey}.${name}`;
                            return (
                              <FieldRowFrame
                                key={name}
                                label={field.label ?? name}
                                htmlFor={
                                  isContainer
                                    ? undefined
                                    : fieldControlId(controlName)
                                }
                                description={field.description}
                                changed={isChanged}
                                adornment={
                                  canDynamic ? (
                                    <DynamicTriggerButton
                                      onClick={() => {
                                        const binding = createDynamicBinding(
                                          dynamicDefaults.defaultSource,
                                          dynamicDefaults.defaultPath,
                                          ''
                                        );
                                        const nextVal = isResp
                                          ? withDeviceValue(val, device, binding)
                                          : binding;
                                        const patch = access.write(
                                          props,
                                          nextVal
                                        );
                                        onPatch(patch, targetPath);
                                      }}
                                    />
                                  ) : undefined
                                }
                                onReset={
                                  readOnly || field.readOnly
                                    ? undefined
                                    : () => {
                                        const nextVal = isResp
                                          ? resetDeviceValue(val, device)
                                          : defVal;
                                        const patch = access.write(
                                          props,
                                          nextVal
                                        );
                                        onPatch(patch, targetPath);
                                      }
                                }
                                device={isResp ? device : undefined}
                                isInherited={!!source && source !== device}
                                inheritedFrom={source ?? undefined}
                                hideLabel={hideLabel}
                              >
                                <FieldControl
                                  bare
                                  name={controlName}
                                  field={field}
                                  value={val}
                                  props={props}
                                  onChange={next => {
                                    const patch = access.write(props, next);
                                    onPatch(patch, targetPath);
                                  }}
                                  readOnly={readOnly || field.readOnly}
                                />
                              </FieldRowFrame>
                            );
                          })}
                        </div>
                      </FieldGroup>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      </DeviceProvider>
      </BreakpointsProvider>
    </FieldTypesProvider>
  );
}
