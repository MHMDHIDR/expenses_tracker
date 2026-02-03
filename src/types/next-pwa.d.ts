declare module "@serwist/next" {
  import type { NextConfig } from "next";

  interface SerwistNextConfig {
    swSrc: string;
    swDest: string;
    disable?: boolean;
    reloadOnOnline?: boolean;
    scope?: string;
    cacheOnNavigation?: boolean;
    swUrl?: string;
    register?: boolean;
    maximumFileSizeToCacheInBytes?: number;
    additionalPrecacheEntries?: (string | { url: string; revision?: string })[];
    dontCacheBustURLsMatching?: RegExp;
    exclude?: (string | RegExp)[];
    excludeChunks?: string[];
    chunks?: "all" | string[];
    mode?: "production" | "development";
    navigateFallback?: string;
    navigateFallbackAllowlist?: RegExp[];
    navigateFallbackDenylist?: RegExp[];
    offlineAnalyticsConfig?: boolean | object;
  }

  function withSerwist(
    config: SerwistNextConfig,
  ): (nextConfig: NextConfig) => NextConfig;

  export default withSerwist;
}
