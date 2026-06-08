/**
 * OnchainMind — In-Memory Cache Utility
 *
 * TTL-based caching for API responses and computed results.
 * Supports generic typed values with automatic expiry cleanup.
 */

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
  readonly createdAt: number;
}

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly defaultTtlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null;
  private hitCount: number;
  private missCount: number;

  constructor(defaultTtlMs: number = 30_000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
    this.cleanupInterval = null;
    this.hitCount = 0;
    this.missCount = 0;

    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60_000);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    this.hitCount++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };
    this.cache.set(key, entry);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      size: this.cache.size,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/** Global singleton cache instance */
let globalCache: MemoryCache<unknown> | null = null;

export function getGlobalCache(ttlMs?: number): MemoryCache<unknown> {
  if (!globalCache) {
    globalCache = new MemoryCache<unknown>(ttlMs ?? 30_000);
  }
  return globalCache;
}
