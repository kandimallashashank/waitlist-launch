"use client";

/**
 * Waitlist launch has no Supabase Auth; quiz uses the waitlist session cookie instead.
 */
export function useSupabaseAuth(): {
  user: null;
  loading: boolean;
  getToken: () => Promise<string | null>;
} {
  return {
    user: null,
    loading: false,
    getToken: async () => null,
  };
}
