import { SiteChromeForRequest } from '@/components/site/site-chrome';

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChromeForRequest>{children}</SiteChromeForRequest>;
}
