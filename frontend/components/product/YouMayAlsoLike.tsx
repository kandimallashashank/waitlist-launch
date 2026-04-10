'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { PdpCompactCard, PdpScrollCarousel, type PdpCarouselFragrance } from '@/components/product/PdpCarouselCard';
import { getPreviewAuthHeaders } from '@/lib/waitlist/previewSessionClient';

interface YouMayAlsoLikeProps {
  fragranceId: string;
  fragranceName?: string;
}

export default function YouMayAlsoLike({ fragranceId, fragranceName }: YouMayAlsoLikeProps) {
  const [dbSimilar, setDbSimilar] = useState<PdpCarouselFragrance[]>([]);
  const [vectorSimilar, setVectorSimilar] = useState<PdpCarouselFragrance[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingVector, setLoadingVector] = useState(true);

  useEffect(() => {
    if (!fragranceId) return;
    let cancelled = false;

    const headers = { ...getPreviewAuthHeaders() };

    const run = async () => {
      setLoadingDb(true);
      setLoadingVector(true);
      let similar: PdpCarouselFragrance[] = [];
      try {
        const simRes = await fetch(`/api/waitlist-preview/fragrances/${fragranceId}/similar?limit=10`, {
          credentials: 'include',
          headers,
        });
        similar = simRes.ok ? ((await simRes.json()) as PdpCarouselFragrance[]) : [];
        if (!Array.isArray(similar)) similar = [];
      } catch {
        similar = [];
      }
      if (cancelled) return;
      setDbSimilar(similar);
      setLoadingDb(false);

      const excludeIds = [fragranceId, ...similar.map((f) => f.id)].filter(Boolean);
      const excludeQs = excludeIds.map((id) => encodeURIComponent(id)).join(',');
      try {
        const recRes = await fetch(
          `/api/fragrances/${fragranceId}/recommendations?limit=12&exclude=${excludeQs}`,
          { credentials: 'include' },
        );
        const rec = recRes.ok ? ((await recRes.json()) as PdpCarouselFragrance[]) : [];
        if (!cancelled) setVectorSimilar(Array.isArray(rec) ? rec : []);
      } catch {
        if (!cancelled) setVectorSimilar([]);
      } finally {
        if (!cancelled) setLoadingVector(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [fragranceId]);

  const uniqueRecs = vectorSimilar.filter((f) => f.id !== fragranceId);
  const hasDbSimilar = dbSimilar.length > 0;
  const hasRecs = uniqueRecs.length > 0;

  if (loadingDb && loadingVector) return null;
  if (!hasDbSimilar && !hasRecs) return null;

  const displayName =
    fragranceName?.replace(/\s+(EDT|EDP|Parfum|Extrait|EDC)$/i, '') || 'this fragrance';

  return (
    <div className="space-y-10">
      {hasDbSimilar && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-[#B85A3A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">Smells Similar to {displayName}</h3>
          </div>
          <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-[#8A7A72]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B85A3A]/70" aria-hidden />
            <span>
              These fragrances share key notes, accords, or scent family with {displayName}. If you enjoy this one, these are your safest next picks.
            </span>
          </p>
          <PdpScrollCarousel label="similar">
            {dbSimilar.map((frag) => (
              <PdpCompactCard
                key={frag.id}
                frag={frag}
                hrefSearch="source=similar"
                badge={
                  <span className="rounded-full bg-[#B85A3A] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    SIMILAR
                  </span>
                }
              />
            ))}
          </PdpScrollCarousel>
        </div>
      )}

      {hasRecs && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D4A574]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">You May Also Like</h3>
          </div>
          <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-[#8A7A72]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B85A3A]/70" aria-hidden />
            <span>
              From the same scent family as {displayName}, ordered by how safe they are to buy blind.
            </span>
          </p>
          <PdpScrollCarousel label="recommendations">
            {uniqueRecs.slice(0, 12).map((frag) => (
              <PdpCompactCard key={frag.id} frag={frag} hrefSearch="source=recommendation" />
            ))}
          </PdpScrollCarousel>
        </div>
      )}
    </div>
  );
}
