import type { CSSProperties } from 'react';

/**
 * Shared card dimensions for homepage and section carousels.
 * Keeps product cards, occasion cards, and season cards visually consistent (UX).
 *
 * - Mobile: ~2 cards visible (width derived from viewport).
 * - Desktop: carousel tiles capped so rows stay scannable; horizontal scroll when many tiles.
 *
 * ``PRODUCT_CARD_LAYOUT_SCALE`` scales carousel / section card widths vs baseline.
 * Set to ``1`` so homepage, PDP similar rows, and best-seller rows match
 * the pre-shrink footprint; PLP density stays governed by grid columns (2–3), not this.
 */

/** Full baseline width carousels and section tiles read at a comfortable size. */
export const PRODUCT_CARD_LAYOUT_SCALE = 1 as const;

const BASE_MIN = 154;
const BASE_MAX = 299;
const BASE_VW_FRAC = 0.4;
const BASE_GAP = 13;

export const SECTION_CARD_GAP_PX = Math.round(BASE_GAP * PRODUCT_CARD_LAYOUT_SCALE);

export const SECTION_CARD_MIN_PX = Math.round(BASE_MIN * PRODUCT_CARD_LAYOUT_SCALE);
export const SECTION_CARD_MAX_PX = Math.round(BASE_MAX * PRODUCT_CARD_LAYOUT_SCALE);

const SECTION_VW_FRAC = BASE_VW_FRAC * PRODUCT_CARD_LAYOUT_SCALE;

/**
 * Inline style for horizontal-scroll section cards (product, occasion, etc.).
 * Use this on the wrapper of each card in ProductSection, OccasionsAccordionSection, etc.
 *
 * Uses clamp so two cards fit narrow phones without forcing page-wide horizontal scroll;
 * caps at SECTION_CARD_MAX_PX on large screens.
 */
export const SECTION_CARD_WIDTH_STYLE: CSSProperties = {
  flex: '0 0 auto',
  width: `clamp(${SECTION_CARD_MIN_PX}px, calc((100vw - 3rem) * ${SECTION_VW_FRAC}), ${SECTION_CARD_MAX_PX}px)`,
};

/**
 * Responsive grid for product cards on full-width pages (For You, gift finder).
 * Matches carousel card max width (SECTION_CARD_MAX_PX) so layouts align with Best Sellers.
 */
export const PRODUCT_CARD_GRID_TEMPLATE_COLUMNS = `repeat(auto-fill, minmax(min(100%, ${SECTION_CARD_MAX_PX}px), 1fr))`;

/**
 * Standard catalog grid: two tiles per row on mobile, three on desktop.
 */
export const PRODUCT_LISTING_GRID_CLASS =
  'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5 xl:gap-3';

/**
 * Single-column PLP layout (centered track). Paired with ``PRODUCT_LISTING_GRID_CLASS`` via view toggle.
 */
export const PRODUCT_LISTING_SINGLE_COLUMN_CLASS =
  'grid grid-cols-1 gap-3 max-w-md mx-auto w-full sm:gap-4';

/**
 * Discovery sets listing: denser multi-column grid than fragrance PLP.
 */
export const DISCOVERY_KIT_LISTING_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-3';

/**
 * Homepage Men’s / Women’s Best Sellers carousels: match ``SECTION_CARD_MAX_PX``
 * and listing ``aspect-[3/2]`` wells for consistent proportions.
 */
export const SECTION_CARD_BEST_SELLERS_MAX_PX = SECTION_CARD_MAX_PX;

/** Pre-scale divisor so fluid width shrinks with ``PRODUCT_CARD_LAYOUT_SCALE``. */
const BEST_SELLERS_DIVISOR = 2.5625 / PRODUCT_CARD_LAYOUT_SCALE;

export const SECTION_CARD_BEST_SELLERS_WIDTH_STYLE: CSSProperties = {
  flex: '0 0 auto',
  width: `clamp(${Math.round(165 * PRODUCT_CARD_LAYOUT_SCALE)}px, calc((100vw - 2.75rem) / ${BEST_SELLERS_DIVISOR}), ${SECTION_CARD_MAX_PX}px)`,
};

/**
 * PDP “Smells similar” / “You may also like” carousel cards.
 * Increased by ~25% so recommendation rows read larger and more prominent.
 */
const PDP_SIMILAR_DIVISOR = 1.83 / PRODUCT_CARD_LAYOUT_SCALE;

export const PDP_SIMILAR_CARD_WIDTH_STYLE: CSSProperties = {
  flex: '0 0 auto',
  width: `clamp(${Math.round(212 * PRODUCT_CARD_LAYOUT_SCALE)}px, calc((100vw - 3.5rem) / ${PDP_SIMILAR_DIVISOR}), ${Math.round(316 * PRODUCT_CARD_LAYOUT_SCALE)}px)`,
};

/**
 * Default horizontal scroll step (~one carousel card + gap) for “similar” rows.
 */
export const PRODUCT_CARD_CAROUSEL_SCROLL_STEP_PX =
  SECTION_CARD_MAX_PX + SECTION_CARD_GAP_PX;
