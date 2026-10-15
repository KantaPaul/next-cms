import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type SectionSettings = {
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'default' | 'muted' | 'primary' | 'dark';
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  anchor?: string;
};

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

/** Outer wrapper shared by every block: spacing, background, anchors, and responsive visibility. */
export function Section({
  section,
  children,
  className,
  innerClassName,
  editing,
}: {
  section?: SectionSettings;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  editing?: boolean;
}) {
  const s = { ...DEFAULT_SECTION, ...section };
  const hidden = cn(
    s.hideOnMobile && (editing ? 'max-md:opacity-30' : 'max-md:hidden'),
    s.hideOnTablet && (editing ? 'md:max-lg:opacity-30' : 'md:max-lg:hidden'),
    s.hideOnDesktop && (editing ? 'lg:opacity-30' : 'lg:hidden')
  );

  return (
    <section
      id={s.anchor || undefined}
      className={cn(PADDING[s.paddingY ?? 'md'], BACKGROUND[s.background ?? 'default'], hidden, className)}
    >
      <div className={cn('mx-auto w-full max-w-[var(--site-max-width,72rem)] px-5 md:px-8', innerClassName)}>{children}</div>
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
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'ghost-light';
}) {
  if (!children) return null;
  const external = !!href && /^https?:\/\//.test(href);
  return (
    <a
      href={href || '#'}
      className={cn('s-btn', `s-btn-${variant}`)}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children}
    </a>
  );
}
