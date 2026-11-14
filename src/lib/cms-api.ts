export type CmsRuntimeConfig = {
  api?: string;
  site?: string;
  locale?: string;
};

declare global {
  interface Window {
    __CMS__?: CmsRuntimeConfig;
  }
}

export function cmsApi(path: string): string {
  if (typeof window !== 'undefined' && window.__CMS__?.api) {
    const base = window.__CMS__.api.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
  return path;
}

export function cmsSiteHeaders(): Record<string, string> {
  if (typeof window !== 'undefined' && window.__CMS__?.site) {
    return { 'x-cms-site': window.__CMS__.site };
  }
  return {};
}
