import { useEffect, useState } from 'react';

/**
 * Tracks whether the viewport is below the Tailwind `md` breakpoint (768px).
 * Used for layout decisions that CSS alone cannot express (e.g. number of
 * months rendered inside a calendar popover).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
