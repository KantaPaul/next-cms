import { cn } from '@/lib/utils/cn';

const baseClassNames =
  'dark:backdrop-blur focus-visible:transition focus-visible:duration-300';

export const focusRing = cn(
  'ring-offset-background focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-steel-300 focus-visible:ring-offset-2 dark:focus-visible:ring-dark-500',
  baseClassNames
);
export const focusOutline = cn(
  'focus-visible:-outline-offset-2 focus-visible:outline-1 focus-visible:outline-steel-200 dark:focus-visible:outline-dark-400',
  baseClassNames
);
