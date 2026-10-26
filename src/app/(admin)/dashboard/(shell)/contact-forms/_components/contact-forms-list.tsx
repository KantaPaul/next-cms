'use client';

import { format } from 'date-fns';
import { Loader2, Mail, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  deleteGlobalBlock,
  renameGlobalBlock,
  saveGlobalBlock,
} from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/input';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';

type FormRow = {
  id: string;
  name: string;
  category: string;
  updatedAt: Date | null;
  createdByName: string | null;
  pages: number;
};

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
          {
            id: 'field-name',
            label: 'Name',
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            id: 'field-email',
            label: 'Email',
            name: 'email',
            type: 'email',
            required: true,
          },
          {
            id: 'field-message',
            label: 'Message',
            name: 'message',
            type: 'textarea',
            required: true,
          },
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
  const [renaming, setRenaming] = useState<FormRow | null>(null);
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
          Shared contact forms stored as global blocks. Embed them on any page
          with the Global block picker.
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
        <div className="overflow-hidden rounded-lg border border-steel-200 dark:border-dark-300">
          <TableContainer>
            <TableRoot>
              <TableHead>
                <TableRow hoverStyle={false}>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Used on</TableHeaderCell>
                  <TableHeaderCell>Updated</TableHeaderCell>
                  <TableHeaderCell>Author</TableHeaderCell>
                  <TableHeaderCell className="w-12 text-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.map(form => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <Link
                        href={PAGES.DASHBOARD.CONTACT_FORM(form.id)}
                        className="font-medium hover:underline"
                      >
                        {form.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {form.pages
                        ? `${form.pages} page${form.pages > 1 ? 's' : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {form.updatedAt
                        ? format(new Date(form.updatedAt), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {form.createdByName ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionDropdown
                        isLoading={pendingId === form.id}
                        variant="vertical"
                      >
                        <ActionDropdownItem
                          href={PAGES.DASHBOARD.CONTACT_FORM(form.id)}
                          label="Edit"
                        />
                        <ActionDropdownItem
                          label="Rename"
                          onClick={() => setRenaming(form)}
                        />
                        {can.delete && (
                          <ActionDropdownItem
                            label="Delete"
                            className="text-red-600 dark:text-red-400"
                            onClick={() => remove(form)}
                          />
                        )}
                      </ActionDropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableRoot>
          </TableContainer>
        </div>
      )}

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameDialog form={renaming} onClose={() => setRenaming(null)} />
    </div>
  );
}

function RenameDialog({
  form,
  onClose,
}: {
  form: FormRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (form) setName(form.name);
    else setName('');
  }, [form]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form || !name.trim()) return;
    startTransition(async () => {
      await handleActionResponse(
        renameGlobalBlock({
          id: form.id,
          name: name.trim(),
          category: 'contact-form',
        }),
        () => {
          toast.success('Renamed');
          onClose();
          router.refresh();
        }
      );
    });
  };

  return (
    <Dialog
      open={!!form}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Rename contact form</DialogTitle>
            <DialogDescription>
              Update the name shown in the list and Global block picker.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Name
            <FormInput
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={150}
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
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
          setName('');
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
              Name the form, then configure its fields in the visual builder.
              Embed it on pages with the Global block.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Name
            <FormInput
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={150}
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
