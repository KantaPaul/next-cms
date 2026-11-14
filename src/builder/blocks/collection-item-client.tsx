'use client';

import { ExternalLink } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEntry } from '@/components/analytics/entry-context';
import {
  entryFeaturedMedia,
  entryGalleryMedia,
  entryMediaValues,
  isValidGeneralUrl,
  mergeFeaturedWithFieldMedia,
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
} from '@/config/post-types';
import { cn } from '@/lib/utils/cn';
import { sanitizeRichText } from '../sanitize';
import {
  type ElementStyle,
  hasActiveMotion,
  type MotionEffectsSettings,
  resolveElementStyle,
} from '../style';
import {
  CollectionGallery,
  type GalleryAspect,
  type GalleryStyle,
} from './collection-gallery-client';
import { el, type WithSection } from './element';
import { EmbedContentFrame, VideoContentFrame } from './embed-frames';
import { OverlayTrigger } from './overlay-trigger';
import { Section } from './section';

type TextSize = 'auto' | 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'small';
type Align = 'left' | 'center' | 'right';
type UrlDisplayMode = 'link' | 'button' | 'text';

/** One row of "Fields to display": a field and its own styling. */
export type CollectionItemField = {
  field?: string;
  textSize?: TextSize;
  showLabel?: boolean;
  labelText?: string;
  popupTrigger?: boolean;
  overlayId?: string;
  posterUrl?: string;
  galleryStyle?: GalleryStyle;
  galleryAspect?: GalleryAspect;
  excludeFeaturedImage?: boolean;
  urlDisplay?: UrlDisplayMode;
  urlLinkText?: string;
  urlNewTab?: boolean;
  motion?: MotionEffectsSettings;
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

type EntryField = {
  key: string;
  label: string;
  type: string;
  config?: unknown;
};

const SIZE_CLASS: Record<Exclude<TextSize, 'auto'>, string> = {
  h1: 'text-4xl s-tab-text-5xl font-extrabold tracking-tight text-[var(--site-fg)]',
  h2: 'text-2xl s-tab-text-3xl font-bold tracking-tight',
  h3: 'text-xl s-tab-text-2xl font-bold tracking-tight text-[var(--site-fg)]',
  lead: 'text-lg s-tab-text-xl s-muted leading-relaxed',
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
  left: 'text-start',
  center: 'text-center',
  right: 'text-end',
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
  featuredImage,
  isTitleField,
  align,
  editing,
}: {
  row: CollectionItemField;
  field: EntryField;
  value: unknown;
  featuredImage: string | null;
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
    const fieldUrls = entryMediaValues(value);
    const mediaMeta = readMediaFieldConfig(field.config);
    const isMultiField = Boolean(mediaMeta.multiple);
    const isFeaturedField = Boolean(mediaMeta.isFeatured);
    const shouldExcludeFeatured = Boolean(
      row.excludeFeaturedImage && isMultiField && !isFeaturedField
    );
    const galleryImages = shouldExcludeFeatured
      ? featuredImage
        ? fieldUrls.filter(url => url !== featuredImage)
        : fieldUrls
      : isMultiField || fieldUrls.length > 1
        ? mergeFeaturedWithFieldMedia(value, featuredImage)
        : fieldUrls;
    const useGallery = galleryImages.length > 1 || isMultiField;
    const usePopupTrigger = Boolean(
      galleryImages.length && row.popupTrigger && row.overlayId
    );

    const mediaInner = useGallery && galleryImages.length > 0 ? (
      <CollectionGallery
        images={galleryImages}
        alt={label}
        galleryStyle={row.galleryStyle ?? 'facebook'}
        galleryAspect={row.galleryAspect ?? 'auto'}
        enableLightbox={!usePopupTrigger}
        showFeaturedBadge={!shouldExcludeFeatured}
        overlayId={usePopupTrigger ? row.overlayId : undefined}
        className={cn(...valueStyle.classes)}
        style={valueStyle.style}
      />
    ) : galleryImages[0] ? (
      <img
        src={galleryImages[0]}
        alt={label}
        className={cn(
          'max-h-96 max-w-full rounded-lg object-cover',
          align === 'center' ? 'mx-auto' : align === 'right' ? 'ms-auto' : '',
          ...valueStyle.classes
        )}
        style={valueStyle.style}
      />
    ) : editing ? (
      <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed text-xs s-muted">
        [No image for {label}]
      </div>
    ) : null;

    const mediaNode =
      !useGallery && mediaInner && usePopupTrigger && row.overlayId ? (
        <OverlayTrigger
          overlayId={row.overlayId}
          className={cn(
            'block w-fit max-w-full',
            align === 'center' ? 'mx-auto' : align === 'right' ? 'ms-auto' : ''
          )}
          lightbox={{
            image: galleryImages[0],
            alt: label,
          }}
        >
          {mediaInner}
        </OverlayTrigger>
      ) : (
        mediaInner
      );

    content =
      mediaNode && isFeaturedField && hasActiveMotion(row.motion) ? (
        <div
          className={cn(
            'overflow-hidden rounded-lg max-w-full',
            useGallery ? 'w-full' : 'w-fit',
            align === 'center' ? 'mx-auto' : align === 'right' ? 'ms-auto' : ''
          )}
        >
          <div data-motion={JSON.stringify(row.motion)}>{mediaNode}</div>
        </div>
      ) : (
        mediaNode
      );
  } else {
    const textMode =
      field.type === 'text' ? readTextFieldMode(field.config) : 'plain';
    const urlMode =
      field.type === 'url' ? readUrlFieldMode(field.config) : 'other';
    const isVideoMode =
      (field.type === 'text' && textMode === 'video') ||
      (field.type === 'url' && urlMode === 'video');
    const isEmbedMode = field.type === 'text' && textMode === 'embed';
    const isUrlMode = field.type === 'url' && urlMode === 'other';
    const rawStr = typeof value === 'string' ? value.trim() : '';

    if (isVideoMode) {
      content =
        rawStr || editing || (row.popupTrigger && row.overlayId) ? (
          <VideoContentFrame
            url={rawStr}
            posterUrl={row.posterUrl}
            popupTrigger={row.popupTrigger}
            overlayId={row.overlayId}
            editing={editing}
            emptyMessage={`[No video URL for ${label}]`}
            frameClassName={cn(
              's-radius aspect-video w-full rounded-lg',
              ...valueStyle.classes
            )}
            frameStyle={valueStyle.style}
          />
        ) : null;
    } else if (isEmbedMode) {
      content =
        rawStr || editing ? (
          <EmbedContentFrame
            url={rawStr}
            editing={editing}
            emptyMessage={`[No embed URL for ${label}]`}
            frameClassName={cn(
              's-radius aspect-video w-full rounded-lg',
              ...valueStyle.classes
            )}
            frameStyle={valueStyle.style}
          />
        ) : null;
    } else if (isUrlMode) {
      const display = row.urlDisplay ?? 'link';
      const newTab = row.urlNewTab !== false;
      const linkText = row.urlLinkText?.trim() || rawStr || (editing ? `[${label}]` : '');
      const validHref = rawStr && isValidGeneralUrl(rawStr) ? rawStr : undefined;

      if (!rawStr) {
        content = editing ? (
          <p className="text-sm s-muted">[{label} URL]</p>
        ) : null;
      } else if (display === 'text' || !validHref) {
        const Tag = SIZE_TAG[size];
        content = (
          <Tag
            className={cn(SIZE_CLASS[size], ...valueStyle.classes)}
            style={valueStyle.style}
          >
            {rawStr}
          </Tag>
        );
      } else if (display === 'button') {
        content = (
          <a
            href={validHref}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
            className={cn(
              's-primary-bg inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:opacity-90',
              align === 'center' ? 'mx-auto' : align === 'right' ? 'ms-auto' : '',
              ...valueStyle.classes
            )}
            style={valueStyle.style}
          >
            <span>{linkText}</span>
            {newTab && <ExternalLink className="size-3.5" aria-hidden />}
          </a>
        );
      } else {
        content = (
          <a
            href={validHref}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
            className={cn(
              's-primary-text inline-flex items-center gap-1 text-base font-medium underline underline-offset-4 hover:opacity-80',
              ...valueStyle.classes
            )}
            style={valueStyle.style}
          >
            <span>{linkText}</span>
            {newTab && <ExternalLink className="size-3.5" aria-hidden />}
          </a>
        );
      }
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
  // CollectionItem configures motion per image field under Content; ignore any legacy section.motion.
  const sectionProps = p.section?.motion
    ? { ...p.section, motion: undefined }
    : p.section;
  // No entry context means we're inside a page that isn't connected to a collection template.
  // Render the editing placeholder so the block is visible on the canvas.
  if (!entry) {
    return (
      <Section section={sectionProps} editing={p.editing}>
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
  const featuredImage = entryFeaturedMedia(entryData, fields);
  const galleryMedia = entryGalleryMedia(entryData, fields);
  const rows = rowsOf(p);

  // No field chosen yet: a preview card of the entire entry.
  if (!rows.length) {
    const titleText = String(entryData.title || entryData.name || entry.slug);
    return (
      <Section section={sectionProps} editing={p.editing}>
        <div className="s-surface s-border space-y-4 rounded-xl border p-6 shadow-sm">
          <div className="border-b pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider s-muted">
              {entry.collection.name}
            </span>
            <h3 className="text-2xl font-bold mt-1">{titleText}</h3>
          </div>
          {galleryMedia.hasGallery && (
            <CollectionGallery
              images={galleryMedia.images}
              alt={titleText}
              galleryStyle="facebook"
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(f => {
              const value = entryData[f.key];
              const mediaUrls = f.type === 'media' ? entryMediaValues(value) : [];
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
                  ) : f.type === 'media' && mediaUrls.length > 1 ? (
                    <CollectionGallery
                      images={mergeFeaturedWithFieldMedia(value, featuredImage)}
                      alt={f.label}
                      galleryStyle="facebook"
                    />
                  ) : f.type === 'media' && mediaUrls[0] ? (
                    <img
                      src={mediaUrls[0]}
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
      <Section section={sectionProps} editing={p.editing}>
        <dl
          className={tableEl.className}
          style={tableEl.style}
          data-overlay-group=""
        >
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
                    featuredImage={featuredImage}
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
    <Section section={sectionProps} editing={p.editing}>
      <div
        className={container.className}
        style={container.style}
        data-overlay-group=""
      >
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
              featuredImage={featuredImage}
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
