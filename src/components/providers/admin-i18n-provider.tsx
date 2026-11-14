'use client';

import { DirectionProvider } from '@radix-ui/react-direction';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
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
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </NextIntlClientProvider>
  );
}
