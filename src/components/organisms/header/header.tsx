import { ExternalLink } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { Box, Flex } from '@/components/atoms/layout';
import { ThemeToggle } from '@/components/atoms/theme-toggle';
import AuthDropdown from '@/components/molecules/auth-dropdown/auth-dropdown';
import { Logo } from '@/components/molecules/logo';
import { Button } from '@/components/ui/button';
// import { TopBarPanel } from "@/components/molecules/topbar-panel";
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import { me } from '@/server/actions/auth.actions';
import { SiteSwitcher } from '@/components/dashboard/site-switcher';
import { LangSwitcher } from '@/components/dashboard/lang-switcher';
import { ExportWebsiteButton } from '@/components/dashboard/export-website-button';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { getAdminTranslations } from '@/i18n/server';

export default async function Header() {
  const [currentUser, session, t] = await Promise.all([
    me(),
    getCurrentUserAndTeamId(),
    getAdminTranslations('nav'),
  ]);
  const { user, profile } = currentUser;
  const [memberships, currentSite, site] = await Promise.all([
    siteContext.memberships(session.userId),
    siteContext.adminSiteId(session.userId),
    siteContext.adminSite(session.userId),
  ]);

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-5 transition-[width,height] ease-linear xl:px-8',
        'sticky inset-x-0 top-0 z-50'
      )}
    >

      <SidebarTrigger label={t('toggleSidebar')} />
      <Button asChild size="sm" variant="outline">
        <Link
          href={PAGES.SITE.page(
            '',
            site.defaultLocale,
            true,
            site.defaultLocale,
            siteSlugPrefix(site)
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink /> {t('visitSite')}
        </Link>
      </Button>
      <Flex justify="between" className="h-full gap-3 ps-1">
        <Logo className="order-2 block md:ms-1 lg:hidden" />

        <Flex
          justify="end"
          className="order-3 flex w-full ms-auto items-center gap-1.5 md:gap-3 lg:gap-4"
        >
          <ExportWebsiteButton />
          <SiteSwitcher current={currentSite} memberships={memberships} />
          <LangSwitcher
            locales={site.locales}
            defaultLocale={site.defaultLocale}
          />
          <ThemeToggle label={t('toggleTheme')} />
          {/* <TopBarPanel /> */}
          {/* <Box className="order-2 ms-1 items-center justify-center md:order-0 md:ms-0 lg:flex"> */}
          <AuthDropdown user={user} />
          {/* </Box> */}
        </Flex>
      </Flex>
    </header>
  );
}
