"use client";

/**
 * Waitlist preview: wishlist UI is inert (no persistence).
 */

import { useCallback, useMemo } from "react";

import type { Wishlist } from "@/api/base44Client";

interface UseWishlistReturn {
  wishlistItems: Wishlist[];
  wishlistCount: number;
  isLoading: boolean;
  addToWishlist: (item: Omit<Wishlist, "id" | "created_by">) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  isInWishlist: (itemId: string) => boolean;
  toggleWishlist: (item: {
    id: string;
    type: "kit" | "fragrance" | "discovery_kit";
    name: string;
    price?: number;
    image?: string;
  }) => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const wishlistItems = useMemo<Wishlist[]>(() => [], []);

  return {
    wishlistItems,
    wishlistCount: 0,
    isLoading: false,
    addToWishlist: useCallback(async () => {}, []),
    removeFromWishlist: useCallback(async () => {}, []),
    isInWishlist: useCallback(() => false, []),
    toggleWishlist: useCallback(async () => {}, []),
  };
}
