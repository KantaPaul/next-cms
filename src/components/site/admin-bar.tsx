'use client';

import {
  AlertTriangle,
  ChevronDown,
  Eye,
  LayoutTemplate,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { ADMIN_BAR_ENDPOINT, ADMIN_BAR_HINT_COOKIE } from '@/lib/admin-bar';
import { cn } from '@/lib/utils/cn';
import { signOut } from '@/server/actions/auth.actions';
import type { AdminBarData } from '@/server/services/admin-bar.service';

type Bar = AdminBarData & { preview: boolean };

const BAR_HEIGHT = '2rem';

const hasHintCookie = () =>
  document.cookie
    .split('; ')
    .some(part => part.startsWith(`${ADMIN_BAR_HINT_COOKIE}=`));

const noopSubscribe = () => () => {};

/**
 * WordPress-style toolbar for signed-in staff on the public site. It renders
 * nothing on the server and for visitors, so cached and exported pages stay
 * identical for everyone; signed-in users load their bar after hydration.
 */
export function AdminBar() {
  const signedIn = useSyncExternalStore(noopSubscribe, hasHintCookie, () => false);
  const pathname = usePathname();
  const [bar, setBar] = useState<Bar | null | undefined>(undefined);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ path: pathname });
    const lang = new URLSearchParams(window.location.search).get('lang');
    if (lang) params.set('lang', lang);
    fetch(`${ADMIN_BAR_ENDPOINT}?${params}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(res => (res.ok ? res.json() : { bar: null }))
      .then((data: { bar: Bar | null }) => setBar(data.bar))
      .catch(error => {
        if (error?.name !== 'AbortError') setBar(null);
      });
    return () => controller.abort();
  }, [signedIn, pathname]);

  const visible = signedIn && bar !== null;

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.style.setProperty('--cms-admin-bar-h', BAR_HEIGHT);

    return () => {
      root.style.removeProperty('--cms-admin-bar-h');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div aria-hidden style={{ height: BAR_HEIGHT }} />
      <div
        role="navigation"
        aria-label="Admin toolbar"
        className="cms-admin-bar fixed inset-x-0 top-0 z-[1000] flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900 px-2 text-[13px] leading-none text-zinc-100 shadow-sm"
        style={{ height: BAR_HEIGHT }}
      >
        {bar ? <BarContents bar={bar} /> : null}
      </div>
    </>
  );
}

function BarContents({ bar }: { bar: Bar }) {
  const { links, edit } = bar;
  const newItems = [
    links.newPage && { href: links.newPage, label: 'Page' },
    links.newPost && { href: links.newPost, label: 'Post' },
  ].filter(Boolean) as { href: string; label: string }[];

  const quickLinks = (
    <>
      {edit && (
        <BarLink href={edit.href} icon={<Pencil className="size-3.5" />}>
          {edit.label}
        </BarLink>
      )}
      {links.siteTemplates && (
        <BarLink
          href={links.siteTemplates}
          icon={<LayoutTemplate className="size-3.5" />}
        >
          Site templates
        </BarLink>
      )}
      {links.settings && (
        <BarLink href={links.settings} icon={<Settings className="size-3.5" />}>
          Settings
        </BarLink>
      )}
    </>
  );

  return (
    <>
      <div className="flex min-w-0 items-center gap-0.5">
        <BarLink href={links.dashboard} className="max-w-[40vw] font-semibold">
          <span className="truncate">{bar.siteName}</span>
        </BarLink>
        {newItems.length > 0 && (
          <Dropdown
            label="New"
            trigger={
              <>
                <Plus className="size-3.5" />
                <span>New</span>
              </>
            }
          >
            {newItems.map(item => (
              <MenuLink key={item.href} href={item.href}>
                {item.label}
              </MenuLink>
            ))}
          </Dropdown>
        )}
        <div className="hidden items-center gap-0.5 md:flex">{quickLinks}</div>
        {bar.preview && (
          <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-400 px-1.5 py-1 text-[11px] font-semibold text-amber-950">
            <Eye className="size-3" />
            Preview / Draft
          </span>
        )}
        {bar.siteMode && bar.siteMode !== 'live' && (
          <a
            href={links.settings ?? links.dashboard}
            className="ml-1 inline-flex items-center gap-1 rounded bg-rose-500/90 px-1.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
          >
            <AlertTriangle className="size-3" />
            {bar.siteMode === 'coming_soon'
              ? 'Coming soon mode is on'
              : 'Maintenance mode is on'}
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {(edit || links.siteTemplates || links.settings) && (
          <div className="md:hidden">
            <Dropdown
              label="More links"
              align="right"
              trigger={({ open }) =>
                open ? <X className="size-4" /> : <Menu className="size-4" />
              }
              hideChevron
            >
              <div className="flex flex-col">{quickLinks}</div>
            </Dropdown>
          </div>
        )}
        <UserMenu bar={bar} />
      </div>
    </>
  );
}

function UserMenu({ bar }: { bar: Bar }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dropdown
      label="Account"
      align="right"
      trigger={
        <>
          <UserRound className="size-3.5" />
          <span className="hidden max-w-[12rem] truncate sm:inline">
            {bar.user.name}
          </span>
        </>
      }
    >
      <div className="border-b border-white/10 px-3 py-2">
        <p className="truncate font-medium">{bar.user.name}</p>
        <p className="truncate text-xs text-zinc-400">{bar.user.email}</p>
      </div>
      <MenuLink href={bar.links.account}>Profile / Account</MenuLink>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await signOut()))}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none disabled:opacity-60"
      >
        <LogOut className="size-3.5" />
        {pending ? 'Logging out…' : 'Log out'}
      </button>
    </Dropdown>
  );
}

const itemClass =
  'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm px-2 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none';

function BarLink({
  href,
  icon,
  className,
  children,
}: {
  href: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  // Plain anchors: the dashboard is a separate app shell, not a client transition.
  return (
    <a href={href} className={cn(itemClass, 'min-w-0', className)}>
      {icon}
      {children}
    </a>
  );
}

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
    >
      {children}
    </a>
  );
}

function Dropdown({
  label,
  trigger,
  align = 'left',
  hideChevron,
  children,
}: {
  label: string;
  trigger: ReactNode | ((state: { open: boolean }) => ReactNode);
  align?: 'left' | 'right';
  hideChevron?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={cn(itemClass, open && 'bg-white/10')}
      >
        {typeof trigger === 'function' ? trigger({ open }) : trigger}
        {!hideChevron && <ChevronDown className="size-3 opacity-70" />}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute top-full mt-px min-w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-b-md border border-white/10 bg-zinc-900 py-1 text-zinc-100 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
