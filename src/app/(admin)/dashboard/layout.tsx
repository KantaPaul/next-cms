import { getCurrentUserAndTeamId } from '@/lib/auth';
import { AccessProvider } from '@/providers/access.provider';
import { SiteLocalesProvider } from '@/providers/site-locales';
import { accessService } from '@/server/services/access.service';
import { siteContext } from '@/server/services/site-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getCurrentUserAndTeamId();
  const [access, site] = await Promise.all([
    accessService.getUserAccess(userId),
    siteContext.adminSite(userId),
  ]);

  return (
    <AccessProvider value={access}>
      <SiteLocalesProvider
        locales={site.locales}
        defaultLocale={site.defaultLocale}
      >
        {children}
      </SiteLocalesProvider>
    </AccessProvider>
  );
}
