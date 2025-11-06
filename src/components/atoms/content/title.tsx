import { cn } from '@/lib/utils/cn';
import type { HTMLAttributes, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

declare const titleStyles: {
  as: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
  };
};

type TitleProps = {
  as?: keyof typeof titleStyles.as;
};

const Title = React.forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement> & TitleProps
>(({ as = 'h2', className, children, ...props }, ref) => {
  const Comp = as;
  return (
    <Comp
      ref={ref}
      className={cn(
        'text-steel-700 font-medium dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

Title.displayName = 'Title';

export { Title };
