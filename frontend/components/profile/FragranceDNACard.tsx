'use client';

/**
 * Visual fragrance DNA card (adapted from apps/web profile). Pilot mode uses a plain title.
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Dna, Sparkles, Loader2 } from 'lucide-react';

export interface ScentFamilyData {
  name: string;
  percentage: number;
  color?: string;
}

export interface DNACardData {
  user_id: string;
  username: string;
  display_name: string;
  scent_profile_name: string;
  profile_description: string;
  primary_color: string;
  secondary_color: string;
  scent_families: ScentFamilyData[];
  top_notes: string[];
  signature_notes: string[];
  favorite_occasions: string[];
  favorite_seasons: string[];
  personality_traits: string[];
  share_url: string;
  generated_at: string;
}

interface FragranceDNACardProps {
  data: DNACardData | null;
  loading: boolean;
  exportMode?: boolean;
  /** Waitlist pilot: avoid “Name’s” use neutral hero title. */
  pilotPlainTitle?: boolean;
}

const THEME_TERRACOTTA = '#B85A3A';
const THEME_TERRACOTTA_RGB = '184, 90, 58';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function FragranceDNACardInner(
  { data, loading, exportMode = false, pilotPlainTitle = false }: FragranceDNACardProps,
  ref: React.ForwardedRef<HTMLDivElement | null>
) {
  if (loading) {
    return (
      <div
        className="w-[360px] min-h-[600px] sm:w-[400px] rounded-3xl border-2 border-terracotta-200/60 bg-gradient-to-b from-[#FDF8F6] to-[#F5EDE9] flex items-center justify-center shadow-2xl shadow-terracotta-900/10"
        style={{ aspectRatio: '2/3' }}
      >
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-terracotta-500/10 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-8 h-8 animate-spin text-terracotta-500" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-neutral-600">Generating your DNA card...</p>
          <p className="text-xs text-neutral-500 mt-1">One moment</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="w-[360px] min-h-[600px] sm:w-[400px] rounded-3xl border-2 border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center shadow-xl"
        style={{ aspectRatio: '2/3' }}
      >
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-2xl bg-neutral-200/80 flex items-center justify-center mx-auto mb-5">
            <Dna className="w-10 h-10 text-neutral-500" strokeWidth={1.8} />
          </div>
          <p className="text-base font-semibold text-neutral-700">Complete your scent profile</p>
          <p className="text-sm text-neutral-500 mt-2 max-w-[260px] mx-auto">
            Take the scent quiz to generate your Fragrance DNA card.
          </p>
        </div>
      </div>
    );
  }

  const cardContent = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-3xl overflow-hidden relative ${
        exportMode ? 'w-[400px] h-[600px]' : 'w-full max-w-[400px] min-h-[560px]'
      } bg-gradient-to-b from-[#FDF8F6] to-[#F5EDE9] border-2 border-terracotta-200/70`}
      style={{
        boxShadow: '0 32px 64px -16px rgba(184, 90, 58, 0.12), 0 0 0 1px rgba(184, 90, 58, 0.08)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-terracotta-500 to-terracotta-400" />

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(${THEME_TERRACOTTA_RGB}, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(${THEME_TERRACOTTA_RGB}, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative pt-8 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg bg-terracotta-500/15 text-terracotta-600">
          <Dna className="w-7 h-7" strokeWidth={2.2} />
        </div>
        {pilotPlainTitle ? (
          <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-dark-900 tracking-tight">
            Your scent profile
          </h2>
        ) : (
          <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-dark-900 tracking-tight">
            {data.display_name || data.username}&apos;s
          </h2>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mt-1 text-terracotta-600">
          Fragrance DNA
        </p>
        <div className="mt-4 pt-4 border-t border-black/6">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1.5">
            Profile
          </p>
          <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug text-terracotta-700">
            {data.scent_profile_name}
          </h3>
          {data.profile_description && (
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed max-w-[300px] mx-auto">
              {data.profile_description}
            </p>
          )}
        </div>
      </div>

      <div
        className={`relative px-6 pb-20 ${exportMode ? 'overflow-hidden' : 'overflow-y-auto'} ${
          exportMode ? 'h-[calc(600px-280px)]' : 'min-h-[300px]'
        }`}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {data.scent_families && data.scent_families.length > 0 && (
            <motion.div variants={itemVariants}>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-3">
                Scent Families
              </p>
              <div className="space-y-3">
                {data.scent_families.slice(0, 4).map((family, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-dark-800 w-28 truncate">
                      {family.name}
                    </span>
                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-black/6 shadow-inner">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: family.color || THEME_TERRACOTTA,
                          boxShadow: `0 0 14px ${(family.color || THEME_TERRACOTTA)}50`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, family.percentage)}%` }}
                        transition={{ duration: 0.9, delay: idx * 0.06, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-neutral-600 w-9 text-right tabular-nums">
                      {family.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {data.signature_notes && data.signature_notes.length > 0 && (
            <motion.div variants={itemVariants}>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2.5">
                Signature Notes
              </p>
              <div className="flex flex-wrap gap-2">
                {data.signature_notes.slice(0, 5).map((note, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border bg-terracotta-50 text-terracotta-700 border-terracotta-200/80"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.personality_traits && data.personality_traits.length > 0 && (
              <motion.div variants={itemVariants}>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2">
                  Personality
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.personality_traits.slice(0, 3).map((trait, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 text-dark-800 border border-black/8 shadow-sm"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            {data.favorite_occasions && data.favorite_occasions.length > 0 && (
              <motion.div variants={itemVariants}>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-2">
                  Occasions
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.favorite_occasions.slice(0, 3).map((occasion, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/80 text-dark-700 border border-black/6"
                    >
                      {occasion}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 border-t border-black/6 bg-[#FDF8F6]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta-600" strokeWidth={2.2} />
          <span className="text-sm font-bold text-dark-800">ScentRev</span>
        </div>
        <span className="text-xs font-medium text-neutral-500 tabular-nums">
          {new Date(data.generated_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>
    </motion.div>
  );

  return cardContent;
}

const FragranceDNACard = forwardRef(FragranceDNACardInner);
FragranceDNACard.displayName = 'FragranceDNACard';

export default FragranceDNACard;
