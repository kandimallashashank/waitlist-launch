import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/waitlistApi';
import { prefetchWaitlistCatalogImages } from '@/lib/prefetchWaitlistImages';
import {
  WAITLIST_STATIC_CATALOG,
  isStaticWaitlistCatalogEnabled,
} from '@/lib/waitlist/staticCatalog';
import {
  readWaitlistCatalogCache,
  writeWaitlistCatalogCache,
} from '@/lib/waitlistPerfumeCache';
import type { WaitlistCatalogEntry } from '@/types/waitlistCatalog';
import { toWaitlistMarqueePicks } from '@/types/waitlistCatalog';

/** @deprecated Use WaitlistCatalogEntry; kept for existing imports. */
export type WaitlistPerfume = WaitlistCatalogEntry;

const DEFAULT_POOL_SIZE = 24;
const HERO_SLICE = 8;

/**
 * Fetches a shared catalog pool for the waitlist (cached 1h in sessionStorage + memory).
 * Use `perfumes` for hero/showcase slices; `marqueePicks` for strips + dark marquee.
 *
 * Args:
 *   poolSize: Number of fragrances to keep in the pool (default 24).
 *
 * Returns:
 *   `perfumes` (full pool), `heroPerfumes` (first 8 for orbit), `marqueePicks` for marquees/strips,
 *   `isLoading`.
 */
function initialPerfumes(poolSize: number): WaitlistCatalogEntry[] {
  if (isStaticWaitlistCatalogEnabled() && WAITLIST_STATIC_CATALOG.length > 0) {
    return WAITLIST_STATIC_CATALOG.slice(0, poolSize);
  }
  if (typeof window === 'undefined') return [];
  return readWaitlistCatalogCache(poolSize) ?? [];
}

function initialLoading(poolSize: number): boolean {
  if (isStaticWaitlistCatalogEnabled() && WAITLIST_STATIC_CATALOG.length > 0) {
    return false;
  }
  if (typeof window === 'undefined') return true;
  const hit = readWaitlistCatalogCache(poolSize);
  return hit == null || hit.length === 0;
}

export function useWaitlistPerfumes(poolSize: number = DEFAULT_POOL_SIZE) {
  const [perfumes, setPerfumes] = useState<WaitlistCatalogEntry[]>(() =>
    initialPerfumes(poolSize),
  );
  const [isLoading, setIsLoading] = useState(() => initialLoading(poolSize));

  const marqueePicks = useMemo(() => toWaitlistMarqueePicks(perfumes), [perfumes]);

  const heroPerfumes = useMemo(
    () => perfumes.slice(0, HERO_SLICE),
    [perfumes]
  );

  useEffect(() => {
    if (isStaticWaitlistCatalogEnabled() && WAITLIST_STATIC_CATALOG.length > 0) {
      const slice = WAITLIST_STATIC_CATALOG.slice(0, poolSize);
      setPerfumes(slice);
      setIsLoading(false);
      writeWaitlistCatalogCache(poolSize, slice);
      prefetchWaitlistCatalogImages(slice.map((p) => p.image));
      return undefined;
    }

    const cached = readWaitlistCatalogCache(poolSize);
    if (cached && cached.length > 0) {
      setPerfumes(cached);
      setIsLoading(false);
      prefetchWaitlistCatalogImages(cached.map((p) => p.image));
      return undefined;
    }

    let cancelled = false;

    const fetchPerfumes = async () => {
      try {
        setIsLoading(true);

        const response = await base44.entities.Fragrance.list(undefined, Math.max(poolSize, 50));

        if (cancelled) return;

        if (response && response.length > 0) {
          const sorted = [...response].sort(
            (a, b) => (b.blind_buy_score ?? 0) - (a.blind_buy_score ?? 0)
          );
          const mapped: WaitlistCatalogEntry[] = sorted.slice(0, poolSize).map((f) => {
            const img =
              (f as { primary_image_url?: string }).primary_image_url ||
              f.image_url ||
              '/placeholder-perfume.png';
            return {
              id: f.id || '',
              name: f.name || 'Unknown',
              brand: f.brand_name || f.brand || 'Unknown',
              image: img,
              blind_buy_score: f.blind_buy_score,
            };
          });

          setPerfumes(mapped);
          writeWaitlistCatalogCache(poolSize, mapped);
          prefetchWaitlistCatalogImages(mapped.map((p) => p.image));
        } else {
          const fallback = padDefaultPerfumes(poolSize);
          setPerfumes(fallback);
          writeWaitlistCatalogCache(poolSize, fallback);
          prefetchWaitlistCatalogImages(fallback.map((p) => p.image));
        }
      } catch (error) {
        console.warn('Error fetching waitlist perfumes:', error);
        if (!cancelled) {
          const fallback = padDefaultPerfumes(poolSize);
          setPerfumes(fallback);
          writeWaitlistCatalogCache(poolSize, fallback);
          prefetchWaitlistCatalogImages(fallback.map((p) => p.image));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchPerfumes();

    return () => {
      cancelled = true;
    };
  }, [poolSize]);

  return { perfumes, heroPerfumes, marqueePicks, isLoading };
}

/**
 * Repeats the small default set with stable unique ids so `poolSize` can be 24+.
 *
 * Args:
 *   poolSize: Target length.
 *
 * Returns:
 *   Padded catalog entries for offline / API-failure UI.
 */
function padDefaultPerfumes(poolSize: number): WaitlistCatalogEntry[] {
  const base = getDefaultPerfumesBase();
  if (poolSize <= 0) return [];
  const out: WaitlistCatalogEntry[] = [];
  for (let i = 0; i < poolSize; i += 1) {
    const src = base[i % base.length];
    out.push({
      ...src,
      id: `${src.id}-pad-${i}`,
    });
  }
  return out;
}

/** Eight placeholder rows when the API returns nothing or errors. */
function getDefaultPerfumesBase(): WaitlistCatalogEntry[] {
  return [
    {
      id: '1',
      name: 'Acqua di Parma',
      brand: 'Blu Mediterraneo',
      image: '/images/default-perfume-1.png',
      blind_buy_score: 8,
    },
    {
      id: '2',
      name: "L'Homme Ideal",
      brand: 'Guerlain',
      image: '/images/default-perfume-2.png',
      blind_buy_score: 8,
    },
    {
      id: '3',
      name: 'Sauvage',
      brand: 'Dior',
      image: '/images/default-perfume-3.png',
      blind_buy_score: 8,
    },
    {
      id: '4',
      name: 'Black Orchid',
      brand: 'Tom Ford',
      image: '/images/default-perfume-4.png',
      blind_buy_score: 8,
    },
    {
      id: '5',
      name: 'Aventus',
      brand: 'Creed',
      image: '/images/default-perfume-5.png',
      blind_buy_score: 8,
    },
    {
      id: '6',
      name: 'Bleu de Chanel',
      brand: 'Chanel',
      image: '/images/default-perfume-6.png',
      blind_buy_score: 8,
    },
    {
      id: '7',
      name: 'La Vie est Belle',
      brand: 'Lancôme',
      image: '/images/default-perfume-7.png',
      blind_buy_score: 8,
    },
    {
      id: '8',
      name: 'Eros',
      brand: 'Versace',
      image: '/images/default-perfume-8.png',
      blind_buy_score: 8,
    },
  ];
}

