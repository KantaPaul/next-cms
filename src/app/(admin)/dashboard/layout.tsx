import { RedirectType, redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { validateSession } from '@/lib/auth';
import { AccessProvider } from '@/providers/access.provider';
import { SiteLocalesProvider } from '@/providers/site-locales';
import { accessService } from '@/server/services/access.service';
import { siteContext } from '@/server/services/site-context';
import { licenseService } from '@/server/services/license.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // R279 / A5-01: Require valid session before license check or dashboard render
  const session = await validateSession();
  if (!session?.user) {
    const authSettings = await siteSettingsService.getAuthSettings();
    if (!authSettings.loginEnabled) {
      redirect(
        `/login?message=${encodeURIComponent(
          authSettings.loginDisabledMessage || 'Login is currently disabled.'
        )}`,
        RedirectType.replace
      );
    }
    redirect(PAGES.AUTH.LOGIN, RedirectType.replace);
  }

  // R239 / L5-02: Dashboard layout fails closed without a valid installation token
  const licenseCheck = await licenseService.requireLicense();
  if (!licenseCheck.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">License Verification Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            {licenseCheck.error || 'A valid active license is required to access this dashboard.'}
          </p>
          <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-3 rounded font-mono break-all">
            Deploy role: {process.env.LICENSE_ROLE || 'installation'}
          </div>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
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
