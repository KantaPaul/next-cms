'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import { Blocks, Settings, ShieldCheck } from 'lucide-react';

export function SettingsNav() {
  const pathname = usePathname();

  const isLicenseActive =
    pathname === PAGES.DASHBOARD.SETTINGS_LICENSE ||
    pathname?.startsWith(`${PAGES.DASHBOARD.SETTINGS_LICENSE}/`);
  const isGeneralActive = pathname === PAGES.DASHBOARD.SETTINGS;
  const isBlocksActive = pathname === PAGES.DASHBOARD.SETTINGS_BLOCKS;

  const navItems = [
    {
      title: 'General',
      href: PAGES.DASHBOARD.SETTINGS,
      icon: Settings,
      active: isGeneralActive,
    },
    {
      title: 'Blocks',
      href: PAGES.DASHBOARD.SETTINGS_BLOCKS,
      icon: Blocks,
      active: isBlocksActive,
    },
    {
      title: 'License',
      href: PAGES.DASHBOARD.SETTINGS_LICENSE,
      icon: ShieldCheck,
      active: isLicenseActive,
    },
  ];

  return (
    <nav className="flex items-center gap-2 border-b border-steel-200 mb-6 dark:border-dark-300">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              item.active
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-steel-500 hover:text-foreground dark:text-steel-400 dark:hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
