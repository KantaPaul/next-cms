'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { archiveSubmission } from '../_modules/inbox.actions';

export function ArchiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await handleActionResponse(archiveSubmission({ id }), () => {
            toast.success('Submission archived');
            router.push(PAGES.DASHBOARD.CONTACT_FORMS_INBOX);
            router.refresh();
          });
        })
      }
    >
      Archive
    </Button>
  );
}
