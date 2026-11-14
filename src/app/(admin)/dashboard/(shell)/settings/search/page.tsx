import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Site Search';

export const metadata = {
  ...metaObject(TITLE),
};

export default function SearchSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_SEARCH}
      section="search"
    />
  );
}
