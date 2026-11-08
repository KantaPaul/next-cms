import { siteHref } from '@/lib/utils/site-href';
import type { ReactNode } from 'react';
import type { MenuWithItems } from '@/server/services/public-site.service';
import { ActiveNavLink } from './active-nav-link';
import { DropdownMenuItem, MegaMenuItem } from './mega-menu-item';
import { el, linkEl } from '@/builder/blocks/element';
import type { ElementStyle } from '@/builder/style';
import { cn } from '@/lib/utils/cn';

/** Menu URLs may be saved with or without the site slug; prefix only once. */
export function menuHref(url: string, siteSlug?: string) {
  if (url.startsWith('#')) return url;
  if (siteSlug && (url === `/${siteSlug}` || url.startsWith(`/${siteSlug}/`)))
    return url;
  return siteHref(url, siteSlug);
}

export type MenuLinksProps = {
  menu?: MenuWithItems | null;
  className?: string;
  siteSlug?: string;
  activeStyle?: 'underline' | 'pill' | 'bold' | 'none';
  orientation?: 'horizontal' | 'vertical';
  depth?: number;
  gap?: 'sm' | 'md' | 'lg';
  /** Rendered mega menu panels by top-level menu item id. */
  megaPanels?: Record<string, ReactNode>;
  /** How mega menu panels open. */
  trigger?: 'hover' | 'click';
  elements?: Record<string, ElementStyle>;
};

const gapClasses: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-5',
  lg: 'gap-8',
};

export function MenuLinks({
  menu,
  className,
  siteSlug,
  activeStyle = 'underline',
  orientation = 'horizontal',
  depth = 2,
  gap = 'md',
  megaPanels,
  trigger = 'hover',
  elements,
}: MenuLinksProps) {
  if (!menu?.items.length) return null;

  const orientationClass =
    orientation === 'vertical'
      ? 'flex flex-col space-y-2'
      : `flex flex-wrap items-center ${gapClasses[gap] || 'gap-5'}`;

  const combinedClass = className
    ? `${orientationClass} ${className}`
    : orientationClass;
  const styled = { elements };
  const linkStyle = linkEl(
    styled,
    'link',
    'inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity'
  );

  return (
    <ul className={combinedClass}>
      {menu.items.map(item => {
        const href = menuHref(item.url, siteSlug);
        const activeClass =
          activeStyle === 'underline'
            ? 'underline underline-offset-4'
            : activeStyle === 'bold'
              ? 'font-bold'
              : activeStyle === 'pill'
                ? 's-soft-primary px-2.5 py-1 rounded-full font-semibold'
                : '';
        const activeEl = el(styled, 'activeLink', activeClass);
        const linkProps = {
          href,
          homeHref: menuHref('/', siteSlug),
          childHrefs: item.children?.map(child =>
            menuHref(child.url, siteSlug)
          ),
          target: item.target,
          rel: item.target === '_blank' ? 'noopener noreferrer' : undefined,
          className: linkStyle.className,
          style: linkStyle.style,
          activeClassName: activeEl.className,
          activeStyle: activeEl.style,
        };

        const badgeEl = item.badge ? (
          <span
            {...el(
              styled,
              'badge',
              's-soft-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold'
            )}
          >
            {item.badge}
          </span>
        ) : null;

        const hasDropdown = depth > 1 && Boolean(item.children?.length);

        const panel =
          orientation === 'horizontal' ? megaPanels?.[item.id] : null;
        if (panel) {
          return (
            <MegaMenuItem
              key={item.id}
              trigger={trigger}
              panel={panel}
              link={
                <ActiveNavLink {...linkProps}>
                  {item.label}
                  {badgeEl}
                </ActiveNavLink>
              }
            />
          );
        }

        return (
          <DropdownMenuItem key={item.id} className="group relative">
            <ActiveNavLink {...linkProps}>
              {item.label}
              {badgeEl}
              {hasDropdown && (
                <span className="inline-flex size-5 items-center justify-center opacity-70">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-focus-within:rotate-180 group-hover:rotate-180"
                  >
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
                  </svg>
                </span>
              )}
            </ActiveNavLink>
            {hasDropdown && (
              <ul
                {...el(
                  styled,
                  'dropdown',
                  's-border invisible absolute left-0 top-[calc(100%+var(--dropdown-offset,0px))] z-20 min-w-44 rounded-md border bg-[var(--site-bg)] p-2 opacity-0 shadow-lg transition before:absolute before:inset-x-0 before:bottom-full before:h-[var(--dropdown-offset,0px)] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100'
                )}
              >
                {item.children.map(child => (
                  <li key={child.id}>
                    <a
                      href={menuHref(child.url, siteSlug)}
                      target={child.target}
                      rel={
                        child.target === '_blank'
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      {...linkEl(
                        styled,
                        'dropdownLink',
                        'block rounded px-2 py-1.5 text-sm hover:opacity-80'
                      )}
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </DropdownMenuItem>
        );
      })}
    </ul>
  );
}
