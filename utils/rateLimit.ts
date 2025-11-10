/**
 * rateLimit.ts
 * 
 * Rate limiting com sliding window algorithm usando Redis
 * Previne abuso de API e protege recursos
 */

import { cache } from './cache.ts';
import { RateLimitError, generateCorrelationId } from './errors.ts';

// ============================================================================
// TIPOS
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;      // Janela de tempo em ms (ex: 60000 = 1 min)
  maxRequests: number;   // Máximo de requests na janela
  keyPrefix: string;     // Prefixo da chave (ex: 'ratelimit:ip')
  message?: string;      // Mensagem de erro customizada
  skipSuccessfulRequests?: boolean; // Não contar requests bem-sucedidos
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;         // Unix timestamp quando o limite reseta
  retryAfter?: number;   // Segundos até poder tentar novamente
}

// ============================================================================
// CONFIGURAÇÕES PADRÃO
// ============================================================================

export const RATE_LIMITS = {
  // Por usuário autenticado
  USER_ANALYTICS: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 10,
    keyPrefix: 'ratelimit:user',
    message: 'Limite de 10 requisições por minuto excedido',
  },
  
  // Por IP (usuários não autenticados)
  IP_GLOBAL: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 100,
    keyPrefix: 'ratelimit:ip',
    message: 'Limite de 100 requisições por minuto excedido',
  },
  
  // Endpoints específicos (AI agents - mais restritivo)
  AI_ANALYSIS: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 5,
    keyPrefix: 'ratelimit:ai',
    message: 'Limite de 5 análises IA por minuto excedido',
  },
  
  // Criação de recursos
  CREATE_RESOURCE: {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 20,
    keyPrefix: 'ratelimit:create',
    message: 'Limite de criação excedido',
  },
} as const;

// ============================================================================
// SLIDING WINDOW ALGORITHM
// ============================================================================

/**
 * Implementação do sliding window counter
 * Mais preciso que fixed window, previne burst attacks
 */
async function slidingWindowCheck(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Chave completa com timestamp bucket
  const fullKey = `${config.keyPrefix}:${key}`;
  
  try {
    // Buscar contador atual do Redis
    const cachedData = await cache.get<{
      requests: Array<{ timestamp: number }>;
      firstRequest: number;
    }>(fullKey);
    
    // Filtrar apenas requests dentro da janela atual
    const recentRequests = cachedData?.requests?.filter(
      req => req.timestamp > windowStart
    ) || [];
    
    const currentCount = recentRequests.length;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    
    // Calcular quando o limite reseta (primeira request + window)
    const firstRequestTime = recentRequests[0]?.timestamp || now;
    const resetTime = firstRequestTime + config.windowMs;
    
    // Verificar se excedeu o limite
    if (currentCount >= config.maxRequests) {
      const retryAfterMs = resetTime - now;
      
      throw new RateLimitError(
        config.message || 'Rate limit exceeded',
        Math.ceil(retryAfterMs / 1000), // Convert to seconds
        {
          limit: config.maxRequests,
          current: currentCount,
          window: `${config.windowMs / 1000}s`,
          key: fullKey,
        }
      );
    }
    
    // Adicionar novo request
    const updatedRequests = [
      ...recentRequests,
      { timestamp: now }
    ];
    
    // Salvar no cache (TTL = windowMs + buffer)
    await cache.set(
      fullKey,
      {
        requests: updatedRequests,
        firstRequest: firstRequestTime,
      },
      Math.ceil(config.windowMs / 1000) + 10 // +10s buffer
    );
    
    return {
      limit: config.maxRequests,
      remaining,
      reset: resetTime,
    };
    
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    // Se Redis falhar, permitir request (fail open)
    console.error('[rateLimit] Check failed, allowing request', {
      error: error instanceof Error ? error.message : String(error),
      key: fullKey,
    });
    
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: now + config.windowMs,
    };
  }
}

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

/**
 * Rate limiter para endpoints API
 * Uso: await rateLimit('user:123', RATE_LIMITS.USER_ANALYTICS)
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const correlationId = generateCorrelationId();
  
  console.log('[rateLimit] Checking', {
    identifier,
    limit: config.maxRequests,
    window: `${config.windowMs / 1000}s`,
    correlationId,
  });
  
  const info = await slidingWindowCheck(identifier, config);
  
  console.log('[rateLimit] Allowed', {
    identifier,
    remaining: info.remaining,
    correlationId,
  });
  
  return info;
}

/**
 * Rate limiter combinado (user + IP)
 * Usa o mais restritivo entre user_id e IP
 */
export async function rateLimitCombined(
  userId: string | null,
  ipAddress: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const results = await Promise.allSettled([
    userId ? rateLimit(`user:${userId}`, config) : null,
    rateLimit(`ip:${ipAddress}`, {
      ...config,
      maxRequests: Math.max(config.maxRequests, 100), // IP sempre mais permissivo
    }),
  ]);
  
  // Se qualquer um dos limiters falhar, propaga o erro
  const failed = results.find(r => r.status === 'rejected');
  if (failed && failed.status === 'rejected') {
    throw failed.reason;
  }
  
  // Retornar o mais restritivo (menor remaining)
  const infos = results
    .filter((r): r is PromiseFulfilledResult<RateLimitInfo> => 
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value);
  
  return infos.reduce((min, curr) => 
    curr.remaining < min.remaining ? curr : min
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extrai IP do request (Vercel/Next.js)
 */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  // Vercel forwarded IP
  const forwardedFor = headers instanceof Headers 
    ? headers.get('x-forwarded-for')
    : headers['x-forwarded-for'];
  
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  // Fallback para x-real-ip
  const realIp = headers instanceof Headers
    ? headers.get('x-real-ip')
    : headers['x-real-ip'];
  
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  return 'unknown';
}

/**
 * Formata headers de rate limit para resposta HTTP
 */
export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': String(info.reset),
    ...(info.retryAfter && {
      'Retry-After': String(info.retryAfter),
    }),
  };
}

/**
 * Reset manual de rate limit (admin)
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix: string
): Promise<void> {
  const fullKey = `${keyPrefix}:${identifier}`;
  await cache.delete(fullKey);
  console.log('[rateLimit] Reset', { key: fullKey });
}

/**
 * Obter informações de rate limit sem consumir
 */
export async function getRateLimitInfo(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const fullKey = `${config.keyPrefix}:${identifier}`;
  
  const cachedData = await cache.get<{
    requests: Array<{ timestamp: number }>;
    firstRequest: number;
  }>(fullKey);
  
  if (!cachedData) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: now + config.windowMs,
    };
  }
  
  const recentRequests = cachedData.requests.filter(
    req => req.timestamp > windowStart
  );
  
  const currentCount = recentRequests.length;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  const firstRequestTime = recentRequests[0]?.timestamp || now;
  const resetTime = firstRequestTime + config.windowMs;
  
  return {
    limit: config.maxRequests,
    remaining,
    reset: resetTime,
  };
}
