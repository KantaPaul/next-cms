import { siteHref } from '@/lib/utils/site-href';
import type { ReactNode } from 'react';
import type { MenuWithItems } from '@/server/services/public-site.service';
import { MegaMenuItem } from './mega-menu-item';
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
  activeUrl?: string;
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
  activeUrl,
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
        const isActive =
          activeUrl && (activeUrl === href || activeUrl.startsWith(href));

        let activeCls = '';
        if (isActive) {
          if (activeStyle === 'underline')
            activeCls = 'underline underline-offset-4';
          else if (activeStyle === 'bold') activeCls = 'font-bold';
          else if (activeStyle === 'pill')
            activeCls = 's-soft-primary px-2.5 py-1 rounded-full font-semibold';
        }

        const linkElProps = {
          className: cn(linkStyle.className, activeCls),
          style: linkStyle.style,
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

        const panel =
          orientation === 'horizontal' ? megaPanels?.[item.id] : null;
        if (panel) {
          return (
            <MegaMenuItem
              key={item.id}
              trigger={trigger}
              panel={panel}
              link={
                <a
                  href={href}
                  target={item.target}
                  rel={
                    item.target === '_blank' ? 'noopener noreferrer' : undefined
                  }
                  {...linkElProps}
                >
                  {item.label}
                  {badgeEl}
                </a>
              }
            />
          );
        }

        return (
          <li key={item.id} className="group relative">
            <a
              href={href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
              {...linkElProps}
            >
              {item.label}
              {badgeEl}
            </a>
            {depth > 1 && item.children && item.children.length > 0 && (
              <ul
                {...el(
                  styled,
                  'dropdown',
                  's-border invisible absolute left-0 top-full z-20 min-w-44 rounded-md border bg-[var(--site-bg)] p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100'
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
          </li>
        );
      })}
    </ul>
  );
}
