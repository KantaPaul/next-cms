import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { renderSlot, type SlotValue } from './content';
import { MenuLinks, menuHref } from '@/components/site/menu-links';
import type { MenuWithItems } from '@/server/services/public-site.service';
import { LanguageSwitcher } from '@/components/site/language-switcher';
import {
  MobileMenuClient,
  type MobileMenuClientProps,
  SearchBoxClient,
  type SearchBoxClientProps,
  AnnouncementBarClient,
  type AnnouncementBarClientProps,
  BackToTopClient,
  type BackToTopClientProps,
  ThemeToggleClient,
  type ThemeToggleClientProps,
} from './site-chrome-client';

/* ---------- HeaderBar ---------- */

export type HeaderBarProps = {
  width?: 'boxed' | 'full';
  background?: 'default' | 'muted' | 'inverted' | 'primary' | 'transparent';
  paddingY?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  minHeight?: string;
  borderBottom?: boolean;
  align?: 'center' | 'start' | 'end';
  layout?: 'left-center-right' | 'split-2' | 'equal-3' | 'left-heavy' | 'right-heavy';
  left?: SlotValue;
  center?: SlotValue;
  right?: SlotValue;
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

const BG_STYLES: Record<string, string> = {
  default: 'bg-transparent text-inherit',
  muted: 'bg-[var(--site-surface)] text-[var(--site-text)]',
  inverted: 'bg-[var(--site-text)] text-[var(--site-bg)]',
  primary: 'bg-[var(--site-primary)] text-white',
  transparent: 'bg-transparent text-inherit',
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
  layout = 'left-center-right',
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

  const colStyles = {
    'left-center-right': {
      left: 'flex items-center gap-3 min-w-0',
      center: 'flex items-center gap-4 min-w-0 justify-center flex-1',
      right: 'flex items-center gap-3 min-w-0 justify-end',
    },
    'split-2': {
      left: 'flex items-center gap-4 min-w-0 flex-1',
      center: 'hidden',
      right: 'flex items-center gap-4 min-w-0 justify-end',
    },
    'equal-3': {
      left: 'flex items-center gap-3 min-w-0 flex-1',
      center: 'flex items-center gap-4 min-w-0 justify-center flex-1',
      right: 'flex items-center gap-3 min-w-0 justify-end flex-1',
    },
    'left-heavy': {
      left: 'flex items-center gap-4 min-w-0 flex-[2]',
      center: 'flex items-center gap-3 min-w-0 justify-center flex-1',
      right: 'flex items-center gap-3 min-w-0 justify-end flex-1',
    },
    'right-heavy': {
      left: 'flex items-center gap-3 min-w-0 flex-1',
      center: 'flex items-center gap-3 min-w-0 justify-center flex-1',
      right: 'flex items-center gap-4 min-w-0 justify-end flex-[2]',
    },
  }[layout || 'left-center-right'];

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
        <div className={colStyles.left}>
          {renderSlot(left, zones)}
        </div>
        {colStyles.center !== 'hidden' && (
          <div className={colStyles.center}>
            {renderSlot(center, zones)}
          </div>
        )}
        <div className={colStyles.right}>
          {renderSlot(right, zones)}
        </div>
      </div>
    </div>
  );
}

/* ---------- HeaderColumns ---------- */

export type HeaderColumnsProps = {
  width?: 'boxed' | 'full';
  background?: 'default' | 'muted' | 'inverted' | 'primary' | 'transparent';
  paddingY?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  columns?: number;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'center' | 'start' | 'end';
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

export function HeaderColumns({
  width = 'boxed',
  background = 'default',
  paddingY = 'none',
  columns = 3,
  gap = 'md',
  align = 'center',
  stackOn = 'mobile',
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  zones,
  editing,
}: HeaderColumnsProps) {
  const containerClass =
    width === 'full'
      ? 'w-full px-4 sm:px-6 lg:px-8'
      : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  const cols = Math.min(Math.max(Number(columns) || 3, 1), 6);
  const slots = [col1, col2, col3, col4, col5, col6].slice(0, cols);

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
          PADDING_Y[paddingY] || PADDING_Y.none,
          'grid items-center',
          gridColsClass,
          GAP_STYLES[gap] || GAP_STYLES.md,
          ALIGN_ITEMS[align] || ALIGN_ITEMS.center
        )}
      >
        {slots.map((slot, index) => (
          <div key={index} className="min-w-0">
            {renderSlot(slot, zones)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- FooterColumns ---------- */

export type FooterColumnsProps = {
  width?: 'boxed' | 'full';
  background?: 'default' | 'muted' | 'inverted' | 'primary';
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  columns?: number;
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

/* ---------- MobileMenu ---------- */

export type MobileMenuProps = MobileMenuClientProps & {
  menuLocation?: 'header' | 'footer';
};

export function MobileMenu(props: MobileMenuProps) {
  return <MobileMenuClient {...props} />;
}

/* ---------- SearchBox ---------- */

export type SearchBoxProps = SearchBoxClientProps;

export function SearchBox(props: SearchBoxProps) {
  return <SearchBoxClient {...props} />;
}

/* ---------- AnnouncementBar ---------- */

export type AnnouncementBarProps = AnnouncementBarClientProps;

export function AnnouncementBar(props: AnnouncementBarProps) {
  return <AnnouncementBarClient {...props} />;
}

/* ---------- BackToTop ---------- */

export type BackToTopProps = BackToTopClientProps;

export function BackToTop(props: BackToTopProps) {
  return <BackToTopClient {...props} />;
}

/* ---------- SocialIcons ---------- */

export type SocialNetwork =
  | 'x'
  | 'twitter'
  | 'github'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'discord'
  | 'tiktok';

export type SocialItem = {
  network: SocialNetwork | string;
  url: string;
  label?: string;
};

export type SocialIconsProps = {
  items?: SocialItem[];
  shape?: 'plain' | 'round' | 'square';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
};

const SOCIAL_ALIGN: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const SOCIAL_SIZE_ICON: Record<string, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

const SOCIAL_SHAPE: Record<string, Record<string, string>> = {
  plain: {
    sm: 'p-1 text-steel-600 hover:text-steel-900 dark:text-steel-400 dark:hover:text-white transition-colors',
    md: 'p-1.5 text-steel-600 hover:text-steel-900 dark:text-steel-400 dark:hover:text-white transition-colors',
    lg: 'p-2 text-steel-600 hover:text-steel-900 dark:text-steel-400 dark:hover:text-white transition-colors',
  },
  round: {
    sm: 'p-1.5 rounded-full bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
    md: 'p-2 rounded-full bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
    lg: 'p-2.5 rounded-full bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
  },
  square: {
    sm: 'p-1.5 rounded-md bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
    md: 'p-2 rounded-md bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
    lg: 'p-2.5 rounded-md bg-steel-100 hover:bg-steel-200 text-steel-700 dark:bg-dark-200 dark:hover:bg-dark-100 dark:text-steel-300 transition-colors',
  },
};

function renderNetworkIcon(network: string, iconClass: string) {
  const norm = network.toLowerCase().trim();
  switch (norm) {
    case 'x':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn(iconClass, 'fill-current')}
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'twitter':
      return <Twitter className={iconClass} />;
    case 'github':
      return <Github className={iconClass} />;
    case 'linkedin':
      return <Linkedin className={iconClass} />;
    case 'youtube':
      return <Youtube className={iconClass} />;
    case 'facebook':
      return <Facebook className={iconClass} />;
    case 'instagram':
      return <Instagram className={iconClass} />;
    case 'discord':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn(iconClass, 'fill-current')}
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn(iconClass, 'fill-current')}
        >
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    default:
      return <Github className={iconClass} />;
  }
}

export function SocialIcons({
  items = [
    { network: 'x', url: 'https://x.com', label: 'X' },
    { network: 'github', url: 'https://github.com', label: 'GitHub' },
    { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
  ],
  shape = 'plain',
  size = 'md',
  align = 'left',
}: SocialIconsProps) {
  const iconClass = SOCIAL_SIZE_ICON[size] || SOCIAL_SIZE_ICON.md;
  const shapeMap = SOCIAL_SHAPE[shape] || SOCIAL_SHAPE.plain;
  const btnClass = shapeMap[size] || shapeMap.md;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        SOCIAL_ALIGN[align] || SOCIAL_ALIGN.left
      )}
      aria-label="Social links"
    >
      {(items || []).map((item, idx) => {
        const networkName = item.network || 'link';
        const aria = item.label || networkName;
        return (
          <a
            key={idx}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={aria}
            title={aria}
            className={btnClass}
          >
            {renderNetworkIcon(networkName, iconClass)}
          </a>
        );
      })}
    </div>
  );
}

/* ---------- ContactInfo ---------- */

export type ContactInfoItem = {
  kind: 'address' | 'phone' | 'email';
  value: string;
  label?: string;
};

export type ContactInfoProps = {
  items?: ContactInfoItem[];
  showIcons?: boolean;
  layout?: 'vertical' | 'horizontal';
  align?: 'left' | 'center' | 'right';
};

const CONTACT_ALIGN: Record<string, string> = {
  left: 'items-start text-left justify-start',
  center: 'items-center text-center justify-center',
  right: 'items-end text-right justify-end',
};

export function ContactInfo({
  items = [
    { kind: 'email', value: 'contact@example.com', label: 'Email' },
    { kind: 'phone', value: '+1 (555) 000-0000', label: 'Phone' },
  ],
  showIcons = true,
  layout = 'vertical',
  align = 'left',
}: ContactInfoProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={cn(
        'text-sm text-steel-600 dark:text-steel-300',
        isHorizontal
          ? 'flex flex-wrap items-center gap-x-6 gap-y-2'
          : 'flex flex-col space-y-2',
        CONTACT_ALIGN[align] || CONTACT_ALIGN.left
      )}
    >
      {(items || []).map((item, idx) => {
        let icon = null;
        let href: string | undefined;

        if (item.kind === 'email') {
          icon = <Mail className="size-4 shrink-0" />;
          href = `mailto:${item.value}`;
        } else if (item.kind === 'phone') {
          icon = <Phone className="size-4 shrink-0" />;
          href = `tel:${item.value.replace(/\s+/g, '')}`;
        } else {
          icon = <MapPin className="size-4 shrink-0" />;
        }

        const content = (
          <span className="inline-flex items-center gap-2">
            {showIcons && icon}
            <span>{item.label ? `${item.label}: ${item.value}` : item.value}</span>
          </span>
        );

        return (
          <div key={idx} className="inline-flex items-center">
            {href ? (
              <a
                href={href}
                className="hover:underline hover:text-[var(--site-text)] transition-colors"
              >
                {content}
              </a>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- LegalLinks ---------- */

export type LegalLinksProps = {
  source?: 'menu' | 'manual';
  menuLocation?: 'header' | 'footer';
  links?: { label: string; url: string; target?: string }[];
  separator?: 'dot' | 'pipe' | 'dash' | 'none';
  align?: 'left' | 'center' | 'right';
  menu?: MenuWithItems | null;
  siteSlug?: string;
};

const LEGAL_ALIGN: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const LEGAL_SEPARATORS: Record<string, string> = {
  dot: '·',
  pipe: '|',
  dash: '–',
  none: '',
};

export function LegalLinks({
  source = 'manual',
  menuLocation = 'footer',
  links = [
    { label: 'Privacy Policy', url: '/privacy' },
    { label: 'Terms of Service', url: '/terms' },
    { label: 'Cookie Settings', url: '/cookies' },
  ],
  separator = 'dot',
  align = 'center',
  menu,
  siteSlug,
}: LegalLinksProps) {
  const items =
    source === 'menu' && menu?.items?.length
      ? menu.items.map(i => ({ label: i.label, url: i.url, target: i.target }))
      : links;

  const sepChar = LEGAL_SEPARATORS[separator] ?? '·';

  return (
    <nav
      aria-label="Legal links"
      className={cn(
        'flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-steel-500 dark:text-steel-400',
        LEGAL_ALIGN[align] || LEGAL_ALIGN.center
      )}
    >
      {(items || []).map((link, idx) => (
        <span key={idx} className="inline-flex items-center gap-2.5">
          {idx > 0 && sepChar && (
            <span className="text-steel-300 dark:text-steel-600 select-none" aria-hidden>
              {sepChar}
            </span>
          )}
          <a
            href={menuHref(link.url, siteSlug)}
            target={link.target}
            rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
            className="hover:underline hover:text-[var(--site-text)] transition-colors"
          >
            {link.label}
          </a>
        </span>
      ))}
    </nav>
  );
}

/* ---------- ThemeToggle ---------- */

export type ThemeToggleProps = ThemeToggleClientProps;

export function ThemeToggle(props: ThemeToggleProps) {
  return <ThemeToggleClient {...props} />;
}

/* ---------- LanguageSwitcherBlock ---------- */

export function LanguageSwitcherBlock() {
  return <LanguageSwitcher />;
}
