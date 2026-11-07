'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEntry } from '@/components/analytics/entry-context';
import { cn } from '@/lib/utils/cn';
import { sanitizeRichText } from '../sanitize';
import { type ElementStyle, resolveElementStyle } from '../style';
import { el, type WithSection } from './element';
import { Section } from './section';

type TextSize = 'auto' | 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'small';
type Align = 'left' | 'center' | 'right';

/** One row of "Fields to display": a field and its own styling. */
export type CollectionItemField = {
  field?: string;
  textSize?: TextSize;
  showLabel?: boolean;
  labelText?: string;
  style?: ElementStyle;
  labelStyle?: ElementStyle;
};

export type CollectionItemProps = WithSection & {
  /** Fields to render, each with its own style. Empty shows the full entry. */
  items?: CollectionItemField[];
  /** `table`: label / value rows with hairline dividers (spec sheets). */
  layout?: 'card' | 'clean' | 'table';
  direction?: 'stack' | 'row' | 'grid';
  gap?: 'sm' | 'md' | 'lg';
  align?: Align;
  /** Legacy single-field props, read when `items` is empty. */
  field?: string;
  textSize?: TextSize;
  showLabel?: boolean;
};

type EntryField = { key: string; label: string; type: string };

const SIZE_CLASS: Record<Exclude<TextSize, 'auto'>, string> = {
  h1: 'text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--site-fg)]',
  h2: 'text-2xl md:text-3xl font-bold tracking-tight',
  h3: 'text-xl md:text-2xl font-bold tracking-tight text-[var(--site-fg)]',
  lead: 'text-lg md:text-xl s-muted leading-relaxed',
  body: 'text-base text-[var(--site-fg)] font-medium',
  small: 'text-sm s-muted',
};

const SIZE_TAG: Record<Exclude<TextSize, 'auto'>, 'h1' | 'h2' | 'h3' | 'p'> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  lead: 'p',
  body: 'p',
  small: 'p',
};

const GAP_CLASS = { sm: 'gap-2', md: 'gap-4', lg: 'gap-8' } as const;

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function styleOf(style: ElementStyle | undefined): {
  classes: string[];
  style: CSSProperties;
} {
  if (!style || Object.keys(style).length === 0) return { classes: [], style: {} };
  return resolveElementStyle(style);
}

/** The rows to render: `items`, or the legacy single `field` prop. */
function rowsOf(p: CollectionItemProps): CollectionItemField[] {
  const items = (p.items ?? []).filter(item => item && item.field);
  if (items.length) return items;
  if (p.field) {
    return [{ field: p.field, textSize: p.textSize, showLabel: p.showLabel }];
  }
  return [];
}

function FieldValue({
  row,
  field,
  value,
  isTitleField,
  align,
  editing,
}: {
  row: CollectionItemField;
  field: EntryField;
  value: unknown;
  isTitleField: boolean;
  align: Align;
  editing?: boolean;
}): ReactNode {
  const showLabel = row.showLabel ?? true;
  const label = row.labelText?.trim() || field.label;
  const valueStyle = styleOf(row.style);
  const labelStyle = styleOf(row.labelStyle);

  const size: Exclude<TextSize, 'auto'> =
    row.textSize && row.textSize !== 'auto'
      ? row.textSize
      : isTitleField
        ? 'h2'
        : 'body';

  let content: ReactNode;
  if (field.type === 'richtext') {
    content = (
      <div
        className={cn(
          's-prose prose prose-lg max-w-none text-[var(--site-fg)]',
          ...valueStyle.classes
        )}
        style={valueStyle.style}
        dangerouslySetInnerHTML={{
          __html: sanitizeRichText(
            String(value ?? (editing ? `<p><em>[${label} content]</em></p>` : ''))
          ),
        }}
      />
    );
  } else if (field.type === 'media') {
    content = value ? (
      <img
        src={String(value)}
        alt={label}
        className={cn(
          'max-h-96 max-w-full rounded-lg object-cover',
          align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : '',
          ...valueStyle.classes
        )}
        style={valueStyle.style}
      />
    ) : editing ? (
      <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed text-xs s-muted">
        [No image for {label}]
      </div>
    ) : null;
  } else {
    const Tag = SIZE_TAG[size];
    const text =
      typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : String(value ?? (editing ? `[${label}]` : ''));
    content = text ? (
      <Tag
        className={cn(SIZE_CLASS[size], ...valueStyle.classes)}
        style={valueStyle.style}
      >
        {text}
      </Tag>
    ) : null;
  }

  if (!content && !editing) return null;

  return (
    <div className="min-w-0 space-y-1.5">
      {showLabel && label && (
        <span
          className={cn(
            'block text-xs font-semibold uppercase tracking-wider s-muted',
            ...labelStyle.classes
          )}
          style={labelStyle.style}
        >
          {label}
        </span>
      )}
      {content}
    </div>
  );
}

export function CollectionItem(p: CollectionItemProps): ReactNode {
  const { entry } = useEntry();
  // No entry context means we're inside a page that isn't connected to a collection template.
  // Render the editing placeholder so the block is visible on the canvas.
  if (!entry) {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border s-muted s-radius flex min-h-40 flex-col items-center justify-center border border-dashed p-6 text-center text-sm">
          <p className="font-semibold text-[var(--site-fg)]">Collection Item</p>
          <p className="text-xs s-muted mt-1 max-w-sm">
            This block displays dynamic collection content when used on a
            collection template page, or when viewed at
            /collections/[collection]/[entry].
          </p>
        </div>
      </Section>
    );
  }

  const fields: EntryField[] = entry.collection?.fields ?? [];
  const entryData = (entry.data as Record<string, unknown>) ?? {};
  const rows = rowsOf(p);

  // No field chosen yet: a preview card of the entire entry.
  if (!rows.length) {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border space-y-4 rounded-xl border p-6 shadow-sm">
          <div className="border-b pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider s-muted">
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
                  <span className="text-xs font-semibold s-muted uppercase tracking-wide">
                    {f.label}
                  </span>
                  {f.type === 'richtext' ? (
                    <div
                      className="s-prose prose prose-sm max-w-none text-[var(--site-fg)]"
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

  const layout = p.layout ?? 'card';
  const align = p.align ?? 'left';
  const direction = p.direction ?? 'stack';
  const container = el(
    p,
    'container',
    cn(
      layout === 'card' && 's-surface s-border s-radius border p-6 shadow-sm',
      direction === 'row'
        ? 'flex flex-wrap items-start'
        : direction === 'grid'
          ? 'grid sm:grid-cols-2'
          : 'flex flex-col',
      GAP_CLASS[p.gap ?? 'md'],
      ALIGN_CLASS[align]
    )
  );

  if (layout === 'table') {
    const tableEl = el(p, 'container', 's-card s-card-outline overflow-hidden');
    return (
      <Section section={p.section} editing={p.editing}>
        <dl className={tableEl.className} style={tableEl.style}>
          {rows.map((row, index) => {
            const field = fields.find(f => f.key === row.field);
            if (!field) return null;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: a field may be listed twice
                key={index}
                className="s-border grid gap-1 border-b px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(8rem,38%)_1fr] sm:gap-6"
              >
                <dt className="s-meta font-semibold uppercase tracking-[0.12em]">
                  {row.labelText?.trim() || field.label}
                </dt>
                <dd className="min-w-0">
                  <FieldValue
                    row={{ ...row, showLabel: false, textSize: row.textSize ?? 'body' }}
                    field={field}
                    value={entryData[field.key]}
                    isTitleField={false}
                    align="left"
                    editing={p.editing}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>
    );
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <div className={container.className} style={container.style}>
        {rows.map((row, index) => {
          const field = fields.find(f => f.key === row.field);
          if (!field) {
            return p.editing ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no ids
              <p key={index} className="text-xs s-muted">
                [Field &ldquo;{row.field}&rdquo; no longer exists]
              </p>
            ) : null;
          }
          return (
            <FieldValue
              // biome-ignore lint/suspicious/noArrayIndexKey: a field may be listed twice
              key={index}
              row={row}
              field={field}
              value={entryData[field.key]}
              isTitleField={
                field.key === 'title' ||
                field.key === 'name' ||
                fields[0]?.key === field.key
              }
              align={align}
              editing={p.editing}
            />
          );
        })}
      </div>
    </Section>
  );
}
