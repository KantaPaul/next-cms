import type { Metadata } from 'next';
import { BRAND } from '@/config/brand';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
    </div>
  );
}
