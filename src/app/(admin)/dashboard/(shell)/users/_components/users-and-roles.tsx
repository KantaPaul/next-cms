'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Check, Loader2, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  type RoleName,
} from '@/config/permissions';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { setUserRole } from '../_modules/users.actions';
import type { UserListItem } from '../_modules/users.service';

type ActivityRow = {
  id: string;
  action: string;
  targetType: string;
  targetName: string | null;
  details: string | null;
  createdAt: Date;
  actor: { name: string | null; email: string; image: string | null } | null;
};

const controlClass =
  'h-9 rounded-md border border-steel-200 bg-white px-2 text-sm dark:border-dark-300 dark:bg-dark-100';

const ROLE_STYLES: Record<RoleName, string> = {
  Admin: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Editor:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  Author:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Viewer: 'bg-steel-100 text-steel-600 dark:bg-dark-200 dark:text-steel-300',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  publish: 'published',
  unpublish: 'unpublished',
  delete: 'deleted',
  restore: 'restored',
  review_requested: 'submitted for review',
  settings_change: 'changed settings',
  media_upload: 'uploaded',
  role_change: 'changed the role of',
  revoke: 'revoked',
};

const humanizeTarget = (type: string) => type.replace(/_/g, ' ');

export function UsersAndRoles({
  currentUserId,
  users,
  activity,
}: {
  currentUserId: string;
  users: UserListItem[];
  activity: ActivityRow[];
}) {
  return (
    <Tabs defaultValue="team">
      <TabsList>
        <TabsTrigger value="team">Team ({users.length})</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
        <TabsTrigger value="activity">Activity log</TabsTrigger>
      </TabsList>
      <TabsContent value="team" className="mt-4">
        <TeamTable users={users} currentUserId={currentUserId} />
      </TabsContent>
      <TabsContent value="permissions" className="mt-4">
        <PermissionMatrix />
      </TabsContent>
      <TabsContent value="activity" className="mt-4">
        <ActivityLog rows={activity} />
      </TabsContent>
    </Tabs>
  );
}

function Avatar({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = (name || email).slice(0, 2).toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-steel-200 text-xs font-semibold text-steel-700 dark:bg-dark-300 dark:text-steel-200">
      {initials}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const known =
    role && (ROLE_NAMES as readonly string[]).includes(role)
      ? (role as RoleName)
      : null;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        known
          ? ROLE_STYLES[known]
          : 'bg-steel-100 text-steel-500 dark:bg-dark-200'
      )}
    >
      {role ?? 'No role'}
    </span>
  );
}

function TeamTable({
  users,
  currentUserId,
}: {
  users: UserListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const changeRole = async (user: UserListItem, role: RoleName) => {
    setPendingId(user.id);
    await handleActionResponse(setUserRole({ userId: user.id, role }), () => {
      toast.success(
        `${user.name || user.email} is now ${role === 'Admin' || role === 'Author' ? 'an' : 'a'} ${role}`
      );
      router.refresh();
    });
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-steel-500">
        People join by signing in with Google. The first account becomes Admin,
        everyone after starts as Viewer until an admin assigns a role.
      </p>
      <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500 dark:bg-dark-100">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-200 dark:divide-dark-300">
            {users.map(user => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user.name}
                        email={user.email}
                        image={user.image}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {user.name || user.email}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-steel-500">
                              (you)
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-steel-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Role for ${user.name || user.email}`}
                          className={controlClass}
                          value={user.role ?? ''}
                          disabled={pendingId === user.id}
                          onChange={e =>
                            changeRole(user, e.target.value as RoleName)
                          }
                        >
                          {!user.role && <option value="">No role</option>}
                          {ROLE_NAMES.map(role => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        {pendingId === user.id && (
                          <Loader2 className="size-4 animate-spin text-steel-400" />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel-500">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionMatrix() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-steel-500">
        What each role can do. The server enforces these on every action.
      </p>
      <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-steel-50 text-xs dark:bg-dark-100">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wide text-steel-500">
                Permission
              </th>
              {ROLE_NAMES.map(role => (
                <th key={role} className="px-4 py-2.5 text-center font-medium">
                  <RoleBadge role={role} />
                  <div className="mt-1 text-[11px] font-normal normal-case text-steel-500">
                    {ROLE_DESCRIPTIONS[role]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-200 dark:divide-dark-300">
            {PERMISSION_MATRIX.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-2.5">
                  <div>{row.label}</div>
                  <code className="text-[11px] text-steel-500">{row.key}</code>
                </td>
                {ROLE_NAMES.map(role => (
                  <td key={role} className="px-4 py-2.5 text-center">
                    {row.roles[role] ? (
                      <Check
                        className="mx-auto size-4 text-emerald-600"
                        aria-label={`${role}: allowed`}
                      />
                    ) : (
                      <Minus
                        className="mx-auto size-4 text-steel-300"
                        aria-label={`${role}: not allowed`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLog({ rows }: { rows: ActivityRow[] }) {
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');

  const types = useMemo(
    () => [...new Set(rows.map(r => r.targetType))].sort(),
    [rows]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      r =>
        (type === 'all' || r.targetType === type) &&
        (!q ||
          [r.targetName, r.details, r.actor?.name, r.actor?.email].some(v =>
            v?.toLowerCase().includes(q)
          ))
    );
  }, [rows, type, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          aria-label="Search activity"
          placeholder="Search by name, item, or detail"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={cn(controlClass, 'w-full px-3 sm:w-72')}
        />
        <select
          aria-label="Filter by item type"
          value={type}
          onChange={e => setType(e.target.value)}
          className={controlClass}
        >
          <option value="all">All items</option>
          {types.map(t => (
            <option key={t} value={t}>
              {humanizeTarget(t)}
            </option>
          ))}
        </select>
        <span className="text-xs text-steel-500">
          Showing the latest {rows.length} events
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-steel-300 p-8 text-center text-sm text-steel-500 dark:border-dark-300">
          {rows.length
            ? 'No activity matches these filters.'
            : 'No activity yet.'}
        </p>
      ) : (
        <ol className="divide-y divide-steel-200 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {filtered.map(row => (
            <li
              key={row.id}
              className="flex items-start gap-3 px-4 py-3 text-sm"
            >
              {row.actor ? (
                <Avatar
                  name={row.actor.name}
                  email={row.actor.email}
                  image={row.actor.image}
                />
              ) : (
                <Avatar name="System" email="system" image={null} />
              )}
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-medium">
                    {row.actor?.name || row.actor?.email || 'System'}
                  </span>{' '}
                  {ACTION_LABELS[row.action] ?? row.action}{' '}
                  {humanizeTarget(row.targetType)}{' '}
                  {row.targetName && (
                    <span className="font-medium">“{row.targetName}”</span>
                  )}
                </p>
                {row.details && (
                  <p className="mt-0.5 text-xs text-steel-500">{row.details}</p>
                )}
              </div>
              <time
                dateTime={new Date(row.createdAt).toISOString()}
                title={format(new Date(row.createdAt), 'PPpp')}
                className="shrink-0 text-xs text-steel-500"
              >
                {formatDistanceToNow(new Date(row.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
