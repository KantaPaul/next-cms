//These are the important styles to make sticky column pinning work!
//Apply styles like this using your CSS strategy of choice with this kind of logic to head cells, data cells, footer cells, etc.

import type { Column } from '@tanstack/react-table';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils/cn';

export function usePinningStyles() {
  const isMobile = useMediaQuery('(max-width: 767px)');

  //View the index.css file for more needed styles such as border-collapse: separate
  function getCommonPinningStyles<T>(column: Column<T>): React.CSSProperties {
    const isPinned = column.getIsPinned();

    return {
      // boxShadow: isLastLeftPinnedColumn
      //   ? '-4px 0 4px -4px gray inset'
      //   : isFirstRightPinnedColumn
      //     ? '4px 0 4px -4px gray inset'
      //     : undefined,
      left: isPinned === 'left' && !isMobile ? `${column.getStart('left')}px` : undefined,
      right: isPinned === 'right' && !isMobile ? `${column.getAfter('right')}px` : undefined,
      opacity: isPinned ? 0.95 : 1,
      width: column.getSize(),
      zIndex: isPinned ? 1 : 0,
      // backgroundColor: isPinned ? '#fff' : 'transparent',
    };
  }

  //View the index.css file for more needed styles such as border-collapse: separate
  function getPinnedColumnStyles<T>(column: Column<T>): string {
    const isPinned = column.getIsPinned();

    return cn(
      // isPinned && 'bg-white dark:bg-dark-50',
      // sticky cell border
      isPinned ? 'relative md:sticky' : 'relative',
      isPinned &&
        'before:absolute before:top-0 before:h-full before:w-[1px] before:bg-border before:content-[""]',
      isPinned === 'left' && 'before:-right-px',
      isPinned === 'right' && 'before:-left-px',
      // sticky cell bg color
      isPinned && 'after:-z-[1] after:absolute after:bg-card',
      isPinned && 'after:top-[1px] after:right-0 after:bottom-0 after:left-0'
    );
  }

  return {
    isMobile,
    getPinnedColumnStyles,
    getCommonPinningStyles,
  };
}
