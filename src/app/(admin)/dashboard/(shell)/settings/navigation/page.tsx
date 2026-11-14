import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Navigation & Templates';

export const metadata = {
  ...metaObject(TITLE),
};

export default function NavigationSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_NAVIGATION}
      section="navigation"
    />
  );
}
