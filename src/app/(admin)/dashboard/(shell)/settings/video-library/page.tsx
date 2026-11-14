import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { SettingsSectionPage } from '../_components/settings-section-page';

const TITLE = 'Video library';

export const metadata = {
  ...metaObject(TITLE),
};

export default function VideoLibrarySettingsPage() {
  return (
    <SettingsSectionPage
      title={TITLE}
      href={PAGES.DASHBOARD.SETTINGS_VIDEO_LIBRARY}
      section="video-library"
    />
  );
}
