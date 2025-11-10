/**
 * sentry-init.ts
 * 
 * Inicialização única do Sentry para ser importada nos endpoints
 * Garante que o Sentry é inicializado apenas uma vez
 */

import { initSentry, setupGlobalErrorHandlers } from './sentry.ts';

// Inicializar apenas uma vez
let initialized = false;

export function ensureSentryInitialized(): void {
  if (!initialized && process.env.SENTRY_DSN) {
    initSentry();
    setupGlobalErrorHandlers();
    initialized = true;
  }
}

// Auto-inicializar ao importar este módulo
ensureSentryInitialized();
