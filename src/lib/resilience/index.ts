/**
 * VENDORED COPY — keep in sync with the canonical package.
 *
 * Vendored from @cubiczan/resilience (icohangar-ops/cubiczan-resilience,
 * typescript/src) at typescript-v0.2.0
 * (commit 60dc5f4b7030bef492fe5df0d432ae49fd612f37).
 * Check the canonical package for updates before modifying locally; this
 * copy's scope and intentional local deltas are recorded in VENDOR_COMMIT.txt
 * beside this file.
 */

/**
 * Vendored subset of cubiczan-resilience (TypeScript).
 *
 * Copied into this repo (no npm registry available). Only the primitives this
 * project wires are included: typed errors, retry/backoff, timeout, safeFetch
 * (timeout + retry + SSRF guard), a sliding-window rate limiter, and the
 * fail-closed requireAuth helper.
 */
export {
  ResilienceError,
  isResilienceError,
  type ResilienceErrorKind,
  type ResilienceErrorOptions,
} from "./errors";

export { withTimeout } from "./timeout";

export { retry, computeBackoff, type RetryOptions } from "./retry";

export {
  safeFetch,
  type SafeFetchOptions,
  type AllowlistHook,
} from "./safeFetch";

export {
  SlidingWindowRateLimiter,
  type RateLimitOptions,
  type RateLimitResult,
} from "./rateLimit";

export {
  requireAuth,
  requireAuthResponse,
  type AuthResult,
  type RequireAuthOptions,
} from "./auth";
