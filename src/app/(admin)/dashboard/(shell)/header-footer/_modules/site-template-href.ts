import { PAGES } from '@/config/pages';

/** Header and footer open in their dedicated editor; search and archive use the global block editor. */
export function siteTemplateEditHref(id: string, category: string) {
  return category === 'Header' || category === 'Footer'
    ? PAGES.DASHBOARD.HEADER_FOOTER_EDIT(id)
    : PAGES.DASHBOARD.GLOBAL_BLOCK(id);
}
