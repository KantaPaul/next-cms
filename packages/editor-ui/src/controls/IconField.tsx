import {
  ArrowRight,
  Award,
  Bell,
  Bookmark,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Cloud,
  Code,
  Compass,
  Cpu,
  CreditCard,
  Database,
  Download,
  Flag,
  Gift,
  Globe,
  Heart,
  Home,
  Image,
  Info,
  Layers,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Rocket,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Tag,
  Terminal,
  ThumbsUp,
  TrendingUp,
  Truck,
  User,
  Users,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { Popover } from '../primitives/Popover';
import { type ControlDeviceState, ControlRow } from './ControlRow';

/** One pickable icon; `id` is what the field stores. */
export interface IconOption {
  id: string;
  name: string;
  icon: LucideIcon;
  /** Extra search words, e.g. "email" for Mail. */
  keywords?: readonly string[];
}

const icon = (
  id: string,
  name: string,
  component: LucideIcon,
  keywords?: string[]
): IconOption => ({ id, name, icon: component, keywords });

/** A curated lucide set; hosts can pass their own list via `icons`. */
export const DEFAULT_ICON_OPTIONS: IconOption[] = [
  icon('star', 'Star', Star, ['favorite', 'rating']),
  icon('heart', 'Heart', Heart, ['love', 'like']),
  icon('zap', 'Zap', Zap, ['lightning', 'fast', 'bolt']),
  icon('shield', 'Shield', Shield, ['security', 'safe']),
  icon('check', 'Check', Check, ['done', 'tick']),
  icon('sparkles', 'Sparkles', Sparkles, ['magic', 'new', 'ai']),
  icon('rocket', 'Rocket', Rocket, ['launch', 'startup']),
  icon('globe', 'Globe', Globe, ['world', 'web', 'language']),
  icon('smile', 'Smile', Smile, ['happy', 'face']),
  icon('award', 'Award', Award, ['badge', 'prize']),
  icon('thumbs-up', 'Thumbs Up', ThumbsUp, ['like', 'approve']),
  icon('trending-up', 'Trending Up', TrendingUp, ['growth', 'chart']),
  icon('layers', 'Layers', Layers, ['stack']),
  icon('code', 'Code', Code, ['developer']),
  icon('terminal', 'Terminal', Terminal, ['console', 'cli']),
  icon('cpu', 'CPU', Cpu, ['chip', 'processor']),
  icon('database', 'Database', Database, ['storage', 'data']),
  icon('cloud', 'Cloud', Cloud, ['hosting']),
  icon('settings', 'Settings', Settings, ['gear', 'cog']),
  icon('search', 'Search', Search, ['find', 'magnifier']),
  icon('compass', 'Compass', Compass, ['explore', 'direction']),
  icon('map-pin', 'Map Pin', MapPin, ['location', 'address']),
  icon('home', 'Home', Home, ['house']),
  icon('user', 'User', User, ['person', 'profile', 'account']),
  icon('users', 'Users', Users, ['team', 'people', 'group']),
  icon('mail', 'Mail', Mail, ['email', 'envelope']),
  icon('phone', 'Phone', Phone, ['call', 'contact']),
  icon('message-circle', 'Message', MessageCircle, ['chat', 'comment']),
  icon('bell', 'Bell', Bell, ['notification', 'alert']),
  icon('calendar', 'Calendar', Calendar, ['date', 'event']),
  icon('clock', 'Clock', Clock, ['time', 'schedule']),
  icon('camera', 'Camera', Camera, ['photo']),
  icon('image', 'Image', Image, ['picture', 'photo', 'media']),
  icon('play', 'Play', Play, ['video', 'start']),
  icon('download', 'Download', Download, ['save']),
  icon('shopping-cart', 'Cart', ShoppingCart, ['shop', 'buy', 'ecommerce']),
  icon('credit-card', 'Credit Card', CreditCard, ['payment', 'billing']),
  icon('truck', 'Truck', Truck, ['shipping', 'delivery']),
  icon('gift', 'Gift', Gift, ['present']),
  icon('tag', 'Tag', Tag, ['label', 'price']),
  icon('bookmark', 'Bookmark', Bookmark, ['save']),
  icon('flag', 'Flag', Flag, ['report', 'goal']),
  icon('info', 'Info', Info, ['help', 'about']),
  icon('arrow-right', 'Arrow Right', ArrowRight, ['next', 'forward']),
  icon('chevron-right', 'Chevron Right', ChevronRight, ['next', 'more']),
];

/** Icons whose id, name, or keywords contain the query (case-insensitive). */
export function filterIcons(
  icons: readonly IconOption[],
  query: string
): IconOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...icons];
  return icons.filter(
    i =>
      i.id.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      !!i.keywords?.some(k => k.toLowerCase().includes(q))
  );
}

/** Moves `id` to the front of the recent list, keeping at most `max`. */
export function pushRecentIcon(
  recent: readonly string[],
  id: string,
  max = 6
): string[] {
  return [id, ...recent.filter(r => r !== id)].slice(0, max);
}

const RECENT_KEY = 'ne-icon-field-recent';

function readRecent(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(recent: string[]) {
  try {
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // Storage can be blocked; the recent row just won't persist.
  }
}

export interface IconFieldProps {
  id?: string;
  label?: string;
  /** The selected icon's id, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  icons?: readonly IconOption[];
  /** Controlled recent ids; omit to remember them in localStorage. */
  recent?: readonly string[];
  onRecentChange?: (recent: string[]) => void;
  /** Shows a "None" choice that clears the value. */
  clearable?: boolean;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  deviceState?: ControlDeviceState;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const IconField: React.FC<IconFieldProps> = ({
  id,
  label,
  value,
  onChange,
  icons = DEFAULT_ICON_OPTIONS,
  recent: controlledRecent,
  onRecentChange,
  clearable = true,
  info,
  changed,
  onReset,
  deviceState,
  helperText,
  disabled = false,
  className,
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [query, setQuery] = useState('');
  const [storedRecent, setStoredRecent] = useState<string[]>([]);
  // Read after mount so server and client markup match.
  useEffect(() => {
    if (controlledRecent === undefined) setStoredRecent(readRecent());
  }, [controlledRecent]);
  const recent = controlledRecent ?? storedRecent;

  const selected = icons.find(i => i.id === value);
  const filtered = useMemo(() => filterIcons(icons, query), [icons, query]);
  const recentItems = useMemo(
    () =>
      recent
        .map(r => icons.find(i => i.id === r))
        .filter((i): i is IconOption => !!i),
    [recent, icons]
  );

  const select = (next: string, close: () => void) => {
    onChange(next);
    setQuery('');
    close();
    if (!next) return;
    const nextRecent = pushRecentIcon(recent, next);
    if (controlledRecent === undefined) {
      setStoredRecent(nextRecent);
      writeRecent(nextRecent);
    }
    onRecentChange?.(nextRecent);
  };

  const tile = (item: IconOption, close: () => void, withName: boolean) => {
    const Icon = item.icon;
    const isSelected = item.id === value;
    return (
      <button
        key={item.id}
        type="button"
        title={item.name}
        aria-label={item.name}
        aria-pressed={isSelected}
        onClick={() => select(item.id, close)}
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-[var(--ne-radius-md)] border p-1.5 transition-colors',
          isSelected
            ? 'border-[var(--ne-primary)] bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
            : 'border-[var(--ne-border)] text-[var(--ne-text)] hover:bg-[var(--ne-surface-subtle)]'
        )}
      >
        <Icon aria-hidden className="h-4 w-4" />
        {withName && (
          <span className="max-w-full truncate text-[9px] text-[var(--ne-text-muted)]">
            {item.name}
          </span>
        )}
      </button>
    );
  };

  const popoverContent = (close: () => void) => (
    <div className="w-60 space-y-2.5" data-icon-picker="">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute start-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--ne-text-muted)]"
        />
        <input
          type="search"
          aria-label="Search icons"
          // biome-ignore lint/a11y/noAutofocus: the popover opens to search
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="h-7 w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] ps-6 pe-2 text-xs text-[var(--ne-text)] outline-none focus:border-[var(--ne-primary)] focus:bg-[var(--ne-surface)]"
        />
      </div>

      {!query && recentItems.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            Recent
          </div>
          <div className="grid grid-cols-6 gap-1">
            {recentItems.map(item => tile(item, close, false))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
          <span>{query ? 'Results' : 'All icons'}</span>
          {clearable && value && (
            <button
              type="button"
              onClick={() => select('', close)}
              className="normal-case tracking-normal text-[var(--ne-text-muted)] hover:text-[var(--ne-danger)]"
            >
              None
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-xs text-[var(--ne-text-muted)]">
            No icons match “{query}”
          </p>
        ) : (
          <div className="ne-scrollbar grid max-h-44 grid-cols-4 gap-1 overflow-y-auto p-0.5">
            {filtered.map(item => tile(item, close, true))}
          </div>
        )}
      </div>
    </div>
  );

  const SelectedIcon = selected?.icon;
  const trigger = (
    <button
      type="button"
      id={fieldId}
      disabled={disabled}
      className="inline-flex h-7 w-full items-center justify-between gap-2 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2 text-xs text-[var(--ne-text)] transition-colors hover:border-[var(--ne-border-strong)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--ne-radius-sm)] bg-[var(--ne-surface-subtle)] text-[var(--ne-primary)]">
          {SelectedIcon ? <SelectedIcon aria-hidden className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="truncate">
          {selected?.name ?? (value || 'No icon')}
        </span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold text-[var(--ne-primary)]">
        Change
      </span>
    </button>
  );

  const content = (
    <Popover
      trigger={trigger}
      content={popoverContent}
      align="end"
      className="p-2"
    />
  );

  if (!label) return <div className={className}>{content}</div>;

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      labelPosition="above"
      info={info}
      changed={changed}
      onReset={onReset}
      deviceState={deviceState}
      helperText={helperText}
      className={className}
    >
      {content}
    </ControlRow>
  );
};
