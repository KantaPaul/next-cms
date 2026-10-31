'use client';

import type { ReactNode } from 'react';
import { useEntry } from '@/components/analytics/entry-context';
import { sanitizeRichText } from '../sanitize';
import { Section, type SectionSettings } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type CollectionItemProps = WithSection & {
  /** Which field to render inline. Falls back to listing all fields. */
  field?: string;
};

export function CollectionItem(p: CollectionItemProps): ReactNode {
  const { entry } = useEntry();
  // No entry context means we're inside the builder preview (or the entry
  // couldn't be resolved). Always render the editing placeholder so the block
  // is visible on the canvas instead of an empty Section.
  if (!entry || p.editing) {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border s-muted s-radius flex min-h-40 items-center justify-center border border-dashed text-sm">
          Collection item fills in on the collection page
        </div>
      </Section>
    );
  }

  const fieldKey = p.field;
  const fields = entry.collection.fields ?? [];
  const field =
    fields.find((f: { key: string }) => f.key === fieldKey) ?? fields[0];

  if (!field) return null;

  const entryData = entry.data as Record<string, unknown> | undefined;
  const value = entryData?.[field.key];
  const label = field.label;

  return (
    <Section section={p.section} editing={p.editing}>
      <div className="s-muted space-y-1">
        {label && <span className="text-sm font-medium">{label}</span>}
        {field.type === 'richtext' ? (
          <div
            className="s-prose prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichText(String(value ?? '')),
            }}
          />
        ) : field.type === 'media' ? (
          value ? (
            <img src={String(value)} alt="" className="max-w-full" />
          ) : null
        ) : (
          <p>{String(value ?? '')}</p>
        )}
      </div>
    </Section>
  );
}
