import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../../_components/settings-section-page';

const TITLE = 'Other languages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metaObject(`${TITLE} (${locale})`);
}

export default async function LanguageLocaleSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_LANGUAGE(locale)}
      section="languages"
      activeLocale={locale}
    />
  );
}
