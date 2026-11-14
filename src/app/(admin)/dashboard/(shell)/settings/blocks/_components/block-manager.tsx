'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  BLOCK_EDITOR_GROUPS,
  type BlockEditorGroup,
  type BlockEditorKind,
  type BlockSettings,
} from '@/config/block-manager';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { updateBlockSettings } from '../../_modules/settings.actions';

export type BlockManagerEditor = {
  kind: BlockEditorKind;
  label: string;
  /** Section of the editor list (content editors, site templates). */
  section?: BlockEditorGroup;
  groups: { title: string; blocks: { type: string; label: string }[] }[];
  hidden: string[];
  defaultHidden: string[];
  customized: boolean;
};

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every(x => b.includes(x));

export function BlockManager({
  editors,
  initialEditor,
  onSave,
  resetLabel = 'Reset to default',
  defaultHint = 'Using the default list.',
  successMessage = 'Block settings saved. Editors pick them up on next load.',
}: {
  editors: BlockManagerEditor[];
  initialEditor?: string;
  onSave?: (hidden: BlockSettings['hidden']) => Promise<unknown>;
  resetLabel?: string;
  defaultHint?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const resolvedInitial =
    editors.find(e => e.kind === initialEditor)?.kind ??
    editors[0]?.kind ??
    'page';
  const [active, setActive] = useState<BlockEditorKind>(resolvedInitial);

  useEffect(() => {
    const match = editors.find(e => e.kind === initialEditor);
    if (match) setActive(match.kind);
  }, [initialEditor, editors]);

  const selectEditor = (kind: BlockEditorKind) => {
    setActive(kind);
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    params.set('editor', kind);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  // Hidden blocks per editor type, as currently edited (not yet saved).
  const [hidden, setHidden] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(editors.map(e => [e.kind, e.hidden]))
  );
  // Editor types whose list was changed here or saved before; others keep
  // following their default, so blocks added later still appear.
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(editors.filter(e => e.customized).map(e => e.kind))
  );
  const [saving, setSaving] = useState(false);

  const editor = editors.find(e => e.kind === active) ?? editors[0];
  // Editor list in sections; entries without one (collection settings) form a single list.
  const navSections = useMemo(() => {
    if (!editors.some(e => e.section)) {
      return [{ id: 'all', label: '', editors }];
    }
    return BLOCK_EDITOR_GROUPS.map(group => ({
      id: group.id,
      label: group.label,
      editors: editors.filter(e => (e.section ?? 'content') === group.id),
    })).filter(section => section.editors.length > 0);
  }, [editors]);
  const current = hidden[editor.kind] ?? [];
  const total = editor.groups.reduce((n, g) => n + g.blocks.length, 0);

  const dirty = useMemo(
    () =>
      editors.some(e => {
        const now = hidden[e.kind] ?? [];
        const wasCustom = e.customized;
        const isCustom = touched.has(e.kind);
        return wasCustom !== isCustom || !sameSet(now, e.hidden);
      }),
    [editors, hidden, touched]
  );

  const setKindHidden = (kind: string, next: string[]) => {
    setHidden(prev => ({ ...prev, [kind]: next }));
    setTouched(prev => new Set(prev).add(kind));
  };

  const toggle = (type: string, shown: boolean) =>
    setKindHidden(
      editor.kind,
      shown ? current.filter(t => t !== type) : [...current, type]
    );

  const setGroup = (types: string[], shown: boolean) =>
    setKindHidden(
      editor.kind,
      shown
        ? current.filter(t => !types.includes(t))
        : [...new Set([...current, ...types])]
    );

  const resetKind = () => {
    setHidden(prev => ({ ...prev, [editor.kind]: editor.defaultHidden }));
    setTouched(prev => {
      const next = new Set(prev);
      next.delete(editor.kind);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const payload: BlockSettings['hidden'] = {};
    for (const e of editors) {
      if (touched.has(e.kind)) payload[e.kind] = hidden[e.kind] ?? [];
    }
    const action = onSave
      ? onSave(payload)
      : updateBlockSettings({ hidden: payload });
    await handleActionResponse(
      Promise.resolve(action).then(res => {
        if (
          res &&
          typeof res === 'object' &&
          'ok' in res &&
          (res as { ok?: boolean; error?: string }).ok === false
        ) {
          return {
            hasError: true,
            message:
              (res as { error?: string }).error ??
              'Failed to save block settings.',
            errorType: 'Error' as const,
          };
        }
        return res;
      }) as never,
      () => {
        toast.success(successMessage);
        router.refresh();
      }
    );
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Editor types" className="flex gap-4 overflow-x-auto lg:flex-col">
        {navSections.map(section => (
          <div key={section.id} className="flex shrink-0 gap-1 lg:flex-col">
            {navSections.length > 1 && (
              <h3 className="hidden px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-steel-500 lg:block">
                {section.label}
              </h3>
            )}
            {section.editors.map(e => {
              const count = e.groups.reduce((n, g) => n + g.blocks.length, 0);
              const shown = count - (hidden[e.kind]?.length ?? 0);
              return (
                <button
                  key={e.kind}
                  type="button"
                  onClick={() => selectEditor(e.kind)}
                  className={cn(
                    'flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    e.kind === active
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-dark-200'
                  )}
                >
                  <span>{e.label}</span>
                  <span className="text-xs tabular-nums opacity-70">
                    {shown}/{count}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <section aria-label={`${editor.label} blocks`} className="min-w-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editor.label}</h2>
            <p className="text-sm text-steel-500">
              {total - current.length} of {total} blocks shown in this editor’s
              insert panel. Hidden blocks already on a page keep working.
              {!touched.has(editor.kind) && ` ${defaultHint}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetKind}
              disabled={!touched.has(editor.kind)}
            >
              <RotateCcw /> {resetLabel}
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {editor.groups.map(group => {
            const types = group.blocks.map(b => b.type);
            const shownCount = types.filter(t => !current.includes(t)).length;
            return (
              <div
                key={group.title}
                className="rounded-lg border border-steel-200 dark:border-dark-300"
              >
                <div className="flex items-center justify-between gap-3 border-b border-steel-200 px-4 py-2.5 dark:border-dark-300">
                  <h3 className="text-sm font-semibold">
                    {group.title}{' '}
                    <span className="font-normal text-steel-500">
                      ({shownCount}/{types.length})
                    </span>
                  </h3>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline disabled:opacity-40"
                      disabled={shownCount === types.length}
                      onClick={() => setGroup(types, true)}
                    >
                      Show all
                    </button>
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline disabled:opacity-40"
                      disabled={shownCount === 0}
                      onClick={() => setGroup(types, false)}
                    >
                      Hide all
                    </button>
                  </div>
                </div>
                <ul className="grid gap-px sm:grid-cols-2 xl:grid-cols-3">
                  {group.blocks.map(block => {
                    const shown = !current.includes(block.type);
                    const id = `block-${editor.kind}-${block.type}`;
                    return (
                      <li
                        key={block.type}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <label
                          htmlFor={id}
                          className={cn('text-sm', !shown && 'text-steel-400 line-through')}
                        >
                          {block.label}
                        </label>
                        <Switch
                          id={id}
                          checked={shown}
                          onChange={value => toggle(block.type, value)}
                          aria-label={`Show ${block.label} in ${editor.label}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
