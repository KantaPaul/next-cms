import { apiHandler, apiOptions } from '@/server/api/v1';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (_request, { siteUrl }) => {
  const settings = await siteSettingsService.get();
  return {
    data: {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      siteUrl,
      logo: settings.logo,
      favicon: settings.favicon,
      defaultOgImage: settings.defaultOgImage,
      headerMenuId: settings.headerMenuId,
      footerMenuId: settings.footerMenuId,
      themeTokens: settings.themeTokens,
      updatedAt: settings.updatedAt,
    },
  };
});

export const OPTIONS = apiOptions;
