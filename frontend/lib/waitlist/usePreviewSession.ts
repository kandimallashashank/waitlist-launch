"use client";

import { useEffect, useState } from "react";
import { PREVIEW_SESSION_STORAGE_KEY } from "./previewSessionClient";

/**
 * Returns whether the user has a waitlist preview session token.
 * Checks sessionStorage (set after signup) and the httpOnly cookie (via a
 * lightweight session ping). Resolves quickly from sessionStorage so there's
 * no flash on pages the user has already unlocked.
 */
export function usePreviewSession(): { ready: boolean; hasSession: boolean } {
  const [state, setState] = useState<{ ready: boolean; hasSession: boolean }>({
    ready: false,
    hasSession: false,
  });

  useEffect(() => {
    // Fast path: sessionStorage token present = already joined
    try {
      const token = sessionStorage.getItem(PREVIEW_SESSION_STORAGE_KEY)?.trim();
      if (token) {
        setState({ ready: true, hasSession: true });
        return;
      }
    } catch {
      /* storage blocked */
    }

    // Slow path: check cookie via session endpoint
    let cancelled = false;
    fetch("/api/waitlist-preview/session", { credentials: "include" })
      .then((r) => {
        if (!cancelled) {
          setState({ ready: true, hasSession: r.ok });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ ready: true, hasSession: false });
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
