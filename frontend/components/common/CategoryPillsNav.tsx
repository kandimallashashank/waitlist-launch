"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { getAccessToken } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * CategoryPillsNav Component
 *
 * Horizontal pill navigation for collection/shop pages. Shows category chips
 * with optional icons; active state and hover align with the app's terracotta
 * design system. Scrollable on mobile with clear affordance.
 *
 * Features:
 * - Active state from URL (pathname + search params)
 * - Horizontal scroll on small screens with smooth scroll and touch
 * - Accessible (focus-visible, aria-current)
 * - Design tokens: #B85A3A, #1A1A1A, #5C5A52, #E5E5E5, #FDF6F3
 */

interface Category {
  id: string;
  label: string;
  href: string;
  /** Tailwind background for the pill icon/indicator (inactive state) */
  pillBg: string;
  /** Optional short badge (e.g. "Sale") */
  badge?: string;
}

/** Base pills; "For you" is inserted when the user has taste signals (see ``personalized_buy_eligible``). */
const BASE_CATEGORIES: Category[] = [
  { id: "womens", label: "Women's", href: "/womens-perfume", pillBg: "bg-[#FDF6F3]" },
  { id: "mens", label: "Men's", href: "/mens-cologne", pillBg: "bg-[#F0F0F0]" },
  { id: "shop-all", label: "Shop All", href: "/shop-all", pillBg: "bg-[#F8E8E0]" },
  {
    id: "best-sellers",
    label: "Best Sellers",
    href: "/shop-all?category=best_seller",
    pillBg: "bg-[#FDF6F3]",
  },
  {
    id: "clearance",
    label: "Clearance",
    href: "/sale",
    pillBg: "bg-[#B85A3A]",
    badge: "Sale",
  },
  {
    id: "new-arrivals",
    label: "New Arrivals",
    href: "/new-arrivals",
    pillBg: "bg-[#E8EDE6]",
  },
  {
    id: "gift-sets",
    label: "Gift Sets",
    href: "/discovery-sets",
    pillBg: "bg-[#F0D1C1]",
  },
];

const FOR_YOU_PILL: Category = {
  id: "recommended-for-you",
  label: "For you",
  href: "/recommended-for-you",
  pillBg: "bg-[#EDE8E4]",
};

interface CategoryPillsNavProps {
  /** Override active pill (otherwise derived from pathname + searchParams) */
  activeCategory?: string;
}

function getIsActive(
  category: Category,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  activeCategory?: string
): boolean {
  if (activeCategory) return category.id === activeCategory;
  if (pathname === "/womens-perfume" && category.id === "womens") return true;
  if (pathname === "/mens-cologne" && category.id === "mens") return true;
  if (pathname === "/shop-all" && category.id === "shop-all" && !searchParams.get("category"))
    return true;
  if (
    pathname === "/shop-all" &&
    category.id === "best-sellers" &&
    searchParams.get("category") === "best_seller"
  )
    return true;
  if (pathname === "/sale" && category.id === "clearance") return true;
  if (pathname === "/new-arrivals" && category.id === "new-arrivals") return true;
  if (pathname === "/discovery-sets" && category.id === "gift-sets") return true;
  if (pathname === "/recommended-for-you" && category.id === "recommended-for-you") return true;
  return false;
}

export default function CategoryPillsNav({ activeCategory }: CategoryPillsNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAppContext();
  const [personalizedBuyEligible, setPersonalizedBuyEligible] = useState(false);

  useEffect(() => {
    // Quiz status check not needed in waitlist - "For You" pill is not shown
    setPersonalizedBuyEligible(false);
  }, [user]);

  const categories = useMemo(() => {
    if (!personalizedBuyEligible) return BASE_CATEGORIES;
    const idx = BASE_CATEGORIES.findIndex((c) => c.id === "best-sellers");
    const at = idx >= 0 ? idx + 1 : BASE_CATEGORIES.length;
    return [...BASE_CATEGORIES.slice(0, at), FOR_YOU_PILL, ...BASE_CATEGORIES.slice(at)];
  }, [personalizedBuyEligible]);

  // Optional: scroll active pill into view on mount/route change (mobile)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('[aria-current="page"]');
    if (active && "scrollIntoView" in active) {
      (active as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [pathname, searchParams, categories]);

  return (
    <div className="bg-white border-b border-neutral-100 shadow-sm">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2.5 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="navigation"
        aria-label="Category navigation"
      >
        {categories.map((category) => {
          const isActive = getIsActive(category, pathname, searchParams, activeCategory);

          return (
            <Link
              key={category.id}
              href={category.href}
              prefetch
              onMouseEnter={() => router.prefetch(category.href)}
              onTouchStart={() => router.prefetch(category.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 flex-shrink-0 rounded-full px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B85A3A] focus-visible:ring-offset-2",
                isActive
                  ? "bg-[#B85A3A] text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <span className="whitespace-nowrap">{category.label}</span>
              {category.badge && (
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/25 text-white" : "bg-[#B85A3A]/10 text-[#B85A3A]"
                  )}
                >
                  {category.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
