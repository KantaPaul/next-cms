'use client';

import { useRouter } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { useAdminHref } from '@/providers/site-locales';
import { Button } from '@/components/ui/button';

interface LicensesPaginationProps {
  currentCount: number;
  total: number;
  page: number;
  totalPages: number;
  currentSearch?: string;
  currentStatus?: string;
}

export function LicensesPagination({
  currentCount,
  total,
  page,
  totalPages,
  currentSearch = '',
  currentStatus = '',
}: LicensesPaginationProps) {
  const router = useRouter();
  const toAdminHref = useAdminHref();

  if (totalPages <= 1) return null;

  const navigateToPage = (newPage: number) => {
    const params = new URLSearchParams();
    if (currentSearch) params.set('q', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    params.set('page', String(newPage));
    router.push(toAdminHref(`${PAGES.DASHBOARD.LICENSES}?${params.toString()}`));
  };

  return (
    <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
      <div>
        Showing {currentCount} of {total} licenses
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => navigateToPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => navigateToPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
