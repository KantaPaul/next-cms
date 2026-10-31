import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { renderSlot, type SlotValue } from './content';
import { MenuLinks, menuHref } from '@/components/site/menu-links';
import type { MenuWithItems } from '@/server/services/public-site.service';

/* ---------- HeaderBar ---------- */

export type HeaderBarProps = {
  width?: 'boxed' | 'full';
  background?: 'default' | 'muted' | 'inverted' | 'primary' | 'transparent';
  paddingY?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  minHeight?: string;
  borderBottom?: boolean;
  align?: 'center' | 'start' | 'end';
  left?: SlotValue;
  center?: SlotValue;
  right?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

const BG_STYLES: Record<string, string> = {
  default: 'bg-[var(--site-bg)] text-[var(--site-text)]',
  muted: 'bg-[var(--site-surface)] text-[var(--site-text)]',
  inverted: 'bg-[var(--site-text)] text-[var(--site-bg)]',
  primary: 'bg-[var(--site-primary)] text-white',
  transparent: 'bg-transparent text-[var(--site-text)]',
};

const PADDING_Y: Record<string, string> = {
  none: 'py-0',
  xs: 'py-1 sm:py-2',
  sm: 'py-2 sm:py-3',
  md: 'py-3 sm:py-4',
  lg: 'py-4 sm:py-6',
};

const ALIGN_ITEMS: Record<string, string> = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
};

export function HeaderBar({
  width = 'boxed',
  background = 'default',
  paddingY = 'sm',
  minHeight,
  borderBottom = false,
  align = 'center',
  left,
  center,
  right,
  zones,
  editing,
}: HeaderBarProps) {
  const containerClass =
    width === 'full'
      ? 'w-full px-4 sm:px-6 lg:px-8'
      : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  const style: React.CSSProperties = minHeight ? { minHeight } : {};

  return (
    <div
      className={cn(
        'w-full transition-colors',
        BG_STYLES[background] || BG_STYLES.default,
        borderBottom && 'border-b border-steel-200 dark:border-dark-300'
      )}
      style={style}
    >
      <div
        className={cn(
          containerClass,
          PADDING_Y[paddingY] || PADDING_Y.sm,
          'flex flex-wrap justify-between gap-4',
          ALIGN_ITEMS[align] || ALIGN_ITEMS.center
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {renderSlot(left, zones)}
        </div>
        <div className="flex items-center gap-4 min-w-0 justify-center flex-1">
          {renderSlot(center, zones)}
        </div>
        <div className="flex items-center gap-3 min-w-0 justify-end">
          {renderSlot(right, zones)}
        </div>
      </div>
    </div>
  );
}

/* ---------- FooterColumns ---------- */

export type FooterColumnsProps = {
  width?: 'boxed' | 'full';
  background?: 'default' | 'muted' | 'inverted' | 'primary';
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  stackOn?: 'mobile' | 'tablet';
  col1?: SlotValue;
  col2?: SlotValue;
  col3?: SlotValue;
  col4?: SlotValue;
  col5?: SlotValue;
  col6?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

const FOOTER_PADDINGS: Record<string, string> = {
  none: 'py-0',
  sm: 'py-6',
  md: 'py-10',
  lg: 'py-16',
  xl: 'py-20',
};

const GAP_STYLES: Record<string, string> = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
};

export function FooterColumns({
  width = 'boxed',
  background = 'default',
  paddingY = 'lg',
  columns = 4,
  gap = 'lg',
  stackOn = 'mobile',
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  zones,
  editing,
}: FooterColumnsProps) {
  const containerClass =
    width === 'full'
      ? 'w-full px-4 sm:px-6 lg:px-8'
      : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  const cols = Math.min(Math.max(Number(columns) || 4, 1), 6);
  const slots = [col1, col2, col3, col4, col5, col6].slice(0, cols);

  // Stacking breakpoint: stackOn === 'tablet' breaks at lg, otherwise md
  const gridColsClass =
    stackOn === 'tablet'
      ? cols === 1
        ? 'grid-cols-1'
        : cols === 2
          ? 'grid-cols-1 lg:grid-cols-2'
          : cols === 3
            ? 'grid-cols-1 lg:grid-cols-3'
            : cols === 4
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : cols === 5
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'
      : cols === 1
        ? 'grid-cols-1'
        : cols === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : cols === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : cols === 4
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
              : cols === 5
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-6';

  return (
    <div
      className={cn(
        'w-full transition-colors',
        BG_STYLES[background] || BG_STYLES.default
      )}
    >
      <div
        className={cn(
          containerClass,
          FOOTER_PADDINGS[paddingY] || FOOTER_PADDINGS.lg
        )}
      >
        <div className={cn('grid', gridColsClass, GAP_STYLES[gap] || GAP_STYLES.lg)}>
          {slots.map((slot, index) => (
            <div key={index} className="min-w-0 flex flex-col space-y-3">
              {renderSlot(slot, zones)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Logo ---------- */

export type LogoProps = {
  source?: 'site' | 'media';
  mediaUrl?: string;
  darkMediaUrl?: string;
  stickyMediaUrl?: string;
  width?: number;
  link?: string;
  showSiteName?: boolean;
  siteName?: string;
  siteLogo?: string;
  siteSlug?: string;
};

export function Logo({
  source = 'site',
  mediaUrl,
  darkMediaUrl,
  width = 140,
  link = '/',
  showSiteName = true,
  siteName = 'Site Name',
  siteLogo,
  siteSlug,
}: LogoProps) {
  const logoUrl =
    source === 'site' ? siteLogo : mediaUrl || siteLogo;
  const href = menuHref(link || '/', siteSlug);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 font-bold text-lg hover:opacity-90 transition-opacity"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={siteName || 'Logo'}
          style={{ width: `${width}px`, maxWidth: '100%', height: 'auto' }}
          className="object-contain"
        />
      ) : null}
      {showSiteName && siteName && (
        <span className="truncate">{siteName}</span>
      )}
    </Link>
  );
}

/* ---------- NavMenu ---------- */

export type NavMenuProps = {
  location?: 'header' | 'footer';
  orientation?: 'horizontal' | 'vertical';
  depth?: number;
  dropdownTrigger?: 'hover' | 'click';
  gap?: 'sm' | 'md' | 'lg';
  activeStyle?: 'underline' | 'pill' | 'bold' | 'none';
  menu?: MenuWithItems | null;
  siteSlug?: string;
};

const SAMPLE_NAV_MENU = {
  id: 'sample-nav',
  siteId: 'default',
  name: 'Navigation',
  location: 'header',
  items: [
    { id: '1', label: 'Home', url: '/', target: '_self', children: [] },
    { id: '2', label: 'About', url: '/about', target: '_self', children: [] },
    { id: '3', label: 'Blog', url: '/blog', target: '_self', children: [] },
    { id: '4', label: 'Contact', url: '/contact', target: '_self', children: [] },
  ],
} as unknown as MenuWithItems;

export function NavMenu({
  location = 'header',
  orientation = 'horizontal',
  depth = 2,
  dropdownTrigger = 'hover',
  gap = 'md',
  activeStyle = 'underline',
  menu,
  siteSlug,
}: NavMenuProps) {
  const resolvedMenu = menu?.items?.length ? menu : SAMPLE_NAV_MENU;

  return (
    <nav aria-label={`${location} navigation`}>
      <MenuLinks
        menu={resolvedMenu}
        orientation={orientation}
        depth={depth}
        gap={gap}
        activeStyle={activeStyle}
        siteSlug={siteSlug}
      />
    </nav>
  );
}

/* ---------- Copyright ---------- */

export type CopyrightProps = {
  text?: string;
  align?: 'left' | 'center' | 'right';
  siteName?: string;
};

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Copyright({
  text = '© {year} {site_name}. All rights reserved.',
  align = 'center',
  siteName = 'Site',
}: CopyrightProps) {
  const year = new Date().getFullYear().toString();
  const renderedText = (text || '')
    .replace(/\{year\}/g, year)
    .replace(/\{site_name\}/g, siteName || 'Site');

  return (
    <p
      className={cn(
        'text-xs text-steel-500 dark:text-steel-400',
        ALIGN_CLASS[align] || ALIGN_CLASS.center
      )}
    >
      {renderedText}
    </p>
  );
}

/* ---------- FooterLinks ---------- */

export type FooterLinksProps = {
  heading?: string;
  source?: 'menu' | 'manual';
  menuLocation?: 'header' | 'footer';
  links?: { label: string; url: string; target?: string }[];
  collapseOnMobile?: boolean;
  menu?: MenuWithItems | null;
  siteSlug?: string;
};

export function FooterLinks({
  heading = 'Quick Links',
  source = 'manual',
  menuLocation = 'footer',
  links = [
    { label: 'Privacy Policy', url: '/privacy' },
    { label: 'Terms of Service', url: '/terms' },
    { label: 'Contact Support', url: '/contact' },
  ],
  collapseOnMobile = false,
  menu,
  siteSlug,
}: FooterLinksProps) {
  const items =
    source === 'menu' && menu?.items?.length
      ? menu.items.map(i => ({ label: i.label, url: i.url, target: i.target }))
      : links;

  return (
    <div className="flex flex-col space-y-2">
      {heading && (
        <h4 className="font-semibold text-sm tracking-tight text-[var(--site-text)]">
          {heading}
        </h4>
      )}
      <ul className="flex flex-col space-y-1.5 text-sm text-steel-600 dark:text-steel-300">
        {(items || []).map((link, idx) => (
          <li key={idx}>
            <a
              href={menuHref(link.url, siteSlug)}
              target={link.target}
              rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
              className="hover:underline hover:text-[var(--site-text)] transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
