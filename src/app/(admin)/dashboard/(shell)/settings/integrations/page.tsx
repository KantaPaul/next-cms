import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';

export default function IntegrationsRedirectPage() {
  redirect(PAGES.DASHBOARD.PLUGINS);
}
