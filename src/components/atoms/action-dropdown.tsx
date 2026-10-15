'use client';

import { MoreHorizontal, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';
// import { Loader } from 'rizzui';
import type { ButtonProps } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './icons/loader/spinner';

interface ActionDropdownProps {
  variant?: 'horizontal' | 'vertical';
  trigger?: React.ReactNode;
  label?: string;
  className?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  menuClassName?: string;
  triggerProps?: ButtonProps;
}

export function ActionDropdown({
  label,
  trigger,
  isLoading,
  children,
  menuClassName,
  triggerProps,
  variant = 'horizontal',
  className,
}: ActionDropdownProps) {
  const isVertical = variant === 'vertical';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isVertical ? 'ghost' : 'outline'}
          size={isVertical ? 'sm' : triggerProps?.size || 'sm'}
          className={cn('gap-2', className)}
          {...triggerProps}
        >
          {isLoading ? (
            <Spinner />
          ) : trigger ? (
            trigger
          ) : (
            <>
              {isVertical ? (
                <>
                  {label && <span>{label}</span>}
                  <MoreVertical size={18} />
                </>
              ) : (
                <>
                  <MoreHorizontal size={18} />
                  {label && <span>{label}</span>}
                </>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className={cn(
          'min-w-48 divide-y divide-border p-0 shadow-md',
          menuClassName
        )}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ActionDropdownItemProps extends ButtonProps {
  href?: string;
  label?: React.ReactNode;
}

export function ActionDropdownItem({
  label,
  href,
  className,
  children,
  ...rest
}: ActionDropdownItemProps): JSX.Element {
  return (
    <DropdownMenuItem asChild>
      <Button
        {...(href && {
          asChild: true,
        })}
        // size="md"
        variant="ghost"
        {...rest}
        className={cn(
          'w-full cursor-pointer justify-start rounded-none border-0 px-3 py-2 font-normal text-foreground transition first:rounded-t-md last:rounded-b-md focus-visible:ring-0',
          rest?.disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          className
        )}
      >
        {href ? <Link href={href}>{label}</Link> : label}
      </Button>
    </DropdownMenuItem>
  );
}
