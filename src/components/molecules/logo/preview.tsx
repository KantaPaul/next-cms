import Image from '@/components/atoms/next/image';
import { cn } from '@/lib/utils/cn';

const LOGO_CLASS =
  'h-auto max-h-full w-auto max-w-[200px] object-contain object-[left_center] rtl:object-[right_center]';

/**
 * The app logo. With a dark-mode logo, both images are rendered and CSS picks
 * one (`dark:` follows next-themes' `data-theme`), so the server HTML and the
 * first client render match. Choosing in JS from `useTheme()` caused a
 * hydration mismatch, because the theme is unknown on the server.
 */
export function Preview({
  logo,
  darkModeLogo,
  appName,
}: {
  logo?: string | null;
  darkModeLogo?: string | null;
  appName: string;
}) {
  // Light theme: the logo, else the app name as text.
  const light = logo ? (
    <Image
      src={logo}
      alt={appName}
      width={200}
      height={70}
      priority={true}
      className={cn(LOGO_CLASS, darkModeLogo && 'dark:hidden')}
    />
  ) : (
    <span
      className={cn(
        'font-bold leading-none text-steel-700 dark:text-steel-100',
        darkModeLogo && 'dark:hidden'
      )}
    >
      {appName}
    </span>
  );

  if (!darkModeLogo) return light;

  return (
    <>
      {light}
      <Image
        src={darkModeLogo}
        alt={appName}
        width={200}
        height={70}
        priority={true}
        className={cn(LOGO_CLASS, 'hidden dark:block')}
      />
    </>
  );
}
