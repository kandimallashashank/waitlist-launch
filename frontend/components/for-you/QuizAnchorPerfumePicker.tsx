"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import type { QuizCatalogPerfume } from "@/lib/quizAnchorDerivation";
import {
  PLP_CATALOG_PAGE_SIZE,
  genderQueryValuesForPlp,
} from "@/lib/plpCatalogFetch";

const MAX_PICK = 5;
/** Desktop / tablet: match PLP page size. */
const DESKTOP_BROWSE_PAGE_SIZE = PLP_CATALOG_PAGE_SIZE;
/** Viewports under 640px: smaller JSON payloads + fewer images per request (3G-friendly). */
const MOBILE_BROWSE_PAGE_SIZE = 16;
/** Only use single-column list layout below this width (very small phones). Typical phones use 2-col grid. */
const COMPACT_LIST_MAX_WIDTH = 400;
const BASE_SEARCH_DEBOUNCE_MS = 280;

function appendAnchorGenderParams(
  params: URLSearchParams,
  preferredGender: string,
): void {
  const vals = genderQueryValuesForPlp([preferredGender]);
  vals.forEach((g) => params.append("gender", g.toLowerCase()));
}

/** Short label for which DB genders step 1 maps to (men → men + unisex, etc.). */
function quizGenderScopeLabel(preferredGender: string): string {
  const g = (preferredGender || "").toLowerCase();
  if (g === "men") return "For Him + unisex";
  if (g === "women") return "For Her + unisex";
  if (g === "unisex") return "Unisex only";
  return "Your type";
}

/**
 * ``pageSize`` is fixed after first client read so browse offsets stay valid; ``compactList`` updates
 * on resize (list vs grid). ``include_notes`` is always requested: rows feed
 * ``deriveQuizFromAnchorPerfumes`` (liked note slugs need top/heart/base text).
 */
function useAnchorPickerPrefs(): {
  compactList: boolean;
  pageSize: number;
  includeNotesInFetch: boolean;
} {
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === "undefined") {
      return {
        compactList: false,
        pageSize: DESKTOP_BROWSE_PAGE_SIZE,
        includeNotesInFetch: true,
      };
    }
    const w = window.innerWidth;
    const narrow = w < 640;
    return {
      compactList: w < COMPACT_LIST_MAX_WIDTH,
      pageSize: narrow ? MOBILE_BROWSE_PAGE_SIZE : DESKTOP_BROWSE_PAGE_SIZE,
      includeNotesInFetch: true,
    };
  });

  useLayoutEffect(() => {
    const read = () => {
      const w = window.innerWidth;
      setPrefs((p) => ({
        ...p,
        compactList: w < COMPACT_LIST_MAX_WIDTH,
      }));
    };
    window.addEventListener("resize", read, { passive: true });
    return () => window.removeEventListener("resize", read);
  }, []);

  return prefs;
}

/**
 * Extra search debounce when the browser reports save-data or a slow radio (e.g. 3G).
 */
function useAdaptiveSearchDebounceMs(): number {
  const [extraMs, setExtraMs] = useState(0);
  useEffect(() => {
    try {
      const nav = navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      };
      const c = nav.connection;
      if (c?.saveData) setExtraMs(400);
      else if (c?.effectiveType === "slow-2g" || c?.effectiveType === "2g") setExtraMs(450);
      else if (c?.effectiveType === "3g") setExtraMs(280);
    } catch {
      /* ignore */
    }
  }, []);
  return BASE_SEARCH_DEBOUNCE_MS + extraMs;
}

interface QuizAnchorPerfumePickerProps {
  /** Quiz gender step value (men / women / unisex). */
  gender: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  /**
   * Parent merges rows into ``anchorCatalog`` for ``deriveQuizFromAnchorPerfumes``
   * (same pattern as PLP accumulating pages).
   */
  onRowsDiscovered: (rows: QuizCatalogPerfume[]) => void;
}

function PerfumeTile({
  p,
  selectedIds,
  onToggle,
}: {
  p: QuizCatalogPerfume;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const id = String(p.id);
  const selected = selectedIds.includes(id);
  const atCap = selectedIds.length >= MAX_PICK && !selected;
  const rawImg = p.primary_image_url || undefined;
  const img = getProxiedImageUrl(rawImg) || rawImg;

  return (
    <button
      type="button"
      disabled={atCap}
      onClick={() => onToggle(id)}
      className={cn(
        "flex h-auto w-full flex-col self-start overflow-hidden rounded-xl text-left transition-transform duration-150 md:[content-visibility:auto] md:[contain-intrinsic-size:110px_200px]",
        selected
          ? "ring-2 ring-[#B85A3A] shadow-[0_4px_16px_rgba(184,90,58,0.16)]"
          : "touch-manipulation ring-1 ring-[#E8D4C4] bg-white shadow-sm active:scale-[0.98] sm:hover:shadow-md sm:hover:ring-[#D4B8A4] sm:enabled:hover:-translate-y-0.5",
        atCap && "cursor-not-allowed opacity-40",
      )}
    >
      {/*
        Taller than 5/6 so tall bottle assets are not visually cropped; flex + object-bottom
        keeps the base of the bottle in-frame (grid row stretch no longer squashes tiles).
      */}
      <div className="relative flex aspect-[3/4] max-sm:max-h-[102px] w-full shrink-0 items-end justify-center overflow-hidden bg-gradient-to-br from-[#FCF4EF] via-[#FAF4EF] to-[#F1E3DA] px-0.5 pb-1 pt-0.5 sm:aspect-[5/6] sm:max-h-none sm:px-1 sm:pb-1.5 sm:pt-1">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="max-h-full w-full max-w-full object-contain object-bottom mix-blend-normal drop-shadow-[0_6px_12px_rgba(0,0,0,0.08)] md:mix-blend-multiply"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 60 120" className="h-16 w-auto opacity-20" fill="none">
              <rect x="22" y="0" width="16" height="10" rx="3" fill="#C4A48E" />
              <rect x="24" y="10" width="12" height="14" rx="2" fill="#D8C4B4" />
              <path
                d="M24 24 C24 24,12 32,12 42 L12 104 C12 112 18 118 26 118 L34 118 C42 118 48 112 48 104 L48 42 C48 32 36 24 36 24 Z"
                fill="#E8D4C4"
              />
            </svg>
          </div>
        )}
        {selected ? (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#B85A3A] text-[10px] font-bold text-white shadow-md sm:h-6 sm:w-6 sm:text-xs">
            {selectedIds.indexOf(id) + 1}
          </span>
        ) : null}
      </div>
      <div className="border-t border-[#F0E8E2] bg-white px-1 py-1 sm:px-1.5 sm:py-1.5">
        <p className="line-clamp-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8A6A5D] sm:text-[8px]">
          {p.brand_name || "-"}
        </p>
        <p className="line-clamp-1 text-[9px] font-medium leading-tight text-[#1A1A1A] sm:text-[10px] sm:leading-snug">
          {p.name || "-"}
        </p>
      </div>
    </button>
  );
}

/**
 * Single-column row layout for narrow viewports: one modest image + readable text (3G / touch).
 */
function PerfumeListRow({
  p,
  selectedIds,
  onToggle,
}: {
  p: QuizCatalogPerfume;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const id = String(p.id);
  const selected = selectedIds.includes(id);
  const atCap = selectedIds.length >= MAX_PICK && !selected;
  const rawImg = p.primary_image_url || undefined;
  const img = getProxiedImageUrl(rawImg) || rawImg;

  return (
    <button
      type="button"
      disabled={atCap}
      onClick={() => onToggle(id)}
      className={cn(
        "flex w-full min-h-[4.5rem] touch-manipulation items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150",
        selected
          ? "border-[#B85A3A] bg-[#FFF8F5] ring-2 ring-[#B85A3A]/35 shadow-sm"
          : "border-[#E8D4C4] bg-white shadow-sm active:bg-[#FAF7F4]",
        atCap && "cursor-not-allowed opacity-45",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#FCF4EF] to-[#F1E3DA]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-full w-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-25">
            <svg viewBox="0 0 60 120" className="h-9 w-auto" fill="none">
              <rect x="22" y="0" width="16" height="10" rx="3" fill="#C4A48E" />
              <rect x="24" y="10" width="12" height="14" rx="2" fill="#D8C4B4" />
              <path
                d="M24 24 C24 24,12 32,12 42 L12 104 C12 112 18 118 26 118 L34 118 C42 118 48 112 48 104 L48 42 C48 32 36 24 36 24 Z"
                fill="#E8D4C4"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8A6A5D]">
          {p.brand_name || "-"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-tight text-[#1A1A1A]">
          {p.name || "-"}
        </p>
      </div>
      {selected ? (
        <span className="flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-[#B85A3A] text-xs font-bold text-white">
          {selectedIds.indexOf(id) + 1}
        </span>
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full border border-dashed border-[#D4C4B8]" aria-hidden />
      )}
    </button>
  );
}

function mapRows(raw: unknown): QuizCatalogPerfume[] {
  if (!Array.isArray(raw)) return [];
  return raw as QuizCatalogPerfume[];
}

/**
 * Same-origin paginated catalog as PLP (``list-with-count``) + hybrid search when typing.
 */
export function QuizAnchorPerfumePicker({
  gender,
  selectedIds,
  onToggle,
  onRowsDiscovered,
}: QuizAnchorPerfumePickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceMs = useAdaptiveSearchDebounceMs();
  const { compactList, pageSize, includeNotesInFetch } = useAnchorPickerPrefs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [browseItems, setBrowseItems] = useState<QuizCatalogPerfume[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);
  const browseLoadingRef = useRef(false);
  const browseLenRef = useRef(0);

  const [searchItems, setSearchItems] = useState<QuizCatalogPerfume[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const searchPagingRef = useRef(false);
  const searchNextOffsetRef = useRef(0);
  /** When false, browse/search match quiz step 1 gender (smaller count). When true, no gender filter (full catalogue). */
  const [showEntireCatalog, setShowEntireCatalog] = useState(false);

  const isSearchMode = debouncedSearch.length > 0;
  const displayItems = isSearchMode ? searchItems : browseItems;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(query.trim()), searchDebounceMs);
    return () => window.clearTimeout(t);
  }, [query, searchDebounceMs]);

  const fetchBrowsePage = useCallback(
    async (offset: number, append: boolean) => {
      if (!gender || browseLoadingRef.current) return;
      browseLoadingRef.current = true;
      setBrowseLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String(offset));
        params.set("include_notes", includeNotesInFetch ? "true" : "false");
        params.set("sort", "rating");
        if (!showEntireCatalog) {
          appendAnchorGenderParams(params, gender);
        }

        const res = await fetch(`/api/fragrances/list-with-count?${params.toString()}`);
        if (!res.ok) throw new Error("list-with-count");
        const data = (await res.json()) as {
          items?: unknown;
          count?: number;
        };
        const items = mapRows(data.items);
        const count = typeof data.count === "number" ? data.count : items.length;
        onRowsDiscovered(items);
        setBrowseTotal(count);
        setBrowseItems((prev) => {
          const next = append ? [...prev, ...items] : items;
          browseLenRef.current = next.length;
          return next;
        });
      } catch {
        if (!append) {
          browseLenRef.current = 0;
          setBrowseItems([]);
          setBrowseTotal(0);
        }
      } finally {
        browseLoadingRef.current = false;
        setBrowseLoading(false);
      }
    },
    [gender, includeNotesInFetch, onRowsDiscovered, pageSize, showEntireCatalog],
  );

  useEffect(() => {
    if (!gender) return;
    browseLenRef.current = 0;
    setBrowseItems([]);
    setBrowseTotal(0);
    setSearchItems([]);
    setQuery("");
    setDebouncedSearch("");
    void fetchBrowsePage(0, false);
  }, [gender, showEntireCatalog, fetchBrowsePage]);

  const allowedGenders = useMemo(
    () => new Set(genderQueryValuesForPlp([gender]).map((g) => g.toLowerCase())),
    [gender],
  );

  const fetchSearchPage = useCallback(
    async (offset: number, append: boolean) => {
      const q = debouncedSearch.trim();
      if (!q || !gender || searchPagingRef.current) return;
      searchPagingRef.current = true;
      setSearchLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("query", q);
        sp.set("limit", String(pageSize));
        sp.set("offset", String(offset));
        sp.set("include_notes", includeNotesInFetch ? "true" : "false");
        if (!showEntireCatalog) {
          appendAnchorGenderParams(sp, gender);
        }
        const res = await fetch(`/api/fragrances/hybrid-search?${sp.toString()}`);
        if (!res.ok) throw new Error("search");
        const data = (await res.json()) as {
          results?: unknown;
          has_more?: boolean;
        };
        const rawRows = mapRows(data.results);
        const rows = rawRows.filter((r) => {
          if (showEntireCatalog || allowedGenders.size === 0) return true;
          const g = String((r as { gender?: string }).gender ?? "")
            .toLowerCase()
            .trim();
          return !g || allowedGenders.has(g);
        });
        searchNextOffsetRef.current = offset + rawRows.length;
        setSearchHasMore(Boolean(data.has_more));

        setSearchItems((prev) => {
          if (!append) return rows;
          const m = new Map(prev.map((p) => [String(p.id), p]));
          for (const p of rows) {
            if (p.id != null) m.set(String(p.id), p);
          }
          return Array.from(m.values());
        });
        if (rows.length > 0) {
          onRowsDiscovered(rows);
        }
      } catch {
        if (!append) {
          setSearchItems([]);
          setSearchHasMore(false);
          searchNextOffsetRef.current = 0;
        }
      } finally {
        searchPagingRef.current = false;
        setSearchLoading(false);
      }
    },
    [
      allowedGenders,
      debouncedSearch,
      gender,
      includeNotesInFetch,
      onRowsDiscovered,
      pageSize,
      showEntireCatalog,
    ],
  );

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchItems([]);
      setSearchLoading(false);
      setSearchHasMore(false);
      searchNextOffsetRef.current = 0;
      searchPagingRef.current = false;
      return;
    }
    searchNextOffsetRef.current = 0;
    searchPagingRef.current = false;
    void fetchSearchPage(0, false);
  }, [debouncedSearch, fetchSearchPage]);

  const hasMoreBrowse =
    !isSearchMode && browseItems.length > 0 && browseItems.length < browseTotal;

  const loadMoreActive =
    (!isSearchMode && hasMoreBrowse) || (isSearchMode && searchHasMore);

  useEffect(() => {
    if (!loadMoreActive) return;
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        if (isSearchMode) {
          if (searchPagingRef.current) return;
          void fetchSearchPage(searchNextOffsetRef.current, true);
        } else if (!browseLoadingRef.current) {
          void fetchBrowsePage(browseLenRef.current, true);
        }
      },
      { root, rootMargin: "120px", threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [
    isSearchMode,
    loadMoreActive,
    fetchBrowsePage,
    fetchSearchPage,
    displayItems.length,
  ]);

  const onPressLoadMore = useCallback(() => {
    if (isSearchMode) {
      if (searchPagingRef.current) return;
      void fetchSearchPage(searchNextOffsetRef.current, true);
      return;
    }
    if (browseLoadingRef.current) return;
    void fetchBrowsePage(browseLenRef.current, true);
  }, [fetchBrowsePage, fetchSearchPage, isSearchMode]);

  const gridClass =
    "grid w-full grid-cols-3 items-start gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5 lg:gap-2.5";

  const listShellClass = "flex w-full flex-col gap-2 px-0.5";

  const countLabel = isSearchMode
    ? searchLoading && searchItems.length === 0
      ? "Searching…"
      : searchHasMore
        ? `${searchItems.length} matches loaded; scroll for more`
        : `${searchItems.length} match${searchItems.length === 1 ? "" : "es"}`
    : browseLoading && browseItems.length === 0
      ? "Loading…"
      : showEntireCatalog
        ? `${browseItems.length} of ${browseTotal} (all genders)`
        : `${browseItems.length} of ${browseTotal} (${quizGenderScopeLabel(gender)})`;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-1 sm:gap-2">
      <p className="mx-auto max-w-3xl px-0.5 text-center text-[10px] leading-tight text-[#5C5A52] sm:text-[11px] sm:leading-snug">
        <span className="sm:hidden">
          Tap up to {MAX_PICK}. {quizGenderScopeLabel(gender)} · &quot;Full catalog&quot; = all genders.
        </span>
        <span className="hidden sm:inline">
          Pick bottles you know; we map notes &amp; families. Default: {quizGenderScopeLabel(gender)}.
          &quot;Full catalog&quot; = all genders. Batched loads; search is paged.
        </span>
      </p>

      <div className="flex justify-center px-1">
        <button
          type="button"
          onClick={() => {
            setShowEntireCatalog((v) => !v);
            setQuery("");
            setDebouncedSearch("");
          }}
          className="text-center text-[10px] font-semibold leading-tight text-[#B85A3A] underline decoration-[#D4B8A4] underline-offset-2 touch-manipulation active:opacity-80 sm:text-[11px]"
        >
          {showEntireCatalog
            ? "Match step 1 only"
            : "Full catalog (all genders)"}
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A09088] sm:left-3.5 sm:h-4 sm:w-4" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brand or name…"
          className="w-full rounded-xl border border-[#E8D4C4] bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1A] outline-none ring-0 placeholder:text-[#A09088] focus:border-[#B85A3A] shadow-sm transition-all focus:shadow-md sm:rounded-2xl sm:py-2.5 sm:pl-10 sm:pr-4 sm:text-sm"
          aria-label="Search perfumes"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>

      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 truncate text-[10px] text-[#8A6A5D] sm:text-xs">{countLabel}</p>
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#B85A3A] sm:text-xs sm:tracking-[0.14em]">
          {selectedIds.length}/{MAX_PICK} picked
        </p>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 w-full flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide sm:pr-1",
          /* ~1.5× prior min-heights: larger selection viewport, smaller tiles above */
          "max-sm:min-h-[min(48dvh,22rem)]",
          !compactList &&
            "sm:min-h-[min(63dvh,840px)] lg:min-h-[min(66dvh,900px)]",
          loadMoreActive && "pb-16",
        )}
      >
        {isSearchMode && searchLoading && searchItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8A6A5D]">Searching catalog…</p>
        ) : displayItems.length === 0 && !browseLoading ? (
          <p className="py-8 text-center text-sm text-[#8A6A5D]">
            {isSearchMode ? "No matches. Try another search." : "No perfumes to show."}
          </p>
        ) : (
          <>
            {compactList ? (
              <div className={listShellClass}>
                {displayItems.map((p) => (
                  <PerfumeListRow
                    key={String(p.id)}
                    p={p}
                    selectedIds={selectedIds}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            ) : (
              <div className={gridClass}>
                {displayItems.map((p) => (
                  <PerfumeTile key={String(p.id)} p={p} selectedIds={selectedIds} onToggle={onToggle} />
                ))}
              </div>
            )}
            {loadMoreActive ? (
              <div className="flex flex-col items-center gap-2 py-2">
                {!browseLoading && !searchLoading ? (
                  <button
                    type="button"
                    onClick={() => onPressLoadMore()}
                    className="rounded-full border border-[#E8D4C4] bg-white px-4 py-2 text-sm font-semibold text-[#B85A3A] shadow-sm active:scale-[0.98] touch-manipulation"
                  >
                    Load more
                  </button>
                ) : null}
                <div ref={sentinelRef} className="flex min-h-12 w-full items-center justify-center">
                  {(!isSearchMode && browseLoading) ||
                  (isSearchMode && searchLoading && searchItems.length > 0) ? (
                    <span className="text-xs text-[#8A6A5D]">Loading more…</span>
                  ) : (
                    <span className="sr-only">Scroll for more</span>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
