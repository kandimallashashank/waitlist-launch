"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Cart } from "@/api/base44Client";

interface PreviewUser {
  id: string;
  email: string;
  full_name?: string;
}

/** Shape matches storefront ``CartAddFlash`` for PLP card typing; always null on pilot. */
export type CartAddFlash = { itemId: string; size?: string } | null;

interface AppContextValue {
  user: PreviewUser | null;
  isLoading: boolean;
  cartAddFlash: CartAddFlash;
  cartItems: Cart[];
  addToCart: (item: Cart) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  refreshCart: (options?: { force?: boolean }) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Minimal context for waitlist-launch pages copied from the main storefront.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AppContextValue>(
    () => ({
      user: { id: "waitlist-preview", email: "preview@waitlist.local" },
      isLoading: false,
      cartAddFlash: null,
      cartItems: [],
      addToCart: async () => {
        const { toast } = await import("sonner");
        toast.message("Checkout on the full site", {
          description: "Cart is disabled on this pilot preview.",
        });
      },
      removeFromCart: async () => {},
      refreshCart: async () => {},
    }),
    [],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext requires AppProvider");
  }
  return ctx;
}

export function useCart() {
  const { addToCart } = useAppContext();
  return { addToCart };
}
