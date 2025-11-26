'use client';

import { MenuButton } from '@headlessui/react';

import Avatar from '@/components/atoms/avatar';
import { cn } from '@/lib/utils/cn';
import { ChevronsUpDown, Ellipsis, Loader2 } from 'lucide-react';
import type { User } from '@/db/schema';
import { Flex } from '@/components/atoms/layout';

// import { ChevronDownIcon } from '@heroicons/react/24/solid';

export const MenuTrigger = ({
  className,
  user,
  isLoading,
}: {
  className?: string;
  user: User;
  isLoading?: boolean;
}) => {
  const userAvatar = user?.image;

  return (
    <MenuButton
      disabled={isLoading}
      className={cn(
        'dark:bg-dark-300 h-10 gap-3 bg-slate-50 px-3',
        className,
        isLoading
          ? 'hover:bg-steel-50 dark:hover:bg-dark-300'
          : 'hover:bg-steel-100 dark:hover:bg-dark-400'
      )}
    >
      {isLoading ? (
        <span className="progressive-dots flex items-center">
          <Loader2 className="me-1.5 animate-spin" size={18} /> Logging Out
        </span>
      ) : (
        <Flex>
          <Avatar
            src={userAvatar}
            name={user?.name}
            className="[&>div]:size-6 [&>span]:size-6 [&>span]:text-base"
          />
          <span className="hidden shrink-0 md:flex">{user?.name}</span>
          <ChevronsUpDown className="ml-auto hidden size-4 md:flex" />
        </Flex>
      )}

      {/* <Text className="whitespace-nowrap">{titleCase(user.name)}</Text>
      <Avatar
        src={userAvatar}
        name={user?.name}
        className="[&>span]:h-6 [&>span]:w-6 [&>span]:text-base"
      /> */}
      {/* <Avatar
        name={user?.name ?? 'User'}
        src={userAvatar}
        // className="w-6 h-6 text-lg"
        className="[&>span]:h-6 [&>span]:w-6 [&>span]:text-base"
      /> */}
      {/* <ChevronDownIcon className="w-5 h-5 text-steel-400" aria-hidden="true" /> */}
    </MenuButton>
  );
};
