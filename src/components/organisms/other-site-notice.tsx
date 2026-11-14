'use client';

import { ArrowLeftRight } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { switchSite } from '@/server/actions/site.actions';

/** Shown when a link opens content that belongs to another of the user's sites. */
export function OtherSiteNotice({
  siteId,
  siteName,
  what = 'This page',
  backHref,
}: {
  siteId: string;
  siteName: string;
  what?: string;
  backHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
        <ArrowLeftRight className="size-10 text-amber-500" />
        <h3 className="text-lg font-semibold">
          {what} belongs to {siteName}
        </h3>
        <p className="text-sm text-muted-foreground">
          You&apos;re working in a different site. Switch to {siteName} to open
          it.
        </p>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await switchSite(siteId);
                router.refresh();
              })
            }
          >
            {pending ? 'Switching…' : `Switch to ${siteName}`}
          </Button>
          <Button variant="outline" asChild>
            <Link href={backHref}>Back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
