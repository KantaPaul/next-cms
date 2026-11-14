import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  BeforeAfterClient,
  DocSearchClient,
  DocsSidebarClient,
  type DocsTreeItem,
  PortfolioGridClient,
  type PortfolioProjectItem,
  ReadingProgressClient,
} from './phase5-clients';

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger';

const CALLOUT_STYLES: Record<
  CalloutVariant,
  { border: string; bg: string; icon: typeof Info }
> = {
  info: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    icon: Info,
  },
  tip: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    icon: CheckCircle2,
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    icon: AlertTriangle,
  },
  danger: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    icon: ShieldAlert,
  },
};

export function Callout({
  variant = 'info',
  title,
  body = '',
  className,
}: {
  variant?: CalloutVariant;
  title?: string;
  body?: string;
  className?: string;
}) {
  const cfg = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.info;
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        'rounded-lg border border-s-4 p-4 text-sm',
        cfg.border,
        cfg.bg,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          {title && <div className="font-semibold">{title}</div>}
          {body && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function Steps({
  items = [],
  className,
}: {
  items?: Array<{ title: string; body?: string }>;
  className?: string;
}) {
  return (
    <ol className={cn('relative ms-3 space-y-6 border-s ps-6', className)}>
      {items.map((step, i) => (
        <li key={i} className="relative">
          <span className="absolute -start-9 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs font-semibold">
            {i + 1}
          </span>
          <h4 className="font-semibold">{step.title}</h4>
          {step.body && (
            <div
              className="mt-1 text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: step.body }}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

export function Kbd({
  keys = '⌘, K',
  className,
}: {
  keys?: string;
  className?: string;
}) {
  const parts = keys
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return (
    <span dir="ltr" className={cn('inline-flex items-center gap-1', className)}>
      {parts.map((key, idx) => (
        <kbd
          key={idx}
          className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium shadow-2xs"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function ApiTable({
  rows = [],
  className,
}: {
  rows?: Array<{
    name: string;
    type: string;
    defaultValue?: string;
    description?: string;
  }>;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-start text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">Prop</th>
            <th className="px-4 py-2.5 text-start font-medium">Type</th>
            <th className="px-4 py-2.5 text-start font-medium">Default</th>
            <th className="px-4 py-2.5 text-start font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="px-4 py-2.5 font-mono text-xs font-medium" dir="ltr">
                {row.name}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-primary" dir="ltr">
                {row.type}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground" dir="ltr">
                {row.defaultValue || '—'}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {row.description || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BeforeAfter(props: {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string;
}) {
  return <BeforeAfterClient {...props} />;
}

export function ReadingProgress(props: { color?: string; height?: number }) {
  return <ReadingProgressClient {...props} />;
}

export function DocsSidebar(props: {
  items?: DocsTreeItem[];
  currentHref?: string;
  title?: string;
}) {
  return <DocsSidebarClient {...props} />;
}

export function DocsPager({
  prev,
  next,
  className,
}: {
  prev?: { title: string; href: string } | null;
  next?: { title: string; href: string } | null;
  className?: string;
}) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="Documentation pagination"
      className={cn(
        'mt-10 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2',
        className
      )}
    >
      {prev ? (
        <a
          href={prev.href}
          className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Previous</div>
            <div className="truncate font-medium">{prev.title}</div>
          </div>
        </a>
      ) : (
        <div />
      )}
      {next && (
        <a
          href={next.href}
          className="flex items-center justify-end gap-3 rounded-lg border p-4 text-end transition-colors hover:bg-muted"
        >
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Next</div>
            <div className="truncate font-medium">{next.title}</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        </a>
      )}
    </nav>
  );
}

export function DocSearch(props: {
  placeholder?: string;
  locale?: string;
  siteId?: string;
  staticEntries?: Array<{ title: string; href: string; excerpt?: string }>;
}) {
  return <DocSearchClient {...props} />;
}

export function PortfolioGrid(props: {
  projects?: PortfolioProjectItem[];
  columns?: number;
}) {
  return <PortfolioGridClient {...props} />;
}

export function ProjectMeta({
  client,
  year,
  role,
  services,
  liveUrl,
  className,
}: {
  client?: string;
  year?: string;
  role?: string;
  services?: string;
  liveUrl?: string;
  className?: string;
}) {
  const entries = [
    { label: 'Client', value: client },
    { label: 'Year', value: year, ltr: true },
    { label: 'Role', value: role },
    { label: 'Services', value: services },
  ].filter((e) => Boolean(e.value));

  return (
    <aside
      className={cn(
        'space-y-4 rounded-xl border bg-card p-5 text-sm',
        className
      )}
    >
      <dl className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.label}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {entry.label}
            </dt>
            <dd
              dir={entry.ltr ? 'ltr' : undefined}
              className="mt-0.5 font-medium"
            >
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <span>Visit live site</span>
          <ExternalLink className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </a>
      )}
    </aside>
  );
}
