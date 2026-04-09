import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { WAITLIST_SESSION_COOKIE } from "@/lib/waitlist/sessionJwt";

const GATED_PREFIXES = [
  "/quiz",
  "/layering-lab",
  "/catalog",
  "/product",
  "/subscribe",
];

function isGatedPath(pathname: string): boolean {
  return GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * When true, preview app routes require a valid waitlist session cookie (redirect
 * to ``/?locked=1`` otherwise). When false/unset, anyone can open Quiz, Layering
 * Lab, etc.; APIs still require a session for persistence (submit, layering, survey).
 */
function isPreviewRouteGateEnabled(): boolean {
  const v =
    process.env.WAITLIST_PREVIEW_ROUTE_GATE?.trim().toLowerCase() ?? "";
  return v === "1" || v === "true" || v === "yes";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isGatedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isPreviewRouteGateEnabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(WAITLIST_SESSION_COOKIE)?.value;
  const secret = process.env.WAITLIST_PREVIEW_JWT_SECRET?.trim();
  if (!token || !secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("locked", "1");
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("locked", "1");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/quiz",
    "/quiz/:path*",
    "/layering-lab",
    "/layering-lab/:path*",
    "/catalog",
    "/catalog/:path*",
    "/product",
    "/product/:path*",
    "/subscribe",
    "/subscribe/:path*",
  ],
};
