'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const clean = (url: string) => url.split(/[?#]/)[0].replace(/(?<=.)\/+$/, '');

/** The current path in the same form as menu links, with the site slug. */
function resolvePath(pathname: string, homeHref: string) {
  const home = clean(homeHref);
  const current = clean(pathname);
  return home === '/' || current === home || current.startsWith(`${home}/`)
    ? current
    : `${home}${current === '/' ? '' : current}`;
}

/**
 * Whether a menu link points at the current page. A section link also matches
 * the pages under it, split on path segments so /blog does not match /blogger.
 * The home link matches only itself, or it would be active on every page.
 */
export function isActiveHref(
  pathname: string,
  href: string,
  homeHref: string
): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const home = clean(homeHref);
  const target = clean(href);
  // A site's pages can also be served without its slug: /blog for /main/blog.
  const path = resolvePath(pathname, homeHref);
  if (path === target) return true;
  if (target === home) return false;
  return path.startsWith(`${target}/`);
}

type ActiveNavLinkProps = {
  href: string;
  homeHref: string;
  /** Dropdown links: the parent stays active while one of them is open. */
  childHrefs?: string[];
  target?: string;
  rel?: string;
  className?: string;
  style?: CSSProperties;
  activeClassName?: string;
  activeStyle?: CSSProperties;
  children: ReactNode;
};

export function ActiveNavLink({
  href,
  homeHref,
  childHrefs,
  target,
  rel,
  className,
  style,
  activeClassName,
  activeStyle,
  children,
}: ActiveNavLinkProps) {
  const pathname = usePathname() ?? '';
  const active =
    isActiveHref(pathname, href, homeHref) ||
    Boolean(childHrefs?.some(child => isActiveHref(pathname, child, homeHref)));

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      aria-current={
        resolvePath(pathname, homeHref) === clean(href) ? 'page' : undefined
      }
      className={cn(className, active && activeClassName)}
      style={active ? { ...style, ...activeStyle } : style}
    >
      {children}
    </a>
  );
}
