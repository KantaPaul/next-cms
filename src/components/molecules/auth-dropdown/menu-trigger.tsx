'use client';

import * as React from 'react';
import Avatar from '@/components/atoms/avatar';
import { Flex } from '@/components/atoms/layout';
import type { User } from '@/db/schema';
import { cn } from '@/lib/utils/cn';
import { ChevronsUpDown, Loader2 } from 'lucide-react';

export const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    user: User;
    isLoading?: boolean;
  }
>(({ className, user, isLoading, ...props }, ref) => {
  const userAvatar = user?.image;

  return (
    <button
      ref={ref}
      type="button"
      disabled={isLoading}
      className={cn(
        'flex h-10 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Logging Out
        </span>
      ) : (
        <Flex align="center" className="gap-2">
          <Avatar
            src={userAvatar}
            name={user?.name}
            className="[&>div]:size-6 [&>span]:size-6 [&>span]:text-xs"
          />
          <span className="hidden shrink-0 font-medium md:flex">{user?.name}</span>
          <ChevronsUpDown className="ml-auto hidden size-4 opacity-50 md:flex" />
        </Flex>
      )}
    </button>
  );
});

MenuTrigger.displayName = 'MenuTrigger';
