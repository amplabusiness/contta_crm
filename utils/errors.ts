/**
 * errors.ts
 * 
 * Custom error classes para rastreamento e debugging
 * Padrão: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
 */

// ============================================================================
// BASE ERROR CLASSES
// ============================================================================

/**
 * Base error class para erros do CRM
 */
export class CRMError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
    };
  }
}

// ============================================================================
// AGENTES IA - SPECIFIC ERRORS
// ============================================================================

/**
 * Erro na análise de churn
 */
export class ChurnAnalysisError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'CHURN_ANALYSIS_ERROR',
      500,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro na análise de upsell
 */
export class UpsellAnalysisError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'UPSELL_ANALYSIS_ERROR',
      500,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro no Gemini API
 */
export class GeminiAPIError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'GEMINI_API_ERROR',
      503,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de validação de output
 */
export class OutputValidationError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'OUTPUT_VALIDATION_ERROR',
      422,
      true,
      context,
      correlationId
    );
  }
}

// ============================================================================
// API/DATABASE ERRORS
// ============================================================================

/**
 * Erro de autenticação
 */
export class AuthenticationError extends CRMError {
  constructor(
    message = 'Não autenticado',
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de autorização
 */
export class AuthorizationError extends CRMError {
  constructor(
    message = 'Sem permissão',
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de validação de dados
 */
export class ValidationError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends CRMError {
  constructor(
    message: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends CRMError {
  constructor(
    resource: string,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      `${resource} não encontrado`,
      'NOT_FOUND_ERROR',
      404,
      true,
      context,
      correlationId
    );
  }
}

/**
 * Erro de rate limiting
 */
export class RateLimitError extends CRMError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Muitas requisições',
    retryAfter?: number,
  context?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      429,
      true,
      context,
      correlationId
    );
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Type guard para verificar se erro é CRMError
 */
export function isCRMError(error: unknown): error is CRMError {
  return error instanceof CRMError;
}

/**
 * Extrai mensagem segura de erro desconhecido
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

/**
 * Gera correlation ID único
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Error boundary para async functions
 */
export function catchAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorClass: typeof CRMError = CRMError
): T {
  return (async (...args: Parameters<T>) => {
    try {
  return await fn(...args);
    } catch (error) {
      if (isCRMError(error)) {
        throw error;
      }
      throw new errorClass(
        getErrorMessage(error),
        'UNKNOWN_ERROR',
        500,
        true,
        { originalError: error instanceof Error ? error.stack : String(error) }
      );
    }
  }) as T;
}

/**
 * Formata erro para logging
 */
export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (isCRMError(error)) {
    return {
      type: 'CRMError',
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      correlationId: error.correlationId,
      timestamp: error.timestamp,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      type: 'Error',
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: 'Unknown',
    value: String(error),
  };
}
