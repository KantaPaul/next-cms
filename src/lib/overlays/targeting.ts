import type {
  OverlaySettings,
  OverlayTargeting,
  PathRule,
} from './types';

export type TargetingContext = {
  pathname: string;
  userState?: 'guest' | 'logged-in';
  entity?: {
    type?: string;
    id?: string;
    slug?: string;
  };
  now?: Date | string | number;
};

export type Targetable =
  | OverlaySettings
  | {
      targeting: OverlayTargeting;
      enabled?: boolean;
      startsAt?: string;
      endsAt?: string;
    }
  | {
      include?: PathRule[];
      exclude?: PathRule[];
      userState?: 'all' | 'guest' | 'logged-in';
      enabled?: boolean;
      startsAt?: string;
      endsAt?: string;
    };

function normalizePath(p: string): string {
  if (!p) return '/';
  const clean = p.startsWith('/') ? p : `/${p}`;
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

export function matchesRule(rule: PathRule, ctx: TargetingContext): boolean {
  if (!rule) return false;
  const path = normalizePath(ctx.pathname);

  switch (rule.kind) {
    case 'all':
      return true;

    case 'exact': {
      const target = normalizePath(rule.value);
      return path === target;
    }

    case 'prefix': {
      const prefix = normalizePath(rule.value);
      if (prefix === '/') return true;
      return path === prefix || path.startsWith(`${prefix}/`);
    }

    case 'post-type':
      return Boolean(ctx.entity?.type && ctx.entity.type === rule.value);

    case 'entity':
      return Boolean(
        (ctx.entity?.id && ctx.entity.id === rule.value) ||
          (ctx.entity?.slug && ctx.entity.slug === rule.value)
      );

    default:
      return false;
  }
}

export function isWithinSchedule(
  schedule: { enabled?: boolean; startsAt?: string; endsAt?: string },
  now?: Date | string | number
): boolean {
  if (schedule.enabled === false) return false;
  const current = now !== undefined ? new Date(now).getTime() : Date.now();

  if (schedule.startsAt) {
    const start = new Date(schedule.startsAt).getTime();
    if (!Number.isNaN(start) && current < start) return false;
  }

  if (schedule.endsAt) {
    const end = new Date(schedule.endsAt).getTime();
    if (!Number.isNaN(end) && current > end) return false;
  }

  return true;
}

/**
 * Pure evaluator for overlay page targeting, user state, schedule, and include/exclude rules.
 * Exclude rules always take precedence over include rules.
 */
export function matchTargeting(
  target: Targetable,
  ctx: TargetingContext
): boolean {
  // 1. Schedule check
  const enabled = 'enabled' in target ? target.enabled : true;
  const startsAt = 'startsAt' in target ? target.startsAt : undefined;
  const endsAt = 'endsAt' in target ? target.endsAt : undefined;

  if (!isWithinSchedule({ enabled, startsAt, endsAt }, ctx.now)) {
    return false;
  }

  // 2. Targeting extraction
  const targeting: OverlayTargeting =
    'targeting' in target && target.targeting
      ? target.targeting
      : {
          include: ('include' in target ? target.include : undefined) ?? [
            { kind: 'all', value: '' },
          ],
          exclude: ('exclude' in target ? target.exclude : undefined) ?? [],
          userState:
            ('userState' in target ? target.userState : undefined) ?? 'all',
          devices: ['desktop', 'tablet', 'mobile'],
        };

  // 3. User state check
  if (targeting.userState && targeting.userState !== 'all') {
    const currentUser = ctx.userState ?? 'guest';

    if (targeting.userState !== currentUser) {
      return false;
    }
  }

  // 4. Exclude rules take precedence!
  if (targeting.exclude && targeting.exclude.length > 0) {
    for (const rule of targeting.exclude) {
      if (matchesRule(rule, ctx)) {
        return false;
      }
    }
  }

  // 5. Include rules
  if (!targeting.include || targeting.include.length === 0) {
    return true;
  }

  return targeting.include.some(rule => matchesRule(rule, ctx));
}
