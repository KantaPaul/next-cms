'use client';

import { Box, Flex } from '@/components/atoms/layout';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils/cn';

interface StickyFooterProps {
  className?: string;
  childrenClassName?: string;
  children?: React.ReactNode;
}

export function StickyFooter({
  className,
  children,
  childrenClassName,
}: StickyFooterProps) {
  const { state } = useSidebar();
  return (
    <Box
      className={cn(
        'sticky-footer fixed end-0 bottom-0 z-[10001] w-full border-border border-t bg-background px-5 py-4 md:px-5 lg:shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.06)] xl:px-8',
        // following width is based on sidebar size and main content padding
        state === 'expanded'
          ? 'xl:w-[calc(100%-var(--sidebar-width))]'
          : 'w-[calc(100%-var(--sidebar-width-icon))]',
        className
      )}
    >
      <Flex
        align="center"
        justify="end"
        className={cn(
          'innerWrapper 5xl:custom-container mx-auto w-full',
          childrenClassName
        )}
      >
        {children}
      </Flex>
    </Box>
  );
}
