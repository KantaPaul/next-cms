import { PAGES } from '@/config/pages';

/** Header, footer, mega menu, popup and drawer open in their dedicated editor; search and archive use the global block editor. */
export function siteTemplateEditHref(id: string, category: string) {
  return category === 'Header' ||
    category === 'Footer' ||
    category === 'MegaMenu' ||
    category === 'Popup' ||
    category === 'Drawer'
    ? PAGES.DASHBOARD.HEADER_FOOTER_EDIT(id)
    : PAGES.DASHBOARD.GLOBAL_BLOCK(id);
}

/** The Site templates list, opened on the tab for this category. */
export function siteTemplatesHref(category: string) {
  return `${PAGES.DASHBOARD.HEADER_FOOTER}?type=${category.toLowerCase()}`;
}
