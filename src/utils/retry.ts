/**
 * OnchainMind — Retry Logic with Exponential Backoff
 *
 * Configurable retry mechanism for resilient API calls
 * and blockchain RPC interactions.
 */

export interface RetryOptions {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
  readonly shouldRetry: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    const retryablePatterns = [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "network",
      "timeout",
      "rate limit",
      "429",
      "503",
      "502",
    ];
    const message = error.message.toLowerCase();
    return retryablePatterns.some((pattern) => message.includes(pattern.toLowerCase()));
  },
};

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt);
  // Add jitter ±25% to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, options.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const mergedOptions: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < mergedOptions.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (
        attempt >= mergedOptions.maxAttempts - 1 ||
        !mergedOptions.shouldRetry(lastError)
      ) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, mergedOptions);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry failed: no attempts made");
}

/**
 * Create a retryable version of any async function.
 *
 * @param fn - The async function to wrap
 * @param options - Retry configuration
 * @returns A wrapped function with retry logic
 */
export function createRetryable<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options: Partial<RetryOptions> = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
