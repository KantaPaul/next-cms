'use client';

import { type User } from '@/db/schema';
import { Menu, MenuItem, MenuItems, Transition } from '@headlessui/react';
import {
  LogOut
} from 'lucide-react';
import { Fragment, useTransition } from 'react';

import { MenuButton } from '@/components/molecules/auth-dropdown/menu-button';
import { MenuTrigger } from "@/components/molecules/auth-dropdown/menu-trigger";
import { signOut } from '@/server/actions/auth.actions';


export default function AuthDropdown({
  user,
}: {
  user: User;
}) {
  const [isPending, startTransition] = useTransition();

  function handleLogOut() {
    startTransition(async () => {
      const result = await signOut();

      if (result.error) {
        console.error('Logout error:', result.error);
      }
    });
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuTrigger
        user={user}
        isLoading={isPending}
        className="min-w-0 bg-transparent p-0 hover:bg-transparent dark:bg-transparent [&>div>span]:size-7 md:[&>div>span]:size-6"
      />
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 mt-2 flex w-60 origin-top-right flex-col overflow-hidden rounded-md border border-steel-100 bg-white focus:outline-none dark:border-dark-400 dark:bg-dark-280 dark:shadow-[0_3px_18px_rgba(0,0,0,0.1)]">
          <MenuItem>
            <MenuButton className="focus-visible:bg-steel-50" onClick={handleLogOut}>
              <LogOut className="size-5 text-steel-400" />
              <span className="truncate">Sign Out 🏃‍♂️</span>
            </MenuButton>
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
