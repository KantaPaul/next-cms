import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';

export default function LegacyPostTemplatePage() {
  redirect(PAGES.DASHBOARD.POSTS.TEMPLATES);
}
