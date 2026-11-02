'use client';

import { Globe, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { MenuTrigger } from '@/components/molecules/auth-dropdown/menu-trigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import type { User } from '@/db/schema';
import { Can } from '@/providers/access.provider';
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
        <MenuTrigger
          user={user}
          isLoading={isPending}
          className="cursor-pointer max-w-80"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={PAGES.DASHBOARD.ACCOUNT} className="cursor-pointer">
            <KeyRound className="mr-2 size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <Can permission={PERMISSIONS.SETTINGS_MANAGE}>
          <DropdownMenuItem asChild>
            <Link href={PAGES.DASHBOARD.SITES} className="cursor-pointer">
              <Globe className="mr-2 size-4" />
              <span>Sites</span>
            </Link>
          </DropdownMenuItem>
        </Can>
        <Can permission={PERMISSIONS.LICENSES_MANAGE}>
          <DropdownMenuItem asChild>
            <Link href={PAGES.DASHBOARD.LICENSES} className="cursor-pointer">
              <ShieldCheck className="mr-2 size-4" />
              <span>Licenses</span>
            </Link>
          </DropdownMenuItem>
        </Can>
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
