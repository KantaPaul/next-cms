'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import type { User } from '@/db/schema';
import { MenuTrigger } from '@/components/molecules/auth-dropdown/menu-trigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/server/actions/auth.actions';

export default function AuthDropdown({ user }: { user: User }) {
  const [isPending, startTransition] = React.useTransition();

  function handleLogOut() {
    startTransition(async () => {
      const result = await signOut();
      if (result?.error) {
        console.error('Logout error:', result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MenuTrigger user={user} isLoading={isPending} className="cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogOut}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
