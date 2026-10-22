'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { deleteBoard } from '../_modules/boards.actions';

export function DeleteBoardButton({
  id,
  name,
  redirectToList = false,
}: {
  id: string;
  name: string;
  redirectToList?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onDelete = () => {
    if (!confirm(`Delete the dashboard “${name}”? This cannot be undone.`)) {
      return;
    }
    start(async () => {
      await handleActionResponse(deleteBoard({ id }), () => {
        toast.success('Dashboard deleted');
        if (redirectToList) {
          router.push('/dashboard/analytics/boards');
        }
        router.refresh();
      });
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700"
      disabled={pending}
      onClick={onDelete}
      aria-label={`Delete ${name}`}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
