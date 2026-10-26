import type { JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { titleCase } from '@/lib/utils/title-case';

/**
 * The `defaultColors` object maps status values to CSS class names.
 * Extend it with your custom status and corresponding color.
 */

export const statusColors = {
  success:
    'bg-[#C7EFD5] text-[#2C573F] dark:bg-green-custom/30 dark:text-green-custom',
  warning:
    'bg-[#bb800926] text-[#d29922] dark:bg-orange-custom/30 dark:text-orange-custom',
  danger:
    'bg-[rgba(208,82,84,0.15)] text-red-custom dark:bg-[rgba(242,27,105,0.30)]',
  neutral:
    'bg-steel-300/30 text-steel-600 dark:bg-yellow-custom/30 dark:text-yellow-custom',
  indigo:
    'bg-indigo-300/30 text-steel-600 dark:bg-yellow-custom/30 dark:text-yellow-custom',
};

export const statusColorMaps = {
  // Boolean
  true: statusColors.success,
  false: statusColors.danger,

  // Success states
  paid: statusColors.success,
  active: statusColors.success,
  approved: statusColors.success,
  running: statusColors.success,
  published: statusColors.success,
  automatic: statusColors.success,
  connected: statusColors.success,
  completed: statusColors.success,
  posted: statusColors.success,
  present: statusColors.success,
  assigned: statusColors.success,
  rule_matched: statusColors.success,
  rule_applied: statusColors.success,
  default: statusColors.success,
  selected: statusColors.success,
  finished: statusColors.success,
  accepted: statusColors.success,
  delivered: statusColors.success,
  fully_applied: statusColors.success,
  awarded: statusColors.success,
  evaluated: statusColors.success,
  strong: statusColors.success,

  // Warning states
  due: statusColors.warning,
  pending: statusColors.warning,
  evaluation_pending: statusColors.warning,
  medium: statusColors.warning,
  absent: statusColors.warning,
  awaiting_approval: statusColors.warning,
  awaiting_for_approval: statusColors.warning,

  // Danger states
  disabled: statusColors.danger,
  disconnected: statusColors.danger,
  rejected: statusColors.danger,
  canceled: statusColors.danger,
  cancelled: statusColors.danger,
  closed: statusColors.danger,
  failed: statusColors.danger,
  high: statusColors.danger,
  returned: statusColors.danger,
  declined: statusColors.danger,
  critical: statusColors.danger,
  overdue: statusColors.danger,
  terminated: statusColors.danger,
  over_applied: statusColors.danger,
  overpaid: statusColors.danger,
  weak: statusColors.danger,

  // Neutral states
  inactive: statusColors.neutral,
  archive: statusColors.neutral,
  archived: statusColors.neutral,
  applied: statusColors.neutral,
  unposted: statusColors.neutral,
  low: statusColors.neutral,
  planned: statusColors.neutral,
  offered: statusColors.neutral,

  // Indigo states
  shipped: statusColors.indigo,

  // Custom colors
  draft: 'bg-[#EEDFC9]/60 text-[#462D15]',
  partially_delivered:
    'bg-[#FFF3CD] text-[#856404] dark:bg-[#664D03]/30 dark:text-[#FFDF7E]',
  out_for_delivery:
    'bg-[#CCE5FF] text-[#004085] dark:bg-blue-custom/20 dark:text-blue-custom',
  in_progress:
    'bg-[#CCE5FF] text-[#004085] dark:bg-blue-custom/20 dark:text-blue-custom',
  refunded:
    'bg-[#E2D9F3] text-[#6F42C1] dark:bg-purple-custom/50 dark:text-purple-custom',
};

export type StatusType = keyof typeof statusColorMaps;

interface StatusBadgeProps {
  status: string | null;
  className?: string;
  statusColor?: keyof typeof statusColorMaps;
}

export function StatusBadge({
  status,
  className,
  statusColor,
}: StatusBadgeProps): JSX.Element {
  if (!status) return <></>;

  const color = statusColor
    ? statusColorMaps[statusColor]
    : statusColorMaps[status?.toLowerCase() as keyof typeof statusColorMaps] ||
      '';

  return (
    <Badge
      // variant="flat"
      className={cn(
        'h-6 rounded px-3 py-px text-[13px] leading-none',
        color,
        className
      )}
    >
      {titleCase(status)}
    </Badge>
  );
}
