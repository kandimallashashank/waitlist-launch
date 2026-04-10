"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Framer Motion's ``useReducedMotion()`` is ``null`` on the server but a boolean on
 * the client. Branching the render tree on that value breaks hydration for users who
 * prefer reduced motion. This hook stays ``false`` until after mount, then reflects
 * the real preference.
 *
 * Returns:
 *   True only on the client when the user prefers reduced motion; always false during
 *   SSR and the first client paint so server and client markup match.
 */
export function useHydrationSafeReducedMotion(): boolean {
  const framerPrefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return false;
  }
  return framerPrefersReduced === true;
}
