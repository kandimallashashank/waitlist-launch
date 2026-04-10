/**
 * Global decant-case rows for PDP (shared pool, not per-perfume).
 * Served via ``/api/decant-inventory/global`` so the client never calls FastAPI for this.
 */

import type { DecantInventoryItem } from "@/api/base44Client";

/**
 * Pilot catalog: same shape as legacy ``GET /api/v1/decant-inventory/global``.
 * Replace with a Supabase query when a ``decant_inventory`` (or similar) table exists.
 */
export const GLOBAL_DECANT_INVENTORY_PILOT: DecantInventoryItem[] = [
  {
    id: "dc-global-8-copper",
    perfume_id: "global",
    size_ml: 8,
    color_name: "Copper",
    color_hex: "#B85A3A",
    quantity_in_stock: 99,
    total_sold: 12,
    price: 199,
  },
  {
    id: "dc-global-8-midnight",
    perfume_id: "global",
    size_ml: 8,
    color_name: "Midnight",
    color_hex: "#1A1A1A",
    quantity_in_stock: 99,
    total_sold: 8,
    price: 199,
  },
  {
    id: "dc-global-12-sage",
    perfume_id: "global",
    size_ml: 12,
    color_name: "Sage",
    color_hex: "#8B9E7E",
    quantity_in_stock: 99,
    total_sold: 5,
    price: 249,
  },
  {
    id: "dc-global-12-sand",
    perfume_id: "global",
    size_ml: 12,
    color_name: "Sand",
    color_hex: "#D4A574",
    quantity_in_stock: 99,
    total_sold: 3,
    price: 249,
  },
];
