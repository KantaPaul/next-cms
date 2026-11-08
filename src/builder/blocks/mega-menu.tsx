import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { resolveLinkProps, type UrlValue } from '../style';
import { el, type WithSection } from './element';
import { Section, type SectionSettings } from './section';

/* ---------- Featured card (mega menu promo) ---------- */

export type MegaMenuCardProps = {
  eyebrow?: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  linkLabel?: string;
  link?: UrlValue | string;
  layout?: 'stacked' | 'overlay' | 'side';
  section?: SectionSettings;
  elements?: WithSection['elements'];
  editing?: boolean;
};

export function MegaMenuCard({
  eyebrow,
  title = 'Featured',
  text,
  imageUrl,
  imageAlt,
  linkLabel = 'Learn more',
  link,
  layout = 'stacked',
  section,
  elements,
  editing,
}: MegaMenuCardProps) {
  const styled = { elements };
  const linkProps = resolveLinkProps(link);
  const image = imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={imageAlt ?? ''}
      {...el(
        styled,
        'image',
        cn(
          'h-full w-full object-cover',
          layout === 'overlay' && 'absolute inset-0'
        )
      )}
    />
  ) : editing ? (
    <div className="s-muted flex h-full min-h-28 w-full items-center justify-center text-xs">
      Choose an image
    </div>
  ) : null;

  const body = (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        layout === 'overlay' &&
          'relative mt-auto bg-gradient-to-t from-black/75 to-transparent p-4 pt-12 text-white'
      )}
    >
      {eyebrow && (
        <span
          {...el(
            styled,
            'eyebrow',
            cn(
              'text-[11px] font-semibold uppercase tracking-wide',
              layout === 'overlay' ? 'text-white/80' : 's-primary-text'
            )
          )}
        >
          {eyebrow}
        </span>
      )}
      {title && (
        <span {...el(styled, 'title', 'text-base font-semibold leading-snug')}>
          {title}
        </span>
      )}
      {text && (
        <span
          {...el(
            styled,
            'text',
            cn('text-sm', layout === 'overlay' ? 'text-white/85' : 's-muted')
          )}
        >
          {text}
        </span>
      )}
      {linkLabel && (
        <span
          {...el(
            styled,
            'link',
            'mt-1 text-sm font-medium underline-offset-4 group-hover:underline'
          )}
        >
          {linkLabel} →
        </span>
      )}
    </div>
  );

  return (
    <Section section={section} editing={editing} innerClassName="max-w-none">
      <a
        {...(editing ? {} : linkProps)}
        {...el(
          styled,
          'card',
          cn(
            'group s-radius s-surface s-border block overflow-hidden border transition hover:shadow-md',
            layout === 'overlay' && 'relative flex min-h-52 flex-col',
            layout === 'side' && 'flex items-stretch gap-0'
          )
        )}
      >
        {image && layout !== 'overlay' && (
          <div
            className={cn(
              'overflow-hidden',
              layout === 'side' ? 'w-2/5 shrink-0' : 'aspect-[16/9]'
            )}
          >
            {image}
          </div>
        )}
        {layout === 'overlay' && image}
        <div
          className={cn(
            layout !== 'overlay' && 'p-4',
            layout === 'overlay' && 'contents'
          )}
        >
          {body}
        </div>
      </a>
    </Section>
  );
}

/* ---------- Panel wrapper (root settings of a mega menu) ---------- */

export type MegaMenuPanelSettings = {
  background?: 'default' | 'muted' | 'inverted';
  padding?: 'sm' | 'md' | 'lg';
  radius?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  maxHeight?: number;
};

const PANEL_BG = {
  default: 'bg-[var(--site-bg)]',
  muted: 's-section-muted',
  inverted: 's-section-dark',
};
const PANEL_PAD = { sm: 'p-4', md: 'p-6', lg: 'p-8' };
const PANEL_RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
};
const PANEL_SHADOW = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-lg',
  lg: 'shadow-2xl',
};

export type MegaMenuWidth = 'container' | 'full' | 'auto';

const WIDTH_CLASS: Record<MegaMenuWidth, string> = {
  container: 'mx-auto w-full max-w-[var(--site-max-width,72rem)]',
  full: 'w-full',
  auto: 'w-max max-w-[min(56rem,calc(100vw-2rem))]',
};

/** Panel chrome around a mega menu's blocks, shared by the site and the editor canvas. */
export function MegaMenuPanel({
  settings,
  width = 'container',
  children,
  className,
  style,
}: {
  settings?: MegaMenuPanelSettings;
  width?: MegaMenuWidth;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const s = settings ?? {};
  const maxHeight = Number(s.maxHeight) || 0;
  return (
    <div
      className={cn(
        's-border border',
        WIDTH_CLASS[width] ?? WIDTH_CLASS.container,
        PANEL_BG[s.background ?? 'default'] ?? PANEL_BG.default,
        PANEL_PAD[s.padding ?? 'md'] ?? PANEL_PAD.md,
        PANEL_RADIUS[s.radius ?? 'md'] ?? PANEL_RADIUS.md,
        PANEL_SHADOW[s.shadow ?? 'md'] ?? PANEL_SHADOW.md,
        maxHeight > 0 && 'overflow-y-auto',
        className
      )}
      style={{ ...(maxHeight > 0 && { maxHeight }), ...style }}
    >
      {children}
    </div>
  );
}
