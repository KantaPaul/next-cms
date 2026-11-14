import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Single pages';

export const metadata = {
  ...metaObject(TITLE),
};

export default function SinglePagesSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_SINGLE_PAGES}
      section="single-pages"
    />
  );
}
