'use client';

import { DirectionProvider } from '@radix-ui/react-direction';
import {
  type AbstractIntlMessages,
  NextIntlClientProvider,
  useTranslations,
} from 'next-intl';
import { type UiLabels, UiLabelsProvider } from '@/components/ui/ui-labels';
import { useEffect } from 'react';

export function AdminI18nProvider({
  locale,
  dir,
  messages,
  children,
}: {
  locale: string;
  dir: 'ltr' | 'rtl';
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TranslatedUiLabels>
        <DirectionProvider dir={dir}>{children}</DirectionProvider>
      </TranslatedUiLabels>
    </NextIntlClientProvider>
  );
}

/** Feeds translated labels to the `ui/*` primitives (see ui-labels.tsx). */
function TranslatedUiLabels({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common.ui');
  const labels: UiLabels = {
    close: t('close'),
    previous: t('previous'),
    next: t('next'),
    goToPreviousPage: t('goToPreviousPage'),
    goToNextPage: t('goToNextPage'),
    morePages: t('morePages'),
    more: t('more'),
    toggleSidebar: t('toggleSidebar'),
    sidebarTitle: t('sidebarTitle'),
    sidebarDescription: t('sidebarDescription'),
  };
  return <UiLabelsProvider value={labels}>{children}</UiLabelsProvider>;
}
