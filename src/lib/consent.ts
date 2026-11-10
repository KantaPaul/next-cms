import {
  type ConsentCategory,
  type ConsentMode,
  type ConsentSettings,
  DEFAULT_CONSENT_SETTINGS,
} from './site-essentials-types';

export const CONSENT_COOKIE_NAME = 'cms_consent';
/** 6 months in seconds. */
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export type ConsentCategoriesState = Record<ConsentCategory, boolean>;

export type ConsentChoice = {
  /** Consent policy version this decision was made against. */
  v: number;
  /** ISO date when consent was saved. */
  d: string;
  /** Opaque random receipt ID for consent logging (not linked to IP). */
  r?: string;
  /** Category decisions. */
  c: ConsentCategoriesState;
};

export type ResolvedConsent = {
  /** Whether consent gating is active for this site. */
  enabled: boolean;
  mode: ConsentMode;
  version: number;
  /** True when the visitor has a valid, up-to-date consent decision cookie. */
  decided: boolean;
  /** True when the banner should be displayed automatically. */
  needsPrompt: boolean;
  /** Effective category permissions. */
  categories: ConsentCategoriesState;
};

export const ALL_DENIED_CATEGORIES: ConsentCategoriesState = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const ALL_GRANTED_CATEGORIES: ConsentCategoriesState = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

export function normalizeConsentCategories(
  input?: Partial<Record<ConsentCategory, boolean>> | null
): ConsentCategoriesState {
  return {
    necessary: true,
    functional: Boolean(input?.functional),
    analytics: Boolean(input?.analytics),
    marketing: Boolean(input?.marketing),
  };
}

export function parseConsentCookie(
  raw: string | null | undefined,
  requiredVersion?: number
): ConsentChoice | null {
  if (!raw || typeof raw !== 'string') return null;
  let decoded = raw.trim();
  if (!decoded) return null;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Use raw if already unencoded
  }
  try {
    const parsed = JSON.parse(decoded) as Partial<ConsentChoice>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.v !== 'number' || !Number.isFinite(parsed.v)) return null;
    if (typeof requiredVersion === 'number' && parsed.v !== requiredVersion) {
      return null;
    }
    if (!parsed.c || typeof parsed.c !== 'object') return null;
    return {
      v: parsed.v,
      d: typeof parsed.d === 'string' ? parsed.d : new Date().toISOString(),
      r: typeof parsed.r === 'string' ? parsed.r : undefined,
      c: normalizeConsentCategories(parsed.c),
    };
  } catch {
    return null;
  }
}

export function serializeConsentCookie(choice: ConsentChoice): string {
  return encodeURIComponent(
    JSON.stringify({
      v: choice.v,
      d: choice.d,
      ...(choice.r ? { r: choice.r } : {}),
      c: normalizeConsentCategories(choice.c),
    })
  );
}

/** Read a named cookie from a raw `document.cookie` or `Cookie` header string. */
export function readCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string
): string | null {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }
  return null;
}

export function resolveConsent(
  cookieRaw: string | null | undefined,
  settings?: Partial<ConsentSettings> | null
): ResolvedConsent {
  const enabled = settings?.enabled ?? DEFAULT_CONSENT_SETTINGS.enabled;
  const mode: ConsentMode = settings?.mode ?? DEFAULT_CONSENT_SETTINGS.mode;
  const version = settings?.version ?? DEFAULT_CONSENT_SETTINGS.version;

  if (!enabled) {
    return {
      enabled: false,
      mode,
      version,
      decided: true,
      needsPrompt: false,
      categories: { ...ALL_GRANTED_CATEGORIES },
    };
  }

  const parsed = parseConsentCookie(cookieRaw, version);
  if (parsed) {
    return {
      enabled: true,
      mode,
      version,
      decided: true,
      needsPrompt: false,
      categories: parsed.c,
    };
  }

  // No decision yet (or version bumped):
  // - opt-in (GDPR): block all non-necessary categories until accepted
  // - notice-only: allow non-necessary categories unless explicitly rejected, still show notice
  return {
    enabled: true,
    mode,
    version,
    decided: false,
    needsPrompt: true,
    categories:
      mode === 'notice-only'
        ? { ...ALL_GRANTED_CATEGORIES }
        : { ...ALL_DENIED_CATEGORIES },
  };
}

export function hasCategoryConsent(
  cookieRaw: string | null | undefined,
  settings: Partial<ConsentSettings> | null | undefined,
  category: ConsentCategory
): boolean {
  if (category === 'necessary') return true;
  return resolveConsent(cookieRaw, settings).categories[category];
}
