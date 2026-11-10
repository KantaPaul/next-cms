'use client';

import { ChevronRight } from 'lucide-react';
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
import { withAdminLanguage } from '@/lib/locale/admin-locale';
import { getMenuItems } from '@/menus';
import { useAccess } from '@/providers/access.provider';
import { useSiteLocales } from '@/providers/site-locales';

export type SidebarPostType = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  taxonomies?: { id: string; key: string; name: string }[];
};

export type SidebarPluginPage = {
  name: string;
  href: string;
  permission?: string;
};

type NavItem = ReturnType<typeof getMenuItems>[number];

export function NavMain({
  postTypes = [],
  pluginPages = [],
}: {
  postTypes?: SidebarPostType[];
  pluginPages?: SidebarPluginPage[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { permissions } = useAccess();
  const { chosenLocale } = useSiteLocales();

  // Each post type gets its own entry after Posts, like WordPress.
  const postTypeItems: (NavItem & { postType?: SidebarPostType })[] =
    postTypes.map(type => ({
      name: type.name,
      href: PAGES.DASHBOARD.COLLECTION(type.slug),
      icon: <PostTypeIcon name={type.icon} className="w-[18px]" />,
      permission: PERMISSIONS.PAGES_EDIT,
      postType: type,
    }));
  const visiblePluginPages = pluginPages.filter(
    p => !p.permission || permissions.includes(p.permission)
  );
  const menuItems = getMenuItems()
    .flatMap(item => {
      if (item.name === 'Posts') return [item, ...postTypeItems];
      if (item.name === 'Plugins' && visiblePluginPages.length > 0) {
        return [
          {
            ...item,
            children: [
              { name: 'All plugins', href: PAGES.DASHBOARD.PLUGINS },
              ...visiblePluginPages.map(p => ({ name: p.name, href: p.href })),
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
      <SidebarGroupLabel>MENU ITEMS</SidebarGroupLabel>
      <SidebarMenu>
        {menuItems.map(item => {
          const postType = (item as { postType?: SidebarPostType }).postType;
          const isPostTypeItem = !!postType;
          const isActive = isPostTypeItem
            ? within(item.href)
            : item.href === PAGES.DASHBOARD.COLLECTIONS && inPostType
              ? false
              : item.href === pathname || pathname.startsWith(`${item.href}/`);
          const { name, icon, href } = item;

          const subItems: { name: string; href: string }[] | null =
            isPostTypeItem && postType
              ? [
              {
                name: 'Entries',
                href: PAGES.DASHBOARD.COLLECTION(postType.slug),
              },
              ...(postType.taxonomies ?? []).map(tax => ({
                name: tax.name,
                href: PAGES.DASHBOARD.COLLECTION_TAXONOMY(
                  postType.slug,
                  tax.key
                ),
              })),
              {
                name: 'Blocks',
                href: PAGES.DASHBOARD.COLLECTION_BLOCKS(postType.slug),
              },
              {
                name: 'Templates',
                href: PAGES.DASHBOARD.COLLECTION_TEMPLATES(postType.slug),
              },
              {
                name: 'Settings',
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
                    <SidebarMenuButton
                      asChild
                      tooltip={name}
                      isActive={isActive}
                    >
                      <span className='block cursor-pointer'>
                        {icon}
                        <span>{name}</span>
                        <SidebarMenuAction
                          className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          aria-label={`Toggle ${name} menu`}
                        >
                          <ChevronRight className="size-4" />
                        </SidebarMenuAction>
                      </span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarMenuSub>
                      {subItems.map(sub => {
                        return (
                          <SidebarMenuSubItem key={sub.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive(sub.href)}
                            >
                              <Link
                                href={withAdminLanguage(sub.href, chosenLocale)}
                              >
                                <span>{sub.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={name} isActive={isActive}>
                <Link href={withAdminLanguage(href, chosenLocale)}>
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
