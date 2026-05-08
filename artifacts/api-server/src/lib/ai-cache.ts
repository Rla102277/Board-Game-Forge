/**
 * AI Response Caching Layer
 * 
 * Caches expensive AI responses to reduce costs and improve response times.
 * Cache keys are based on content hash + model + prompt type.
 * 
 * Note: This is a memory-based cache. For production with multiple server instances,
 * consider using Redis or a database-backed cache.
 */

import { createHash } from "crypto";
import { logger } from "./logger";

interface CacheEntry {
  value: string;
  timestamp: number;
  model: string;
  promptHash: string;
}

interface CacheConfig {
  ttlMs: number;        // Time to live in milliseconds
  maxSize: number;      // Maximum number of entries
}

const DEFAULT_CONFIG: CacheConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours for AI responses
  maxSize: 1000,              // Max 1000 cached responses
};

class AIResponseCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a cache key from prompt and model
   */
  private generateKey(prompt: string, model: string): string {
    const normalizedPrompt = prompt.trim().toLowerCase().replace(/\s+/g, " ");
    const hash = createHash("sha256").update(normalizedPrompt).digest("hex").slice(0, 32);
    return `${model}:${hash}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, model: string): string | null {
    const key = this.generateKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      logger.debug({ key }, "AI cache entry expired");
      return null;
    }

    logger.debug({ key, age: now - entry.timestamp }, "AI cache hit");
    return entry.value;
  }

  /**
   * Store response in cache
   */
  set(prompt: string, model: string, value: string): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        logger.debug({ key: oldestKey }, "AI cache evicted oldest entry");
      }
    }

    const key = this.generateKey(prompt, model);
    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      model,
      promptHash: createHash("sha256").update(prompt).digest("hex").slice(0, 16),
    };

    this.cache.set(key, entry);
    logger.debug({ key, size: this.cache.size }, "AI cache stored");
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    logger.info("AI cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs,
    };
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info({ removed, remaining: this.cache.size }, "AI cache cleanup completed");
    }

    return removed;
  }
}

// Singleton instance
const aiCache = new AIResponseCache();

/**
 * Wrap an AI completion function with caching
 */
export function withCache(
  fn: (prompt: string, options?: { maxTokens?: number }) => Promise<string>,
  model: string,
): (prompt: string, options?: { maxTokens?: number }) => Promise<string> {
  return async (prompt: string, options?: { maxTokens?: number }): Promise<string> => {
    // Check cache first
    const cached = aiCache.get(prompt, model);
    if (cached !== null) {
      return cached;
    }

    // Call the actual AI function
    const result = await fn(prompt, options);

    // Cache the result
    aiCache.set(prompt, model, result);

    return result;
  };
}

export { aiCache, AIResponseCache };
export type { CacheEntry, CacheConfig };
