/**
 * Hook for preserving scroll position during navigation
 * 
 * This hook saves the scroll position before navigation and restores it
 * when the user navigates back using the browser's back button.
 * 
 * Features:
 * - Saves scroll position per pathname + search params
 * - Restores position when navigating back
 * - Works with browser back/forward buttons
 * - Handles dynamic content loading
 *
 * Note: Intentionally no `beforeunload` listener it blocks back/forward cache
 * (bfcache). Scroll is saved on scroll (throttled), visibility hidden, and unmount.
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

// Store scroll positions globally across component instances
const scrollPositions = new Map<string, ScrollPosition>();

// Maximum age for stored scroll positions (30 minutes)
const MAX_POSITION_AGE = 30 * 60 * 1000;

export function useScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRestoringRef = useRef(false);
  const lastSavedPositionRef = useRef<ScrollPosition | null>(null);

  // Create unique key for current page including query params
  const getPageKey = () => {
    const params = searchParams?.toString();
    return params ? `${pathname}?${params}` : pathname;
  };

  useEffect(() => {
    const pageKey = getPageKey();

    // Clean up old scroll positions
    const cleanupOldPositions = () => {
      const now = Date.now();
      for (const [key, position] of scrollPositions.entries()) {
        if (now - position.timestamp > MAX_POSITION_AGE) {
          scrollPositions.delete(key);
        }
      }
    };

    // Save scroll position
    const saveScrollPosition = () => {
      if (!isRestoringRef.current) {
        const position: ScrollPosition = {
          x: window.scrollX,
          y: window.scrollY,
          timestamp: Date.now()
        };
        scrollPositions.set(pageKey, position);
        lastSavedPositionRef.current = position;
      }
    };

    // Restore scroll position on mount
    const restoreScrollPosition = () => {
      const savedPosition = scrollPositions.get(pageKey);
      
      if (savedPosition) {
        isRestoringRef.current = true;
        
        // Try immediate restoration
        const attemptRestore = () => {
          window.scrollTo({
            left: savedPosition.x,
            top: savedPosition.y,
            behavior: 'instant' as ScrollBehavior
          });
        };

        // Attempt restoration multiple times to handle dynamic content
        attemptRestore();
        
        requestAnimationFrame(() => {
          attemptRestore();
          
          // Final attempt after a short delay for dynamic content
          setTimeout(() => {
            attemptRestore();
            isRestoringRef.current = false;
          }, 100);
        });
      } else {
        // No saved position, scroll to top
        window.scrollTo(0, 0);
      }
    };

    // Clean up old positions periodically
    cleanupOldPositions();

    // Restore on mount
    restoreScrollPosition();

    // Save on scroll with throttling
    let scrollTimeout: NodeJS.Timeout;
    const throttledSave = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 100);
    };

    window.addEventListener('scroll', throttledSave, { passive: true });

    // Save when visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimeout(scrollTimeout);
      saveScrollPosition(); // Save one last time
      window.removeEventListener('scroll', throttledSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, searchParams]);
}
