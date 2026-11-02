import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Box, Flex } from '@/components/atoms/layout';
import { ThemeToggle } from '@/components/atoms/theme-toggle';
import AuthDropdown from '@/components/molecules/auth-dropdown/auth-dropdown';
import { Logo } from '@/components/molecules/logo';
import { Button } from '@/components/ui/button';
// import { TopBarPanel } from "@/components/molecules/topbar-panel";
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { cn } from '@/lib/utils/cn';
import { Can } from '@/providers/access.provider';
import { me } from '@/server/actions/auth.actions';
import { SiteSwitcher } from '@/components/dashboard/site-switcher';
import { LangSwitcher } from '@/components/dashboard/lang-switcher';
import { ExportWebsiteButton } from '@/components/dashboard/export-website-button';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { siteContext } from '@/server/services/site-context';

export default async function Header() {
  const [currentUser, session] = await Promise.all([
    me(),
    getCurrentUserAndTeamId(),
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
      {/* <SidebarTrigger className="ml-1" /> */}

      <SidebarTrigger />
      <Can permission={PERMISSIONS.PAGES_CREATE}>
        <div className="">
          <Button asChild size="sm">
            <Link href={PAGES.DASHBOARD.PAGES.CREATE}>
              <Plus /> New page
            </Link>
          </Button>
        </div>
      </Can>
      <Flex justify="between" className="h-full gap-3 pl-1">
        <Logo className="order-2 block md:ms-1 lg:hidden" />

        <Flex
          justify="end"
          className="order-3 flex w-full ml-auto items-center gap-1.5 md:gap-3 lg:gap-4"
        >
          <ExportWebsiteButton />
          <SiteSwitcher current={currentSite} memberships={memberships} />
          <LangSwitcher
            locales={site.locales}
            defaultLocale={site.defaultLocale}
          />
          <ThemeToggle />
          {/* <TopBarPanel /> */}
          {/* <Box className="order-2 ml-1 items-center justify-center md:order-0 md:ml-0 lg:flex"> */}
          <AuthDropdown user={user} />
          {/* </Box> */}
        </Flex>
      </Flex>
    </header>
  );
}
