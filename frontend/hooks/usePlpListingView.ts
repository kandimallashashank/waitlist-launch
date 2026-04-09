'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PLP_LISTING_VIEW_STORAGE_KEY,
  parsePlpListingViewMode,
  type PlpListingViewMode,
} from '@/lib/plpListingView';
import {
  DISCOVERY_KIT_LISTING_GRID_CLASS,
  PRODUCT_LISTING_GRID_CLASS,
  PRODUCT_LISTING_SINGLE_COLUMN_CLASS,
} from '@/lib/sectionCardSizes';

/**
 * Shared catalog layout: multi-column grid vs one column (persisted in ``localStorage``).
 *
 * Returns:
 *     mode: Current layout mode.
 *     setMode: Updates mode and persists.
 *     productGridClassName: Tailwind classes for fragrance/product PLPs.
 *     discoveryKitsGridClassName: Tailwind classes for discovery kit grids.
 */
export function usePlpListingView(): {
  mode: PlpListingViewMode;
  setMode: (next: PlpListingViewMode) => void;
  productGridClassName: string;
  discoveryKitsGridClassName: string;
} {
  const [mode, setModeState] = useState<PlpListingViewMode>('grid');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLP_LISTING_VIEW_STORAGE_KEY);
      setModeState(parsePlpListingViewMode(raw));
    } catch {
      // Ignore quota / private mode.
    }
  }, []);

  const setMode = useCallback((next: PlpListingViewMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(PLP_LISTING_VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore.
    }
  }, []);

  const productGridClassName =
    mode === 'grid' ? PRODUCT_LISTING_GRID_CLASS : PRODUCT_LISTING_SINGLE_COLUMN_CLASS;

  const discoveryKitsGridClassName =
    mode === 'grid' ? DISCOVERY_KIT_LISTING_GRID_CLASS : PRODUCT_LISTING_SINGLE_COLUMN_CLASS;

  return { mode, setMode, productGridClassName, discoveryKitsGridClassName };
}
