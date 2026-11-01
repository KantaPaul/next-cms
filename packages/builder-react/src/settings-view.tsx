/**
 * Settings view (E12 / R693, R722): inspector with SectionAccordion,
 * SettingsSearch, ChangedFilter ("Show changed only"), and device switching.
 */

import {
  type Device,
  type FieldDef,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
} from '@nextcms/builder-core';
import {
  ControlRow,
  FieldGroup,
  FieldRow as FieldRowFrame,
  GroupControl,
  type ControlState,
} from '@nextcms/editor-ui';
import { Copy, Filter, RotateCcw, Search, Trash2 } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import {
  DeviceProvider,
  type FieldComponent,
  FieldControl,
  FieldTypesProvider,
  fieldControlId,
} from './fields';
import { DeviceSwitch, type InspectorBlock } from './inspector';

export interface SettingsViewProps {
  blocks: Record<string, InspectorBlock>;
  fieldTypes?: Record<string, FieldComponent>;
  className?: string;
}

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
    default:
      return 'General';
  }
}

export function SettingsView({
  blocks,
  fieldTypes,
  className,
}: SettingsViewProps) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const selection = useEditor(state => state.selection);
  const selectedId = selection.length === 1 ? selection[0] : null;
  const count = selection.length;
  const node = useEditor(state => (selectedId ? state.doc.nodes[selectedId] : null));

  const [searchQuery, setSearchQuery] = useState('');
  const [changedOnly, setChangedOnly] = useState(false);

  const block = node ? blocks[node.type] : null;
  const props = node ? node.props : {};
  const defaultProps = block?.defaultProps ?? {};
  const isLocked = !!node?.meta?.locked;

  // Group fields into accordion sections
  const sections = useMemo(() => {
    if (!block) return {};
    const grouped: Record<string, Array<[string, FieldDef]>> = {};
    const q = searchQuery.trim().toLowerCase();

    for (const [name, field] of Object.entries(block.fields)) {
      if (field.when && !field.when(props)) continue;

      const isChanged = fieldChanged(field, props[name], defaultProps[name], device);
      if (changedOnly && !isChanged) continue;

      if (q) {
        const matches =
          name.toLowerCase().includes(q) ||
          (field.label ?? '').toLowerCase().includes(q) ||
          (field.description ?? '').toLowerCase().includes(q);
        if (!matches) continue;
      }

      const sec = fieldSection(field);
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push([name, field]);
    }

    return grouped;
  }, [block, props, defaultProps, device, searchQuery, changedOnly]);

  const totalChangedCount = useMemo(() => {
    if (!block) return 0;
    return Object.entries(block.fields).filter(([name, field]) =>
      fieldChanged(field, props[name], defaultProps[name], device)
    ).length;
  }, [block, props, defaultProps, device]);

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
          {/* Header controls: Search & Changed Filter */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flex: 1,
                padding: '3px 6px',
                borderRadius: 4,
                border: '1px solid var(--ne-border)',
                background: 'var(--ne-surface-subtle)',
              }}
            >
              <Search size={13} style={{ color: 'var(--ne-text-muted)' }} />
              <input
                type="search"
                placeholder="Search settings…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: 'var(--ne-text)',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              aria-label="Filter changed properties"
              aria-pressed={changedOnly}
              title={changedOnly ? 'Show all properties' : 'Show changed only'}
              onClick={() => setChangedOnly(c => !c)}
              style={{
                padding: '4px 6px',
                borderRadius: 4,
                border: '1px solid var(--ne-border)',
                background: changedOnly ? 'var(--ne-primary-soft)' : 'var(--ne-surface)',
                color: changedOnly ? 'var(--ne-primary)' : 'var(--ne-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              <Filter size={12} />
              <span>{totalChangedCount > 0 ? totalChangedCount : ''}</span>
            </button>
          </div>

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
            {Object.keys(sections).length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ne-text-muted)', margin: '24px 0' }}>
                {searchQuery || changedOnly
                  ? 'No matching settings found.'
                  : 'No editable settings.'}
              </p>
            ) : (
              Object.entries(sections).map(([sectionTitle, fields]) => {
                const sectionChangedCount = fields.filter(([name, field]) =>
                  fieldChanged(field, props[name], defaultProps[name], device)
                ).length;

                return (
                  <div key={sectionTitle} style={{ marginBottom: 8 }}>
                    <FieldGroup
                      title={sectionTitle}
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
