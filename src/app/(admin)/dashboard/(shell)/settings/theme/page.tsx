import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';

export default function SettingsThemeRedirectPage() {
  redirect(PAGES.DASHBOARD.THEME);
}
