'use client';

import { ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import Link from '@/components/atoms/next/link';
import { getMenuItems } from '@/menus';

export function NavMain() {
  const pathname = usePathname();

  const menuItems = getMenuItems();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>MENU ITEMS</SidebarGroupLabel>
      <SidebarMenu>
        {menuItems.map((item) => {
          const isActive = item.href === pathname;
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
                      data-active={String(isActive)}
                      // className={cn(
                      //   'cursor-pointer font-medium hover:bg-steel-100 dark:hover:bg-dark-300/80'
                      // )}
                      className={cn('dark:hover:bg-dark-300/80', isActive && 'dark:bg-dark-300/80')}
                    >
                      <Link href={href}>
                        {icon}
                        <span>{name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <>
                    <CollapsibleTrigger
                      asChild
                      className={cn(isActive && 'text-steel-700')} //bg-steel-100 dark:bg-dark-300/80
                    >
                      <SidebarMenuButton tooltip={name}>
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
