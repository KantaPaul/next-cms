'use client';

import type { ReactNode } from 'react';
import { useEntry } from '@/components/analytics/entry-context';
import { cn } from '@/lib/utils/cn';
import { sanitizeRichText } from '../sanitize';
import { Section, type SectionSettings } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type CollectionItemProps = WithSection & {
  /** Which field to render inline. Falls back to listing all fields. */
  field?: string;
  layout?: 'card' | 'clean';
  textSize?: 'auto' | 'h1' | 'h2' | 'h3' | 'lead' | 'body';
  align?: 'left' | 'center' | 'right';
  showLabel?: boolean;
};

export function CollectionItem(p: CollectionItemProps): ReactNode {
  const { entry } = useEntry();
  // No entry context means we're inside a page that isn't connected to a collection template.
  // Render the editing placeholder so the block is visible on the canvas.
  if (!entry) {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border s-muted s-radius flex min-h-40 flex-col items-center justify-center border border-dashed p-6 text-center text-sm">
          <p className="font-semibold text-foreground">Collection Item</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            This block displays dynamic collection content when used on a
            collection template page, or when viewed at
            /collections/[collection]/[entry].
          </p>
        </div>
      </Section>
    );
  }

  const fieldKey = p.field;
  const fields = entry.collection?.fields ?? [];
  const entryData = (entry.data as Record<string, unknown>) ?? {};

  // If no specific field selected, render a comprehensive preview card of the entire entry
  if (!fieldKey) {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border space-y-4 rounded-xl border p-6 shadow-sm">
          <div className="border-b pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {entry.collection.name}
            </span>
            <h3 className="text-2xl font-bold mt-1">
              {String(entryData.title || entryData.name || entry.slug)}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(f => {
              const value = entryData[f.key];
              return (
                <div key={f.key} className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {f.label}
                  </span>
                  {f.type === 'richtext' ? (
                    <div
                      className="s-prose prose prose-sm max-w-none text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichText(String(value ?? '')),
                      }}
                    />
                  ) : f.type === 'media' && value ? (
                    <img
                      src={String(value)}
                      alt={f.label}
                      className="max-h-48 rounded object-cover"
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {String(value ?? '-')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    );
  }

  const field =
    fields.find((f: { key: string }) => f.key === fieldKey) ?? fields[0];

  if (!field) return null;

  const value = entryData?.[field.key];
  const label = field.label;
  const showLabel = p.showLabel ?? true;
  const layout = p.layout ?? 'card';
  const align = p.align ?? 'left';

  const isTitleField =
    field.key === 'title' ||
    field.key === 'name' ||
    fields[0]?.key === field.key;

  const resolvedSize =
    p.textSize && p.textSize !== 'auto'
      ? p.textSize
      : isTitleField
        ? 'h2'
        : 'body';

  const textValue = String(value ?? (p.editing ? `[${label}]` : ''));

  let textElement: ReactNode;
  switch (resolvedSize) {
    case 'h1':
      textElement = (
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {textValue}
        </h1>
      );
      break;
    case 'h2':
      textElement = (
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {textValue}
        </h2>
      );
      break;
    case 'h3':
      textElement = (
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          {textValue}
        </h3>
      );
      break;
    case 'lead':
      textElement = (
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          {textValue}
        </p>
      );
      break;
    case 'body':
    default:
      textElement = (
        <p className="text-base text-foreground font-medium">{textValue}</p>
      );
      break;
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          layout === 'card'
            ? 's-surface s-border rounded-xl border p-6 shadow-sm space-y-3'
            : 'space-y-1.5',
          align === 'center'
            ? 'text-center'
            : align === 'right'
              ? 'text-right'
              : 'text-left'
        )}
      >
        {showLabel && label && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            {label}
          </span>
        )}
        {field.type === 'richtext' ? (
          <div
            className="s-prose prose prose-lg max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichText(
                String(
                  value ??
                    (p.editing ? `<p><em>[${label} content]</em></p>` : '')
                )
              ),
            }}
          />
        ) : field.type === 'media' ? (
          value ? (
            <img
              src={String(value)}
              alt={label}
              className={cn(
                'max-w-full rounded-lg object-cover',
                layout === 'card' ? 'max-h-80 w-full' : 'max-h-96',
                align === 'center'
                  ? 'mx-auto'
                  : align === 'right'
                    ? 'ml-auto'
                    : ''
              )}
            />
          ) : p.editing ? (
            <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              [No image for {label}]
            </div>
          ) : null
        ) : (
          textElement
        )}
      </div>
    </Section>
  );
}
