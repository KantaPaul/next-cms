/**
 * Page settings view (E12): inspector for document-level / root settings
 * (title, layout, metadata, overlay controls). Built on shared SettingsPanel
 * and bound to store.updateRootProps.
 */

import type { FieldDef } from '@nextcms/builder-core';
import { ExternalLink } from 'lucide-react';
import React, { useMemo } from 'react';
import { useEditor, useEditorStore } from './context';
import type { FieldComponent } from './fields';
import { SettingsPanel } from './settings-panel';

export interface PageSettingsViewProps {
  fields?: Record<string, FieldDef>;
  label?: string;
  defaultProps?: Record<string, unknown>;
  settingsHref?: string;
  fieldTypes?: Record<string, FieldComponent>;
  className?: string;

  /** "Show only changed", controlled. */
  changedOnly?: boolean;
  defaultChangedOnly?: boolean;
  onChangedOnlyChange?: (changedOnly: boolean) => void;
  onChangedCountChange?: (count: number) => void;
  hideChangedFilter?: boolean;
}

export function PageSettingsView({
  fields = {},
  label = 'Page',
  defaultProps = {},
  settingsHref,
  fieldTypes,
  className,
  changedOnly,
  defaultChangedOnly = false,
  onChangedOnlyChange,
  onChangedCountChange,
  hideChangedFilter = false,
}: PageSettingsViewProps) {
  const store = useEditorStore();
  const rootProps = useEditor(state => state.doc.root?.props || {});

  const hasFields = Object.keys(fields).length > 0;
  if (!hasFields) {
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
        <p style={{ margin: '16px 0 8px' }}>
          No settings for this {label.toLowerCase()}.
        </p>
      </div>
    );
  }

  const effectiveProps = useMemo(
    () => ({ ...defaultProps, ...rootProps }),
    [defaultProps, rootProps]
  );

  const headerExtras = settingsHref ? (
    <a
      href={settingsHref}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--ne-primary)',
        textDecoration: 'none',
      }}
    >
      URL & SEO settings
      <ExternalLink size={11} />
    </a>
  ) : undefined;

  return (
    <SettingsPanel
      className={className}
      panelKey="root"
      label={label}
      fields={fields}
      props={effectiveProps}
      defaultProps={defaultProps}
      fieldTypes={fieldTypes}
      headerExtras={headerExtras}
      changedOnly={changedOnly}
      defaultChangedOnly={defaultChangedOnly}
      onChangedOnlyChange={onChangedOnlyChange}
      onChangedCountChange={onChangedCountChange}
      hideChangedFilter={hideChangedFilter}
      onPatch={(patch, path) => {
        store.updateRootProps(patch, `root.${path}`);
      }}
    />
  );
}
