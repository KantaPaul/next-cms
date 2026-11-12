import type { CSSProperties, ReactNode } from 'react';
import { parseEmbedInput, parseVideoUrl } from '@/config/post-types';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { sanitizeRichText } from '../sanitize';
import {
  type Device,
  hideOnClasses,
  type ImageSize,
  type MaybeResponsive,
  normalizeUrlValue,
  resolveImageSize,
  resolveLinkProps,
  resolveResponsive,
  resolveSectionStyle,
  type UrlValue,
} from '../style';
import { BlockList } from './block-list';
import { ContactFormClient } from './contact-form-client';
import { CopyButtonClient } from './copy-button-client';
import { el, type WithSection } from './element';
import { EmbedContentFrame, VideoContentFrame } from './embed-frames';
import { OverlayTrigger } from './overlay-trigger';
import {
  columnsGridStyle,
  HEADER_COL_JUSTIFY,
  type HeaderColAlign,
  headerColJustify,
} from './header-grid';
import {
  DEFAULT_SECTION,
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

import {
  CollectionItem as CollectionItemClient,
  type CollectionItemProps,
} from './collection-item-client';

export type { CollectionItemProps };
export function CollectionItem(p: CollectionItemProps) {
  return <CollectionItemClient {...p} />;
}

export type RichTextProps = WithSection & {
  content: string;
  filteredHtml?: string;
  width?: 'narrow' | 'normal' | 'wide';
};

const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

export function RichText(p: RichTextProps) {
  const contentEl = el(p, 'content', 's-prose prose prose-lg max-w-none');
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <div
        className={contentEl.className}
        style={contentEl.style}
        dangerouslySetInnerHTML={{
          __html: p.filteredHtml ?? sanitizeRichText(p.content),
        }}
      />
    </Section>
  );
}

export type ImageProps = WithSection & {
  url?: string;
  alt?: string;
  caption?: string;
  aspect?: 'auto' | 'video' | 'square' | 'wide';
  width?: 'normal' | 'wide' | 'full';
  link?: UrlValue;
  /** CSS width in px (optional). */
  imageWidth?: number;
  /** CSS height in px (optional). */
  imageHeight?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  imageSize?: ImageSize;
  popupTrigger?: boolean;
  overlayId?: string;
};

const ASPECT = {
  auto: '',
  video: 'aspect-video',
  square: 'aspect-square',
  wide: 'aspect-[21/9]',
};
const IMAGE_WIDTH = {
  normal: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: 'max-w-none',
};

export function ImageBlock(p: ImageProps) {
  if (!p.url) {
    return p.editing ? (
      <Section section={p.section} editing>
        <div className="s-surface s-border s-muted s-radius flex aspect-video items-center justify-center border border-dashed text-sm">
          Choose an image in the sidebar
        </div>
      </Section>
    ) : null;
  }

  const resolvedSize = resolveImageSize(p.imageSize, p.url);
  const finalUrl = resolvedSize.src || p.url;
  const effectiveWidth = resolvedSize.width ?? p.imageWidth;
  const effectiveHeight = resolvedSize.height ?? p.imageHeight;

  const fit = p.objectFit ?? 'cover';
  const dimStyle =
    effectiveWidth || effectiveHeight
      ? {
          width: effectiveWidth ? `${effectiveWidth}px` : undefined,
          height: effectiveHeight ? `${effectiveHeight}px` : undefined,
          maxWidth: '100%' as const,
        }
      : undefined;

  const imageEl = el(
    p,
    'image',
    cn(
      's-radius',
      !dimStyle && 'w-full',
      fit === 'contain'
        ? 'object-contain'
        : fit === 'fill'
          ? 'object-fill'
          : 'object-cover',
      ASPECT[p.aspect ?? 'auto']
    )
  );
  const captionEl = el(p, 'caption', 's-muted mt-3 text-center text-sm');

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalUrl}
      alt={p.alt ?? ''}
      loading="lazy"
      width={effectiveWidth}
      height={effectiveHeight}
      sizes={resolvedSize.sizes}
      style={{ ...dimStyle, ...imageEl.style }}
      className={imageEl.className}
    />
  );

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={IMAGE_WIDTH[p.width ?? 'normal']}
    >
      <figure>
        {p.popupTrigger && p.overlayId ? (
          <OverlayTrigger
            overlayId={p.overlayId}
            lightbox={{
              image: p.url,
              alt: p.alt,
              caption: p.caption,
            }}
          >
            {img}
          </OverlayTrigger>
        ) : normalizeUrlValue(p.link).url ? (
          <a {...resolveLinkProps(p.link)}>{img}</a>
        ) : (
          img
        )}
        {p.caption && (
          <figcaption className={captionEl.className} style={captionEl.style}>
            {p.caption}
          </figcaption>
        )}
      </figure>
    </Section>
  );
}

/* ---------- Gallery ---------- */

export type GalleryItem = {
  url?: string;
  alt?: string;
  caption?: string;
  overlayId?: string;
};

export type GalleryProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items?: GalleryItem[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  popupTrigger?: boolean;
  overlayId?: string;
};

const GALLERY_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 s-desk-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 s-desk-cols-4',
};
const GALLERY_GAP = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };

export function Gallery(p: GalleryProps) {
  const items = (p.items ?? []).filter(i => i.url);
  const cols = (p.columns ?? 3) as 2 | 3 | 4;
  const gap = p.gap ?? 'md';
  const imageEl = el(
    p,
    'image',
    's-radius aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-105'
  );
  const captionEl = el(p, 'caption', 's-muted mt-2 text-center text-xs');

  if (!items.length) {
    return p.editing ? (
      <Section section={p.section} editing>
        <SectionHeading
          elements={p.elements}
          eyebrow={p.eyebrow}
          title={p.title}
          subtitle={p.subtitle}
        />
        <div className="s-surface s-border s-muted s-radius flex aspect-[21/9] items-center justify-center border border-dashed text-sm">
          Add images in the sidebar
        </div>
      </Section>
    ) : null;
  }

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading
        elements={p.elements}
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
      />
      <div
        className={cn('grid', GALLERY_COLS[cols], GALLERY_GAP[gap])}
        data-overlay-group=""
      >
        {items.map((item, i) => {
          const effectiveOverlayId = p.popupTrigger
            ? item.overlayId || p.overlayId
            : undefined;
          return (
            <MotionItem
              key={`${item.url}-${i}`}
              as="figure"
              className="overflow-hidden"
            >
              <OverlayTrigger
                overlayId={effectiveOverlayId}
                className="group/gallery-item block h-full w-full overflow-hidden"
                lightbox={{
                  image: item.url,
                  alt: item.alt,
                  caption: item.caption,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt ?? ''}
                  loading="lazy"
                  className={imageEl.className}
                  style={imageEl.style}
                />
              </OverlayTrigger>
              {item.caption && (
                <figcaption
                  className={captionEl.className}
                  style={captionEl.style}
                >
                  {item.caption}
                </figcaption>
              )}
            </MotionItem>
          );
        })}
      </div>
    </Section>
  );
}

export type ContactFormFieldCondition = {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'empty'
    | 'not_empty'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte';
  value?: string;
};

export type ContactFormField = {
  label: string;
  name: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'textarea'
    | 'number'
    | 'date'
    | 'url'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'step'
    | 'file'
    | 'hidden'
    | 'acceptance'
    | 'calculated';
  required?: boolean;
  placeholder?: string;
  options?: string;
  accept?: 'images' | 'documents' | 'both';
  maxSizeMb?: number;
  multiple?: boolean;
  hiddenValue?: string;
  hiddenSource?: 'static' | 'url_param';
  conditions?: ContactFormFieldCondition[];
  conditionMatch?: 'all' | 'any';
  conditionAction?: 'show' | 'hide' | 'require';
  formula?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

export type ContactFormProps = WithSection & {
  title?: string;
  subtitle?: string;
  fields: ContactFormField[];
  submitText?: string;
  successMessage?: string;
  actionUrl?: string;
  formId?: string;
  nodeId?: string;
  formSource?: {
    kind: 'global' | 'page' | 'post';
    id: string;
    nodeId?: string;
  };
  actions?: ('email' | 'redirect' | 'webhook' | 'mailchimp')[];
  emailTo?: string;
  emailSubject?: string;
  emailReplyToField?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  mailchimpListId?: string;
  mailchimpEmailField?: string;
  mailchimpFirstNameField?: string;
  mailchimpLastNameField?: string;
  mailchimpTags?: string;
  mailchimpDoubleOptIn?: boolean;
};

export function ContactForm(p: ContactFormProps) {
  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-2xl">
      <SectionHeading
        elements={p.elements}
        title={p.title}
        subtitle={p.subtitle}
      />
      <ContactFormClient
        fields={p.fields ?? []}
        submitText={p.submitText || 'Send message'}
        successMessage={p.successMessage || 'Thanks! We will be in touch soon.'}
        actionUrl={p.actionUrl}
        formId={p.formId}
        nodeId={p.nodeId}
        formSource={p.formSource}
        editing={p.editing}
        elements={p.elements}
      />
    </Section>
  );
}

/* ---------- Video ---------- */

export type VideoProps = WithSection & {
  url?: string;
  posterUrl?: string;
  popupTrigger?: boolean;
  overlayId?: string;
};

export function Video(p: VideoProps) {
  const cleanUrl = typeof p.url === 'string' ? p.url.trim() : '';
  const hasLightbox = Boolean(p.popupTrigger && p.overlayId);
  const source = cleanUrl ? parseVideoUrl(cleanUrl) : null;
  if (!hasLightbox && !source && !p.editing) return null;

  const frameEl = el(p, 'frame', 's-radius aspect-video h-full w-full rounded');
  return (
    <Section section={p.section} editing={p.editing}>
      <VideoContentFrame
        url={cleanUrl}
        posterUrl={p.posterUrl}
        popupTrigger={p.popupTrigger}
        overlayId={p.overlayId}
        editing={p.editing}
        frameClassName={frameEl.className}
        frameStyle={frameEl.style}
      />
    </Section>
  );
}

/* ---------- Embed ---------- */

export type EmbedProps = WithSection & {
  url?: string;
};

export function Embed(p: EmbedProps) {
  const url = typeof p.url === 'string' ? p.url.trim() : '';
  const parsed = url ? parseEmbedInput(url) : null;
  if (!parsed && !p.editing) return null;

  const frameEl = el(p, 'frame', 's-radius aspect-video h-full w-full rounded');
  return (
    <Section section={p.section} editing={p.editing}>
      <EmbedContentFrame
        url={url}
        editing={p.editing}
        frameClassName={frameEl.className}
        frameStyle={frameEl.style}
      />
    </Section>
  );
}

/* ---------- Code ---------- */

export type CodeProps = WithSection & {
  code?: string;
  /** Shown in the header bar, e.g. "config.json". */
  filename?: string;
  showCopy?: boolean;
};

export function Code(p: CodeProps) {
  const code = p.code ?? '';
  const frameEl = el(
    p,
    'frame',
    's-surface s-border s-radius overflow-hidden border'
  );
  const headerEl = el(
    p,
    'header',
    's-border flex items-center justify-between gap-3 border-b px-4 py-1.5'
  );
  const codeEl = el(p, 'code', 'font-mono');

  return (
    <Section section={p.section} editing={p.editing}>
      {code ? (
        <div className={frameEl.className} style={frameEl.style}>
          {(p.filename || p.showCopy !== false) && (
            <div className={headerEl.className} style={headerEl.style}>
              <span className="s-meta truncate font-mono">{p.filename}</span>
              {p.showCopy !== false && (
                <CopyButtonClient text={code} elements={p.elements} />
              )}
            </div>
          )}
          <pre className="overflow-auto p-4 text-sm leading-relaxed">
            <code className={codeEl.className} style={codeEl.style}>
              {code}
            </code>
          </pre>
        </div>
      ) : p.editing ? (
        <div className="s-surface s-border s-muted s-radius flex min-h-40 items-center justify-center border border-dashed text-sm">
          Add code in the sidebar
        </div>
      ) : null}
    </Section>
  );
}

export type SlotRender = (props: {
  minEmptyHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}) => ReactNode;
export type SlotValue = ReactNode | BuilderItem[] | SlotRender | undefined;

export type ColumnItemRef = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  meta?: { hidden?: boolean };
};

export type ColumnProps = WithSection & {
  width?: MaybeResponsive<string>;
  size?: MaybeResponsive<string>;
  align?: MaybeResponsive<'start' | 'center' | 'end'>;
  verticalAlign?: MaybeResponsive<'start' | 'center' | 'end'>;
  content?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
};

export type ColumnsProps = WithSection & {
  layout?: '1-1' | '1-1-1' | '1-1-1-1' | '2-1' | '1-2';
  gap?: 'sm' | 'md' | 'lg';
  verticalAlign?: 'start' | 'center' | 'end';
  columns?: SlotValue;
  columnItems?: ColumnItemRef[];
  column1?: SlotValue;
  column2?: SlotValue;
  column3?: SlotValue;
  column4?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
};

const LAYOUTS = {
  '1-1': { count: 2, grid: 's-tab-cols-2' },
  '1-1-1': { count: 3, grid: 's-tab-cols-3' },
  '1-1-1-1': { count: 4, grid: 's-tab-cols-2 s-desk-cols-4' },
  '2-1': { count: 2, grid: 's-tab-cols-2-1' },
  '1-2': { count: 2, grid: 's-tab-cols-1-2' },
};
const GAP = { sm: 'gap-4', md: 'gap-8', lg: 'gap-12' };
const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

const COLUMN_PADDING = {
  none: '',
  sm: 'py-8 s-tab-py-10',
  md: 'py-14 s-tab-py-20',
  lg: 'py-20 s-tab-py-28',
};

const COLUMN_BG = {
  default: '',
  muted: 's-section-muted',
  primary: 's-section-primary',
  dark: 's-section-dark',
};

const COL_ALIGN_MOBILE: Record<HeaderColAlign, string> = {
  start: 's-mob-justify-start s-mob-text-left',
  center: 's-mob-justify-center s-mob-text-center',
  end: 's-mob-justify-end s-mob-text-right',
};
const COL_ALIGN_TABLET: Record<HeaderColAlign, string> = {
  start: 's-tabonly-justify-start s-tabonly-text-left',
  center: 's-tabonly-justify-center s-tabonly-text-center',
  end: 's-tabonly-justify-end s-tabonly-text-right',
};
const COL_ALIGN_DESKTOP: Record<HeaderColAlign, string> = {
  start: 's-desk-justify-start s-desk-text-left',
  center: 's-desk-justify-center s-desk-text-center',
  end: 's-desk-justify-end s-desk-text-right',
};

const COL_VALIGN: Record<HeaderColAlign, string> = {
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
};
const COL_VALIGN_MOBILE: Record<HeaderColAlign, string> = {
  start: 's-mob-self-start',
  center: 's-mob-self-center',
  end: 's-mob-self-end',
};
const COL_VALIGN_TABLET: Record<HeaderColAlign, string> = {
  start: 's-tabonly-self-start',
  center: 's-tabonly-self-center',
  end: 's-tabonly-self-end',
};
const COL_VALIGN_DESKTOP: Record<HeaderColAlign, string> = {
  start: 's-desk-self-start',
  center: 's-desk-self-center',
  end: 's-desk-self-end',
};

const validAlign = (v: unknown): HeaderColAlign | undefined =>
  v === 'start' || v === 'center' || v === 'end' ? v : undefined;

function resolveColumnAlignClasses(
  align?: MaybeResponsive<'start' | 'center' | 'end'>
): string | undefined {
  if (!align) return undefined;
  if (typeof align === 'string') {
    return HEADER_COL_JUSTIFY[align]
      ? cn('flex items-center gap-3', headerColJustify(align, 'start'))
      : undefined;
  }
  const d = resolveResponsive(align, 'desktop', validAlign);
  const t = resolveResponsive(align, 'tablet', validAlign);
  const m = resolveResponsive(align, 'mobile', validAlign);
  if (!d && !t && !m) return undefined;
  if (d === t && t === m && d) {
    return cn('flex items-center gap-3', headerColJustify(d, 'start'));
  }
  return cn(
    'flex items-center gap-3',
    m && COL_ALIGN_MOBILE[m],
    t && COL_ALIGN_TABLET[t],
    d && COL_ALIGN_DESKTOP[d]
  );
}

function resolveColumnVAlignClasses(
  verticalAlign?: MaybeResponsive<'start' | 'center' | 'end'>
): string | undefined {
  if (!verticalAlign) return undefined;
  if (typeof verticalAlign === 'string') {
    return COL_VALIGN[verticalAlign];
  }
  const d = resolveResponsive(verticalAlign, 'desktop', validAlign);
  const t = resolveResponsive(verticalAlign, 'tablet', validAlign);
  const m = resolveResponsive(verticalAlign, 'mobile', validAlign);
  if (!d && !t && !m) return undefined;
  if (d === t && t === m && d) {
    return COL_VALIGN[d];
  }
  return cn(
    m && COL_VALIGN_MOBILE[m],
    t && COL_VALIGN_TABLET[t],
    d && COL_VALIGN_DESKTOP[d]
  );
}

export function renderSlot(
  slot: SlotValue,
  zones?: Record<string, BuilderItem[]>,
  className?: string,
  style?: CSSProperties
) {
  if (typeof slot === 'function')
    return slot({
      className: cn('w-full min-w-0', className),
      style,
      minEmptyHeight: 80,
    });
  if (Array.isArray(slot))
    return <BlockList items={slot} zones={zones} nested />;
  return null;
}

export function Column(p: ColumnProps) {
  const s: SectionSettings = {
    ...DEFAULT_SECTION,
    paddingY: 'none',
    ...p.section,
  };
  const hidden = cn(hideOnClasses(s, p.editing));
  const styles = resolveSectionStyle(s);
  const alignClass = resolveColumnAlignClasses(p.align);
  const vAlignClass = resolveColumnVAlignClasses(p.verticalAlign);

  return (
    <MotionItem
      id={s.anchor || undefined}
      data-column
      className={cn(
        'min-w-0',
        COLUMN_PADDING[s.paddingY ?? 'none'],
        !styles.hasFill && COLUMN_BG[s.background ?? 'default'],
        styles.outerClasses,
        styles.innerClasses,
        hidden,
        alignClass,
        vAlignClass
      )}
      style={styles.style}
    >
      {renderSlot(p.content, p.zones)}
    </MotionItem>
  );
}

/** Extract visible Column items from either `columnItems` (Document renderer) or inline `columns` array. */
export function resolveVisibleColumns(
  columnItems?: ColumnItemRef[],
  columns?: SlotValue
): ColumnItemRef[] {
  if (Array.isArray(columnItems)) return columnItems;
  if (Array.isArray(columns)) {
    return (columns as ColumnItemRef[]).filter(
      c =>
        c &&
        typeof c === 'object' &&
        !c.meta?.hidden &&
        !(c.props?.__builderMeta as { hidden?: boolean } | undefined)?.hidden
    );
  }
  return [];
}

/** Nested blocks inside columns render without their own section padding. */
export function Columns(p: ColumnsProps) {
  if (typeof p.columns === 'function' || Array.isArray(p.columns)) {
    const colItems = resolveVisibleColumns(p.columnItems, p.columns);
    const isFourEqual =
      colItems.length === 4 &&
      colItems.every(c => {
        const w = c.props?.width;
        return !w || w === 'fill';
      });
    const gridStyle = columnsGridStyle(
      colItems.length ? colItems : [{ width: 'fill' }, { width: 'fill' }],
      isFourEqual
        ? { tabletFallback: 'minmax(0,1fr) minmax(0,1fr)' }
        : undefined
    ) as CSSProperties;
    const gridClass = cn(
      'grid grid-cols-1 s-hcols [&_section>div]:px-0 [&_section]:py-0',
      GAP[p.gap ?? 'md'],
      ALIGN[p.verticalAlign ?? 'start']
    );

    return (
      <Section section={p.section} editing={p.editing} hasItems>
        {typeof p.columns === 'function' ? (
          p.columns({
            className: gridClass,
            style: gridStyle,
            minEmptyHeight: 80,
          })
        ) : (
          <div className={gridClass} style={gridStyle}>
            <BlockList items={p.columns} zones={p.zones} nested />
          </div>
        )}
      </Section>
    );
  }

  const layout = LAYOUTS[p.layout ?? '1-1'] ?? LAYOUTS['1-1'];
  const slots = [p.column1, p.column2, p.column3, p.column4].slice(
    0,
    layout.count
  );

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <div
        className={cn(
          'grid grid-cols-1 [&_section>div]:px-0 [&_section]:py-0',
          layout.grid,
          GAP[p.gap ?? 'md'],
          ALIGN[p.verticalAlign ?? 'start']
        )}
      >
        {slots.map((slot, i) => (
          <MotionItem key={i} className="min-w-0">
            {renderSlot(slot)}
          </MotionItem>
        ))}
      </div>
    </Section>
  );
}

export type GlobalRefProps = {
  globalBlockId?: string;
  globalBlockName?: string;
  blocks?: BuilderItem[];
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

function stampFormId(items: BuilderItem[] | undefined, formId: string) {
  return (items ?? []).map(item =>
    item.type === 'ContactForm'
      ? { ...item, props: { ...item.props, formId } }
      : item
  );
}

export function GlobalRef(p: GlobalRefProps) {
  if (!p.globalBlockId || !p.blocks?.length) {
    return p.editing ? (
      <div className="m-4 rounded-lg border-2 border-dashed border-violet-300 p-8 text-center text-sm text-violet-700">
        {p.globalBlockId
          ? 'This global block is empty or was deleted.'
          : 'Pick a global block in the sidebar.'}
      </div>
    ) : null;
  }

  return (
    <div
      className={cn(
        p.editing && 'relative outline-dashed outline-1 outline-violet-400'
      )}
    >
      {p.editing && (
        <span className="absolute right-2 top-2 z-10 rounded bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
          Global · {p.globalBlockName ?? 'block'}
        </span>
      )}
      <BlockList
        items={stampFormId(p.blocks, p.globalBlockId)}
        zones={Object.fromEntries(
          Object.entries(p.zones ?? {}).map(([key, items]) => [
            key,
            stampFormId(items, p.globalBlockId!),
          ])
        )}
      />
    </div>
  );
}
