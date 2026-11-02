import { PAGES } from '@/config/pages';

/**
 * Validates post-login next path to ensure it starts with a single '/'
 * and is not protocol-relative (R277 / A4-03).
 */
export function getSafeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return PAGES.DASHBOARD.ROOT;
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  return PAGES.DASHBOARD.ROOT;
}
