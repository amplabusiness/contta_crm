/**
 * sentry.ts
 * 
 * Integração com Sentry para error tracking e monitoring em production
 * - Captura automática de errors
 * - Breadcrumbs para rastreamento de flow
 * - Context enrichment (correlation ID, user, company)
 * - Performance monitoring (transactions)
 * - Sampling configurável
 */

import * as Sentry from '@sentry/node';
import { isCRMError, type CRMError } from './errors.ts';
import { logger } from './logger.ts';

// ============================================================================
// TIPOS
// ============================================================================

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface SentryContext {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  companyId?: string;
  companyName?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, any>;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Inicializa o Sentry (chamar uma vez no bootstrap da aplicação)
 */
export function initSentry(): void {
  // Não inicializar em test ou se DSN não configurado
  if (isTest || !process.env.SENTRY_DSN) {
    if (!isTest) {
      logger.warn('Sentry DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking (usar commit SHA do deploy)
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    
    // Sampling para reduzir custos
    // Production: 10% das transações, 100% dos errors
    // Development: 100% de tudo
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    
    // Integrations - usar apenas as built-in do @sentry/node
    integrations: [
      // HTTP tracking já incluído por padrão no Sentry.init
    ],
    
    // BeforeSend: enriquecer eventos antes de enviar
    beforeSend(event, hint) {
      // Em desenvolvimento, logar evento no console
      if (isDevelopment) {
        logger.debug({ event, hint }, 'Sentry event captured');
      }
      
      // Filtrar eventos de baixa prioridade em produção
      if (!isDevelopment && event.level === 'debug') {
        return null;
      }
      
      return event;
    },
    
    // BeforeBreadcrumb: filtrar breadcrumbs desnecessários
    beforeBreadcrumb(breadcrumb) {
      // Filtrar breadcrumbs de console.log em produção
      if (!isDevelopment && breadcrumb.category === 'console') {
        return null;
      }
      
      return breadcrumb;
    },
    
    // Ignorar certos erros conhecidos
    ignoreErrors: [
      // Network errors (não são bugs da aplicação)
      'NetworkError',
      'Network request failed',
      
      // Rate limit (esperado, não é erro)
      'Rate limit exceeded',
      
      // Timeouts de navegador
      'timeout',
      'AbortError',
    ],
  });
  
  logger.info({
    dsn: process.env.SENTRY_DSN?.slice(0, 30) + '...',
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
  }, 'Sentry initialized');
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

/**
 * Define contexto do usuário para todas as capturas seguintes
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  companyId?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
  
  // Adicionar company no contexto extra
  if (user.companyId) {
    Sentry.setContext('company', {
      id: user.companyId,
    });
  }
}

/**
 * Limpa contexto do usuário (logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
  Sentry.setContext('company', null);
}

/**
 * Define tags customizadas
 */
export function setTags(tags: Record<string, string | number | boolean>): void {
  Sentry.setTags(tags);
}

/**
 * Define contexto adicional
 */
export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context);
}

// ============================================================================
// ERROR CAPTURING
// ============================================================================

/**
 * Captura erro manualmente com contexto enriquecido
 */
export function captureError(
  error: Error | unknown,
  context?: SentryContext
): string {
  // Enriquecer contexto se for CRMError
  if (isCRMError(error)) {
    const crmError = error as CRMError;
    
    // Adicionar correlation ID às tags
    if (crmError.correlationId) {
      Sentry.setTag('correlationId', crmError.correlationId);
    }
    
    // Adicionar contexto completo
    Sentry.setContext('error', {
      code: crmError.code,
      statusCode: crmError.statusCode,
      isOperational: crmError.isOperational,
      context: crmError.context,
      timestamp: crmError.timestamp,
    });
  }
  
  // Adicionar contexto customizado
  if (context) {
    if (context.correlationId) {
      Sentry.setTag('correlationId', context.correlationId);
    }
    if (context.userId) {
      Sentry.setUser({ id: context.userId });
    }
    if (context.endpoint) {
      Sentry.setTag('endpoint', context.endpoint);
    }
    
    // Contexto completo
    Sentry.setContext('custom', context);
  }
  
  // Capturar erro
  const eventId = Sentry.captureException(error);
  
  logger.info({
    eventId,
    errorMessage: error instanceof Error ? error.message : String(error),
    correlationId: context?.correlationId,
  }, 'Error captured by Sentry');
  
  return eventId;
}

/**
 * Captura mensagem (não é erro, mas informação importante)
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: SentryContext
): string {
  if (context) {
    Sentry.setContext('custom', context);
    
    if (context.correlationId) {
      Sentry.setTag('correlationId', context.correlationId);
    }
  }
  
  const eventId = Sentry.captureMessage(message, level);
  
  logger.debug({
    eventId,
    message,
    level,
  }, 'Message captured by Sentry');
  
  return eventId;
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

/**
 * Adiciona breadcrumb para rastreamento de flow
 */
export function addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Breadcrumb de HTTP request
 */
export function addHttpBreadcrumb(params: {
  method: string;
  url: string;
  statusCode?: number;
  data?: any;
}): void {
  addBreadcrumb({
    category: 'http',
    message: `${params.method} ${params.url}`,
    level: params.statusCode && params.statusCode >= 400 ? 'error' : 'info',
    data: {
      method: params.method,
      url: params.url,
      status_code: params.statusCode,
      ...params.data,
    },
  });
}

/**
 * Breadcrumb de operação de database
 */
export function addDatabaseBreadcrumb(params: {
  operation: string;
  table: string;
  rowCount?: number;
}): void {
  addBreadcrumb({
    category: 'database',
    message: `${params.operation} on ${params.table}`,
    data: {
      operation: params.operation,
      table: params.table,
      row_count: params.rowCount,
    },
  });
}

/**
 * Breadcrumb de operação de cache
 */
export function addCacheBreadcrumb(params: {
  operation: 'hit' | 'miss' | 'set' | 'delete';
  key: string;
}): void {
  addBreadcrumb({
    category: 'cache',
    message: `Cache ${params.operation}: ${params.key}`,
    data: params,
  });
}

/**
 * Breadcrumb de navegação do usuário
 */
export function addNavigationBreadcrumb(params: {
  from: string;
  to: string;
}): void {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigate from ${params.from} to ${params.to}`,
    data: params,
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Wrapper para trackear performance de função
 * Usa o SDK moderno do Sentry sem startTransaction
 */
export async function trackTransaction<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
  context?: SentryContext
): Promise<T> {
  // Adicionar breadcrumb para tracking
  addBreadcrumb({
    category: 'performance',
    message: `Starting: ${name}`,
    data: { operation, ...context },
  });
  
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    addBreadcrumb({
      category: 'performance',
      message: `Completed: ${name}`,
      data: { operation, duration: `${duration}ms`, success: true },
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    addBreadcrumb({
      category: 'performance',
      message: `Failed: ${name}`,
      level: 'error',
      data: { operation, duration: `${duration}ms`, success: false },
    });
    
    captureError(error, context);
    throw error;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Flush eventos pendentes (útil em serverless)
 * Aguarda até 2 segundos para enviar todos os eventos
 */
export async function flushEvents(timeout = 2000): Promise<boolean> {
  try {
    const success = await Sentry.flush(timeout);
    logger.debug({ success }, 'Sentry events flushed');
    return success;
  } catch (error) {
    logger.error({ error }, 'Failed to flush Sentry events');
    return false;
  }
}

/**
 * Wrapper para serverless functions
 * Garante que eventos são enviados antes da function terminar
 */
export function wrapServerlessHandler<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      const result = await handler(...args);
      await flushEvents();
      return result;
    } catch (error) {
      captureError(error);
      await flushEvents();
      throw error;
    }
  }) as T;
}

/**
 * Captura erro não tratado (global error handler)
 */
export function setupGlobalErrorHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    captureError(error, {
      type: 'uncaughtException',
    });
    
    // Flush e exit
    flushEvents().then(() => {
      process.exit(1);
    });
  });
  
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    captureError(
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        type: 'unhandledRejection',
      }
    );
  });
  
  logger.info('Global error handlers configured');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  init: initSentry,
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  setTags,
  setContext,
  addBreadcrumb,
  addHttpBreadcrumb,
  addDatabaseBreadcrumb,
  addCacheBreadcrumb,
  addNavigationBreadcrumb,
  trackTransaction,
  flushEvents,
  wrapServerlessHandler,
  setupGlobalErrorHandlers,
};

