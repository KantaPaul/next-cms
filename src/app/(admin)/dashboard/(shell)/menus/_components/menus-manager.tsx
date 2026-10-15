'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { MENU_LOCATION, type MenuLocationType } from '@/db/schemas/shared.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { cn } from '@/lib/utils/cn';
import { deleteMenu, saveMenu, saveMenuItems } from '../_modules/menus.actions';
import type { MenuDetail } from '../_modules/menus.service';

type LinkablePage = { id: string; title: string; slug: string; language: string | null };

type EditorItem = {
  key: string;
  label: string;
  url: string;
  target: '_self' | '_blank';
  badge: string;
  children: EditorItem[];
};

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

let keySeed = 0;
const newKey = () => `item-${Date.now().toString(36)}-${keySeed++}`;

const toEditorItems = (items: MenuDetail['items']): EditorItem[] =>
  items.map(item => ({
    key: item.id,
    label: item.label,
    url: item.url,
    target: item.target === '_blank' ? '_blank' : '_self',
    badge: item.badge ?? '',
    children: item.children.map(child => ({
      key: child.id,
      label: child.label,
      url: child.url,
      target: child.target === '_blank' ? '_blank' : '_self',
      badge: child.badge ?? '',
      children: [],
    })),
  }));

const pageHref = (page: LinkablePage) => (page.language && page.language !== 'en' ? `/${page.language}/${page.slug}` : `/${page.slug}`);

export function MenusManager({
  menus,
  linkablePages,
  assigned,
}: {
  menus: MenuDetail[];
  linkablePages: LinkablePage[];
  assigned: { header: string | null; footer: string | null };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(menus[0]?.id ?? null);
  const selected = menus.find(m => m.id === selectedId) ?? menus[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="flex flex-col gap-4">
        <section className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
          <h3 className="mb-3 text-sm font-semibold">Your menus</h3>
          {menus.length ? (
            <ul className="flex flex-col gap-1">
              {menus.map(menu => {
                const usage = [assigned.header === menu.id && 'Header', assigned.footer === menu.id && 'Footer'].filter(Boolean);
                return (
                  <li key={menu.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(menu.id)}
                      aria-current={menu.id === selected?.id}
                      className={cn(
                        'flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition hover:bg-steel-100 dark:hover:bg-dark-300',
                        menu.id === selected?.id && 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100'
                      )}
                    >
                      <span className="font-medium">{menu.title}</span>
                      <span className="text-xs text-steel-500">
                        {menu.items.length} items · {usage.length ? `Shown in ${usage.join(' & ')}` : 'Not assigned'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-steel-500">No menus yet. Create one below.</p>
          )}
        </section>
        <NewMenuForm onCreated={setSelectedId} />
        <p className="text-xs text-steel-500">
          Choose which menu appears in the site header and footer in{' '}
          <Link href={PAGES.DASHBOARD.SETTINGS} className="font-medium text-indigo-600 hover:underline">
            Settings &amp; Theme
          </Link>
          .
        </p>
      </aside>

      {selected ? (
        <MenuEditor key={selected.id} menu={selected} linkablePages={linkablePages} />
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-steel-200 p-12 text-sm text-steel-500 dark:border-dark-300">
          Create a menu to start adding links.
        </div>
      )}
    </div>
  );
}

function NewMenuForm({ onCreated }: { onCreated: (id: string) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState<MenuLocationType>('header');
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(saveMenu({ title, location }), row => {
        toast.success('Menu created');
        setTitle('');
        onCreated((row as { id: string }).id);
        router.refresh();
      });
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-steel-200 p-4 dark:border-dark-300">
      <h3 className="text-sm font-semibold">New menu</h3>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} placeholder="Main navigation" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Location
        <select className={inputClass} value={location} onChange={e => setLocation(e.target.value as MenuLocationType)}>
          {MENU_LOCATION.map(l => (
            <option key={l} value={l}>
              {l[0].toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />} Create menu
      </Button>
    </form>
  );
}

function MenuEditor({ menu, linkablePages }: { menu: MenuDetail; linkablePages: LinkablePage[] }) {
  const router = useRouter();
  const dndId = useId();
  const [title, setTitle] = useState(menu.title);
  const [location, setLocation] = useState<MenuLocationType>(menu.location);
  const [items, setItems] = useState<EditorItem[]>(() => toEditorItems(menu.items));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(toEditorItems(menu.items)));
  const [isSaving, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dirty = useMemo(
    () => JSON.stringify(items) !== baseline || title !== menu.title || location !== menu.location,
    [items, baseline, title, location, menu.title, menu.location]
  );

  const update = (key: string, patch: Partial<EditorItem>) =>
    setItems(list =>
      list.map(item =>
        item.key === key
          ? { ...item, ...patch }
          : { ...item, children: item.children.map(child => (child.key === key ? { ...child, ...patch } : child)) }
      )
    );

  const remove = (key: string) =>
    setItems(list => list.filter(item => item.key !== key).map(item => ({ ...item, children: item.children.filter(c => c.key !== key) })));

  const indent = (index: number) =>
    setItems(list => {
      if (index === 0 || list[index].children.length) return list;
      const next = [...list];
      const [moved] = next.splice(index, 1);
      next[index - 1] = { ...next[index - 1], children: [...next[index - 1].children, { ...moved, children: [] }] };
      return next;
    });

  const outdent = (parentKey: string, childKey: string) =>
    setItems(list => {
      const parentIndex = list.findIndex(i => i.key === parentKey);
      const parent = list[parentIndex];
      const child = parent.children.find(c => c.key === childKey)!;
      const next = [...list];
      next[parentIndex] = { ...parent, children: parent.children.filter(c => c.key !== childKey) };
      next.splice(parentIndex + 1, 0, child);
      return next;
    });

  const addItem = (item?: Partial<EditorItem>) => {
    const key = newKey();
    setItems(list => [...list, { key, label: '', url: '/', target: '_self', badge: '', children: [], ...item }]);
    if (!item?.label) setOpenKey(key);
  };

  const onTopDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setItems(list => {
      const from = list.findIndex(i => i.key === active.id);
      const to = list.findIndex(i => i.key === over.id);
      return from < 0 || to < 0 ? list : arrayMove(list, from, to);
    });
  };

  const onChildDragEnd = (parentKey: string) => ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setItems(list =>
      list.map(item => {
        if (item.key !== parentKey) return item;
        const from = item.children.findIndex(c => c.key === active.id);
        const to = item.children.findIndex(c => c.key === over.id);
        return from < 0 || to < 0 ? item : { ...item, children: arrayMove(item.children, from, to) };
      })
    );
  };

  const save = () =>
    startSaving(async () => {
      const strip = ({ label, url, target, badge }: EditorItem) => ({ label, url, target, badge: badge || null });
      const payload = items.map(item => ({ ...strip(item), children: item.children.map(strip) }));
      const invalid = [...items, ...items.flatMap(i => i.children)].find(i => !i.label.trim() || !i.url.trim());
      if (invalid) {
        setOpenKey(invalid.key);
        toast.error('Every item needs a label and a link.');
        return;
      }

      if (title !== menu.title || location !== menu.location) {
        const ok = await handleActionResponse(saveMenu({ id: menu.id, title, location }), () => {});
        if (!ok) return;
      }
      await handleActionResponse(saveMenuItems({ menuId: menu.id, items: payload }), saved => {
        const fresh = toEditorItems((saved as MenuDetail).items);
        setItems(fresh);
        setBaseline(JSON.stringify(fresh));
        toast.success('Menu saved');
        router.refresh();
      });
    });

  const removeMenu = () => {
    if (!confirm(`Delete the "${menu.title}" menu and all of its links?`)) return;
    startSaving(async () => {
      await handleActionResponse(deleteMenu({ id: menu.id }), () => {
        toast.success('Menu deleted');
        router.refresh();
      });
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-steel-200 p-5 dark:border-dark-300">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
          Menu title
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Location
          <select className={inputClass} value={location} onChange={e => setLocation(e.target.value as MenuLocationType)}>
            {MENU_LOCATION.map(l => (
              <option key={l} value={l}>
                {l[0].toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={save} disabled={!dirty || isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Save menu
        </Button>
        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={removeMenu} disabled={isSaving}>
          <Trash2 /> Delete
        </Button>
      </div>

      <p className="text-xs text-steel-500">
        Drag items to reorder. Use the indent button to nest an item under the one above it (one level deep).
      </p>

      {items.length ? (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onTopDragEnd}>
          <SortableContext items={items.map(i => i.key)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              {items.map((item, index) => (
                <SortableRow
                  key={item.key}
                  item={item}
                  open={openKey === item.key}
                  onToggle={() => setOpenKey(k => (k === item.key ? null : item.key))}
                  onChange={patch => update(item.key, patch)}
                  onRemove={() => remove(item.key)}
                  action={
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Nest ${item.label || 'item'} under the item above`}
                      disabled={index === 0 || item.children.length > 0}
                      onClick={() => indent(index)}
                    >
                      <IndentIncrease />
                    </Button>
                  }
                >
                  {item.children.length > 0 && (
                    <DndContext id={`${dndId}-${item.key}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onChildDragEnd(item.key)}>
                      <SortableContext items={item.children.map(c => c.key)} strategy={verticalListSortingStrategy}>
                        <ol className="ml-8 mt-2 flex flex-col gap-2 border-l border-steel-200 pl-3 dark:border-dark-300">
                          {item.children.map(child => (
                            <SortableRow
                              key={child.key}
                              item={child}
                              open={openKey === child.key}
                              onToggle={() => setOpenKey(k => (k === child.key ? null : child.key))}
                              onChange={patch => update(child.key, patch)}
                              onRemove={() => remove(child.key)}
                              action={
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Move ${child.label || 'item'} to the top level`}
                                  onClick={() => outdent(item.key, child.key)}
                                >
                                  <IndentDecrease />
                                </Button>
                              }
                            />
                          ))}
                        </ol>
                      </SortableContext>
                    </DndContext>
                  )}
                </SortableRow>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-md border border-dashed border-steel-200 px-3 py-8 text-center text-sm text-steel-500 dark:border-dark-300">
          This menu has no links yet.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-steel-100 pt-4 dark:border-dark-300">
        <Button type="button" size="sm" variant="outline" onClick={() => addItem()}>
          <Plus /> Custom link
        </Button>
        <select
          aria-label="Add a published page"
          className={cn(inputClass, 'w-auto max-w-xs')}
          value=""
          onChange={e => {
            const page = linkablePages.find(p => p.id === e.target.value);
            if (page) addItem({ label: page.title, url: pageHref(page) });
          }}
        >
          <option value="">{linkablePages.length ? 'Add a published page…' : 'No published pages yet'}</option>
          {linkablePages.map(page => (
            <option key={page.id} value={page.id}>
              {page.title} ({pageHref(page)})
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function SortableRow({
  item,
  open,
  onToggle,
  onChange,
  onRemove,
  action,
  children,
}: {
  item: EditorItem;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<EditorItem>) => void;
  onRemove: () => void;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && 'relative z-10 opacity-80')}>
      <div className="rounded-md border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-100">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${item.label || 'item'}`}
            className="cursor-grab rounded p-1 text-steel-400 hover:bg-steel-100 active:cursor-grabbing dark:hover:bg-dark-300"
          >
            <GripVertical className="size-4" />
          </button>
          <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" aria-expanded={open}>
            {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
            <span className={cn('truncate font-medium', !item.label && 'italic text-steel-400')}>{item.label || 'Untitled link'}</span>
            <span className="truncate text-xs text-steel-400">{item.url}</span>
            {item.target === '_blank' && <ExternalLink className="size-3 shrink-0 text-steel-400" />}
            {item.badge && (
              <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                {item.badge}
              </span>
            )}
          </button>
          {action}
          <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${item.label || 'item'}`} onClick={onRemove} className="text-red-600 hover:text-red-700">
            <Trash2 />
          </Button>
        </div>
        {open && (
          <div className="grid gap-3 border-t border-steel-100 p-3 sm:grid-cols-2 dark:border-dark-300">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Label
              <input className={inputClass} value={item.label} onChange={e => onChange({ label: e.target.value })} maxLength={100} autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Link
              <input className={inputClass} value={item.url} onChange={e => onChange({ url: e.target.value })} maxLength={500} placeholder="/pricing or https://…" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Badge
              <input className={inputClass} value={item.badge} onChange={e => onChange({ badge: e.target.value })} maxLength={30} placeholder="New" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={item.target === '_blank'} onChange={e => onChange({ target: e.target.checked ? '_blank' : '_self' })} />
              Open in a new tab
            </label>
          </div>
        )}
      </div>
      {children}
    </li>
  );
}
