/**
 * api/analytics-upsell.ts
 * 
 * Endpoint para identificação de oportunidades de upsell/cross-sell usando Gemini AI
 * 
 * Analisa clientes atuais e identifica serviços adicionais que poderiam
 * ser oferecidos com base no perfil da empresa.
 * 
 * @see PLANO_PRODUCAO.md - Seção 4 (Agentes IA)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeUpsellOpportunityV2 } from '../services/geminiService.v2.ts';
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
} from '../utils/sentry.ts';

const logger = createModuleLogger('analytics-upsell');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
    url: req.url || '/api/analytics-upsell',
    ip: clientIp,
    userAgent: req.headers['user-agent'] as string,
  });
  
  // Sentry breadcrumb
  addHttpBreadcrumb({
    method: req.method,
    url: req.url || '/api/analytics-upsell',
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
    
    // 1. Buscar deals "Closed Won" (clientes ativos)
    const dbStart = Date.now();
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('stage', 'Closed Won')
      .order('value', { ascending: false })
      .limit(20); // Top 20 clientes por valor

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
        url: req.url || '/api/analytics-upsell',
        statusCode: 200,
        duration,
      });
      return res.status(200).json([]);
    }

    // 2. Para cada deal, buscar dados da empresa e analisar oportunidade
    const upsellOpportunities = [];

    for (const deal of deals) {
      // Buscar dados da empresa se disponível
      let companyData = null;
      if (deal.empresa_cnpj) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('porte, cnae_principal_descricao')
          .eq('cnpj', deal.empresa_cnpj)
          .single();
        
        companyData = empresa;
      }

      // Analisar oportunidade com Gemini AI V2 (otimizada)
      const analysis = await analyzeUpsellOpportunityV2({
        company_name: deal.company_name,
        current_value: deal.value,
        deal_stage: deal.stage,
        company_size: companyData?.porte || 'Desconhecido',
        industry: companyData?.cnae_principal_descricao || 'Desconhecido',
      });

      // Filtrar apenas oportunidades com confiança > 50%
      if (analysis.confidence >= 50) {
        upsellOpportunities.push({
          id: deal.id,
          companyName: deal.company_name,
          opportunityType: analysis.opportunity_type,
          productSuggestion: analysis.product_suggestion,
          confidence: analysis.confidence,
          potentialValue: analysis.potential_value,
        });
      }
    }

    // 3. Ordenar por valor potencial (maior primeiro)
    upsellOpportunities.sort((a, b) => b.potentialValue - a.potentialValue);
    
    perf.checkpoint('ai-analysis');

    // 4. Retornar top 10
    const duration = perf.finish();
    
    logger.info({
      totalDeals: deals.length,
      opportunitiesCount: upsellOpportunities.length,
      duration: `${duration.toFixed(2)}ms`,
    }, 'Upsell analysis completed successfully');
    
    logResponse({
      method: req.method,
      url: req.url || '/api/analytics-upsell',
      statusCode: 200,
      duration,
    });
    
    return res.status(200).json(upsellOpportunities.slice(0, 10));

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
        url: req.url || '/api/analytics-upsell',
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
    }, 'Upsell analysis failed');
    
    // Capturar erro no Sentry (exceto rate limits esperados)
    if (!(error instanceof RateLimitError)) {
      captureError(error, {
        endpoint: req.url || '/api/analytics-upsell',
        method: req.method,
        ip: clientIp,
        duration: `${duration.toFixed(2)}ms`,
      });
    }
    
    logResponse({
      method: req.method,
      url: req.url || '/api/analytics-upsell',
      statusCode: 500,
      duration,
      error,
    });
    
    return res.status(500).json({
      error: 'Erro ao gerar análise de upsell',
      message: error.message
    });
  }
}
