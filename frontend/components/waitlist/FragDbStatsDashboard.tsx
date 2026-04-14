"use client";

/**
 * Live FragDB scale: hero layout + Recharts bar visuals (client-only charts).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FragDbStats } from "@/lib/waitlist/fragDbStats";

const nfIn = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

interface LibraryRow {
  name: string;
  value: number;
  fill: string;
  hint: string;
}

/** Short axis ticks for large integers (chart axis only). */
function axisTickCompact(n: number): string {
  if (n >= 1_00_00_000) {
    return `${Math.round(n / 1_00_00_000)}cr`;
  }
  if (n >= 1_00_000) {
    return `${Math.round(n / 1_00_000)}L`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 1000)}k`;
  }
  return String(n);
}

function ChartTooltipCard({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8DDD6] bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_rgba(20,18,15,0.12)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B85A3A]">
        {title}
      </p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#14120F]">{body}</p>
      {hint ? <p className="mt-1 max-w-[14rem] text-[11px] leading-snug text-[#6B5E54]">{hint}</p> : null}
    </div>
  );
}

function LibraryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: LibraryRow }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0].payload;
  return (
    <ChartTooltipCard
      title={row.name}
      body={nfIn.format(row.value)}
      hint={row.hint}
    />
  );
}

function buildLibraryData(stats: FragDbStats): LibraryRow[] {
  const rows: LibraryRow[] = [
    {
      name: "Fragrances",
      value: stats.fragrances,
      fill: "#B85A3A",
      hint: "Bottles you can explore in the graph",
    },
    {
      name: "Scent notes",
      value: stats.notes,
      fill: "#C2785A",
      hint: "Ingredients we recognise (bergamot, oud, rose…)",
    },
    {
      name: "Brands",
      value: stats.brands,
      fill: "#A86F4D",
      hint: "Houses and designers on file",
    },
    {
      name: "Perfumers",
      value: stats.perfumers,
      fill: "#D4A574",
      hint: "Noses linked to bottles",
    },
    {
      name: "Mood & style",
      value: stats.accords,
      fill: "#6D7D63",
      hint: "Families like woody, fresh, gourmand",
    },
  ];
  return rows.sort((a, b) => b.value - a.value);
}

export default function FragDbStatsDashboard() {
  const [stats, setStats] = useState<FragDbStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/frag-db-stats");
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        const data = (await res.json()) as FragDbStats;
        if (!cancelled) {
          setStats(data);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setStats(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const libraryData = useMemo(() => (stats ? buildLibraryData(stats) : []), [stats]);

  return (
    <section
      id="fragdb-live-stats"
      className="relative overflow-hidden border-t border-[#E0D8CC] bg-[#F6F1EA] py-14 md:py-20"
      aria-labelledby="fragdb-stats-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(184,90,58,0.11),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,165,116,0.22),transparent_68%)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(184,90,58,0.08),transparent_70%)] blur-2xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-white/95 via-white to-[#FFF9F4] p-6 shadow-[0_28px_90px_-32px_rgba(20,18,15,0.22),0_1px_0_rgba(255,255,255,0.9)_inset] md:p-10 md:rounded-[2rem]">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B85A3A]/15 to-[#D4A574]/10 ring-1 ring-[#B85A3A]/25">
                  <Database className="h-5 w-5 text-[#B85A3A]" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B85A3A]">
                    Live catalog graph
                  </p>
                  <h2
                    id="fragdb-stats-heading"
                    className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight text-[#14120F] md:text-3xl"
                  >
                    Depth you can actually use
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#4E463E]">
                    Every filter and recommendation draws on structured notes, accords, houses, and
                    community similarity, not vibes alone.
                  </p>
                </div>
              </div>

              {stats ? (
                <div className="mt-8 rounded-2xl border border-[#EDE5DC] bg-gradient-to-br from-[#FFFCF9] to-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-[#B85A3A]">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                      Headline scale
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-[#14120F] md:text-[2.75rem] md:leading-none">
                    {nfIn.format(stats.fragrances)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3A342E]">fragrances mapped today</p>
                  <p
                    className="mt-4 text-[11px] text-[#8A7E72]"
                    suppressHydrationWarning
                  >
                    Updated{" "}
                    {new Date(stats.fetchedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-8">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-[#14120F]">Library breadth</h3>
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A7E72]">
                  By volume
                </span>
              </div>

              <div
                className="h-[300px] w-full md:h-[320px]"
                role="status"
                aria-live="polite"
                aria-busy={!stats && !failed}
              >
                {!stats && !failed ? (
                  <div className="flex h-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E0D8CC] bg-[#FAF7F3]/80 text-sm text-[#6B5E54]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#B85A3A]" aria-hidden />
                    Loading chart…
                  </div>
                ) : null}

                {failed ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#E0D8CC] bg-[#FAF7F3]/80 px-4 text-center text-sm text-[#6B5E54]">
                    Stats unavailable. The catalog still works. Try again shortly.
                  </div>
                ) : null}

                {stats && chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={libraryData}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                      barCategoryGap={10}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        horizontal={false}
                        stroke="#E8DDD6"
                        strokeOpacity={0.85}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={axisTickCompact}
                        tick={{ fill: "#8A7E72", fontSize: 11 }}
                        axisLine={{ stroke: "#D9D0C4" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        tick={{ fill: "#3A342E", fontSize: 12, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<LibraryTooltip />}
                        cursor={{ fill: "rgba(184, 90, 58, 0.06)" }}
                      />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={22}>
                        {libraryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
