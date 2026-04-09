'use client';

import React from 'react';
import { Shield, Droplets, CheckCircle2 } from 'lucide-react';

export default function BlindBuySection({ score }: { score?: number }) {
  const displayScore = score ?? 4.0;

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#B85A3A]/15 to-transparent rounded-bl-full" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#B85A3A]/20 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-[#D4A574]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white text-lg font-semibold mb-1">No more blind buy regret</h3>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Every recommendation is backed by data from 100k+ fragrances, real community sentiment, and climate analysis for Indian weather.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 relative z-10">
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <p className="text-2xl font-bold text-[#D4A574]">{displayScore.toFixed(1)}</p>
          <p className="text-[10px] text-white/50 mt-1">Blind Buy Score</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <p className="text-2xl font-bold text-white">100k+</p>
          <p className="text-[10px] text-white/50 mt-1">Data Points</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <p className="text-2xl font-bold text-white">4</p>
          <p className="text-[10px] text-white/50 mt-1">Score Factors</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
        {[
          { label: 'Longevity & sillage analysis', icon: Droplets },
          { label: 'Climate suitability for India', icon: CheckCircle2 },
          { label: 'Community sentiment scoring', icon: CheckCircle2 },
          { label: 'Verified buyer reviews', icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className="w-3 h-3 text-[#6FCF97] shrink-0" />
            <span className="text-[11px] text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
