"use client";

/**
 * Radar / spider chart for scent preferences (from apps/web profile).
 */

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface Preferences {
  liked_notes: string[];
  disliked_notes: string[];
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
  preferred_seasons: string[];
  preferred_occasions: string[];
  scent_families: string[];
  preferred_intensity: string | null;
  preferred_longevity: string | null;
  preferred_gender: string | null;
  mood_preferences: string[];
  budget_range: string | null;
}

interface ScentProfileChartProps {
  preferences: Preferences;
  className?: string;
  showTitle?: boolean;
}

/**
 * Radar chart of preference-derived axes (intensity, freshness, sweetness, woody, floral, spicy).
 *
 * Args:
 *   preferences: Flat preference lists (profile / quiz shape).
 *   className: Optional wrapper classes.
 *   showTitle: When false, hides the heading.
 */
export default function ScentProfileChart({
  preferences,
  className,
  showTitle = true,
}: ScentProfileChartProps) {
  const hasPreferences =
    (preferences.top_notes && preferences.top_notes.length > 0) ||
    (preferences.middle_notes && preferences.middle_notes.length > 0) ||
    (preferences.base_notes && preferences.base_notes.length > 0) ||
    (preferences.scent_families && preferences.scent_families.length > 0) ||
    (preferences.liked_notes && preferences.liked_notes.length > 0) ||
    preferences.preferred_intensity ||
    preferences.preferred_longevity;

  if (!hasPreferences) {
    return null;
  }

  const getIntensityValue = (): number => {
    if (!preferences.preferred_intensity) return 50;
    const intensity = preferences.preferred_intensity.toLowerCase();
    if (intensity.includes("strong") || intensity.includes("bold")) return 90;
    if (intensity.includes("moderate") || intensity.includes("medium")) return 65;
    if (intensity.includes("light") || intensity.includes("soft")) return 40;
    return 50;
  };

  const getFreshnessValue = (): number => {
    const freshFamilies = ["fresh", "aquatic", "citrus", "green"];
    const freshNotes = [
      "citrus",
      "lemon",
      "bergamot",
      "orange",
      "aquatic",
      "marine",
      "green",
      "mint",
    ];

    const hasFreshFamily = preferences.scent_families?.some((f) =>
      freshFamilies.some((ff) => f.toLowerCase().includes(ff))
    );
    const hasFreshNote = [
      ...(preferences.top_notes || []),
      ...(preferences.middle_notes || []),
      ...(preferences.liked_notes || []),
    ].some((n) => freshNotes.some((fn) => n.toLowerCase().includes(fn)));

    if (hasFreshFamily || hasFreshNote) return 85;
    return 45;
  };

  const getSweetnessValue = (): number => {
    const sweetNotes = [
      "vanilla",
      "fruity",
      "tonka",
      "caramel",
      "honey",
      "sugar",
      "chocolate",
      "gourmand",
    ];
    const allNotes = [
      ...(preferences.top_notes || []),
      ...(preferences.middle_notes || []),
      ...(preferences.base_notes || []),
      ...(preferences.liked_notes || []),
    ];

    const hasSweetNote = allNotes.some((n) =>
      sweetNotes.some((sn) => n.toLowerCase().includes(sn))
    );

    if (hasSweetNote) return 80;
    return 35;
  };

  const getWoodyValue = (): number => {
    const woodyFamilies = ["woody", "oriental"];
    const woodyNotes = ["wood", "cedar", "sandalwood", "oud", "amber", "resin"];

    const hasWoodyFamily = preferences.scent_families?.some((f) =>
      woodyFamilies.some((wf) => f.toLowerCase().includes(wf))
    );
    const hasWoodyNote = [
      ...(preferences.top_notes || []),
      ...(preferences.middle_notes || []),
      ...(preferences.base_notes || []),
      ...(preferences.liked_notes || []),
    ].some((n) => woodyNotes.some((wn) => n.toLowerCase().includes(wn)));

    if (hasWoodyFamily || hasWoodyNote) return 85;
    return 40;
  };

  const getFloralValue = (): number => {
    const floralFamilies = ["floral"];
    const floralNotes = ["rose", "jasmine", "lavender", "lily", "iris", "violet", "peony"];

    const hasFloralFamily = preferences.scent_families?.some((f) =>
      floralFamilies.some((ff) => f.toLowerCase().includes(ff))
    );
    const hasFloralNote = [
      ...(preferences.top_notes || []),
      ...(preferences.middle_notes || []),
      ...(preferences.base_notes || []),
      ...(preferences.liked_notes || []),
    ].some((n) => floralNotes.some((fn) => n.toLowerCase().includes(fn)));

    if (hasFloralFamily || hasFloralNote) return 85;
    return 30;
  };

  const getSpicyValue = (): number => {
    const spicyNotes = ["spicy", "pepper", "cinnamon", "cardamom", "clove", "ginger", "nutmeg"];
    const allNotes = [
      ...(preferences.top_notes || []),
      ...(preferences.middle_notes || []),
      ...(preferences.base_notes || []),
      ...(preferences.liked_notes || []),
    ];

    const hasSpicyNote = allNotes.some((n) =>
      spicyNotes.some((sn) => n.toLowerCase().includes(sn))
    );

    if (hasSpicyNote) return 75;
    return 35;
  };

  const chartData = [
    { category: "Intensity", value: getIntensityValue(), fullMark: 100 },
    { category: "Freshness", value: getFreshnessValue(), fullMark: 100 },
    { category: "Sweetness", value: getSweetnessValue(), fullMark: 100 },
    { category: "Woody", value: getWoodyValue(), fullMark: 100 },
    { category: "Floral", value: getFloralValue(), fullMark: 100 },
    { category: "Spicy", value: getSpicyValue(), fullMark: 100 },
  ];

  return (
    <div className={`rounded-2xl border border-[#E5E5E5] bg-white p-6 ${className || ""}`}>
      {showTitle ? (
        <h3 className="font-display mb-4 text-xl text-[#1A1A1A]">Your Scent Profile</h3>
      ) : null}

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#E5E5E5" />
          <PolarAngleAxis dataKey="category" tick={{ fill: "#404040", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
          <Radar
            name="Profile"
            dataKey="value"
            stroke="#B85A3A"
            fill="#B85A3A"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <p className="text-sm text-[#404040]">Based on your quiz preferences</p>
      </div>
    </div>
  );
}
