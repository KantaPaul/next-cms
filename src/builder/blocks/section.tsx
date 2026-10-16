import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { MotionBoundary, MotionSection } from '../motion';
import { resolveLinkProps, type UrlValue } from '../fields/client-fields';
import { resolveAnimation, resolveSectionStyle, type SectionSettings } from '../style';

export type { SectionSettings } from '../style';
export { MotionItem } from '../motion';

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
}: {
  section?: SectionSettings;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  editing?: boolean;
  hasItems?: boolean;
}) {
  const s = { ...DEFAULT_SECTION, ...section };
  const hidden = cn(
    s.hideOnMobile && (editing ? 'max-md:opacity-30' : 'max-md:hidden'),
    s.hideOnTablet && (editing ? 'md:max-lg:opacity-30' : 'md:max-lg:hidden'),
    s.hideOnDesktop && (editing ? 'lg:opacity-30' : 'lg:hidden')
  );
  const styles = resolveSectionStyle(s);
  const outer = cn(
    PADDING[s.paddingY ?? 'md'],
    !styles.hasFill && BACKGROUND[s.background ?? 'default'],
    styles.outerClasses,
    hidden,
    className
  );
  const inner = cn('mx-auto w-full max-w-[var(--site-max-width,72rem)] px-5 md:px-8', styles.innerClasses, innerClassName);
  const animation = resolveAnimation(s.animation);

  if (animation) {
    return (
      <MotionSection
        animation={animation}
        hasItems={hasItems}
        id={s.anchor || undefined}
        className={outer}
        innerClassName={inner}
        style={styles.style}
      >
        {children}
      </MotionSection>
    );
  }

  return (
    <section id={s.anchor || undefined} className={outer} style={styles.style}>
      <div className={inner}>{hasItems ? <MotionBoundary>{children}</MotionBoundary> : children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <div className={cn('mb-10 max-w-3xl md:mb-14', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="s-primary-text mb-3 text-sm font-semibold uppercase tracking-wider">{eyebrow}</p>}
      {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
      {subtitle && <p className="s-muted mt-4 text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href?: UrlValue;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'ghost-light';
}) {
  if (!children) return null;
  const link = resolveLinkProps(href);
  return (
    <a href={link.href} className={cn('s-btn', `s-btn-${variant}`)} {...('target' in link ? { target: link.target, rel: link.rel } : {})}>
      {children}
    </a>
  );
}
