/**
 * cache.ts
 * 
 * Abstração de cache com Upstash Redis + fallback em memória
 * Funciona tanto em serverless (Vercel) quanto local
 */

import { Redis } from '@upstash/redis';

// ============================================================================
// TIPOS
// ============================================================================

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getMetrics(): CacheMetrics;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: string;
  size?: number;
}

// ============================================================================
// REDIS ADAPTER (Upstash)
// ============================================================================

class RedisAdapter implements CacheAdapter {
  private redis: Redis;
  private metrics: Omit<CacheMetrics, 'hitRate'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(url: string, token: string) {
    this.redis = new Redis({
      url,
      token,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      if (value !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      return value;
    } catch (error) {
      console.error('[RedisAdapter] Get failed:', error);
      this.metrics.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      this.metrics.sets++;
    } catch (error) {
      console.error('[RedisAdapter] Set failed:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.metrics.deletes++;
    } catch (error) {
      console.error('[RedisAdapter] Delete failed:', error);
    }
  }

  async clear(): Promise<void> {
    console.warn('[RedisAdapter] Clear not implemented (use Redis CLI)');
  }

  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 
        ? `${((this.metrics.hits / total) * 100).toFixed(2)}%` 
        : '0%',
    };
  }
}

// ============================================================================
// MEMORY ADAPTER (Fallback)
// ============================================================================

class MemoryAdapter implements CacheAdapter {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private metrics: Omit<CacheMetrics, 'hitRate'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.metrics.misses++;
      return null;
    }
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    this.metrics.hits++;
    return cached.data as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.metrics.sets++;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.metrics.deletes++;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    console.log('[MemoryAdapter] Cache cleared');
  }

  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      size: this.cache.size,
      hitRate: total > 0 
        ? `${((this.metrics.hits / total) * 100).toFixed(2)}%` 
        : '0%',
    };
  }
}

// ============================================================================
// CACHE FACTORY
// ============================================================================

let cacheInstance: CacheAdapter | null = null;

export function createCache(): CacheAdapter {
  if (cacheInstance) {
    return cacheInstance;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    console.log('[Cache] Initializing Upstash Redis adapter');
    cacheInstance = new RedisAdapter(redisUrl, redisToken);
  } else {
    console.warn('[Cache] Redis credentials not found, using Memory adapter');
    cacheInstance = new MemoryAdapter();
  }

  return cacheInstance;
}

/**
 * Singleton cache instance
 */
export const cache = createCache();

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Cache key builder com namespace
 */
export function buildCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `crm:${namespace}:${parts.join(':')}`;
}

/**
 * Invalidação em lote (pattern matching)
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  console.log(`[Cache] Invalidating pattern: ${pattern}`);
  // Redis SCAN com pattern matching (apenas Redis adapter)
  // Memory adapter: limpar tudo ou implementar pattern matching manual
}

/**
 * Cache warming - pré-carrega dados críticos
 */
type WarmCacheEntry = {
  key: string;
  fetcher: () => Promise<unknown>;
  ttl?: number;
};

type WarmCacheResult = {
  key: string;
  status: 'already-cached' | 'warmed';
};

export async function warmCache(entries: WarmCacheEntry[]): Promise<void> {
  console.log(`[Cache] Warming ${entries.length} keys...`);

  const results = await Promise.allSettled<WarmCacheResult>(
    entries.map(async ({ key, fetcher, ttl }) => {
      const cached = await cache.get(key);
      if (cached) {
        return { key, status: 'already-cached' } as WarmCacheResult;
      }

      const data = await fetcher();
      await cache.set(key, data, ttl);
      return { key, status: 'warmed' } as WarmCacheResult;
    })
  );

  const warmed = results.reduce((count, result) => {
    if (result.status === 'fulfilled' && result.value.status === 'warmed') {
      return count + 1;
    }
    return count;
  }, 0);

  console.log(`[Cache] Warmed ${warmed}/${entries.length} keys`);
}

/**
 * Cache-aside pattern helper
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  // 1. Tentar buscar do cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // 2. Cache miss - buscar da fonte
  const data = await fetcher();
  
  // 3. Salvar no cache
  await cache.set(key, data, ttlSeconds);
  
  return data;
}

/**
 * Write-through cache pattern
 */
export async function cacheWriteThrough<T>(
  key: string,
  data: T,
  persister: (data: T) => Promise<void>,
  ttlSeconds = 300
): Promise<void> {
  // 1. Escrever na fonte primária
  await persister(data);
  
  // 2. Atualizar cache
  await cache.set(key, data, ttlSeconds);
}

/**
 * Cache invalidation on write
 */
export async function invalidateOnWrite(
  keys: string[],
  writer: () => Promise<void>
): Promise<void> {
  // 1. Executar escrita
  await writer();
  
  // 2. Invalidar cache
  await Promise.all(keys.map(key => cache.delete(key)));
  
  console.log(`[Cache] Invalidated ${keys.length} keys after write`);
}
