'use client';

import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
};

type NavItem = ReturnType<typeof getMenuItems>[number];

export function NavMain({ postTypes = [] }: { postTypes?: SidebarPostType[] }) {
  const pathname = usePathname();
  const { permissions } = useAccess();
  const { chosenLocale } = useSiteLocales();

  // Each post type gets its own entry after Posts, like WordPress.
  const postTypeItems: NavItem[] = postTypes.map(type => ({
    name: type.name,
    href: PAGES.DASHBOARD.COLLECTION(type.slug),
    icon: <PostTypeIcon name={type.icon} className="w-[18px]" />,
    permission: PERMISSIONS.PAGES_EDIT,
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
          const isPostTypeItem = postTypeItems.includes(item);
          const isActive =
            isPostTypeItem
              ? within(item.href)
              : item.href === PAGES.DASHBOARD.COLLECTIONS && inPostType
                ? false
                : item.href === pathname ||
                  pathname.startsWith(`${item.href}/`);
          const { name, icon, href } = item;
          return (
            <Collapsible
              key={item.href}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {href ? (
                  <CollapsibleTrigger asChild>
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
                  </CollapsibleTrigger>
                ) : (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={name} isActive={isActive}>
                        {icon}
                        <span>{name}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
