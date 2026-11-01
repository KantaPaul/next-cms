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

type RuleDraft = {
  id?: string;
  kind: 'post-type' | 'category' | 'tag' | 'user-state' | 'role';
  value: string;
  priority: number;
};

type Option = { label: string; value: string };

export function DisplayConditionsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: HeaderFooterItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
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
      const [rulesData] = (rulesRes as any) || [];
      if (rulesData && Array.isArray(rulesData)) {
        setRules(
          rulesData.map((r: any) => ({
            id: r.id,
            kind: r.kind as any,
            value: r.value,
            priority: r.priority ?? 0,
          }))
        );
      }
      const [taxonomyData] = (taxonomyRes as any) || [];
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
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, item.id]);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        kind: 'post-type',
        value: 'post',
        priority: 0,
      },
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
          if (patch.kind === 'post-type') next.value = 'post';
          else if (patch.kind === 'category')
            next.value = categories[0]?.value || '';
          else if (patch.kind === 'tag') next.value = tags[0]?.value || '';
          else if (patch.kind === 'user-state') next.value = 'logged-in';
          else next.value = 'admin';
        }
        return next;
      })
    );
  };

  const save = () => {
    startTransition(async () => {
      const area = item.category.toLowerCase() as 'header' | 'footer';
      await handleActionResponse(
        saveDisplayRules({
          templateId: item.id,
          area,
          rules: rules.map(r => ({
            kind: r.kind,
            value: r.value,
            priority: Number(r.priority) || 0,
          })),
        }),
        () => {
          toast.success('Display conditions saved');
          onOpenChange(false);
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
                    Without rules, this {item.category.toLowerCase()} is assigned via Site Settings or specific Page/Post settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
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
                        <option value="post-type">Content Type</option>
                        <option value="category">Category</option>
                        <option value="tag">Tag</option>
                        <option value="user-state">User State</option>
                      </select>

                      <span className="text-steel-400 font-medium">is</span>

                      {/* Value Selector */}
                      {rule.kind === 'post-type' ? (
                        <select
                          value={rule.value}
                          onChange={e => updateRule(idx, { value: e.target.value })}
                          className="flex-1 rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                        >
                          <option value="post">All Blog Posts</option>
                          <option value="page">All Standard Pages</option>
                        </select>
                      ) : rule.kind === 'category' ? (
                        <select
                          value={rule.value}
                          onChange={e => updateRule(idx, { value: e.target.value })}
                          className="flex-1 rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                        >
                          {categories.length === 0 ? (
                            <option value="">No categories found</option>
                          ) : (
                            categories.map(c => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))
                          )}
                        </select>
                      ) : rule.kind === 'tag' ? (
                        <select
                          value={rule.value}
                          onChange={e => updateRule(idx, { value: e.target.value })}
                          className="flex-1 rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                        >
                          {tags.length === 0 ? (
                            <option value="">No tags found</option>
                          ) : (
                            tags.map(t => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <select
                          value={rule.value}
                          onChange={e => updateRule(idx, { value: e.target.value })}
                          className="flex-1 rounded border border-steel-300 bg-white px-2 py-1 text-xs dark:border-dark-300 dark:bg-dark-100"
                        >
                          <option value="logged-in">Logged In</option>
                          <option value="guest">Guest / Anonymous</option>
                        </select>
                      )}

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
                <Plus className="size-3.5 mr-1" />
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
