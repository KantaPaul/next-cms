'use client';

import { format } from 'date-fns';
import { Loader2, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  deleteGlobalBlock,
  renameGlobalBlock,
  saveGlobalBlock,
} from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';

type FormRow = {
  id: string;
  name: string;
  category: string;
  updatedAt: Date | null;
  createdByName: string | null;
  pages: number;
};

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

const DEFAULT_CONTACT_FORM_CONTENT = {
  content: [
    {
      type: 'ContactForm',
      props: {
        id: 'contact-form-default',
        title: 'Contact us',
        subtitle: '',
        submitText: 'Send message',
        successMessage: 'Thanks! We will be in touch soon.',
        actionUrl: '',
        fields: [
          { id: 'field-name', label: 'Name', name: 'name', type: 'text', required: true },
          { id: 'field-email', label: 'Email', name: 'email', type: 'email', required: true },
          { id: 'field-message', label: 'Message', name: 'message', type: 'textarea', required: true },
        ],
        section: {},
      },
    },
  ],
  zones: {},
};

export function ContactFormsList({
  forms,
  can,
}: {
  forms: FormRow[];
  can: { create: boolean; delete: boolean };
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const remove = async (form: FormRow) => {
    const warning = form.pages
      ? `"${form.name}" is used on ${form.pages} page${form.pages > 1 ? 's' : ''}. Those pages will show an empty placeholder. Delete anyway?`
      : `Delete the "${form.name}" contact form?`;
    if (!confirm(warning)) return;
    setPendingId(form.id);
    await handleActionResponse(deleteGlobalBlock({ id: form.id }), () => {
      toast.success('Contact form deleted');
      router.refresh();
    });
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-steel-500">
          Shared contact forms stored as global blocks. Embed them on any page with the Global block picker.
        </p>
        {can.create && (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New contact form
          </Button>
        )}
      </div>

      {!forms.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-steel-200 px-6 py-12 text-center dark:border-dark-300">
          <Mail className="size-8 text-steel-300" />
          <p className="font-medium">No contact forms yet</p>
          <p className="max-w-md text-sm text-steel-500">
            Create a form here, then embed it on pages using the Global block.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {forms.map(form => (
            <li key={form.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              {renaming === form.id ? (
                <RenameForm form={form} onDone={() => setRenaming(null)} />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={PAGES.DASHBOARD.CONTACT_FORM(form.id)}
                      className="font-semibold hover:underline"
                    >
                      {form.name}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {form.pages
                        ? `Used on ${form.pages} page${form.pages > 1 ? 's' : ''}`
                        : 'Not used on any page yet'}
                      {form.updatedAt ? ` · Updated ${format(new Date(form.updatedAt), 'MMM d, yyyy')}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={PAGES.DASHBOARD.CONTACT_FORM(form.id)}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRenaming(form.id)}>
                      Rename
                    </Button>
                    {can.delete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingId === form.id}
                        onClick={() => remove(form)}
                      >
                        {pendingId === form.id ? <Loader2 className="animate-spin" /> : <Trash2 className="size-3.5" />}
                        Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function RenameForm({ form, onDone }: { form: FormRow; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(form.name);
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await handleActionResponse(
        renameGlobalBlock({ id: form.id, name: name.trim(), category: 'contact-form' }),
        () => {
          toast.success('Renamed');
          onDone();
          router.refresh();
        }
      );
    });
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2">
      <input
        className={inputClass + ' max-w-xs'}
        value={name}
        onChange={e => setName(e.target.value)}
        required
        maxLength={150}
        autoFocus
      />
      <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
        {isPending && <Loader2 className="animate-spin" />} Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await handleActionResponse(
        saveGlobalBlock({
          name: name.trim(),
          category: 'contact-form',
          content: DEFAULT_CONTACT_FORM_CONTENT,
        }),
        (row: { id: string }) => {
          toast.success('Contact form created');
          onOpenChange(false);
          router.push(PAGES.DASHBOARD.CONTACT_FORM(row.id));
        }
      );
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) setName('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-muted-foreground" /> New contact form
            </DialogTitle>
            <DialogDescription>
              Name the form, then configure its fields in the visual builder. Embed it on pages with the Global block.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Name
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={150}
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="animate-spin" />} Create & edit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
