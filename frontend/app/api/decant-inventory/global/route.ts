/**
 * GET /api/decant-inventory/global
 *
 * Global decant-case inventory for PDP (replaces FastAPI ``/api/v1/decant-inventory/global``).
 */

import { NextResponse } from "next/server";

import { GLOBAL_DECANT_INVENTORY_PILOT } from "@/lib/waitlist/globalDecantInventory";
import { responseNoStoreHeaders } from "@/lib/waitlist/httpNoStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(GLOBAL_DECANT_INVENTORY_PILOT, {
    status: 200,
    headers: responseNoStoreHeaders,
  });
}
