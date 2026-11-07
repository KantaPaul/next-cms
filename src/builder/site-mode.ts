/**
 * Visitor light/dark choice for the public site.
 *
 * The chosen mode lives on `<html data-site-mode>` (see the dark rules in
 * `site.css`), so it applies to every `.site-root` on the page, including the
 * nested roots each rendered document creates. It is persisted in the
 * `site_theme` cookie.
 */
export type SiteMode = 'light' | 'dark';

export const SITE_MODE_COOKIE = 'site_theme';
export const SITE_MODE_ATTR = 'data-site-mode';

/**
 * Inline script for the site layout. Runs before first paint: applies the
 * cookie's mode, else the OS preference when the theme's mode is "system".
 */
export function siteModeScript(defaultMode: 'light' | 'dark' | 'system'): string {
  return `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${SITE_MODE_COOKIE}=(light|dark)/);var v=m?m[1]:null;if(!v&&${JSON.stringify(defaultMode)}==='system'){v=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(v)d.setAttribute('${SITE_MODE_ATTR}',v)}catch(e){}})();`;
}

/** The mode currently shown: the visitor's choice, else the theme default. */
export function currentSiteMode(): SiteMode {
  const html = document.documentElement;
  const chosen = html.getAttribute(SITE_MODE_ATTR);
  if (chosen === 'dark' || chosen === 'light') return chosen;
  const theme = document
    .querySelector<HTMLElement>('.site-root[data-site-theme]')
    ?.getAttribute('data-site-theme');
  if (theme === 'dark') return 'dark';
  if (theme === 'system')
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  return 'light';
}

export function setSiteMode(mode: SiteMode): void {
  document.documentElement.setAttribute(SITE_MODE_ATTR, mode);
  try {
    document.cookie = `${SITE_MODE_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookies unavailable — the choice still applies for this page view
  }
}
