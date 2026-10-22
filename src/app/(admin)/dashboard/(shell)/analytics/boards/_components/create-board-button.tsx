'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createBoard } from '../_modules/boards.actions';

export function CreateBoardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    start(async () => {
      await handleActionResponse(createBoard({ name: trimmed }), board => {
        toast.success('Dashboard created');
        setOpen(false);
        setName('');
        router.push(PAGES.DASHBOARD.ANALYTICS_BOARD_EDIT((board as { id: string }).id));
        router.refresh();
      });
    });
  };

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus /> New dashboard
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        className="h-9 w-48 rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100"
        placeholder="Dashboard name"
        value={name}
        maxLength={120}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
