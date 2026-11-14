import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from './_components/settings-section-page';

const TITLE = 'Settings';

export const metadata = {
  ...metaObject(TITLE),
};

export default function SettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS}
      section="general"
      showExport
    />
  );
}
