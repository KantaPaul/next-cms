import isEmpty from 'lodash/isEmpty';
import { ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';

import { ActionDropdown, ActionDropdownItem } from '@/components/atoms/action-dropdown';
import type { Option } from '@/components/atoms/react-select';
import { focusRing } from '@/components/atoms/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { ButtonProps } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
// import { Button, type ButtonProps } from './button';

interface BaseProps extends ButtonProps {
  text?: string;
  className?: string;
  textClassName?: string;
}

type SingleLinkProps = BaseProps & {
  href: string;
  options?: never;
};

type MultipleOptionsProps = BaseProps & {
  href?: never;
  options: Option[];
};

type CreateButtonProps = SingleLinkProps | MultipleOptionsProps;

export default function CreateButton({
  href,
  className,
  textClassName,
  text = 'Create New',
  options,
  ...rest
}: CreateButtonProps) {
  const buttonContent = (
    <Button className="cursor-pointer gap-1 px-3" {...rest}>
      <Plus className="size-5" />
      <span className={cn(textClassName)}>{text}</span>
      {!isEmpty(options) && <ChevronDown className="size-5" />}
    </Button>
  );

  if (href) {
    return (
      <Link href={href} className={cn(focusRing, className)}>
        {buttonContent}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className={cn(
          'ml-5 min-w-48 border-steel-100 p-0 shadow-md dark:border-dark-300 dark:bg-dark-200'
        )}
      >
        {options?.map((option) => (
          <ActionDropdownItem key={option.value} href={option.value} label={option.label} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
