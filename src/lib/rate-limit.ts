/**
 * rate-limit.ts
 * ---------------------------------------------------------------------------
 * In-memory sliding-window rate limiter for Next.js API routes.
 *
 * Each unique key (typically the client IP) gets a bucket that tracks
 * how many requests were made within the last `windowMs` milliseconds.
 * When the count exceeds `max` the request is rejected with 429.
 *
 * ⚠️  In-memory means state is NOT shared across serverless instances.
 *     For high-traffic production workloads consider Upstash Redis instead.
 *     For Teramy's current scale this is perfectly fine.
 */

interface Bucket {
  count: number;
  resetAt: number; // Unix timestamp (ms) when the window resets
}

const store = new Map<string, Bucket>();

// Clean up expired buckets every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  store.forEach((bucket, key) => {
    if (bucket.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Window duration in milliseconds (default: 60 000 = 1 minute) */
  windowMs?: number;
  /** Maximum requests per window per key (default: 20) */
  max?: number;
}

export interface RateLimitResult {
  success: boolean;   // true → allowed, false → blocked
  remaining: number;  // requests left in the current window
  resetAt: number;    // when the window resets (Unix ms)
}

/**
 * Check whether the given `key` is within rate limits.
 *
 * @param key      Unique identifier for the client — use IP address
 * @param options  Window & max overrides
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { windowMs = 60_000, max = 20 } = options;
  const now = Date.now();

  let bucket = store.get(key);

  // Create or reset bucket when the window has expired
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;

  return {
    success: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * Extract the real client IP from a Next.js request.
 * Handles proxies (Vercel, Cloudflare) by reading standard forwarding headers.
 */
export function getClientIp(request: Request): string {
  const headers = new Headers((request as any).headers);

  // Vercel / Cloudflare forward the real IP in these headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // "x-forwarded-for" can be a comma-separated list; first entry is client
    return forwarded.split(',')[0].trim();
  }

  return headers.get('x-real-ip') ?? 'unknown';
}
