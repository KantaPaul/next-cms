import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Other languages';

export const metadata = {
  ...metaObject(TITLE),
};

export default function LanguagesSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_LANGUAGES}
      section="languages"
    />
  );
}
