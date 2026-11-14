'use client';

import { cmsApi, cmsSiteHeaders } from '@/lib/cms-api';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ALL_DENIED_CATEGORIES,
  ALL_GRANTED_CATEGORIES,
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  type ConsentCategoriesState,
  normalizeConsentCategories,
  parseConsentCookie,
  readCookieFromHeader,
  resolveConsent,
  type ResolvedConsent,
  serializeConsentCookie,
} from '@/lib/consent';
import {
  type ConsentCategory,
  type ConsentSettings,
  DEFAULT_CONSENT_SETTINGS,
} from '@/lib/site-essentials-types';

const CONSENT_EVENT = 'cms-consent-change';

type ConsentContextValue = {
  settings: ConsentSettings;
  resolved: ResolvedConsent;
  isOpen: boolean;
  isCustomizing: boolean;
  openPreferences: (customize?: boolean) => void;
  closePreferences: () => void;
  hasConsent: (category: ConsentCategory) => boolean;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  savePreferences: (categories: Partial<ConsentCategoriesState>) => Promise<void>;
  acceptCategory: (category: ConsentCategory) => Promise<void>;
};

const FALLBACK_CONTEXT: ConsentContextValue = {
  settings: DEFAULT_CONSENT_SETTINGS,
  resolved: {
    enabled: false,
    mode: 'opt-in',
    version: 1,
    decided: true,
    needsPrompt: false,
    categories: { ...ALL_GRANTED_CATEGORIES },
  },
  isOpen: false,
  isCustomizing: false,
  openPreferences: () => {},
  closePreferences: () => {},
  hasConsent: () => true,
  acceptAll: async () => {},
  rejectAll: async () => {},
  savePreferences: async () => {},
  acceptCategory: async () => {},
};

const ConsentContext = createContext<ConsentContextValue>(FALLBACK_CONTEXT);

function makeReceiptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function ConsentProvider({
  settings,
  initialCookie,
  siteSlug,
  children,
}: {
  settings?: ConsentSettings | null;
  initialCookie?: string | null;
  siteSlug?: string | null;
  children: ReactNode;
}) {
  const effectiveSettings = useMemo<ConsentSettings>(
    () => ({ ...DEFAULT_CONSENT_SETTINGS, ...settings }),
    [settings]
  );

  const [cookieRaw, setCookieRaw] = useState<string | null | undefined>(
    initialCookie
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const resolved = useMemo(
    () => resolveConsent(cookieRaw, effectiveSettings),
    [cookieRaw, effectiveSettings]
  );

  useEffect(() => {
    const syncFromDocument = () => {
      if (typeof document === 'undefined') return;
      setCookieRaw(readCookieFromHeader(document.cookie, CONSENT_COOKIE_NAME));
    };
    syncFromDocument();
    window.addEventListener(CONSENT_EVENT, syncFromDocument);
    return () => window.removeEventListener(CONSENT_EVENT, syncFromDocument);
  }, []);

  // Re-open banner on `#cookie-settings` link clicks or hash navigation
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#cookie-settings') {
        setIsCustomizing(true);
        setManualOpen(true);
      }
    };
    checkHash();

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const trigger = target?.closest(
        'a[href="#cookie-settings"], a[href$="#cookie-settings"], [data-cookie-settings]'
      );
      if (!trigger) return;
      event.preventDefault();
      setIsCustomizing(true);
      setManualOpen(true);
    };

    window.addEventListener('hashchange', checkHash);
    document.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('hashchange', checkHash);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const persistChoice = useCallback(
    async (nextInput: Partial<ConsentCategoriesState>) => {
      const categories = normalizeConsentCategories(nextInput);
      const existing = parseConsentCookie(
        typeof document !== 'undefined'
          ? readCookieFromHeader(document.cookie, CONSENT_COOKIE_NAME)
          : cookieRaw
      );
      const receiptId = existing?.r || makeReceiptId();
      const choice = {
        v: effectiveSettings.version,
        d: new Date().toISOString(),
        r: receiptId,
        c: categories,
      };
      const serialized = serializeConsentCookie(choice);

      if (typeof document !== 'undefined') {
        const secure =
          typeof window !== 'undefined' && window.location.protocol === 'https:'
            ? '; Secure'
            : '';
        document.cookie = `${CONSENT_COOKIE_NAME}=${serialized}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
        setCookieRaw(serialized);
        window.dispatchEvent(new Event(CONSENT_EVENT));
      }

      setManualOpen(false);
      setIsCustomizing(false);

      if (
        typeof window !== 'undefined' &&
        window.location.hash === '#cookie-settings'
      ) {
        try {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
        } catch {
          // ignore
        }
      }

      try {
        await fetch(cmsApi('/api/consent'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...cmsSiteHeaders(),
            ...(siteSlug ? { 'x-cms-site-slug': siteSlug } : {}),
          },
          body: JSON.stringify({
            categories,
            version: effectiveSettings.version,
            receiptId,
          }),
        });
      } catch {
        // Non-blocking audit log; client cookie already holds the decision.
      }
    },
    [cookieRaw, effectiveSettings.version, siteSlug]
  );

  const acceptAll = useCallback(
    () => persistChoice(ALL_GRANTED_CATEGORIES),
    [persistChoice]
  );

  const rejectAll = useCallback(
    () => persistChoice(ALL_DENIED_CATEGORIES),
    [persistChoice]
  );

  const savePreferences = useCallback(
    (categories: Partial<ConsentCategoriesState>) => persistChoice(categories),
    [persistChoice]
  );

  const acceptCategory = useCallback(
    (category: ConsentCategory) =>
      persistChoice({
        ...resolved.categories,
        [category]: true,
      }),
    [persistChoice, resolved.categories]
  );

  const openPreferences = useCallback((customize = true) => {
    setIsCustomizing(customize);
    setManualOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setManualOpen(false);
    setIsCustomizing(false);
  }, []);

  const hasConsent = useCallback(
    (category: ConsentCategory) => {
      if (category === 'necessary') return true;
      return resolved.categories[category];
    },
    [resolved.categories]
  );

  const isOpen =
    effectiveSettings.enabled && (manualOpen || resolved.needsPrompt);

  const value = useMemo<ConsentContextValue>(
    () => ({
      settings: effectiveSettings,
      resolved,
      isOpen,
      isCustomizing,
      openPreferences,
      closePreferences,
      hasConsent,
      acceptAll,
      rejectAll,
      savePreferences,
      acceptCategory,
    }),
    [
      effectiveSettings,
      resolved,
      isOpen,
      isCustomizing,
      openPreferences,
      closePreferences,
      hasConsent,
      acceptAll,
      rejectAll,
      savePreferences,
      acceptCategory,
    ]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
