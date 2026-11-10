import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { MotionBoundary, MotionSection } from '../motion';
import {
  resolveAnimation,
  resolveLinkProps,
  resolveSectionStyle,
  type SectionSettings,
  type UrlValue,
} from '../style';
import { el, orderedParts } from './element';
import { sanitizeCss } from '../sanitize';

export { MotionItem } from '../motion';
export type { SectionSettings } from '../style';

export const DEFAULT_SECTION: SectionSettings = {
  paddingY: 'md',
  background: 'default',
  hideOnMobile: false,
  hideOnTablet: false,
  hideOnDesktop: false,
  anchor: '',
};

const PADDING = {
  none: 'py-0',
  sm: 'py-8 md:py-10',
  md: 'py-14 md:py-20',
  lg: 'py-20 md:py-28',
};

const BACKGROUND = {
  default: '',
  muted: 's-section-muted',
  primary: 's-section-primary',
  dark: 's-section-dark',
};

/**
 * Outer wrapper shared by every block: spacing, background, style, anchors, responsive visibility, and motion.
 * `hasItems` marks blocks whose repeated children use `MotionItem`, so stagger and hover target those children.
 */
export function Section({
  section,
  children,
  className,
  innerClassName,
  editing,
  hasItems,
  id,
  nodeId,
}: {
  section?: SectionSettings;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  editing?: boolean;
  hasItems?: boolean;
  id?: string;
  nodeId?: string;
}) {
  const s = { ...DEFAULT_SECTION, ...section };
  const elId = id ?? nodeId ?? s.nodeId;
  const sanitizedCss = s.customCss ? sanitizeCss(s.customCss) : '';
  const scopedCss =
    sanitizedCss && elId
      ? sanitizedCss.replace(
          /(^|[^_a-zA-Z0-9-])selector(?=[^_a-zA-Z0-9-]|$)/g,
          `$1[data-el="${elId}"]`
        )
      : sanitizedCss;
  const hidden = cn(
    s.hideOnMobile && (editing ? 'max-md:opacity-30' : 'max-md:hidden'),
    s.hideOnTablet && (editing ? 'md:max-lg:opacity-30' : 'md:max-lg:hidden'),
    s.hideOnDesktop && (editing ? 'lg:opacity-30' : 'lg:hidden')
  );
  const hasBgParallax = Boolean(
    s.fill?.type === 'image' && s.fill.parallax && s.fill.image
  );
  // With parallax the image lives on its own moving layer, so the section must
  // not paint it again as a static background on top of that layer.
  const styles = resolveSectionStyle(
    hasBgParallax ? { ...s, fill: { ...s.fill, image: undefined } } : s
  );
  const hasVideo = s.fill?.type === 'video' && Boolean(s.fill.videoUrl);
  const outer = cn(
    'w-full',
    PADDING[s.paddingY ?? 'md'],
    !styles.hasFill && !hasBgParallax && BACKGROUND[s.background ?? 'default'],
    styles.outerClasses,
    (hasVideo || hasBgParallax) && 'relative overflow-hidden',
    // Own stacking context: the -z-10 layer paints above this section's
    // background instead of behind the page's.
    hasBgParallax && 'isolate',
    hidden,
    className
  );
  const inner = cn(
    'mx-auto w-full max-w-[var(--site-max-width,72rem)]',
    styles.innerClasses,
    innerClassName
  );
  const animation = resolveAnimation(s.animation);

  const videoLayer = hasVideo ? (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={s.fill?.videoFallback || undefined}
        className="absolute min-w-full min-h-full w-auto h-auto object-cover top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        src={s.fill?.videoUrl}
      />
    </div>
  ) : null;

  const bgParallaxLayer = hasBgParallax ? (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden="true"
    >
      <div
        data-bg-parallax
        data-parallax-speed={s.fill?.parallaxSpeed ?? 0.4}
        className="absolute -top-[20%] -bottom-[20%] inset-x-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(s.fill?.image ?? '')})` }}
      />
    </div>
  ) : null;

  const customStyleEl = scopedCss ? (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized scoped CSS
      dangerouslySetInnerHTML={{ __html: scopedCss }}
    />
  ) : null;

  if (animation) {
    return (
      <MotionSection
        animation={animation}
        hasItems={hasItems}
        id={s.anchor || undefined}
        className={outer}
        innerClassName={inner}
        style={styles.style}
        data-el={elId || undefined}
        data-motion={s.motion ? JSON.stringify(s.motion) : undefined}
      >
        {customStyleEl}
        {videoLayer}
        {bgParallaxLayer}
        {children}
      </MotionSection>
    );
  }

  return (
    <section
      id={s.anchor || undefined}
      className={outer}
      style={styles.style}
      data-el={elId || undefined}
      data-motion={s.motion ? JSON.stringify(s.motion) : undefined}
    >
      {customStyleEl}
      {videoLayer}
      {bgParallaxLayer}
      <div className={inner}>
        {hasItems ? <MotionBoundary>{children}</MotionBoundary> : children}
      </div>
    </section>
  );
}

/** Element-style keys for the shared section heading (see `headingStyles()`). */
export const HEADING_ELEMENTS = {
  eyebrow: 'headingEyebrow',
  title: 'headingTitle',
  subtitle: 'headingSubtitle',
} as const;

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  partOrder,
  editing,
  elements,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  partOrder?: string[];
  editing?: boolean;
  /** The block's `elements` map, for the heading element styles. */
  elements?: Record<string, unknown>;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  const owner = { elements } as Parameters<typeof el>[0];
  return (
    <div
      className={cn(
        'mb-10 max-w-3xl md:mb-14',
        align === 'center' && 'mx-auto text-center'
      )}
    >
      {orderedParts(
        { partOrder, editing },
        {
          eyebrow: eyebrow ? (
            <p className="mb-4">
              <span {...el(owner, HEADING_ELEMENTS.eyebrow, 's-eyebrow')}>
                {eyebrow}
              </span>
            </p>
          ) : null,
          title: title ? (
            <h2 {...el(owner, HEADING_ELEMENTS.title, 's-section-title')}>
              {title}
            </h2>
          ) : null,
          subtitle: subtitle ? (
            <p
              {...el(
                owner,
                HEADING_ELEMENTS.subtitle,
                's-muted mt-4 text-lg leading-relaxed'
              )}
            >
              {subtitle}
            </p>
          ) : null,
        }
      )}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className,
  style,
  ...rest
}: {
  href?: UrlValue;
  children: ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'soft'
    | 'light'
    | 'ghost-light';
  className?: string;
  style?: CSSProperties;
  'data-overlay-open'?: string;
  [key: `data-${string}`]: unknown;
}) {
  if (!children) return null;
  const link = resolveLinkProps(href);
  return (
    <a
      href={link.href}
      className={cn('s-btn', `s-btn-${variant}`, className)}
      style={style}
      {...('target' in link ? { target: link.target, rel: link.rel } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

export type CardVariant =
  | 'default'
  | 'flat'
  | 'outline'
  | 'elevated'
  | 'glass'
  | 'none';

/** Card props shared by card-based blocks (see `cardFields()`). */
export type CardStyleProps = { cardVariant?: CardVariant; cardHover?: boolean };

/**
 * Classes for one card. "default" keeps each block's original look (`legacy`),
 * so existing pages don't change until a card style is picked.
 */
export function cardClass(
  p: CardStyleProps,
  legacy = 's-surface s-border s-radius border'
): string {
  const v = p.cardVariant;
  const base = !v || v === 'default' ? legacy : `s-card s-card-${v}`;
  return cn(base, p.cardHover && 's-card s-hover-lift');
}

/** `md:`/`lg:` grid columns for 1–4 column item grids. */
export const ITEM_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};
