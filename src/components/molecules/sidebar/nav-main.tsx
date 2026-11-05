'use client';

import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
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

export function NavMain() {
  const pathname = usePathname();
  const { permissions } = useAccess();
  const { chosenLocale } = useSiteLocales();

  const menuItems = getMenuItems().filter(
    item => !item.permission || permissions.includes(item.permission)
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>MENU ITEMS</SidebarGroupLabel>
      <SidebarMenu>
        {menuItems.map(item => {
          const isActive =
            item.href === pathname || pathname.startsWith(`${item.href}/`);
          const { name, icon, href } = item;
          return (
            <Collapsible
              key={item.name}
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
