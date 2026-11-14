'use client';

import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
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
import { FormInput } from '@/components/ui/input';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { HeaderFooterItem } from '../_modules/header-footer.service';
import {
  getDisplayRules,
  getDisplayRulesTaxonomy,
  saveDisplayRules,
} from '../_modules/header-footer.actions';

type RuleKind =
  | 'post-type'
  | 'category'
  | 'tag'
  | 'user-state'
  | 'role'
  | 'archive-type'
  | 'search-kind';

type RuleDraft = {
  id?: string;
  kind: RuleKind;
  value: string;
  priority: number;
};

type Option = { label: string; value: string };
type Area = 'header' | 'footer' | 'search' | 'archive';

/** Which condition kinds each template area supports, first is the default. */
const KINDS_BY_AREA: Record<Area, { value: RuleKind; label: string }[]> = {
  header: [
    { value: 'post-type', label: 'Content Type' },
    { value: 'category', label: 'Category' },
    { value: 'tag', label: 'Tag' },
    { value: 'user-state', label: 'User State' },
  ],
  footer: [
    { value: 'post-type', label: 'Content Type' },
    { value: 'category', label: 'Category' },
    { value: 'tag', label: 'Tag' },
    { value: 'user-state', label: 'User State' },
  ],
  archive: [
    { value: 'archive-type', label: 'Archive Type' },
    { value: 'post-type', label: 'Post Type' },
    { value: 'category', label: 'Category' },
    { value: 'tag', label: 'Tag' },
  ],
  search: [{ value: 'search-kind', label: 'Results Filter' }],
};

const ARCHIVE_TYPE_OPTIONS: Option[] = [
  { value: 'category', label: 'Category archive' },
  { value: 'tag', label: 'Tag archive' },
  { value: 'author', label: 'Author archive' },
  { value: 'date', label: 'Date archive' },
  { value: 'collection', label: 'Post type archive' },
  { value: 'term', label: 'Post type taxonomy term' },
];

const SEARCH_KIND_OPTIONS: Option[] = [
  { value: 'all', label: 'All results (no filter)' },
  { value: 'page', label: 'Pages' },
  { value: 'post', label: 'Posts' },
  { value: 'collection', label: 'Post type entries' },
  { value: 'video', label: 'Videos' },
];

const CONTENT_TYPE_OPTIONS: Option[] = [
  { value: 'post', label: 'All Blog Posts' },
  { value: 'page', label: 'All Standard Pages' },
];

const USER_STATE_OPTIONS: Option[] = [
  { value: 'logged-in', label: 'Logged In' },
  { value: 'guest', label: 'Guest / Anonymous' },
];

const SETTINGS_HINT: Record<Area, string> = {
  header: 'Site Settings or specific Page/Post settings',
  footer: 'Site Settings or specific Page/Post settings',
  archive: 'Settings → Archive Template (or a post type’s own archive template)',
  search: 'Settings → Search Results Template',
};

export function DisplayConditionsDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: HeaderFooterItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [postTypes, setPostTypes] = useState<Option[]>([]);
  const area = item.category.toLowerCase() as Area;
  const kinds = KINDS_BY_AREA[area] ?? KINDS_BY_AREA.header;
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getDisplayRules({ templateId: item.id }),
      getDisplayRulesTaxonomy(undefined as any),
    ]).then(([rulesRes, taxonomyRes]) => {
      if (cancelled) return;
      // Actions return the data itself, or an error object on failure.
      const isError = (v: any) =>
        !v || typeof v !== 'object' || 'hasError' in v || 'errors' in v;
      const rulesData: any[] = Array.isArray(rulesRes)
        ? (rulesRes as any[]).filter(r => !isError(r))
        : [];
      setRules(
        rulesData.map((r: any) => ({
          id: r.id,
          kind: r.kind as RuleKind,
          value: r.value,
          priority: r.priority ?? 0,
        }))
      );
      const taxonomyData: any = isError(taxonomyRes) ? null : taxonomyRes;
      if (taxonomyData) {
        setCategories(
          (taxonomyData.categories || []).map((c: any) => ({
            label: c.name || c.label,
            value: c.id || c.value,
          }))
        );
        setTags(
          (taxonomyData.tags || []).map((t: any) => ({
            label: t.name || t.label,
            value: t.id || t.value,
          }))
        );
        setPostTypes(taxonomyData.postTypes || []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, item.id]);

  const optionsFor = (kind: RuleKind): Option[] => {
    switch (kind) {
      case 'post-type':
        return area === 'archive'
          ? [{ value: 'post', label: 'Blog posts' }, ...postTypes]
          : CONTENT_TYPE_OPTIONS;
      case 'category':
        return categories;
      case 'tag':
        return tags;
      case 'user-state':
        return USER_STATE_OPTIONS;
      case 'archive-type':
        return ARCHIVE_TYPE_OPTIONS;
      case 'search-kind':
        return SEARCH_KIND_OPTIONS;
      default:
        return [];
    }
  };

  const emptyLabel = (kind: RuleKind) =>
    kind === 'category'
      ? 'No categories found'
      : kind === 'tag'
        ? 'No tags found'
        : 'No options';

  const addRule = () => {
    const kind = kinds[0].value;
    setRules(prev => [
      ...prev,
      { kind, value: optionsFor(kind)[0]?.value ?? '', priority: 0 },
    ]);
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateRule = (index: number, patch: Partial<RuleDraft>) => {
    setRules(prev =>
      prev.map((r, idx) => {
        if (idx !== index) return r;
        const next = { ...r, ...patch };
        if (patch.kind && patch.kind !== r.kind) {
          next.value = optionsFor(patch.kind)[0]?.value ?? '';
        }
        return next;
      })
    );
  };

  const save = () => {
    startTransition(async () => {
      await handleActionResponse(
        saveDisplayRules({
          templateId: item.id,
          area,
          rules: rules.filter(r => r.value).map(r => ({
            kind: r.kind,
            value: r.value,
            priority: Number(r.priority) || 0,
          })),
        }),
        () => {
          toast.success('Display conditions saved');
          onOpenChange(false);
          onSaved?.();
        }
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-[var(--site-primary,#3b82f6)]" />
            <DialogTitle>Display Conditions: {item.name}</DialogTitle>
          </div>
          <DialogDescription>
            Configure rule-based display conditions for this {item.category.toLowerCase()}.
            Rules automatically assign this layout when content matches.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          {loading ? (
            <p className="text-center py-6 text-sm text-steel-400">Loading conditions...</p>
          ) : (
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-lg border border-dashed border-steel-200 dark:border-dark-300">
                  <p className="text-sm font-medium text-steel-700 dark:text-steel-300">
                    No display conditions configured
                  </p>
                  <p className="text-xs text-steel-500 dark:text-steel-400 mt-1">
                    Without rules, this {item.category.toLowerCase()} is assigned via {SETTINGS_HINT[area]}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-md border border-steel-200 dark:border-dark-300 bg-steel-50/50 dark:bg-dark-200/50 text-xs"
                    >
                      {/* Kind Selector */}
                      <select
                        value={rule.kind}
                        onChange={e =>
                          updateRule(idx, { kind: e.target.value as any })
                        }
                        className="rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                      >
                        {kinds.map(k => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>

                      <span className="text-steel-400 font-medium">is</span>

                      {/* Value Selector */}
                      <select
                        value={rule.value}
                        onChange={e => updateRule(idx, { value: e.target.value })}
                        className="flex-1 min-w-0 rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                      >
                        {optionsFor(rule.kind).length === 0 ? (
                          <option value="">{emptyLabel(rule.kind)}</option>
                        ) : (
                          optionsFor(rule.kind).map(o => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))
                        )}
                      </select>

                      {/* Priority */}
                      <label className="flex items-center gap-1 text-[11px] text-steel-500 whitespace-nowrap">
                        <span>Priority:</span>
                        <input
                          type="number"
                          value={rule.priority}
                          onChange={e =>
                            updateRule(idx, { priority: Number(e.target.value) || 0 })
                          }
                          className="w-12 rounded border border-steel-300 px-1 py-0.5 text-xs text-center dark:border-dark-300 dark:bg-dark-100"
                        />
                      </label>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeRule(idx)}
                        aria-label="Remove condition"
                        className="rounded p-1 text-steel-400 hover:text-red-600 hover:bg-steel-100 dark:hover:bg-dark-300 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                className="w-full text-xs"
              >
                <Plus className="size-3.5 me-1" />
                Add condition
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isPending || loading}
          >
            {isPending ? 'Saving...' : 'Save conditions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
