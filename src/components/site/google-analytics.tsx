'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { useConsent } from './consent-provider';

const VALID_GA_ID = /^G-[A-Z0-9]+$/i;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics({
  measurementId,
}: {
  measurementId?: string | null;
}) {
  const { hasConsent } = useConsent();
  const validId =
    measurementId && VALID_GA_ID.test(measurementId) ? measurementId : null;
  const analyticsAllowed = hasConsent('analytics');
  const marketingAllowed = hasConsent('marketing');

  useEffect(() => {
    if (!validId || typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    const gtag =
      window.gtag ??
      function gtagFn(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
    window.gtag = gtag;

    gtag('consent', 'update', {
      analytics_storage: analyticsAllowed ? 'granted' : 'denied',
      ad_storage: marketingAllowed ? 'granted' : 'denied',
      ad_user_data: marketingAllowed ? 'granted' : 'denied',
      ad_personalization: marketingAllowed ? 'granted' : 'denied',
    });
  }, [validId, analyticsAllowed, marketingAllowed]);

  if (!validId || !analyticsAllowed) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${validId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${validId}');`}
      </Script>
    </>
  );
}
