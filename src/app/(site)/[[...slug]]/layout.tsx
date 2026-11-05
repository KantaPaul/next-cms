import { SiteChrome } from '@/components/site/site-chrome';

/**
 * Header and footer for public pages, posts and archives. This layout sits under
 * the `[[...slug]]` segment, so it re-renders whenever the slug changes,
 * including on client-side navigation, and each page gets its own header.
 */
export default async function SitePageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return (
    <SiteChrome pathname={`/${slug?.join('/') ?? ''}`}>{children}</SiteChrome>
  );
}
