import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Site mode';

export const metadata = {
  ...metaObject(TITLE),
};

export default function SiteModeSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_SITE_MODE}
      section="site-mode"
    />
  );
}
