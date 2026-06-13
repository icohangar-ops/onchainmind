/**
 * Tests for src/utils/cache.ts — MemoryCache TTL expiry, the periodic cleanup
 * sweep, hit/miss stats, and destroy().
 */
import { MemoryCache, getGlobalCache } from "../src/utils/cache";

describe("MemoryCache", () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    cache = new MemoryCache<string>(1000);
  });

  afterEach(() => {
    cache.destroy();
    jest.useRealTimers();
  });

  it("stores and retrieves a value before it expires", () => {
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
    expect(cache.has("k")).toBe(true);
    expect(cache.size()).toBe(1);
  });

  it("returns undefined for a missing key and counts a miss", () => {
    expect(cache.get("nope")).toBeUndefined();
    expect(cache.getStats().misses).toBe(1);
    expect(cache.getStats().hits).toBe(0);
  });

  it("expires an entry once its TTL elapses (lazy expiry on get)", () => {
    cache.set("k", "v", 1000);
    jest.advanceTimersByTime(999);
    expect(cache.get("k")).toBe("v");

    jest.advanceTimersByTime(2); // now past expiresAt (1000)
    expect(cache.get("k")).toBeUndefined();
    // Expired read deletes the entry and counts as a miss.
    expect(cache.size()).toBe(0);
  });

  it("uses the per-entry TTL override over the default", () => {
    cache.set("short", "v", 100);
    cache.set("long", "v", 5000);

    jest.advanceTimersByTime(150);
    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("long")).toBe("v");
  });

  it("periodic cleanup sweeps expired entries without a get()", () => {
    cache.set("a", "v", 500);
    // "b" must outlive the 60_000ms cleanup interval so we can assert the sweep
    // removed only the expired entry, not the live one.
    cache.set("b", "v", 120_000);
    expect(cache.size()).toBe(2);

    // The cleanup interval fires every 60_000ms. Advance past it; "a" is gone.
    jest.advanceTimersByTime(60_000);
    expect(cache.size()).toBe(1);
    expect(cache.get("b")).toBe("v");
  });

  it("tracks hit rate across hits and misses", () => {
    cache.set("k", "v");
    cache.get("k"); // hit
    cache.get("k"); // hit
    cache.get("x"); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
  });

  it("delete and clear remove entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("destroy clears the cleanup interval and empties the cache", () => {
    const clearSpy = jest.spyOn(global, "clearInterval");
    cache.set("k", "v");
    cache.destroy();
    expect(clearSpy).toHaveBeenCalled();
    expect(cache.size()).toBe(0);
    clearSpy.mockRestore();
  });

  it("getGlobalCache returns a reused singleton", () => {
    const a = getGlobalCache();
    const b = getGlobalCache();
    expect(a).toBe(b);
    a.destroy();
  });
});
