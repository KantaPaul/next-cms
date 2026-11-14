'use client';

import { createContext, useContext } from 'react';

/**
 * Screen-reader and button text used inside the `ui/*` primitives.
 *
 * The primitives also render on the public site (overlays use Dialog and
 * Sheet), where there is no next-intl provider, so they must not call
 * `useTranslations`. They read these labels instead: English by default, and
 * translated inside the admin, where `AdminI18nProvider` supplies them.
 */
export type UiLabels = {
  close: string;
  previous: string;
  next: string;
  goToPreviousPage: string;
  goToNextPage: string;
  morePages: string;
  more: string;
  toggleSidebar: string;
  sidebarTitle: string;
  sidebarDescription: string;
};

export const DEFAULT_UI_LABELS: UiLabels = {
  close: 'Close',
  previous: 'Previous',
  next: 'Next',
  goToPreviousPage: 'Go to previous page',
  goToNextPage: 'Go to next page',
  morePages: 'More pages',
  more: 'More',
  toggleSidebar: 'Toggle sidebar',
  sidebarTitle: 'Sidebar',
  sidebarDescription: 'Displays the mobile sidebar.',
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

export const UiLabelsProvider = UiLabelsContext.Provider;

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
