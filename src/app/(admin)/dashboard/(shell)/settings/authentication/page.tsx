import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Authentication & access';

export const metadata = {
  ...metaObject(TITLE),
};

export default function AuthenticationSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_AUTHENTICATION}
      section="authentication"
    />
  );
}
