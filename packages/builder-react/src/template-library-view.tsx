/**
 * Template Library View (E12 / Phase 8):
 * Categorized template browser and inserter, wired to server persistence
 * (avoiding prototype localStorage) or local editor store.
 */

import { cloneSubtree, createNodeId } from '@nextcms/builder-core';
import { Button, Chip, Dialog, IconButton, Input } from '@nextcms/editor-ui';
import {
  Check,
  Copy,
  LayoutTemplate,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useId, useMemo, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { DEFAULT_TEMPLATES, type TemplateItem } from './data/default-templates';

export { DEFAULT_TEMPLATES, type TemplateItem };

export interface TemplateLibraryViewProps {
  templates?: TemplateItem[];
  onApplyTemplate?: (template: TemplateItem) => void;
  onSaveTemplate?: (template: Omit<TemplateItem, 'id'>) => Promise<void> | void;
  onDeleteTemplate?: (id: string) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

export function TemplateLibraryView({
  templates: customTemplates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  isLoading = false,
  className,
}: TemplateLibraryViewProps) {
  const store = useEditorStore();
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<TemplateItem['category']>('Custom');
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [targetTemplate, setTargetTemplate] = useState<TemplateItem | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const allTemplates = useMemo(() => {
    if (customTemplates && customTemplates.length > 0) {
      return [...customTemplates, ...DEFAULT_TEMPLATES];
    }
    return DEFAULT_TEMPLATES;
  }, [customTemplates]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const t of allTemplates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [allTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTemplates.filter(t => {
      const matchesCat =
        selectedCategory === 'All' || t.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  const handleApply = (
    template: TemplateItem,
    mode: 'append' | 'replace' = 'append'
  ) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
    } else {
      // Insert template blocks into current document root
      const state = store.getState();
      const currentDoc = state.doc;
      const tDoc = template.content;
      if (!tDoc.root || !tDoc.nodes) return;

      const newNodes = mode === 'replace' ? {} : { ...currentDoc.nodes };
      const idMap = new Map<string, string>();

      // Generate fresh ids for template nodes to avoid collisions
      for (const [oldId, node] of Object.entries(tDoc.nodes)) {
        idMap.set(oldId, createNodeId(node.type));
      }

      for (const [oldId, node] of Object.entries(tDoc.nodes)) {
        const freshId = idMap.get(oldId)!;
        const freshSlots: Record<string, string[]> = {};
        for (const [slotKey, slotChildren] of Object.entries(node.slots ?? {})) {
          freshSlots[slotKey] = slotChildren.map(c => idMap.get(c) ?? c);
        }

        newNodes[freshId] = {
          ...node,
          id: freshId,
          slots: freshSlots,
        };
      }

      const rootChildrenToAdd = (tDoc.rootSlot ?? []).map(
        c => idMap.get(c) ?? c
      );
      const nextRootSlot =
        mode === 'replace'
          ? rootChildrenToAdd
          : [...(currentDoc.rootSlot ?? []), ...rootChildrenToAdd];

      store.replaceDocument(
        {
          ...currentDoc,
          rootSlot: nextRootSlot,
          nodes: newNodes,
        },
        {
          label:
            mode === 'replace'
              ? `Replace page with ${template.name}`
              : `Add ${template.name}`,
        }
      );

      if (rootChildrenToAdd.length > 0) {
        store.select([rootChildrenToAdd[0]]);
      }
    }

    setAppliedId(template.id);
    setTimeout(() => setAppliedId(null), 1800);
  };

  const onInsertClick = (template: TemplateItem) => {
    const hasBlocks = (store.getState().doc.rootSlot?.length ?? 0) > 0;
    if (!hasBlocks) {
      handleApply(template, 'append');
    } else {
      setTargetTemplate(template);
      setConfirmReplace(false);
    }
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!saveName.trim()) return;
    const doc = store.getState().doc;
    const newTemplate: Omit<TemplateItem, 'id'> = {
      name: saveName.trim(),
      category: saveCategory,
      content: doc,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    if (onSaveTemplate) {
      await onSaveTemplate(newTemplate);
    }
    setSaveName('');
    setIsSaving(false);
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 12,
        padding: 12,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Header and save action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ne-text, inherit)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LayoutTemplate size={14} /> Templates ({filteredTemplates.length})
        </span>
        <Button
          size="sm"
          variant={isSaving ? 'secondary' : 'ghost'}
          onClick={() => setIsSaving(v => !v)}
          leftIcon={<Plus size={13} />}
        >
          Save Current
        </Button>
      </div>

      {/* Save current page drawer */}
      {isSaving && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 10,
            borderRadius: 'var(--ne-radius-md, 6px)',
            border: '1px solid var(--ne-primary, #4f46e5)',
            background: 'var(--ne-primary-soft, rgba(79, 70, 229, 0.05))',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600 }}>Save Page as Template</span>
          <Input
            placeholder="Template name…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => setIsSaving(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!saveName.trim()}
              onClick={handleSaveCurrentAsTemplate}
            >
              Save Template
            </Button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative' }}>
        <Input
          id={searchId}
          placeholder="Search templates…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftElement={<Search size={13} style={{ color: 'var(--ne-text-muted)' }} />}
        />
      </div>

      {/* Categories chips */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {categories.map(cat => (
          <Chip
            key={cat}
            active={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Chip>
        ))}
      </div>

      {/* Templates list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        {filteredTemplates.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--ne-text-muted, #94a3b8)',
              fontSize: 12,
            }}
          >
            No templates match "{searchQuery}".
          </div>
        ) : (
          filteredTemplates.map(template => {
            const blockCount = Object.keys(template.content.nodes ?? {}).length;
            const isApplied = appliedId === template.id;

            return (
              <div
                key={template.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 10,
                  borderRadius: 'var(--ne-radius-md, 6px)',
                  border: '1px solid var(--ne-border, rgba(127,127,127,.2))',
                  background: 'var(--ne-surface, #ffffff)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--ne-text, inherit)',
                        }}
                      >
                        {template.name}
                      </span>
                      {template.isCustom && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--ne-primary-soft, rgba(79, 70, 229, 0.1))',
                            color: 'var(--ne-primary, #4f46e5)',
                            fontWeight: 600,
                          }}
                        >
                          Custom
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 11,
                          color: 'var(--ne-text-muted, #64748b)',
                          lineHeight: 1.35,
                        }}
                      >
                        {template.description}
                      </p>
                    )}
                  </div>

                  {template.isCustom && onDeleteTemplate && (
                    <IconButton
                      size="sm"
                      variant="danger"
                      aria-label={`Delete ${template.name}`}
                      tooltip="Delete custom template"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 4,
                    borderTop: '1px solid var(--ne-border-subtle, rgba(127,127,127,.1))',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--ne-text-muted, #94a3b8)',
                    }}
                  >
                    {blockCount} {blockCount === 1 ? 'block' : 'blocks'} · {template.category}
                  </span>

                  <Button
                    size="sm"
                    variant={isApplied ? 'secondary' : 'primary'}
                    onClick={() => onInsertClick(template)}
                    leftIcon={isApplied ? <Check size={12} /> : <Plus size={12} />}
                  >
                    {isApplied ? 'Inserted' : 'Insert'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {targetTemplate && (
        <Dialog
          open={!!targetTemplate}
          onClose={() => {
            setTargetTemplate(null);
            setConfirmReplace(false);
          }}
          title={`Insert "${targetTemplate.name}"`}
          description={
            confirmReplace
              ? 'Are you sure you want to replace all blocks on this page?'
              : 'Choose whether to add this template to the bottom of the page or replace the page.'
          }
          maxWidth="sm"
        >
          <div className="space-y-4 py-2">
            {!confirmReplace ? (
              <div className="flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full justify-start py-2.5 px-3 text-left"
                  onClick={() => {
                    handleApply(targetTemplate, 'append');
                    setTargetTemplate(null);
                  }}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-xs">Add to bottom of page</span>
                    <span className="text-[11px] opacity-80 font-normal">
                      Appends all sections from this template after your existing blocks.
                    </span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-start py-2.5 px-3 text-left"
                  onClick={() => setConfirmReplace(true)}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-xs text-[var(--ne-text)]">
                      Replace page...
                    </span>
                    <span className="text-[11px] text-[var(--ne-text-muted)] font-normal">
                      Replaces all current blocks on the canvas with this template.
                    </span>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <span className="font-semibold">Caution:</span> This will overwrite all blocks currently on the page. You can still use Undo (⌘Z) if needed.
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmReplace(false)}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      handleApply(targetTemplate, 'replace');
                      setTargetTemplate(null);
                      setConfirmReplace(false);
                    }}
                  >
                    Confirm & Replace
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
