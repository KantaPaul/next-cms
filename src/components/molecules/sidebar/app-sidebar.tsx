"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_VERSION } from "@/lib/utils/app-version";
import { SidebarLogo } from "@/components/molecules/sidebar/sidebar-logo";
import { NavMain } from "./nav-main";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="sticky inset-x-0 top-0 h-16 flex-row items-center justify-between">
        <SidebarLogo />
        {APP_VERSION && state !== "collapsed" && (
          <Badge
            variant="outline"
            className="rounded-md border-steel-200 bg-white [box-shadow:0_0.8px_0_rgb(var(--muted))] dark:border-steel-600 dark:bg-transparent dark:shadow-none"
          >
            {APP_VERSION}
          </Badge>
        )}
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea>
          <NavMain />
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
