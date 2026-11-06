'use client';

import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
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
import { getMenuItems } from '@/menus';
import { useAccess } from '@/providers/access.provider';
import { useSiteLocales } from '@/providers/site-locales';
import { withAdminLanguage } from '@/lib/locale/admin-locale';

export type SidebarPostType = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  taxonomies?: { id: string; key: string; name: string }[];
};

type NavItem = ReturnType<typeof getMenuItems>[number];

export function NavMain({ postTypes = [] }: { postTypes?: SidebarPostType[] }) {
  const pathname = usePathname();
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
  const menuItems = getMenuItems()
    .flatMap(item => (item.name === 'Posts' ? [item, ...postTypeItems] : [item]))
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
          const isActive =
            isPostTypeItem
              ? within(item.href)
              : item.href === PAGES.DASHBOARD.COLLECTIONS && inPostType
                ? false
                : item.href === pathname ||
                  pathname.startsWith(`${item.href}/`);
          const { name, icon, href } = item;

          if (isPostTypeItem && postType) {
            const subItems = [
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
                name: 'Templates',
                href: PAGES.DASHBOARD.COLLECTION_TEMPLATES(postType.slug),
              },
              {
                name: 'Settings',
                href: PAGES.DASHBOARD.COLLECTION_SETTINGS(postType.slug),
              },
            ];

            return (
              <Collapsible
                key={item.href}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={name}
                    isActive={isActive}
                  >
                    <Link href={withAdminLanguage(href, chosenLocale)}>
                      {icon}
                      <span>{name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction
                      className="transition-transform duration-200 data-[state=open]:rotate-90"
                      aria-label={`Toggle ${name} menu`}
                    >
                      <ChevronRight className="size-4" />
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {subItems.map(sub => {
                        const isSubActive =
                          sub.href ===
                          PAGES.DASHBOARD.COLLECTION(postType.slug)
                            ? pathname === sub.href
                            : pathname === sub.href ||
                              pathname.startsWith(`${sub.href}/`);
                        return (
                          <SidebarMenuSubItem key={sub.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                            >
                              <Link
                                href={withAdminLanguage(
                                  sub.href,
                                  chosenLocale
                                )}
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
              <SidebarMenuButton
                asChild
                tooltip={name}
                isActive={isActive}
              >
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
