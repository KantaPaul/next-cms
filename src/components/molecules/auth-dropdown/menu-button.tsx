import { forwardRef } from 'react';

import { cn } from '@/lib/utils/cn';

interface MenuButtonType extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonType>(
  ({ children, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative flex min-h-[32px] w-full cursor-pointer select-none items-center justify-start gap-3 px-4 py-2.5 text-sm text-steel-700 transition-colors hover:bg-steel-50 dark:text-steel-100 dark:hover:bg-dark-400/60',
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
MenuButton.displayName = 'MenuButton';
