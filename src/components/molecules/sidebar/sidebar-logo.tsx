'use client';

import { Logo } from '@/components/molecules/logo';
import { useSidebar } from '@/components/ui/sidebar';
import { BRAND } from '@/config/brand';

interface SidebarLogoProps {
  className?: string;
}

export function SidebarLogo({ className }: SidebarLogoProps) {
  const { state } = useSidebar();
  return state === 'collapsed' ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG
    <img src={BRAND.mark} alt={BRAND.name} width={32} height={32} className="size-8" />
  ) : (
    <Logo className="py-0" />
  );
}
