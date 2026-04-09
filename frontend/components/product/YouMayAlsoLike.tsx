'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { PdpCompactCard, PdpScrollCarousel, type PdpCarouselFragrance } from '@/components/product/PdpCarouselCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    fetch(`${API_URL}/api/v1/fragrances/${fragranceId}/similar?limit=10`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDbSimilar(Array.isArray(data) ? data : []))
      .catch(() => setDbSimilar([]))
      .finally(() => setLoadingDb(false));

    fetch(`${API_URL}/api/v1/vector-search/similar/${fragranceId}?limit=12&exclude_same_brand=true`)
      .then((res) => (res.ok ? res.json() : { similar_fragrances: [] }))
      .then((data) => setVectorSimilar(data.similar_fragrances || []))
      .catch(() => setVectorSimilar([]))
      .finally(() => setLoadingVector(false));
  }, [fragranceId]);

  const dbIds = new Set(dbSimilar.map((f) => f.id));
  const uniqueVector = vectorSimilar.filter((f) => !dbIds.has(f.id) && f.id !== fragranceId);
  const hasDbSimilar = dbSimilar.length > 0;
  const hasVector = uniqueVector.length > 0;

  if (loadingDb && loadingVector) return null;
  if (!hasDbSimilar && !hasVector) return null;

  const displayName =
    fragranceName?.replace(/\s+(EDT|EDP|Parfum|Extrait|EDC)$/i, '') || 'this fragrance';

  return (
    <div className="space-y-10">
      {hasDbSimilar && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-[#B85A3A]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">Smells Similar to {displayName}</h3>
          </div>
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

      {hasVector && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D4A574]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">You May Also Like</h3>
          </div>
          <PdpScrollCarousel label="recommendations">
            {uniqueVector.slice(0, 12).map((frag) => (
              <PdpCompactCard key={frag.id} frag={frag} hrefSearch="source=recommendation" />
            ))}
          </PdpScrollCarousel>
        </div>
      )}
    </div>
  );
}
