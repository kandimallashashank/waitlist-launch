/**
 * Shared visuals for product tiles (aligned with `ForYouStyleProductCard` / For You page).
 * Use on any perfume bottle image well so grids and carousels feel consistent.
 *
 * Design: warm cream studio “spotlight” lighter behind the bottle, slightly deeper at edges.
 */
export const PRODUCT_IMAGE_WELL_CLASS =
  "bg-[radial-gradient(ellipse_85%_72%_at_50%_42%,#fdfbf7_0%,#f4ece2_48%,#ebe0d4_100%)]";

/**
 * PLP / carousel / section rows: landscape well. Uses 5:4 so the image area is ~20% taller
 * than 3:2 at the same width (uniform card footprint with truncated titles).
 */
export const PRODUCT_CARD_LISTING_IMAGE_ASPECT_CLASS = "aspect-[5/4]";

/**
 * Warm full-page background for cart, checkout, order success, discovery detail, etc.
 * Product detail (`app/product/[id]`) uses `bg-white` for a clean PDP canvas.
 */
export const PRODUCT_PAGE_BACKGROUND_CLASS =
  "bg-gradient-to-b from-[#FAFAF9] via-[#F6F5F4] to-[#F0EFED]";

/** Softer listing border used on For You cards; optional for shop grids. */
export const PRODUCT_CARD_BORDER_CLASS = "border-[#E4E3E1]";

/**
 * Unified product typography Inter (`font-sans`, same as `<body>`) for names and prices;
 * Poppins (`font-display`) reserved for marketing feature tiles below.
 */

/** Brand line above product name (Inter, subtle matches PLP / For You). */
export const PRODUCT_CARD_BRAND_CLASS =
  "font-sans truncate text-[10px] text-neutral-400 sm:text-xs";

/**
 * Product title on compact cards (carousel, PDP similar / recently viewed).
 * Avoid ``group-hover`` so nested tiles are not tinted when a parent carousel uses ``group``.
 */
export const PRODUCT_CARD_TITLE_COMPACT_CLASS =
  "font-sans font-semibold text-xs leading-tight text-dark-800 transition-colors";

/** Product title with direct hover (e.g. h3 with onClick, no wrapping Link group). */
export const PRODUCT_CARD_TITLE_COMPACT_HOVER_CLASS =
  "font-sans font-semibold text-xs leading-tight text-dark-800 hover:text-terracotta-600 transition-colors";

/** Primary price on compact product cards. */
export const PRODUCT_CARD_PRICE_COMPACT_CLASS =
  "font-sans font-bold text-sm tabular-nums text-dark-800";

/**
 * Product title on 2–4 column shop grids (slightly larger).
 * Pair with ``line-clamp-1`` + a fixed-height wrapper so row tiles stay equal height.
 */
export const PRODUCT_CARD_TITLE_GRID_CLASS =
  "font-sans font-semibold text-xs sm:text-sm leading-tight text-dark-800";

/** Primary price on shop / category grids. */
export const PRODUCT_CARD_PRICE_GRID_CLASS =
  "font-sans font-bold text-sm sm:text-base tabular-nums text-dark-800";

/** For You / larger marketing cards product name. */
export const PRODUCT_CARD_TITLE_FEATURE_CLASS =
  "font-display font-semibold text-base leading-tight text-dark-800 transition-colors hover:text-terracotta-500";

/** For You / feature cards "From ₹…" primary price line. */
export const PRODUCT_CARD_PRICE_FEATURE_CLASS =
  "font-display font-bold text-xl tabular-nums text-dark-800";
