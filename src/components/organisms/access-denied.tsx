import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { PAGES } from '@/config/pages';

export function AccessDenied({ what = 'this area' }: { what?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-steel-200 px-6 py-16 text-center dark:border-dark-300">
      <ShieldAlert className="size-10 text-amber-500" />
      <h3 className="text-lg font-semibold">
        You don&apos;t have access to {what}
      </h3>
      <p className="max-w-md text-sm text-steel-500">
        Your role doesn&apos;t include this permission. Ask an administrator to
        update your role in Users &amp; Roles.
      </p>
      <Link
        href={PAGES.DASHBOARD.ROOT}
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
