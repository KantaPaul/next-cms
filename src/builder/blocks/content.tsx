'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useEntry } from '@/components/analytics/entry-context';
import type { BuilderItem } from '../data';
import { sanitizeRichText } from '../sanitize';
import { normalizeUrlValue, resolveLinkProps, type UrlValue } from '../style';
import { BlockList } from './block-list';
import { ContactFormClient } from './contact-form-client';
import {
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type RichTextProps = WithSection & {
  content: string;
  width?: 'narrow' | 'normal' | 'wide';
};

const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

export function RichText(p: RichTextProps) {
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <div
        className="s-prose prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(p.content) }}
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

  const fit = p.objectFit ?? 'cover';
  const dimStyle =
    p.imageWidth || p.imageHeight
      ? {
          width: p.imageWidth ? `${p.imageWidth}px` : undefined,
          height: p.imageHeight ? `${p.imageHeight}px` : undefined,
          maxWidth: '100%' as const,
        }
      : undefined;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.url}
      alt={p.alt ?? ''}
      loading="lazy"
      style={dimStyle}
      className={cn(
        's-radius',
        !dimStyle && 'w-full',
        fit === 'contain'
          ? 'object-contain'
          : fit === 'fill'
            ? 'object-fill'
            : 'object-cover',
        ASPECT[p.aspect ?? 'auto']
      )}
    />
  );

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={IMAGE_WIDTH[p.width ?? 'normal']}
    >
      <figure>
        {normalizeUrlValue(p.link).url ? (
          <a {...resolveLinkProps(p.link)}>{img}</a>
        ) : (
          img
        )}
        {p.caption && (
          <figcaption className="s-muted mt-3 text-center text-sm">
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
};

export type GalleryProps = WithSection & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items?: GalleryItem[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
};

const GALLERY_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};
const GALLERY_GAP = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };

export function Gallery(p: GalleryProps) {
  const items = (p.items ?? []).filter(i => i.url);
  const cols = (p.columns ?? 3) as 2 | 3 | 4;
  const gap = p.gap ?? 'md';

  if (!items.length) {
    return p.editing ? (
      <Section section={p.section} editing>
        <SectionHeading
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
        eyebrow={p.eyebrow}
        title={p.title}
        subtitle={p.subtitle}
      />
      <div className={cn('grid', GALLERY_COLS[cols], GALLERY_GAP[gap])}>
        {items.map((item, i) => (
          <MotionItem
            key={`${item.url}-${i}`}
            as="figure"
            className="overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt ?? ''}
              loading="lazy"
              className="s-radius aspect-square w-full object-cover"
            />
            {item.caption && (
              <figcaption className="s-muted mt-2 text-center text-sm">
                {item.caption}
              </figcaption>
            )}
          </MotionItem>
        ))}
      </div>
    </Section>
  );
}

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
    | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: string;
};

export type ContactFormProps = WithSection & {
  title?: string;
  subtitle?: string;
  fields: ContactFormField[];
  submitText?: string;
  successMessage?: string;
  actionUrl?: string;
  formId?: string;
};

export function ContactForm(p: ContactFormProps) {
  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-2xl">
      <SectionHeading title={p.title} subtitle={p.subtitle} />
      <ContactFormClient
        fields={p.fields ?? []}
        submitText={p.submitText || 'Send message'}
        successMessage={p.successMessage || 'Thanks! We will be in touch soon.'}
        actionUrl={p.actionUrl}
        formId={p.formId}
        editing={p.editing}
      />
    </Section>
  );
}

/* ---------- Video ---------- */

export type VideoProps = WithSection & {
  url?: string;
};

type VideoSource = { kind: 'youtube' | 'vimeo' | 'file'; src: string };

/** Recognizes one YouTube watch/embed or youtu.be URL, a Vimeo URL, or a direct mp4/webm URL. */
function videoSource(url: string): VideoSource | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const id = u.searchParams.get('v');
    if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` };
    if (u.pathname.startsWith('/embed/')) {
      return { kind: 'youtube', src: `https://www.youtube.com${u.pathname}${u.search}` };
    }
    return null;
  }

  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '');
    if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` };
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = u.pathname.match(/(\d+)/);
    if (match) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${match[1]}` };
    return null;
  }

  if (
    (u.protocol === 'https:' || u.protocol === 'http:') &&
    /\.(mp4|webm)(\?|#|$)/.test(u.pathname)
  ) {
    return { kind: 'file', src: url };
  }

  return null;
}

export function Video(p: VideoProps) {
  const source = p.url ? videoSource(p.url) : null;

  if (!source) {
    return p.editing ? (
      <Section section={p.section} editing>
        <div className="s-surface s-border s-muted s-radius flex aspect-video items-center justify-center border border-dashed text-sm">
          Add a video URL in the sidebar
        </div>
      </Section>
    ) : null;
  }

  return (
    <Section section={p.section} editing={p.editing}>
      {source.kind === 'youtube' ? (
        <div className="aspect-video w-full">
          <iframe
            className="s-radius h-full w-full rounded"
            src={source.src}
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : null}
      {source.kind === 'vimeo' ? (
        <iframe
          className="s-radius aspect-video h-full w-full rounded"
          src={source.src}
          title="Video player"
          allow="autoplay"
          allowFullScreen
        />
      ) : null}
      {source.kind === 'file' ? (
        <video
          controls
          preload="metadata"
          src={source.src}
          className="s-radius aspect-video w-full rounded"
        />
      ) : null}
    </Section>
  );
}

/* ---------- Embed ---------- */

export type EmbedProps = WithSection & {
  url?: string;
};

const EMBED_HOSTS = new Set([
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'google.com',
  'maps.google.com',
  'openstreetmap.org',
]);

function embedHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\.|^m\./, '');
  } catch {
    return null;
  }
}

export function Embed(p: EmbedProps) {
  const url = p.url?.trim() || '';
  const host = url ? embedHost(url) : null;
  const allowed = !!host && EMBED_HOSTS.has(host);

  if (!allowed) {
    return p.editing ? (
      <Section section={p.section} editing>
        <div className="s-surface s-border s-muted s-radius flex aspect-video items-center justify-center border border-dashed text-sm">
          Add an embeddable URL in the sidebar
        </div>
      </Section>
    ) : null;
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <iframe
        className="s-radius aspect-video h-full w-full rounded"
        src={url}
        title="Embedded content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </Section>
  );
}

/* ---------- Code ---------- */

export type CodeProps = WithSection & {
  code?: string;
};

export function Code(p: CodeProps) {
  const code = p.code ?? '';

  return (
    <Section section={p.section} editing={p.editing}>
      {code ? (
        <pre className="s-surface s-border s-muted s-radius overflow-auto rounded-lg border p-4 text-sm">
          <code>{code}</code>
        </pre>
      ) : (
        <div className="s-surface s-border s-muted s-radius flex min-h-40 items-center justify-center border border-dashed text-sm">
          Add code in the sidebar
        </div>
      )}
    </Section>
  );
}

export type SlotRender = (props: {
  minEmptyHeight?: number | string;
}) => ReactNode;
export type SlotValue = ReactNode | BuilderItem[] | SlotRender | undefined;

/* ---------- CollectionItem ---------- */

export type CollectionItemProps = WithSection & {
  /** Which field to render inline. Falls back to listing all fields. */
  field?: string;
};

export function CollectionItem(p: CollectionItemProps) {
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

export type ColumnsProps = WithSection & {
  layout?: '1-1' | '1-1-1' | '1-1-1-1' | '2-1' | '1-2';
  gap?: 'sm' | 'md' | 'lg';
  verticalAlign?: 'start' | 'center' | 'end';
  column1?: SlotValue;
  column2?: SlotValue;
  column3?: SlotValue;
  column4?: SlotValue;
};

const LAYOUTS = {
  '1-1': { count: 2, grid: 'md:grid-cols-2' },
  '1-1-1': { count: 3, grid: 'md:grid-cols-3' },
  '1-1-1-1': { count: 4, grid: 'md:grid-cols-2 lg:grid-cols-4' },
  '2-1': { count: 2, grid: 'md:grid-cols-[2fr_1fr]' },
  '1-2': { count: 2, grid: 'md:grid-cols-[1fr_2fr]' },
};
const GAP = { sm: 'gap-4', md: 'gap-8', lg: 'gap-12' };
const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

export function renderSlot(
  slot: SlotValue,
  zones?: Record<string, BuilderItem[]>
) {
  if (typeof slot === 'function') return slot({ minEmptyHeight: 80 });
  if (Array.isArray(slot))
    return <BlockList items={slot} zones={zones} nested />;
  return null;
}

/** Nested blocks inside columns render without their own section padding. */
export function Columns(p: ColumnsProps) {
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
