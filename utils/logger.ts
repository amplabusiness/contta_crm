/**
 * logger.ts
 * 
 * Sistema de logging estruturado com Pino
 * - Performance otimizada (10x mais rápido que Winston)
 * - JSON format para parsing automático
 * - Correlation IDs integrados
 * - Níveis: debug, info, warn, error, fatal
 * - Pretty print em desenvolvimento
 */

import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

// ============================================================================
// TIPOS
// ============================================================================

export interface LogContext {
  correlationId?: string;
  userId?: string;
  companyId?: string;
  dealId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface PerformanceTracker {
  start: number;
  end?: number;
  duration?: number;
  checkpoint: (label: string) => void;
  finish: () => number;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Configuração do Pino
 */
const pinoConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Em desenvolvimento: pretty print
  // Em produção: JSON para parsing
  transport: isDevelopment && !isTest ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{levelLabel} - {msg} {correlationId}',
    },
  } : undefined,
  
  // Campos base em todas as mensagens
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'contta-crm',
  },
  
  // Serializers customizados
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  
  // Timestamps ISO8601
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
};

// ============================================================================
// LOGGER SINGLETON
// ============================================================================

/**
 * Logger global da aplicação
 */
export const logger: Logger = pino(pinoConfig);

// ============================================================================
// CHILD LOGGERS (com contexto)
// ============================================================================

/**
 * Cria child logger com contexto específico
 * 
 * @example
 * const log = createLogger({ correlationId: 'abc123', userId: 'user123' });
 * log.info('User action performed');
 */
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

/**
 * Cria logger para módulo específico
 * 
 * @example
 * const log = createModuleLogger('gemini-service');
 * log.info('Analyzing churn risk');
 */
export function createModuleLogger(moduleName: string, context?: LogContext): Logger {
  return logger.child({
    module: moduleName,
    ...context,
  });
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Inicia rastreamento de performance
 * 
 * @example
 * const perf = startPerformanceTracking();
 * // ... código ...
 * perf.checkpoint('database-query');
 * // ... mais código ...
 * const duration = perf.finish();
 * logger.info({ duration }, 'Operation completed');
 */
export function startPerformanceTracking(): PerformanceTracker {
  const start = performance.now();
  const checkpoints: Array<{ label: string; time: number }> = [];
  
  return {
    start,
    
    checkpoint: (label: string) => {
      const time = performance.now();
      checkpoints.push({ label, time: time - start });
      
      if (isDevelopment) {
        logger.debug({ 
          checkpoint: label, 
          elapsed: `${(time - start).toFixed(2)}ms` 
        }, `Checkpoint: ${label}`);
      }
    },
    
    finish: () => {
      const end = performance.now();
      const duration = end - start;
      
      if (isDevelopment && checkpoints.length > 0) {
        logger.debug({ 
          checkpoints,
          totalDuration: `${duration.toFixed(2)}ms` 
        }, 'Performance tracking completed');
      }
      
      return duration;
    },
  };
}

/**
 * Wrapper para função com performance tracking automático
 * 
 * @example
 * const result = await trackPerformance('analyze-churn', async () => {
 *   return analyzeChurnRiskV2(data);
 * }, { correlationId: 'abc123' });
 */
export async function trackPerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const log = context ? createLogger(context) : logger;
  const perf = startPerformanceTracking();
  
  log.debug({ operation: operationName }, `Starting: ${operationName}`);
  
  try {
    const result = await operation();
    const duration = perf.finish();
    
    log.info({ 
      operation: operationName,
      duration: `${duration.toFixed(2)}ms`,
      success: true,
    }, `Completed: ${operationName}`);
    
    return result;
    
  } catch (error) {
    const duration = perf.finish();
    
    log.error({ 
      operation: operationName,
      duration: `${duration.toFixed(2)}ms`,
      error,
      success: false,
    }, `Failed: ${operationName}`);
    
    throw error;
  }
}

// ============================================================================
// HTTP REQUEST LOGGING
// ============================================================================

/**
 * Log de request HTTP (middleware-style)
 * 
 * @example
 * logRequest({
 *   method: 'GET',
 *   url: '/api/analytics-churn',
 *   correlationId: 'abc123',
 *   userId: 'user123',
 * });
 */
export function logRequest(params: {
  method: string;
  url: string;
  correlationId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}): void {
  logger.info({
    type: 'http.request',
    method: params.method,
    url: params.url,
    correlationId: params.correlationId,
    userId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
  }, `${params.method} ${params.url}`);
}

/**
 * Log de response HTTP
 * 
 * @example
 * logResponse({
 *   method: 'GET',
 *   url: '/api/analytics-churn',
 *   statusCode: 200,
 *   duration: 125.45,
 *   correlationId: 'abc123',
 * });
 */
export function logResponse(params: {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  correlationId?: string;
  userId?: string;
  error?: Error;
}): void {
  const level = params.statusCode >= 500 ? 'error' 
    : params.statusCode >= 400 ? 'warn' 
    : 'info';
  
  logger[level]({
    type: 'http.response',
    method: params.method,
    url: params.url,
    statusCode: params.statusCode,
    duration: `${params.duration.toFixed(2)}ms`,
    correlationId: params.correlationId,
    userId: params.userId,
    error: params.error,
  }, `${params.method} ${params.url} ${params.statusCode} (${params.duration.toFixed(0)}ms)`);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Log de erro com contexto completo
 * 
 * @example
 * logError(error, {
 *   operation: 'analyze-churn',
 *   correlationId: 'abc123',
 *   userId: 'user123',
 * });
 */
export function logError(
  error: Error | unknown,
  context?: LogContext & { operation?: string }
): void {
  const log = context ? createLogger(context) : logger;
  
  log.error({
    error: error instanceof Error ? error : new Error(String(error)),
    operation: context?.operation,
    ...context,
  }, error instanceof Error ? error.message : String(error));
}

/**
 * Log de cache hit/miss
 */
export function logCacheOperation(params: {
  operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear';
  key: string;
  ttl?: number;
  correlationId?: string;
}): void {
  logger.debug({
    type: 'cache',
    operation: params.operation,
    key: params.key,
    ttl: params.ttl,
    correlationId: params.correlationId,
  }, `Cache ${params.operation}: ${params.key}`);
}

/**
 * Log de operação de database
 */
export function logDatabaseOperation(params: {
  operation: 'query' | 'insert' | 'update' | 'delete';
  table: string;
  duration: number;
  rowCount?: number;
  correlationId?: string;
}): void {
  logger.debug({
    type: 'database',
    operation: params.operation,
    table: params.table,
    duration: `${params.duration.toFixed(2)}ms`,
    rowCount: params.rowCount,
    correlationId: params.correlationId,
  }, `DB ${params.operation} on ${params.table} (${params.duration.toFixed(0)}ms)`);
}

/**
 * Log de chamada a API externa
 */
export function logExternalAPI(params: {
  service: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  duration: number;
  cached?: boolean;
  correlationId?: string;
}): void {
  logger.info({
    type: 'external.api',
    service: params.service,
    endpoint: params.endpoint,
    method: params.method,
    statusCode: params.statusCode,
    duration: `${params.duration.toFixed(2)}ms`,
    cached: params.cached,
    correlationId: params.correlationId,
  }, `${params.service} API: ${params.method} ${params.endpoint} (${params.duration.toFixed(0)}ms)`);
}

/**
 * Log de evento de negócio
 */
export function logBusinessEvent(params: {
  event: string;
  entity: string;
  entityId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}): void {
  logger.info({
    type: 'business.event',
    event: params.event,
    entity: params.entity,
    entityId: params.entityId,
    userId: params.userId,
    metadata: params.metadata,
    correlationId: params.correlationId,
  }, `Business Event: ${params.event} on ${params.entity}/${params.entityId}`);
}

// ============================================================================
// REDACT SENSITIVE DATA
// ============================================================================

/**
 * Remove dados sensíveis antes de logar
 */
export function redactSensitiveData<T>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'apikey',
    'secret',
    'authorization',
    'cookie',
    'creditcard',
    'ssn',
    'cpf',
    'cnpj',
  ];

  const redacted: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
      redacted[key] = '***REDACTED***';
    } else {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted as unknown as T;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default logger;

// Re-export tipos do Pino para conveniência
export type { Logger, LoggerOptions } from 'pino';
