import { Image, Play } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/cn';

/**
 * Stylised mini-render of a block for the library's hover preview: one
 * wireframe per block family, drawn with editor tokens so it follows the
 * editor theme rather than the site's.
 */

export type BlockThumbnailFamily =
  | 'hero'
  | 'section'
  | 'columns'
  | 'cards'
  | 'text'
  | 'button'
  | 'media'
  | 'video'
  | 'list'
  | 'form'
  | 'chrome'
  | 'embed'
  | 'spacer'
  | 'generic';

const BY_TYPE: Record<string, BlockThumbnailFamily> = {
  hero: 'hero',
  cta: 'hero',
  announcementbar: 'hero',
  container: 'section',
  globalref: 'section',
  columns: 'columns',
  headercolumns: 'chrome',
  footercolumns: 'chrome',
  features: 'cards',
  stats: 'cards',
  pricing: 'cards',
  team: 'cards',
  testimonials: 'cards',
  logocloud: 'cards',
  relatedposts: 'cards',
  blogposts: 'cards',
  richtext: 'text',
  posttitle: 'text',
  postcontent: 'text',
  postmeta: 'text',
  authorbio: 'text',
  authorcard: 'cards',
  comments: 'text',
  postnavigation: 'cards',
  entryterms: 'text',
  audio: 'media',
  bookmarks: 'button',
  copyright: 'text',
  collectionitem: 'text',
  button: 'button',
  backtotop: 'button',
  themetoggle: 'button',
  image: 'media',
  gallery: 'media',
  imagemorph: 'media',
  postfeaturedimage: 'media',
  slider: 'media',
  logo: 'media',
  video: 'video',
  videolibrary: 'video',
  faq: 'list',
  accordion: 'list',
  tabs: 'list',
  timeline: 'list',
  navmenu: 'list',
  mobilemenu: 'list',
  footerlinks: 'list',
  legallinks: 'list',
  sociallinks: 'list',
  socialicons: 'list',
  contactinfo: 'list',
  languageswitcher: 'list',
  contactform: 'form',
  newsletter: 'form',
  searchbox: 'form',
  headerbar: 'chrome',
  embed: 'embed',
  code: 'embed',
  map: 'embed',
  spacer: 'spacer',
};

const BY_CATEGORY: Record<string, BlockThumbnailFamily> = {
  heroes: 'hero',
  marketing: 'cards',
  layout: 'section',
  content: 'text',
  header: 'chrome',
  footer: 'chrome',
  contact: 'form',
  blog: 'cards',
  post: 'text',
};

/** Picks the wireframe for a block type, falling back to its category. */
export function blockThumbnailFamily(
  type: string,
  category?: string
): BlockThumbnailFamily {
  return (
    BY_TYPE[type.toLowerCase()] ??
    (category ? BY_CATEGORY[category.toLowerCase()] : undefined) ??
    'generic'
  );
}

/** A bar standing in for a line of text. */
const Bar: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn('h-1.5 rounded-full bg-[var(--ne-border-strong)]', className)}
  />
);

const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-1.5',
      className
    )}
  >
    {children}
  </div>
);

function render(family: BlockThumbnailFamily, label: string) {
  switch (family) {
    case 'hero':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 bg-[var(--ne-primary)] p-3">
          <div className="h-2.5 w-4/5 rounded-full bg-white/90" />
          <div className="h-2.5 w-3/5 rounded-full bg-white/70" />
          <div className="h-1.5 w-11/12 rounded-full bg-white/40" />
          <div className="mt-1 flex gap-1.5">
            <div className="h-4 w-12 rounded-[var(--ne-radius-sm)] bg-white" />
            <div className="h-4 w-12 rounded-[var(--ne-radius-sm)] border border-white/60" />
          </div>
        </div>
      );
    case 'section':
      return (
        <div className="flex h-full flex-col gap-1.5 p-2.5">
          <span className="font-mono text-[9px] text-[var(--ne-text-subtle)]">
            &lt;{label}&gt;
          </span>
          <div className="flex flex-1 flex-col gap-1.5 rounded-[var(--ne-radius-sm)] border-2 border-dashed border-[var(--ne-border-strong)] p-2">
            <Bar className="w-1/3 bg-[var(--ne-text-muted)]" />
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              <Card />
              <Card />
            </div>
          </div>
        </div>
      );
    case 'columns':
      return (
        <div className="grid h-full grid-cols-3 gap-1.5 p-2.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="flex flex-col justify-end gap-1 rounded-[var(--ne-radius-sm)] border border-dashed border-[var(--ne-primary)] bg-[var(--ne-primary-soft)] p-1.5"
            >
              <Bar className="bg-[var(--ne-primary)]" />
              <Bar className="w-3/5" />
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className="flex h-full flex-col gap-1.5 p-2.5">
          <Bar className="mx-auto h-2 w-2/5 bg-[var(--ne-text-muted)]" />
          <div className="grid flex-1 grid-cols-3 gap-1.5">
            {[0, 1, 2].map(i => (
              <Card key={i} className="flex flex-col gap-1">
                <div className="h-3 w-3 rounded-full bg-[var(--ne-primary-soft)]" />
                <Bar className="bg-[var(--ne-text-muted)]" />
                <Bar className="w-4/5" />
                <Bar className="w-3/5" />
              </Card>
            ))}
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-3">
          <div className="text-sm font-bold leading-none text-[var(--ne-text)]">
            Aa
          </div>
          <Bar className="h-2.5 w-3/4 bg-[var(--ne-text-muted)]" />
          <Bar className="w-full" />
          <Bar className="w-11/12" />
          <Bar className="w-2/3" />
        </div>
      );
    case 'button':
      return (
        <div className="flex h-full items-center justify-center gap-2 p-3">
          <div className="flex h-6 w-16 items-center justify-center rounded-[var(--ne-radius-md)] bg-[var(--ne-primary)]">
            <div className="h-1.5 w-8 rounded-full bg-white/80" />
          </div>
          <div className="flex h-6 w-16 items-center justify-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border-strong)] bg-[var(--ne-surface)]">
            <Bar className="w-8" />
          </div>
        </div>
      );
    case 'media':
    case 'video':
      return (
        <div className="flex h-full p-2.5">
          <div className="flex flex-1 items-center justify-center rounded-[var(--ne-radius-sm)] bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]">
            {family === 'video' ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ne-primary)] text-white">
                <Play aria-hidden className="h-3.5 w-3.5" />
              </div>
            ) : (
              <Image aria-hidden className="h-7 w-7" />
            )}
          </div>
        </div>
      );
    case 'list':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-2.5">
          {[0, 1, 2].map(i => (
            <Card key={i} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[var(--ne-primary)]" />
              <Bar className={i === 0 ? 'w-2/3' : 'w-1/2'} />
            </Card>
          ))}
        </div>
      );
    case 'form':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-3">
          <Bar className="w-1/3 bg-[var(--ne-text-muted)]" />
          <div className="h-4 rounded-[var(--ne-radius-sm)] border border-[var(--ne-border-strong)] bg-[var(--ne-surface)]" />
          <div className="h-4 rounded-[var(--ne-radius-sm)] border border-[var(--ne-border-strong)] bg-[var(--ne-surface)]" />
          <div className="h-4 w-1/3 rounded-[var(--ne-radius-sm)] bg-[var(--ne-primary)]" />
        </div>
      );
    case 'chrome':
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 py-2">
            <div className="h-3 w-3 rounded-[var(--ne-radius-sm)] bg-[var(--ne-primary)]" />
            <Bar className="w-8 bg-[var(--ne-text-muted)]" />
            <div className="ms-auto flex gap-1.5">
              <Bar className="w-5" />
              <Bar className="w-5" />
              <Bar className="w-5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--ne-border)] bg-[var(--ne-surface)] px-2.5 py-2">
            <Bar />
            <Bar />
            <Bar />
          </div>
        </div>
      );
    case 'embed':
      return (
        <div className="flex h-full flex-col justify-center gap-1 p-3 font-mono text-[9px] text-[var(--ne-text-muted)]">
          <span className="text-[var(--ne-primary)]">&lt;{label}&gt;</span>
          <Bar className="ms-3 w-3/4" />
          <Bar className="ms-3 w-1/2" />
          <span className="text-[var(--ne-primary)]">&lt;/{label}&gt;</span>
        </div>
      );
    case 'spacer':
      return (
        <div className="flex h-full flex-col justify-between p-3">
          <Bar />
          <div className="mx-auto flex-1 border-s border-dashed border-[var(--ne-primary)] my-1" />
          <Bar />
        </div>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center p-3">
          <Card className="flex w-2/3 flex-col gap-1">
            <Bar className="bg-[var(--ne-text-muted)]" />
            <Bar className="w-2/3" />
          </Card>
        </div>
      );
  }
}

export interface BlockThumbnailPreviewProps {
  type: string;
  category?: string;
  /** Overrides the family picked from `type` and `category`. */
  family?: BlockThumbnailFamily;
  className?: string;
}

export const BlockThumbnailPreview: React.FC<BlockThumbnailPreviewProps> = ({
  type,
  category,
  family,
  className,
}) => {
  const resolved = family ?? blockThumbnailFamily(type, category);
  return (
    <div
      aria-hidden
      data-family={resolved}
      className={cn(
        'h-full w-full overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)]',
        className
      )}
    >
      {render(resolved, type)}
    </div>
  );
};
