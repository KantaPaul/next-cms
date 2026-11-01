/**
 * Page settings view (E12): inspector for document-level / root settings
 * (title, slug, metadata, global styles). Bound to store.updateRootProps.
 */

import { ControlRow } from '@nextcms/editor-ui';
import type React from 'react';
import { useEditor, useEditorStore } from './context';

export interface PageSettingsViewProps {
  className?: string;
  customRootFields?: React.ReactNode;
}

export function PageSettingsView({
  className,
  customRootFields,
}: PageSettingsViewProps) {
  const store = useEditorStore();
  const root = useEditor(state => state.doc.root);
  const props = root.props || {};

  const update = (patch: Record<string, unknown>) => {
    store.updateRootProps(patch, 'page.settings');
  };

  const title = String(props.title ?? '');
  const slug = String(props.slug ?? '');
  const description = String(props.description ?? '');

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        font: 'var(--ne-text-body)',
        color: 'var(--ne-text)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Page Settings</span>
        <span style={{ fontSize: 11, color: 'var(--ne-text-muted)' }}>
          Configure document metadata, URLs, and SEO.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Page Title */}
        <ControlRow label="Page Title" htmlFor="page-setting-title">
          <input
            id="page-setting-title"
            type="text"
            value={title}
            placeholder="e.g. Home, About Us"
            onChange={e => update({ title: e.target.value })}
            style={{
              width: '100%',
              height: 28,
              padding: '0 8px',
              borderRadius: 4,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-text)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </ControlRow>

        {/* Slug */}
        <ControlRow label="URL Slug" htmlFor="page-setting-slug">
          <input
            id="page-setting-slug"
            type="text"
            value={slug}
            placeholder="e.g. /home"
            onChange={e => update({ slug: e.target.value })}
            style={{
              width: '100%',
              height: 28,
              padding: '0 8px',
              borderRadius: 4,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-text)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </ControlRow>

        {/* Description */}
        <ControlRow label="Description" htmlFor="page-setting-description">
          <textarea
            id="page-setting-description"
            rows={3}
            value={description}
            placeholder="Brief meta description for search engines..."
            onChange={e => update({ description: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--ne-border)',
              background: 'var(--ne-surface)',
              color: 'var(--ne-text)',
              fontSize: 12,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </ControlRow>

        {customRootFields}
      </div>
    </div>
  );
}
