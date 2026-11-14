'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import {
  BarChart3,
  Blocks,
  Code,
  Cookie,
  FileText,
  Globe,
  ImageIcon,
  Languages,
  LayoutTemplate,
  MonitorSmartphone,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Video,
} from 'lucide-react';

export function SettingsNav() {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'General',
      href: PAGES.DASHBOARD.SETTINGS,
      icon: Settings,
      active: pathname === PAGES.DASHBOARD.SETTINGS,
    },
    {
      title: 'Branding',
      href: PAGES.DASHBOARD.SETTINGS_BRANDING,
      icon: ImageIcon,
      active: pathname === PAGES.DASHBOARD.SETTINGS_BRANDING,
    },
    {
      title: 'Navigation',
      href: PAGES.DASHBOARD.SETTINGS_NAVIGATION,
      icon: LayoutTemplate,
      active: pathname === PAGES.DASHBOARD.SETTINGS_NAVIGATION,
    },
    {
      title: 'Site Search',
      href: PAGES.DASHBOARD.SETTINGS_SEARCH,
      icon: Search,
      active: pathname === PAGES.DASHBOARD.SETTINGS_SEARCH,
    },
    {
      title: 'Single pages',
      href: PAGES.DASHBOARD.SETTINGS_SINGLE_PAGES,
      icon: FileText,
      active: pathname === PAGES.DASHBOARD.SETTINGS_SINGLE_PAGES,
    },
    {
      title: 'Video library',
      href: PAGES.DASHBOARD.SETTINGS_VIDEO_LIBRARY,
      icon: Video,
      active: pathname === PAGES.DASHBOARD.SETTINGS_VIDEO_LIBRARY,
    },
    {
      title: 'Authentication',
      href: PAGES.DASHBOARD.SETTINGS_AUTHENTICATION,
      icon: Shield,
      active: pathname === PAGES.DASHBOARD.SETTINGS_AUTHENTICATION,
    },
    {
      title: 'Site mode',
      href: PAGES.DASHBOARD.SETTINGS_SITE_MODE,
      icon: Globe,
      active: pathname === PAGES.DASHBOARD.SETTINGS_SITE_MODE,
    },
    {
      title: 'SEO & analytics',
      href: PAGES.DASHBOARD.SETTINGS_SEO,
      icon: BarChart3,
      active: pathname === PAGES.DASHBOARD.SETTINGS_SEO,
    },
    {
      title: 'Languages',
      href: PAGES.DASHBOARD.SETTINGS_LANGUAGES,
      icon: Languages,
      active:
        pathname === PAGES.DASHBOARD.SETTINGS_LANGUAGES ||
        pathname?.startsWith(`${PAGES.DASHBOARD.SETTINGS_LANGUAGES}/`),
    },
    {
      title: 'Breakpoints',
      href: PAGES.DASHBOARD.SETTINGS_BREAKPOINTS,
      icon: MonitorSmartphone,
      active: pathname === PAGES.DASHBOARD.SETTINGS_BREAKPOINTS,
    },
    {
      title: 'Cookie consent',
      href: PAGES.DASHBOARD.SETTINGS_CONSENT,
      icon: Cookie,
      active: pathname === PAGES.DASHBOARD.SETTINGS_CONSENT,
    },
    {
      title: 'Custom code',
      href: PAGES.DASHBOARD.SETTINGS_CUSTOM_CODE,
      icon: Code,
      active: pathname === PAGES.DASHBOARD.SETTINGS_CUSTOM_CODE,
    },
    {
      title: 'Blocks',
      href: PAGES.DASHBOARD.SETTINGS_BLOCKS,
      icon: Blocks,
      active: pathname === PAGES.DASHBOARD.SETTINGS_BLOCKS,
    },
    {
      title: 'License',
      href: PAGES.DASHBOARD.SETTINGS_LICENSE,
      icon: ShieldCheck,
      active:
        pathname === PAGES.DASHBOARD.SETTINGS_LICENSE ||
        pathname?.startsWith(`${PAGES.DASHBOARD.SETTINGS_LICENSE}/`),
    },
  ];

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-steel-200 dark:border-dark-300">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium -mb-px transition-colors',
              item.active
                ? 'border-primary font-semibold text-primary'
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
