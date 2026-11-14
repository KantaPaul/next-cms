import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'SEO & analytics';

export const metadata = {
  ...metaObject(TITLE),
};

export default function SeoSettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_SEO}
      section="seo"
    />
  );
}
