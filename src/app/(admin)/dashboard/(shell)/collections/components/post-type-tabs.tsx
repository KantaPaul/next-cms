'use client';

import { useTranslations } from 'next-intl';
import Link from '@/components/atoms/next/link';
import { usePathname } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import type { PostTypeSupports } from '@/config/post-types';
import { FileText, FolderTree, LayoutTemplate, Settings } from 'lucide-react';

export function PostTypeTabs({
  slug,
  taxonomies = [],
  supports,
}: {
  slug: string;
  taxonomies?: { key: string; name: string }[];
  supports?: PostTypeSupports;
}) {
  const t = useTranslations('collections.tabs');
  const pathname = usePathname();

  const entriesHref = PAGES.DASHBOARD.COLLECTION(slug);
  const settingsHref = PAGES.DASHBOARD.COLLECTION_SETTINGS(slug);
  const templatesHref = PAGES.DASHBOARD.COLLECTION_TEMPLATES(slug);

  const tabs: {
    title: string;
    href: string;
    icon: typeof FileText;
    active: boolean;
  }[] = [
    {
      title: t('entries'),
      href: entriesHref,
      icon: FileText,
      active: pathname === entriesHref,
    },
  ];

  if (supports?.taxonomies !== false) {
    for (const tax of taxonomies) {
      const taxHref = PAGES.DASHBOARD.COLLECTION_TAXONOMY(slug, tax.key);
      tabs.push({
        title: tax.name,
        href: taxHref,
        icon: FolderTree,
        active: pathname === taxHref,
      });
    }
  }

  if (supports?.template !== false) {
    tabs.push({
      title: t('templates'),
      href: templatesHref,
      icon: LayoutTemplate,
      active: pathname === templatesHref || pathname?.startsWith(`${templatesHref}/`),
    });
  }

  tabs.push({
    title: t('settings'),
    href: settingsHref,
    icon: Settings,
    active: pathname === settingsHref,
  });

  return (
    <nav
      aria-label={t('ariaLabel')}
      className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-steel-200 dark:border-dark-300"
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
              tab.active
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-steel-500 hover:border-steel-300 hover:text-steel-800 dark:text-steel-400 dark:hover:text-steel-200'
            )}
          >
            <Icon className="size-4" />
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
