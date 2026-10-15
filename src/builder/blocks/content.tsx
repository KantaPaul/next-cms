import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { sanitizeRichText } from '../sanitize';
import { BlockList } from './block-list';
import { ContactFormClient } from './contact-form-client';
import { MotionItem, Section, SectionHeading, type SectionSettings } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type RichTextProps = WithSection & {
  content: string;
  width?: 'narrow' | 'normal' | 'wide';
};

const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

export function RichText(p: RichTextProps) {
  return (
    <Section section={p.section} editing={p.editing} innerClassName={WIDTH[p.width ?? 'normal']}>
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
  link?: string;
};

const ASPECT = { auto: '', video: 'aspect-video', square: 'aspect-square', wide: 'aspect-[21/9]' };
const IMAGE_WIDTH = { normal: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-none' };

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

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.url}
      alt={p.alt ?? ''}
      loading="lazy"
      className={cn('s-radius w-full object-cover', ASPECT[p.aspect ?? 'auto'])}
    />
  );

  return (
    <Section section={p.section} editing={p.editing} innerClassName={IMAGE_WIDTH[p.width ?? 'normal']}>
      <figure>
        {p.link ? <a href={p.link}>{img}</a> : img}
        {p.caption && <figcaption className="s-muted mt-3 text-center text-sm">{p.caption}</figcaption>}
      </figure>
    </Section>
  );
}

export type ContactFormField = {
  label: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  required?: boolean;
};

export type ContactFormProps = WithSection & {
  title?: string;
  subtitle?: string;
  fields: ContactFormField[];
  submitText?: string;
  successMessage?: string;
  actionUrl?: string;
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
        editing={p.editing}
      />
    </Section>
  );
}

type SlotValue = ((props?: { className?: string; minEmptyHeight?: number }) => ReactNode) | BuilderItem[] | undefined;

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
const ALIGN = { start: 'items-start', center: 'items-center', end: 'items-end' };

function renderSlot(slot: SlotValue) {
  if (typeof slot === 'function') return slot({ minEmptyHeight: 80 });
  if (Array.isArray(slot)) return <BlockList items={slot} nested />;
  return null;
}

/** Nested blocks inside columns render without their own section padding. */
export function Columns(p: ColumnsProps) {
  const layout = LAYOUTS[p.layout ?? '1-1'] ?? LAYOUTS['1-1'];
  const slots = [p.column1, p.column2, p.column3, p.column4].slice(0, layout.count);

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <div className={cn('grid grid-cols-1 [&_section]:py-0 [&_section>div]:px-0', layout.grid, GAP[p.gap ?? 'md'], ALIGN[p.verticalAlign ?? 'start'])}>
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
  editing?: boolean;
};

export function GlobalRef(p: GlobalRefProps) {
  if (!p.globalBlockId || !p.blocks?.length) {
    return p.editing ? (
      <div className="m-4 rounded-lg border-2 border-dashed border-violet-300 p-8 text-center text-sm text-violet-700">
        {p.globalBlockId ? 'This global block is empty or was deleted.' : 'Pick a global block in the sidebar.'}
      </div>
    ) : null;
  }

  return (
    <div className={cn(p.editing && 'relative outline-dashed outline-1 outline-violet-400')}>
      {p.editing && (
        <span className="absolute right-2 top-2 z-10 rounded bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
          Global · {p.globalBlockName ?? 'block'}
        </span>
      )}
      <BlockList items={p.blocks} />
    </div>
  );
}
