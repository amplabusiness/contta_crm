/**
 * geminiService.v2.ts
 * 
 * Versão otimizada com:
 * - Retry logic exponencial
 * - Caching inteligente (Redis)
 * - Validação robusta de outputs
 * - Performance monitoring
 * - Error boundaries
 * - Type safety melhorado
 * - Logging estruturado (Pino)
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { 
  ChurnPrediction, 
  UpsellOpportunity, 
  Deal 
} from '../types.ts';
import {
  GeminiAPIError,
  OutputValidationError,
  generateCorrelationId,
  formatErrorForLogging,
} from '../utils/errors.ts';
import { cache as redisCache, buildCacheKey, cacheAside } from '../utils/cache.ts';
import { 
  createModuleLogger, 
  trackPerformance,
  logCacheOperation,
  logExternalAPI,
} from '../utils/logger.ts';

const logger = createModuleLogger('gemini-service');

// ============================================================================
// CONFIGURAÇÃO & INICIALIZAÇÃO
// ============================================================================

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY não configurado');
}

const ai = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

// Métricas de performance (agora cache é gerenciado por utils/cache.ts)
const metrics = {
  totalRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Parse JSON com fallback robusto
 */
function safelyParseJson<T>(jsonString: string): T | null {
  try {
    // Remove markdown backticks e whitespace
    const cleanJsonString = jsonString
      .replace(/^```json\s*|```$/g, '')
      .replace(/^```\s*|```$/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanJsonString);
    return parsed as T;
  } catch (error) {
    console.error('[geminiService] JSON parse failed:', {
      error: error instanceof Error ? error.message : String(error),
      rawString: jsonString.substring(0, 200),
    });
    return null;
  }
}

/**
 * Retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  correlationId?: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn({
          correlationId,
          attempt: attempt + 1,
          maxRetries,
          delay: `${delay}ms`,
          error: lastError.message,
        }, `Retry attempt ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  metrics.failedRequests++;
  logger.error({
    correlationId,
    maxRetries,
    error: lastError,
  }, 'Max retries exceeded');
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Valida output de churn prediction
 */
function validateChurnOutput(output: any): output is {
  risk_score: number;
  primary_reason: string;
  suggested_action: string;
} {
  return (
    typeof output === 'object' &&
    typeof output.risk_score === 'number' &&
    output.risk_score >= 0 &&
    output.risk_score <= 100 &&
    typeof output.primary_reason === 'string' &&
    output.primary_reason.length > 0 &&
    typeof output.suggested_action === 'string' &&
    output.suggested_action.length > 0
  );
}

/**
 * Valida output de upsell prediction
 */
function validateUpsellOutput(output: any): output is {
  opportunity_type: 'Upsell' | 'Cross-sell' | 'Retention';
  product_suggestion: string;
  confidence: number;
  potential_value: number;
} {
  const validTypes = ['upsell', 'cross-sell', 'retention'];
  const normalizedType = output.opportunity_type?.toLowerCase();
  
  if (!validTypes.includes(normalizedType)) {
    return false;
  }
  
  // Normalizar para capitalized
  if (normalizedType === 'upsell') output.opportunity_type = 'Upsell';
  else if (normalizedType === 'cross-sell') output.opportunity_type = 'Cross-sell';
  else if (normalizedType === 'retention') output.opportunity_type = 'Retention';
  
  return (
    typeof output === 'object' &&
    typeof output.product_suggestion === 'string' &&
    output.product_suggestion.length > 0 &&
    typeof output.confidence === 'number' &&
    output.confidence >= 0 &&
    output.confidence <= 100 &&
    typeof output.potential_value === 'number' &&
    output.potential_value >= 0
  );
}

// ============================================================================
// AGENTES IA - VERSÃO OTIMIZADA
// ============================================================================

/**
 * Analisa risco de churn (OTIMIZADO)
 * 
 * MELHORIAS:
 * - Retry automático com backoff exponencial
 * - Cache de 5min (evita chamadas duplicadas)
 * - Validação rigorosa de output
 * - Métricas de performance
 * - Error handling detalhado
 */
export async function analyzeChurnRiskV2(dealData: {
  company_name: string;
  deal_value: number;
  days_since_last_activity: number;
  task_completion_rate: number;
  total_tasks: number;
  deal_stage: string;
  contact_email: string | null;
}): Promise<{
  risk_score: number;
  primary_reason: string;
  suggested_action: string;
}> {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  metrics.totalRequests++;
  
  // Build cache key com namespace
  const cacheKey = buildCacheKey(
    'churn',
    dealData.company_name,
    dealData.days_since_last_activity,
    Math.round(dealData.task_completion_rate * 100)
  );
  
  // Use cache-aside pattern com Redis (ou fallback memória)
  return cacheAside(
    cacheKey,
    async () => {
      const prompt = `
# SISTEMA DE PREDIÇÃO DE CHURN B2B

## CONTEXTO
Você é um modelo de IA especializado em Customer Success para empresas SaaS B2B.
Sua função é analisar dados de engajamento e prever risco de perda de clientes.

## DADOS DO CLIENTE
\`\`\`json
${JSON.stringify(dealData, null, 2)}
\`\`\`

## ALGORITMO DE CLASSIFICAÇÃO
Calcule risk_score (0-100) baseado em:

1. **Inatividade** (peso: 40%)
   - 0-7 dias: 0 pontos
   - 8-30 dias: 20 pontos
   - 31-60 dias: 40 pontos
   - 61-90 dias: 70 pontos
   - 90+ dias: 100 pontos

2. **Taxa de Conclusão de Tarefas** (peso: 35%)
   - 80-100%: 0 pontos
   - 60-79%: 20 pontos
   - 40-59%: 40 pontos
   - 20-39%: 70 pontos
   - 0-19%: 100 pontos

3. **Volume de Tarefas** (peso: 15%)
   - 10+ tarefas: 0 pontos
   - 5-9 tarefas: 20 pontos
   - 1-4 tarefas: 50 pontos
   - 0 tarefas: 100 pontos

4. **Estágio do Deal** (peso: 10%)
   - "Closed Won": 0 pontos
   - Outros: adicionar 20 pontos

## OUTPUT OBRIGATÓRIO (JSON)
{
  "risk_score": <número 0-100>,
  "primary_reason": "<razão principal em 1 frase objetiva>",
  "suggested_action": "<ação específica e executável>"
}

**IMPORTANTE**: Retorne APENAS o JSON, sem explicações adicionais.
  `.trim();
  
      try {
        const apiStartTime = Date.now();
        const result = await retryWithBackoff(async () => {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
              responseMimeType: 'application/json',
              temperature: 0.3,
            }
          });
          
          const parsed = safelyParseJson<any>(response.text);
          if (!parsed) {
            throw new Error('JSON parse failed');
          }
          
          if (!validateChurnOutput(parsed)) {
            throw new Error(`Invalid output structure: ${JSON.stringify(parsed)}`);
          }
          
          return parsed;
        }, 3, 1000, correlationId);
        
        const apiDuration = Date.now() - apiStartTime;
        logExternalAPI({
          service: 'Gemini',
          endpoint: '/generateContent',
          method: 'POST',
          statusCode: 200,
          duration: apiDuration,
          correlationId,
        });
        
        const elapsed = Date.now() - startTime;
        metrics.avgResponseTime = (metrics.avgResponseTime + elapsed) / 2;
        
        logger.info({
          company: dealData.company_name,
          riskScore: result.risk_score,
          duration: `${elapsed}ms`,
          correlationId,
        }, `Churn analysis completed: ${dealData.company_name}`);
        
        return result;
        
      } catch (error) {
        const elapsed = Date.now() - startTime;
        metrics.failedRequests++;
        
        logger.error({
          error,
          company: dealData.company_name,
          duration: `${elapsed}ms`,
          correlationId,
        }, 'Churn analysis failed, using fallback');
        
        // Fallback heurístico
        const fallbackScore = Math.min(
          100,
          (dealData.days_since_last_activity > 60 ? 70 : 30) +
          (dealData.task_completion_rate < 0.3 ? 30 : 0)
        );
        
        logger.warn({
          correlationId,
          fallbackScore,
          company: dealData.company_name,
        }, 'Using fallback heuristic');
        
        return {
          risk_score: fallbackScore,
          primary_reason: 'Análise baseada em heurística (IA indisponível)',
          suggested_action: 'Agendar reunião de reativação imediatamente',
        };
      }
    },
    300 // TTL 5 minutos
  );
}

/**
 * Identifica oportunidades de upsell (OTIMIZADO)
 */
export async function analyzeUpsellOpportunityV2(dealData: {
  company_name: string;
  current_value: number;
  deal_stage: string;
  services_used?: string[];
  company_size?: string;
  industry?: string;
}): Promise<{
  opportunity_type: 'Upsell' | 'Cross-sell' | 'Retention';
  product_suggestion: string;
  confidence: number;
  potential_value: number;
}> {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  metrics.totalRequests++;
  
  // Build cache key
  const cacheKey = buildCacheKey(
    'upsell',
    dealData.company_name,
    dealData.current_value,
    dealData.company_size || 'unknown'
  );
  
  // Use cache-aside pattern
  return cacheAside(
    cacheKey,
    async () => {
      const prompt = `
# SISTEMA DE IDENTIFICAÇÃO DE OPORTUNIDADES DE EXPANSÃO

## CONTEXTO
Você é um especialista em vendas consultivas para escritórios de contabilidade.
Analise o perfil do cliente e identifique a melhor oportunidade de crescimento de receita.

## CATÁLOGO DE SERVIÇOS
| Serviço                   | Faixa de Preço (mensal) | Perfil Ideal                          |
|---------------------------|-------------------------|---------------------------------------|
| Contabilidade Básica      | R$ 500 - 2.000         | MEI, Micro empresas                   |
| Folha de Pagamento        | R$ 300 - 1.500         | 5+ funcionários                       |
| Assessoria Fiscal         | R$ 800 - 3.000         | Empresas com operações complexas      |
| BPO Financeiro            | R$ 1.500 - 5.000       | Empresas sem setor financeiro interno |
| Planejamento Tributário   | R$ 2.000 - 8.000       | Empresas com receita >R$ 500k/ano    |
| Compliance & Auditoria    | R$ 3.000 - 10.000      | Empresas reguladas, licitações        |

## DADOS DO CLIENTE
\`\`\`json
${JSON.stringify(dealData, null, 2)}
\`\`\`

## REGRAS DE CLASSIFICAÇÃO

**Upsell**: Upgrade do serviço atual (mesma categoria, maior valor)
**Cross-sell**: Adicionar novo serviço complementar
**Retention**: Cliente em risco, manter serviço atual

**Confiança** (0-100):
- 80-100: Perfil perfeito, timing ideal
- 60-79: Bom fit, apresentar oportunidade
- 40-59: Possível interesse, investigar mais
- 0-39: Baixa probabilidade, não priorizar

## OUTPUT OBRIGATÓRIO (JSON)
{
  "opportunity_type": "Upsell" | "Cross-sell" | "Retention",
  "product_suggestion": "<nome serviço> - <benefício chave em 1 linha>",
  "confidence": <número 0-100>,
  "potential_value": <valor mensal estimado em reais>
}

**IMPORTANTE**: Retorne APENAS o JSON, sem markdown ou explicações.
  `.trim();
  
  try {
    const apiStartTime = Date.now();
    const result = await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          temperature: 0.4,
        }
      });
      
      const parsed = safelyParseJson<any>(response.text);
      if (!parsed || !validateUpsellOutput(parsed)) {
        throw new Error('Invalid output structure');
      }
      
      return parsed;
    }, 3, 1000, correlationId);
    
    const apiDuration = Date.now() - apiStartTime;
    logExternalAPI({
      service: 'Gemini',
      endpoint: '/generateContent',
      method: 'POST',
      statusCode: 200,
      duration: apiDuration,
      correlationId,
    });
    
    const elapsed = Date.now() - startTime;
    logger.info({
      company: dealData.company_name,
      confidence: result.confidence,
      duration: `${elapsed}ms`,
      correlationId,
    }, `Upsell analysis completed: ${dealData.company_name}`);
    
    return result;
    
  } catch (error) {
    logger.error({
      error,
      company: dealData.company_name,
      correlationId,
    }, 'Upsell analysis failed, using fallback');
    
    // Fallback heurístico
    return {
      opportunity_type: 'Cross-sell' as const,
      product_suggestion: 'Folha de Pagamento - Automatize gestão de RH',
      confidence: 50,
      potential_value: Math.max(500, dealData.current_value * 0.3),
    };
  }
    },
    600 // TTL 10 minutos
  );
}

/**
 * Retorna métricas de performance do serviço
 */
export function getGeminiMetrics() {
  const cacheMetrics = redisCache.getMetrics();
  
  return {
    ...metrics,
    cache: cacheMetrics,
    avgResponseTime: Math.round(metrics.avgResponseTime),
  };
}

/**
 * Limpa cache manualmente
 */
export async function clearCache() {
  await redisCache.clear();
  console.log('[geminiService] Cache cleared');
}
