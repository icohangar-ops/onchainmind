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
