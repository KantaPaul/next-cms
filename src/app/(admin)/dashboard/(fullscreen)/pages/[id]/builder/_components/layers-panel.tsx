'use client';

import { createUsePuck } from '@measured/puck';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { getBlockIcon } from './builder-shell';

const usePuck = createUsePuck();

type SlotGroup = {
  key: string;
  label: string;
  items: any[];
};

function getItemSubtitle(props: Record<string, any>): string | null {
  if (typeof props.title === 'string' && props.title.trim()) return props.title.trim();
  if (typeof props.headline === 'string' && props.headline.trim()) return props.headline.trim();
  if (typeof props.eyebrow === 'string' && props.eyebrow.trim()) return props.eyebrow.trim();
  if (typeof props.badge === 'string' && props.badge.trim()) return props.badge.trim();
  return null;
}

function getSlotGroupsForItem(item: any, config: any, zones: Record<string, any[]> = {}): SlotGroup[] {
  const comp = config.components[item.type];
  if (!comp?.fields) return [];

  const groups: SlotGroup[] = [];

  for (const [fieldName, field] of Object.entries<any>(comp.fields)) {
    if (field?.type === 'slot') {
      const zoneKey = `${item.props.id}:${fieldName}`;
      const slotItems = zones[zoneKey] || (Array.isArray(item.props[fieldName]) ? item.props[fieldName] : []);
      groups.push({
        key: zoneKey,
        label: field.label || fieldName,
        items: slotItems,
      });
    } else if (field?.type === 'array' && field.arrayFields) {
      const slotEntry = Object.entries<any>(field.arrayFields).find(([, f]) => f?.type === 'slot');
      if (slotEntry) {
        const [slotKey] = slotEntry;
        const arrayItems = Array.isArray(item.props[fieldName]) ? item.props[fieldName] : [];
        arrayItems.forEach((arrayItem: any, idx: number) => {
          const zoneKey = `${item.props.id}:${fieldName}[${idx}].${slotKey}`;
          const slotItems = zones[zoneKey] || (Array.isArray(arrayItem[slotKey]) ? arrayItem[slotKey] : []);
          groups.push({
            key: zoneKey,
            label: arrayItem.label || `${field.label || 'Panel'} ${idx + 1}`,
            items: slotItems,
          });
        });
      }
    }
  }

  // Pick up any other custom zones starting with `${item.props.id}:`
  const existingKeys = new Set(groups.map(g => g.key));
  for (const [zoneKey, zoneItems] of Object.entries(zones)) {
    if (zoneKey.startsWith(`${item.props.id}:`) && !existingKeys.has(zoneKey)) {
      const slotPath = zoneKey.slice(`${item.props.id}:`.length);
      groups.push({
        key: zoneKey,
        label: slotPath,
        items: zoneItems ?? [],
      });
    }
  }

  return groups;
}

function findAncestors(
  items: any[],
  targetId: string,
  config: any,
  zones: Record<string, any[]>
): string[] {
  for (const item of items) {
    if (item.props.id === targetId) return [item.props.id];
    const slotGroups = getSlotGroupsForItem(item, config, zones);
    for (const group of slotGroups) {
      const sub = findAncestors(group.items, targetId, config, zones);
      if (sub.length > 0) {
        return [item.props.id, group.key, ...sub];
      }
    }
  }
  return [];
}

function scrollToCanvasItem(id: string) {
  try {
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;
    const el =
      doc.querySelector(`[data-puck-component="${id}"]`) ||
      doc.querySelector(`[data-puck-component*="${id}"]`) ||
      doc.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch {
    // Cross-origin / detached fallback
  }
}

export function LayersPanel() {
  const content = usePuck(s => s.appState.data.content) ?? [];
  const zones = usePuck(s => s.appState.data.zones) ?? {};
  const config = usePuck(s => s.config);
  const dispatch = usePuck(s => s.dispatch);
  const getSelectorForId = usePuck(s => s.getSelectorForId);
  const selectedItem = usePuck(s => s.selectedItem);

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  // Keep ancestors of selection automatically expanded
  useEffect(() => {
    if (!selectedItem?.props?.id) return;
    const ancestors = findAncestors(content, selectedItem.props.id, config, zones);
    if (ancestors.length) {
      setExpanded(prev => {
        const next = { ...prev };
        ancestors.forEach(id => {
          next[id] = true;
        });
        return next;
      });
    }
  }, [selectedItem?.props?.id, content, config, zones]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (itemId: string) => {
    const isSelected = selectedItem?.props.id === itemId;
    if (isSelected) {
      dispatch({ type: 'setUi', ui: { itemSelector: null } });
    } else {
      const selector = getSelectorForId(itemId);
      if (selector) {
        dispatch({ type: 'setUi', ui: { itemSelector: selector } });
      }
      scrollToCanvasItem(itemId);
    }
  };

  // Check if an item matches search query or has matching descendants
  const matchesSearch = useMemo(() => {
    if (!q) return () => true;

    const check = (item: any): boolean => {
      const label = (config.components[item.type]?.label || item.type).toLowerCase();
      const subtitle = getItemSubtitle(item.props)?.toLowerCase() || '';
      if (label.includes(q) || subtitle.includes(q)) return true;

      const slotGroups = getSlotGroupsForItem(item, config, zones);
      return slotGroups.some(g => g.items.some(child => check(child)));
    };

    return check;
  }, [q, config, zones]);

  const renderItem = (item: any, depth = 0) => {
    if (!matchesSearch(item)) return null;

    const Icon = getBlockIcon(item.type);
    const label = config.components[item.type]?.label || item.type;
    const subtitle = getItemSubtitle(item.props);
    const slotGroups = getSlotGroupsForItem(item, config, zones);
    const hasChildren = slotGroups.some(g => g.items.length > 0);
    const isSelected = selectedItem?.props.id === item.props.id;
    const isExpanded = q.length > 0 || !!expanded[item.props.id];

    return (
      <div key={item.props.id} className="space-y-1">
        <div
          onClick={() => handleSelect(item.props.id)}
          style={{ paddingLeft: `${Math.max(0.5, depth * 0.85)}rem` }}
          className={cn(
            'group flex items-center justify-between gap-2 rounded-lg py-1.5 pr-2 text-xs transition-all cursor-pointer',
            isSelected
              ? 'bg-slate-200/90 font-medium text-slate-900 shadow-xs ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
              : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={e => toggleExpand(item.props.id, e)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </button>
            ) : (
              <span className="size-4" />
            )}

            <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/50 text-foreground">
              <Icon className="size-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight">{label}</p>
              {subtitle && (
                <p className="truncate text-[10px] text-muted-foreground leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nested slots */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 pl-3 border-l border-border/40 ml-2.5">
            {slotGroups.map(group => {
              if (!group.items.length) return null;
              const isGroupExpanded = q.length > 0 || expanded[group.key] !== false;

              return (
                <div key={group.key} className="space-y-1">
                  {slotGroups.length > 1 && (
                    <div
                      onClick={e => toggleExpand(group.key, e)}
                      className="flex items-center gap-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 cursor-pointer hover:text-foreground"
                    >
                      {isGroupExpanded ? (
                        <ChevronDown className="size-2.5" />
                      ) : (
                        <ChevronRight className="size-2.5" />
                      )}
                      <span>{group.label}</span>
                      <span className="rounded bg-muted px-1 py-0.2 text-[9px]">
                        {group.items.length}
                      </span>
                    </div>
                  )}
                  {isGroupExpanded && (
                    <div className="space-y-1">
                      {group.items.map(child => renderItem(child, depth + 1))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!content.length) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        <Layers className="mx-auto mb-2 size-8 text-muted-foreground/40" />
        <p className="font-medium text-foreground">No layers yet</p>
        <p className="mt-1">Add blocks from the Blocks tab to build your page.</p>
      </div>
    );
  }

  const matchingItems = content.filter(item => matchesSearch(item));

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search layers"
          aria-label="Search layers"
          className="h-8 w-full rounded-md border border-input bg-background/50 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="space-y-1 pt-1">
        {matchingItems.map(item => renderItem(item, 0))}
        {!matchingItems.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No layers match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}
