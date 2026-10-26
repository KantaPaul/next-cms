import Link from '@/components/atoms/next/link';
import { Preview } from '@/components/molecules/logo/preview';
import { CONFIG } from '@/config';
import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';

export function Logo({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
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
