"use client";

/**
 * No-op analytics for waitlist preview builds.
 */
export function useAnalytics() {
  return {
    layeringLabAnalyzed: (
      _count: number,
      _score: number,
      _ai: boolean,
    ): void => {},
    layeringLabBlendSaved: (_score: number): void => {},
    shopAllFilterApplied: (_payload: Record<string, unknown>): void => {},
    layeringLabBannerViewed: (_source: string): void => {},
    layeringLabCtaClicked: (_source: string): void => {},
    productViewed: (
      _payload: {
        id: string;
        name: string;
        brand: string;
        price?: number;
      },
      _source: string,
    ): void => {},
  };
}
