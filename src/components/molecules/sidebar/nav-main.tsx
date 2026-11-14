'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type { PostTypeSupports } from '@/config/post-types';
import { stripAdminLocale } from '@/lib/locale/admin-href';
import { getMenuItems, type MenuItem } from '@/menus';
import { useAccess } from '@/providers/access.provider';

export type SidebarPostType = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  supports?: PostTypeSupports;
  taxonomies?: { id: string; key: string; name: string }[];
};

export type SidebarPluginPage = {
  name: string;
  href: string;
  permission?: string;
};

/**
 * A sidebar entry. Built-in entries carry a `nav` message key; post types,
 * taxonomies and plugin pages carry their own (user-entered) `label`.
 */
type NavEntry = {
  labelKey?: string;
  label?: string;
  href: string;
};

type NavItem = NavEntry &
  Omit<MenuItem, 'labelKey' | 'children'> & {
    children?: NavEntry[];
    postType?: SidebarPostType;
  };

export function NavMain({
  postTypes = [],
  pluginPages = [],
}: {
  postTypes?: SidebarPostType[];
  pluginPages?: SidebarPluginPage[];
}) {
  const rawPathname = usePathname();
  const pathname = stripAdminLocale(rawPathname).path;
  const searchParams = useSearchParams();
  const { permissions } = useAccess();
  const tNav = useTranslations('nav');
  const labelOf = (entry: NavEntry) =>
    entry.label ?? (entry.labelKey ? tNav(entry.labelKey as never) : '');

  // Each post type gets its own entry after Posts, like WordPress.
  const postTypeItems: NavItem[] = postTypes.map(type => ({
    label: type.name,
    href: PAGES.DASHBOARD.COLLECTION(type.slug),
    icon: <PostTypeIcon name={type.icon} className="w-[18px]" />,
    permission: PERMISSIONS.PAGES_EDIT,
    postType: type,
  }));
  const visiblePluginPages = pluginPages.filter(
    p => !p.permission || permissions.includes(p.permission)
  );
  const menuItems: NavItem[] = getMenuItems()
    .flatMap((item): NavItem[] => {
      if (item.labelKey === 'posts') return [item, ...postTypeItems];
      if (item.labelKey === 'plugins' && visiblePluginPages.length > 0) {
        return [
          {
            ...item,
            children: [
              { labelKey: 'allPlugins', href: PAGES.DASHBOARD.PLUGINS },
              ...visiblePluginPages.map(p => ({ label: p.name, href: p.href })),
            ],
          },
        ];
      }
      return [item];
    })
    .filter(item => !item.permission || permissions.includes(item.permission));

  // Inside one post type's screens, highlight that type, not "Post types".
  const within = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  const inPostType = postTypes.some(type =>
    within(PAGES.DASHBOARD.COLLECTION(type.slug))
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{tNav('menuItems')}</SidebarGroupLabel>
      <SidebarMenu>
        {menuItems.map(item => {
          const { postType } = item;
          const isActive = postType
            ? within(item.href)
            : item.href === PAGES.DASHBOARD.COLLECTIONS && inPostType
              ? false
              : item.href === pathname || pathname.startsWith(`${item.href}/`);
          const { icon, href } = item;
          const name = labelOf(item);

          const subItems: NavEntry[] | null = postType
            ? [
                {
                  labelKey: 'postTypeMenu.entries',
                  href: PAGES.DASHBOARD.COLLECTION(postType.slug),
                },
                ...(postType.taxonomies ?? []).map(tax => ({
                  label: tax.name,
                  href: PAGES.DASHBOARD.COLLECTION_TAXONOMY(postType.slug, tax.key),
                })),
                {
                  labelKey: 'postTypeMenu.blocks',
                  href: PAGES.DASHBOARD.COLLECTION_BLOCKS(postType.slug),
                },
                {
                  labelKey: 'postTypeMenu.templates',
                  href: PAGES.DASHBOARD.COLLECTION_TEMPLATES(postType.slug),
                },
                ...(postType.supports?.comments !== false &&
                permissions.includes(PERMISSIONS.COMMENTS_MODERATE)
                  ? [
                      {
                        labelKey: 'postTypeMenu.comments',
                        href: PAGES.DASHBOARD.COLLECTION_COMMENTS(postType.slug),
                      },
                    ]
                  : []),
                {
                  labelKey: 'postTypeMenu.settings',
                  href: PAGES.DASHBOARD.COLLECTION_SETTINGS(postType.slug),
                },
              ]
            : item.children?.length
              ? item.children
              : null;

          if (subItems) {
            const isSubActive = (subHref: string) => {
              const [subPath, subQuery] = subHref.split('?');
              if (subQuery) {
                if (pathname !== subPath && !pathname.startsWith(`${subPath}/`))
                  return false;
                const want = new URLSearchParams(subQuery);
                const first = subItems[0]?.href === subHref;
                return [...want.entries()].every(([k, v]) => {
                  const got = searchParams.get(k);
                  return got === v || (!got && first);
                });
              }
              if (postType && subHref === PAGES.DASHBOARD.COLLECTION(postType.slug))
                return pathname === subHref;
              if (subHref === PAGES.DASHBOARD.SETTINGS)
                return pathname === subHref;
              return pathname === subHref || pathname.startsWith(`${subHref}/`);
            };

            return (
              <Collapsible
                key={item.href}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild tooltip={name} isActive={isActive}>
                      <span className="block cursor-pointer">
                        {icon}
                        <span>{name}</span>
                        <SidebarMenuAction
                          className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100 rtl:group-data-[state=open]/collapsible:-rotate-90"
                          aria-label={tNav('toggleMenu', { name })}
                        >
                          <ChevronRight className="size-4" />
                        </SidebarMenuAction>
                      </span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarMenuSub>
                      {subItems.map(sub => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton asChild isActive={isSubActive(sub.href)}>
                            <Link href={sub.href}>
                              <span>{labelOf(sub)}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={name} isActive={isActive}>
                <Link href={href}>
                  {icon}
                  <span>{name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
