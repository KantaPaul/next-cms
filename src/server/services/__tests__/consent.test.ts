import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_COOKIE_NAME,
  hasCategoryConsent,
  parseConsentCookie,
  readCookieFromHeader,
  resolveConsent,
  serializeConsentCookie,
} from '@/lib/consent';
import { DEFAULT_CONSENT_SETTINGS } from '@/lib/site-essentials-types';

describe('consent cookie parsing and resolution', () => {
  it('blocks non-necessary categories on first visit in opt-in GDPR mode', () => {
    const state = resolveConsent(null, DEFAULT_CONSENT_SETTINGS);
    assert.equal(state.enabled, true);
    assert.equal(state.decided, false);
    assert.equal(state.needsPrompt, true);
    assert.equal(state.categories.necessary, true);
    assert.equal(state.categories.functional, false);
    assert.equal(state.categories.analytics, false);
    assert.equal(state.categories.marketing, false);
  });

  it('round-trips serialized consent cookie and enforces version matching', () => {
    const raw = serializeConsentCookie({
      v: 2,
      d: '2026-11-10T00:00:00.000Z',
      r: 'receipt-1',
      c: { necessary: true, functional: true, analytics: true, marketing: false },
    });

    const parsedV2 = parseConsentCookie(raw, 2);
    assert.ok(parsedV2);
    assert.equal(parsedV2.c.analytics, true);
    assert.equal(parsedV2.c.marketing, false);

    // Bumping required version to 3 invalidates v2 cookie so user is asked again
    const staleForV3 = parseConsentCookie(raw, 3);
    assert.equal(staleForV3, null);

    const resolvedV3 = resolveConsent(raw, { ...DEFAULT_CONSENT_SETTINGS, version: 3 });
    assert.equal(resolvedV3.decided, false);
    assert.equal(resolvedV3.needsPrompt, true);
    assert.equal(resolvedV3.categories.analytics, false);
  });

  it('allows all categories when consent banner is disabled', () => {
    const state = resolveConsent(null, { ...DEFAULT_CONSENT_SETTINGS, enabled: false });
    assert.equal(state.needsPrompt, false);
    assert.equal(state.categories.analytics, true);
    assert.equal(state.categories.marketing, true);
    assert.equal(
      hasCategoryConsent(null, { ...DEFAULT_CONSENT_SETTINGS, enabled: false }, 'analytics'),
      true
    );
  });

  it('supports notice-only mode and explicit rejection', () => {
    const beforeDismiss = resolveConsent(null, {
      ...DEFAULT_CONSENT_SETTINGS,
      mode: 'notice-only',
    });
    assert.equal(beforeDismiss.needsPrompt, true);
    assert.equal(beforeDismiss.categories.analytics, true);

    const rejected = serializeConsentCookie({
      v: 1,
      d: '2026-11-10T00:00:00.000Z',
      c: { necessary: true, functional: false, analytics: false, marketing: false },
    });
    const afterReject = resolveConsent(rejected, {
      ...DEFAULT_CONSENT_SETTINGS,
      mode: 'notice-only',
    });
    assert.equal(afterReject.needsPrompt, false);
    assert.equal(afterReject.categories.analytics, false);
  });

  it('extracts cms_consent from Cookie header string', () => {
    const val = serializeConsentCookie({
      v: 1,
      d: '2026-11-10T00:00:00.000Z',
      c: { necessary: true, functional: true, analytics: true, marketing: true },
    });
    const header = `session=abc; ${CONSENT_COOKIE_NAME}=${val}; site_theme=dark`;
    const extracted = readCookieFromHeader(header, CONSENT_COOKIE_NAME);
    assert.equal(extracted, val);
    assert.equal(
      hasCategoryConsent(extracted, DEFAULT_CONSENT_SETTINGS, 'analytics'),
      true
    );
  });
});
