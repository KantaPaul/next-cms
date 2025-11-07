'use client';

import { Logo } from '@/components/molecules/logo';
import { useSidebar } from '@/components/ui/sidebar';

interface SidebarLogoProps {
  className?: string;
}

export function SidebarLogo({ className }: SidebarLogoProps) {
  const { state } = useSidebar();
  return state === 'collapsed' ? (
    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
      L
    </div>
  ) : (
    <Logo className="py-0" />
  );
}
