import { CONFIG } from '@/config';
import Link from '@/components/atoms/next/link';
import { cn } from '@/lib/utils/cn';
import { PAGES } from '@/config/pages';
import { Preview } from '@/components/molecules/logo/preview';

export function Logo({ href, className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href ?? PAGES.DASHBOARD.ROOT}
      className={cn(
        'relative inline-flex max-h-full shrink-0 py-5 text-xl font-semibold lg:text-2xl',
        className
      )}
    >
      <Preview logo={''} darkModeLogo={''} appName={CONFIG.APP_NAME} />
    </Link>
  );
}
