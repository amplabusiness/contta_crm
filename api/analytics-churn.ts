/**
 * api/analytics-churn.ts
 * 
 * Endpoint para predição de churn usando Gemini AI
 * 
 * Analisa histórico de deals, tasks e engajamento para prever
 * quais clientes têm risco de churn e sugere ações preventivas.
 * 
 * @see PLANO_PRODUCAO.md - Seção 4 (Agentes IA)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeChurnRiskV2 } from '../services/geminiService.v2.ts';
import { rateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from '../utils/rateLimit.ts';
import { RateLimitError } from '../utils/errors.ts';
import { 
  createModuleLogger, 
  logRequest, 
  logResponse,
  startPerformanceTracking,
  logDatabaseOperation,
} from '../utils/logger.ts';
import {
  captureError,
  addHttpBreadcrumb,
  addDatabaseBreadcrumb,
  trackTransaction,
} from '../utils/sentry.ts';

const logger = createModuleLogger('analytics-churn');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const perf = startPerformanceTracking();
  const clientIp = getClientIp(req.headers);
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log request inicial
  logRequest({
    method: req.method,
    url: req.url || '/api/analytics-churn',
    ip: clientIp,
    userAgent: req.headers['user-agent'] as string,
  });
  
  // Sentry breadcrumb
  addHttpBreadcrumb({
    method: req.method,
    url: req.url || '/api/analytics-churn',
  });

  try {
    // 🛡️ RATE LIMITING
    const rateLimitInfo = await rateLimit(
      `ip:${clientIp}`,
      RATE_LIMITS.AI_ANALYSIS
    );
    
    // Adicionar headers de rate limit
    Object.entries(rateLimitHeaders(rateLimitInfo)).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    perf.checkpoint('rate-limit-check');
    
    // 1. Buscar todos os deals "Closed Won" (clientes ativos)
    const dbStart = Date.now();
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('stage', 'Closed Won');

    if (dealsError) throw dealsError;
    
    const dbDuration = Date.now() - dbStart;
    logDatabaseOperation({
      operation: 'query',
      table: 'deals',
      duration: dbDuration,
      rowCount: deals?.length || 0,
    });
    
    // Sentry breadcrumb
    addDatabaseBreadcrumb({
      operation: 'query',
      table: 'deals',
      rowCount: deals?.length || 0,
    });
    
    perf.checkpoint('fetch-deals');

    if (!deals || deals.length === 0) {
      const duration = perf.finish();
      logResponse({
        method: req.method,
        url: req.url || '/api/analytics-churn',
        statusCode: 200,
        duration,
      });
      return res.status(200).json([]);
    }

    // 2. Para cada deal, buscar histórico de atividades (tasks)
    const churnPredictions = [];

    for (const deal of deals) {
      // Buscar tasks relacionadas ao deal
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false });

      // Calcular métricas de engajamento
      const lastActivityDate = tasks?.[0]?.created_at || deal.last_activity;
      const daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const completedTasks = tasks?.filter(t => t.status === 'Concluída').length || 0;
      const totalTasks = tasks?.length || 0;
      const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

      // 3. Usar Gemini AI V2 (otimizada) para analisar risco de churn
      const analysis = await analyzeChurnRiskV2({
        company_name: deal.company_name,
        deal_value: deal.value,
        days_since_last_activity: daysSinceLastActivity,
        task_completion_rate: taskCompletionRate,
        total_tasks: totalTasks,
        deal_stage: deal.stage,
        contact_email: deal.contact_email,
      });

      churnPredictions.push({
        id: deal.id,
        companyName: deal.company_name,
        churnRisk: analysis.risk_score,
        primaryReason: analysis.primary_reason,
        suggestedAction: analysis.suggested_action,
      });
    }

    // 4. Ordenar por risco (maior primeiro)
    churnPredictions.sort((a, b) => b.churnRisk - a.churnRisk);
    
    perf.checkpoint('ai-analysis');

    // 5. Retornar top 10 com maior risco
    const duration = perf.finish();
    
    logger.info({
      totalDeals: deals.length,
      predictionsCount: churnPredictions.length,
      duration: `${duration.toFixed(2)}ms`,
    }, 'Churn analysis completed successfully');
    
    logResponse({
      method: req.method,
      url: req.url || '/api/analytics-churn',
      statusCode: 200,
      duration,
    });
    
    return res.status(200).json(churnPredictions.slice(0, 10));

  } catch (error: any) {
    const duration = perf.finish();
    
    // Tratar erro de rate limit separadamente
    if (error instanceof RateLimitError) {
      Object.entries(rateLimitHeaders({
        limit: error.context.limit,
        remaining: 0,
        reset: Date.now() + (error.retryAfter * 1000),
        retryAfter: error.retryAfter,
      })).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      logResponse({
        method: req.method,
        url: req.url || '/api/analytics-churn',
        statusCode: 429,
        duration,
        error,
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
        retryAfter: error.retryAfter,
      });
    }
    
    logger.error({
      error,
      url: req.url,
      duration: `${duration.toFixed(2)}ms`,
    }, 'Churn analysis failed');
    
    // Capturar erro no Sentry (exceto rate limits esperados)
    if (!(error instanceof RateLimitError)) {
      captureError(error, {
        endpoint: req.url || '/api/analytics-churn',
        method: req.method,
        ip: clientIp,
        duration: `${duration.toFixed(2)}ms`,
      });
    }
    
    logResponse({
      method: req.method,
      url: req.url || '/api/analytics-churn',
      statusCode: 500,
      duration,
      error,
    });
    
    return res.status(500).json({
      error: 'Erro ao gerar predições de churn',
      message: error.message
    });
  }
}
