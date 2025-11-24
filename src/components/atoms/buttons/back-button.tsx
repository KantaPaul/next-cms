'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface BackButtonType extends ButtonProps {
  text?: string;
  href?: string;
  isLoading?: boolean;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonType>(
  ({ text = 'Back', href, className, isLoading = false, ...rest }, ref) => {
    const router = useRouter();

    const buttonContent = (
      <>
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
        <span className={cn('inline-block')}>{text}</span>
      </>
    );

    return (
      <Button
        ref={ref}
        variant="ghost"
        {...(href
          ? {
              asChild: true,
            }
          : {
              onClick: () => router.back(),
            })}
        className={cn('w-auto gap-2', className)}
        disabled={isLoading}
        {...rest}
      >
        {href ? <Link href={href}>{buttonContent}</Link> : buttonContent}
      </Button>
    );
  }
);
BackButton.displayName = 'BackButton';
