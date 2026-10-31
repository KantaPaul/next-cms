'use client';

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils/cn';

export type HeaderShellProps = {
  sticky?: 'off' | 'always' | 'scroll-up';
  transparent?: boolean;
  shrinkOnScroll?: boolean;
  hideOnScrollDown?: boolean;
  shadow?: 'none' | 'on-scroll' | 'always';
  zIndex?: number;
  className?: string;
  children: ReactNode;
};

export function HeaderShell({
  sticky = 'off',
  transparent = false,
  shrinkOnScroll = false,
  hideOnScrollDown = false,
  shadow = 'none',
  zIndex = 50,
  className,
  children,
}: HeaderShellProps) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (
      sticky === 'off' &&
      !transparent &&
      !shrinkOnScroll &&
      !hideOnScrollDown &&
      shadow !== 'on-scroll'
    ) {
      return;
    }

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrolled = currentScrollY > 20;
      setScrolled(isScrolled);

      const isScrollUpMode = sticky === 'scroll-up';
      if (isScrollUpMode || hideOnScrollDown) {
        if (currentScrollY > 80 && currentScrollY > lastScrollY.current) {
          // Scrolling down
          setHidden(true);
        } else {
          // Scrolling up
          setHidden(false);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [sticky, transparent, shrinkOnScroll, hideOnScrollDown, shadow]);

  const style: CSSProperties = {
    zIndex,
  };

  return (
    <div
      className={cn('site-header-shell', className)}
      data-sticky={sticky}
      data-transparent={transparent ? 'true' : 'false'}
      data-scrolled={scrolled ? 'true' : 'false'}
      data-hidden={hidden ? 'true' : 'false'}
      data-shrink={shrinkOnScroll ? 'true' : 'false'}
      data-shadow={shadow}
      style={style}
    >
      {children}
    </div>
  );
}
