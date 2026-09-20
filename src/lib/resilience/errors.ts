/**
 * VENDORED COPY — keep in sync with the canonical package.
 *
 * Vendored from @cubiczan/resilience (icohangar-ops/cubiczan-resilience,
 * typescript/src) at typescript-v0.2.0
 * (commit 37ce1571f5beb751d153ecdc3b1457cd9c871e37).
 * Check the canonical package for updates before modifying locally; this
 * copy's scope and intentional local deltas are recorded in VENDOR_COMMIT.txt
 * beside this file.
 *
 * Local adaptation: No npm registry available — copied verbatim except relative import extensions stripped for this repo's commonjs/extensionless module style.
 */
export type ResilienceErrorKind =
  | "timeout"
  | "network"
  | "http"
  | "ssrf"
  | "exhausted"
  | "aborted";

export interface ResilienceErrorOptions {
  /** Number of attempts made before giving up (1-based). */
  readonly attempts?: number;
  /** HTTP status code, when the failure originated from an HTTP response. */
  readonly status?: number;
  /** Underlying error that triggered this failure, if any. */
  readonly cause?: unknown;
}

/**
 * Typed error thrown by the resilience primitives. Carries a machine-readable
 * `kind`, the number of attempts made, and (for HTTP failures) the status code.
 */
export class ResilienceError extends Error {
  readonly kind: ResilienceErrorKind;
  readonly attempts: number;
  readonly status: number | undefined;

  constructor(
    kind: ResilienceErrorKind,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(message);
    this.name = "ResilienceError";
    this.kind = kind;
    this.attempts = options.attempts ?? 1;
    this.status = options.status;
    if (options.cause !== undefined) {
      // Preserve the cause chain without requiring lib.es2022.error in older targets.
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, ResilienceError.prototype);
  }
}

/** Type guard for {@link ResilienceError}. */
export function isResilienceError(value: unknown): value is ResilienceError {
  return value instanceof ResilienceError;
}
