'use client';

import { toast } from 'sonner';
import { acceptRedirectOffer } from '@/app/(admin)/dashboard/(shell)/redirects/_modules/redirects.actions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';

export async function maybeOfferRedirect(result: unknown) {
  const offer = (
    result as { redirectOffer?: { from: string; to: string } | null } | null
  )?.redirectOffer;
  if (!offer) return;
  const accepted = window.confirm(
    `Create a 301 redirect from ${offer.from} to ${offer.to}?`
  );
  if (!accepted) return;
  await handleActionResponse(
    acceptRedirectOffer({
      fromPath: offer.from,
      toPath: offer.to,
    }),
    () => {
      toast.success('Redirect created');
    }
  );
}
