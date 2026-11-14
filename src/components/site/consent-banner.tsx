'use client';

import { ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { siteHref } from '@/lib/utils/site-href';
import { useConsent } from './consent-provider';

const POSITION_CLASSES = {
  'bottom-bar': 'inset-x-0 bottom-0 p-3 sm:p-4',
  'bottom-left': 'bottom-4 start-4 end-4 sm:end-auto sm:max-w-md',
  'bottom-right': 'bottom-4 start-4 end-4 sm:start-auto sm:max-w-md',
  center: 'inset-0 flex items-center justify-center bg-black/40 p-4',
} as const;

export function ConsentBanner({ siteSlug }: { siteSlug?: string }) {
  const {
    settings,
    resolved,
    isOpen,
    isCustomizing,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectAll,
    savePreferences,
  } = useConsent();

  const [functional, setFunctional] = useState(resolved.categories.functional);
  const [analytics, setAnalytics] = useState(resolved.categories.analytics);
  const [marketing, setMarketing] = useState(resolved.categories.marketing);

  useEffect(() => {
    setFunctional(resolved.categories.functional);
    setAnalytics(resolved.categories.analytics);
    setMarketing(resolved.categories.marketing);
  }, [
    resolved.categories.functional,
    resolved.categories.analytics,
    resolved.categories.marketing,
    isOpen,
  ]);

  if (!isOpen) return null;

  const isBar = settings.position === 'bottom-bar';
  const isNoticeOnly = settings.mode === 'notice-only';
  const privacyHref = settings.privacyPolicyUrl
    ? siteHref(settings.privacyPolicyUrl, siteSlug)
    : null;

  return (
    <div
      role="dialog"
      aria-modal={settings.position === 'center' ? 'true' : 'false'}
      aria-label={settings.title}
      data-testid="consent-banner"
      className={cn(
        'fixed z-[950]',
        POSITION_CLASSES[settings.position] ?? POSITION_CLASSES['bottom-bar']
      )}
    >
      <div
        className={cn(
          's-surface s-border s-radius border shadow-xl',
          isBar ? 'mx-auto max-w-5xl p-4 sm:p-5' : 'w-full max-w-lg p-5'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="s-primary-text mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold sm:text-base">
                {settings.title}
              </h2>
              <p className="s-muted mt-1 text-xs leading-relaxed sm:text-sm">
                {settings.description}{' '}
                {privacyHref && (
                  <a
                    href={privacyHref}
                    className="s-primary-text font-medium underline underline-offset-2"
                  >
                    {settings.privacyPolicyLabel || 'Privacy Policy'}
                  </a>
                )}
              </p>
            </div>
          </div>
          {resolved.decided && (
            <button
              type="button"
              onClick={closePreferences}
              aria-label="Close cookie preferences"
              className="s-muted rounded p-1 hover:opacity-80"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isCustomizing && (
          <div className="s-border mt-4 space-y-2.5 border-t pt-4">
            <div className="s-border flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-xs font-semibold sm:text-sm">Necessary</p>
                <p className="s-muted text-xs">
                  Essential for sign-in sessions, theme preference, and security.
                </p>
              </div>
              <span className="s-muted text-xs font-medium">Always active</span>
            </div>

            <label className="s-border flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-xs font-semibold sm:text-sm">Functional</p>
                <p className="s-muted text-xs">
                  Remembers commenter identity and saved bookmarks.
                </p>
              </div>
              <input
                type="checkbox"
                checked={functional}
                onChange={e => setFunctional(e.target.checked)}
                aria-label="Functional cookies"
                className="size-4 accent-[var(--site-primary)]"
              />
            </label>

            <label className="s-border flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-xs font-semibold sm:text-sm">Analytics</p>
                <p className="s-muted text-xs">
                  Measures page visits and helps us improve site content.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                aria-label="Analytics cookies"
                className="size-4 accent-[var(--site-primary)]"
              />
            </label>

            <label className="s-border flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-xs font-semibold sm:text-sm">Marketing</p>
                <p className="s-muted text-xs">
                  Enables third-party embeds (YouTube, Vimeo, Maps) and tracking pixels.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                aria-label="Marketing cookies"
                className="size-4 accent-[var(--site-primary)]"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!isCustomizing && !isNoticeOnly && (
            <button
              type="button"
              onClick={() => openPreferences(true)}
              className="s-btn-secondary s-radius inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium sm:text-sm"
            >
              <SlidersHorizontal className="size-3.5" />
              {settings.customizeLabel || 'Customize'}
            </button>
          )}
          {!isNoticeOnly && (
            <button
              type="button"
              onClick={() => void rejectAll()}
              className="s-btn-secondary s-radius px-3.5 py-2 text-xs font-medium sm:text-sm"
            >
              {settings.rejectAllLabel || 'Reject all'}
            </button>
          )}
          {isCustomizing && (
            <button
              type="button"
              onClick={() =>
                void savePreferences({
                  necessary: true,
                  functional,
                  analytics,
                  marketing,
                })
              }
              className="s-btn-primary s-radius px-4 py-2 text-xs font-medium sm:text-sm"
            >
              {settings.saveLabel || 'Save preferences'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void acceptAll()}
            className="s-btn-primary s-radius px-4 py-2 text-xs font-medium sm:text-sm"
          >
            {isNoticeOnly ? 'Got it' : settings.acceptAllLabel || 'Accept all'}
          </button>
        </div>
      </div>
    </div>
  );
}
