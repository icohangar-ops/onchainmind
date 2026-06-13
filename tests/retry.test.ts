/**
 * Tests for src/utils/retry.ts — exponential backoff timing, attempt limits,
 * and the default shouldRetry predicate.
 */
import { withRetry, createRetryable } from "../src/utils/retry";

describe("withRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Deterministic jitter: Math.random() -> 0.5 makes the ±25% jitter term 0,
    // so calculateDelay returns exactly baseDelay * multiplier^attempt.
    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** Drain pending timers + microtasks so awaited sleeps resolve under fake timers. */
  async function flush(): Promise<void> {
    await Promise.resolve();
    await jest.runOnlyPendingTimersAsync();
  }

  it("returns immediately on first success without sleeping", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff timing (base * multiplier^attempt)", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("network glitch"))
      .mockRejectedValueOnce(new Error("network glitch"))
      .mockResolvedValue("recovered");

    const promise = withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 1000,
      backoffMultiplier: 2,
    });

    // Attempt 0 fails synchronously, then sleeps baseDelay * 2^0 = 1000ms.
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Attempt 1 fails, sleeps baseDelay * 2^1 = 2000ms.
    await jest.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe("recovered");
  });

  it("does NOT advance past the backoff delay prematurely", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 1000, backoffMultiplier: 2 });

    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    // Only 999ms elapsed — the retry must not have fired yet.
    await jest.advanceTimersByTimeAsync(999);
    expect(fn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toBe("ok");
  });

  it("throws the last error after exhausting maxAttempts", async () => {
    const err = new Error("ETIMEDOUT");
    const fn = jest.fn().mockRejectedValue(err);

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    const assertion = expect(promise).rejects.toThrow("ETIMEDOUT");

    await flush();
    await flush();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  describe("default shouldRetry predicate", () => {
    const retryableMessages = [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "request timeout exceeded",
      "rate limit hit",
      "HTTP 429 Too Many Requests",
      "503 Service Unavailable",
      "502 Bad Gateway",
      "network unreachable",
    ];

    it.each(retryableMessages)("retries on transient error: %s", async (message) => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error(message))
        .mockResolvedValue("ok");

      const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 5 });
      const assertion = expect(promise).resolves.toBe("ok");
      await jest.runOnlyPendingTimersAsync();
      await assertion;
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry a non-transient error (fail fast)", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("invalid argument: bad address"));
      await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 5 })).rejects.toThrow(
        "invalid argument",
      );
      // Only one attempt — predicate returned false, so no retry.
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("honors a custom shouldRetry that refuses all retries", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("ETIMEDOUT"));
      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelayMs: 5, shouldRetry: () => false }),
      ).rejects.toThrow("ETIMEDOUT");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  it("createRetryable wraps a function and forwards arguments", async () => {
    const raw = jest
      .fn(async (a: number, b: number) => a + b)
      .mockRejectedValueOnce(new Error("network blip"))
      .mockImplementation(async (a: number, b: number) => a + b);
    const wrapped = createRetryable(raw as never, { maxAttempts: 2, baseDelayMs: 5 });

    const promise = (wrapped as (a: number, b: number) => Promise<number>)(2, 3);
    const assertion = expect(promise).resolves.toBe(5);
    await jest.runOnlyPendingTimersAsync();
    await assertion;
    expect(raw).toHaveBeenCalledWith(2, 3);
  });
});
