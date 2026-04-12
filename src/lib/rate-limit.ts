/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Each limiter tracks requests per key (typically IP) within a sliding window.
 * State resets on worker restart — acceptable for edge deployments where
 * the goal is to prevent casual abuse, not determined attackers.
 *
 * For stricter guarantees, swap the backing store to KV or Durable Objects.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean;
}

/**
 * Creates a rate limiter that allows `maxRequests` per `windowMs` per key.
 * Automatically evicts expired entries to prevent memory growth.
 */
export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const entries = new Map<string, RateLimitEntry>();
  let lastCleanup = Date.now();

  function cleanup(now: number) {
    // Run cleanup at most once per window to avoid overhead
    if (now - lastCleanup < windowMs) return;
    lastCleanup = now;
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) entries.delete(key);
    }
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      cleanup(now);

      const entry = entries.get(key);
      if (!entry || now > entry.resetAt) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= maxRequests) return false;
      entry.count++;
      return true;
    },
  };
}

/** Extract the client IP from Cloudflare or proxy headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

/** Return a 429 JSON response. */
export function rateLimitResponse(message = 'Too many requests. Please try again later.'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  });
}

// ── Pre-configured limiters for common use cases ────────────────────────────

/** 10 booking attempts per IP per hour */
export const bookingLimiter = createRateLimiter(10, 60 * 60 * 1000);

/** 5 inquiry submissions per IP per hour */
export const inquiryLimiter = createRateLimiter(5, 60 * 60 * 1000);

/** 10 login attempts per IP per 15 minutes */
export const authLimiter = createRateLimiter(10, 15 * 60 * 1000);

/** 5 password reset requests per IP per hour */
export const passwordResetLimiter = createRateLimiter(5, 60 * 60 * 1000);
