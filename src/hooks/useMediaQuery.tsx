'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  // Memoize the getMatches function to avoid recreating it on each render
  const getMatches = (): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }

    return false;
  };

  // Use lazy initial state to avoid unnecessary calculations during SSR
  const [matches, setMatches] = useState<boolean>(() => getMatches());

  useEffect(() => {
    // Update matches if query changes
    setMatches(getMatches());

    const matchMedia = window.matchMedia(query);

    // Use standard event listener with fallback for older browsers
    const handler = () => setMatches(matchMedia.matches);

    // Add event listener based on browser support
    matchMedia.addEventListener('change', handler);

    // Clean up event listener on unmount or when query changes
    return () => {
      matchMedia.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}
