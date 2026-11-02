import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';

export default function SettingsLicensesRedirectPage() {
  redirect(PAGES.DASHBOARD.SETTINGS_LICENSE);
}
