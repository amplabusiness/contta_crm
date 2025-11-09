/**
 * test-gemini-optimizations.js
 * 
 * Testa versão otimizada vs original
 * Compara: performance, cache hit rate, error handling
 * 
 * USO: npm run test:ai:v2
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

// Import ambas as versões
import { 
  analyzeChurnRisk as analyzeChurnRiskV1,
  analyzeUpsellOpportunity as analyzeUpsellOpportunityV1 
} from '../services/geminiService.ts';

import { 
  analyzeChurnRiskV2,
  analyzeUpsellOpportunityV2,
  getGeminiMetrics,
  clearCache
} from '../services/geminiService.v2.ts';

const mockDealData = {
  company_name: 'Empresa Teste Ltda',
  deal_value: 5000,
  days_since_last_activity: 90,
  task_completion_rate: 0.3,
  total_tasks: 10,
  deal_stage: 'Closed Won',
  contact_email: 'contato@teste.com'
};

const mockUpsellData = {
  company_name: 'Empresa Teste Ltda',
  current_value: 2000,
  deal_stage: 'Closed Won',
  services_used: ['Contabilidade Básica'],
  company_size: 'MEDIA',
  industry: 'Consultoria'
};

console.log('🔬 TESTE DE OTIMIZAÇÕES - Gemini Service\n');
console.log('═══════════════════════════════════════════════════════\n');

async function benchmarkChurnAnalysis() {
  console.log('📊 Benchmark: Churn Analysis\n');
  
  // Warm-up
  console.log('🔥 Warm-up...');
  await analyzeChurnRiskV2(mockDealData);
  clearCache();
  
  // V1 (Original)
  console.log('\n📌 Testando V1 (Original)...');
  const v1Start = Date.now();
  const v1Result = await analyzeChurnRiskV1({
    company_name: mockDealData.company_name,
    deal_value: mockDealData.deal_value,
    days_since_last_activity: mockDealData.days_since_last_activity,
    task_completion_rate: mockDealData.task_completion_rate,
    total_tasks: mockDealData.total_tasks,
    deal_stage: mockDealData.deal_stage,
    contact_email: mockDealData.contact_email
  });
  const v1Time = Date.now() - v1Start;
  
  console.log(`   ⏱️  Tempo: ${v1Time}ms`);
  console.log(`   📈 Risk Score: ${v1Result.risk_score}`);
  console.log(`   💡 Razão: ${v1Result.primary_reason.substring(0, 50)}...`);
  
  // V2 (Otimizada) - 1ª chamada (cache miss)
  console.log('\n📌 Testando V2 (Otimizada) - Cache Miss...');
  clearCache();
  const v2Start = Date.now();
  const v2Result = await analyzeChurnRiskV2(mockDealData);
  const v2Time = Date.now() - v2Start;
  
  console.log(`   ⏱️  Tempo: ${v2Time}ms`);
  console.log(`   📈 Risk Score: ${v2Result.risk_score}`);
  console.log(`   💡 Razão: ${v2Result.primary_reason.substring(0, 50)}...`);
  
  // V2 (Otimizada) - 2ª chamada (cache hit)
  console.log('\n📌 Testando V2 (Otimizada) - Cache Hit...');
  const v2CachedStart = Date.now();
  const v2CachedResult = await analyzeChurnRiskV2(mockDealData);
  const v2CachedTime = Date.now() - v2CachedStart;
  
  console.log(`   ⏱️  Tempo: ${v2CachedTime}ms`);
  console.log(`   📈 Risk Score: ${v2CachedResult.risk_score}`);
  console.log(`   ✅ Cache: ${v2CachedTime < 10 ? 'HIT' : 'MISS'}`);
  
  // Comparação
  console.log('\n📊 Comparação de Performance:');
  console.log(`   V1 Original:      ${v1Time}ms`);
  console.log(`   V2 Cache Miss:    ${v2Time}ms`);
  console.log(`   V2 Cache Hit:     ${v2CachedTime}ms`);
  
  const improvement = ((v1Time - v2CachedTime) / v1Time * 100).toFixed(1);
  console.log(`   🚀 Melhoria:      ${improvement}% mais rápido (com cache)`);
  
  return { v1Time, v2Time, v2CachedTime };
}

async function testCacheEfficiency() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('🗄️  TESTE DE EFICIÊNCIA DO CACHE\n');
  
  clearCache();
  
  const iterations = 10;
  console.log(`Executando ${iterations} chamadas repetidas...\n`);
  
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await analyzeChurnRiskV2(mockDealData);
    const elapsed = Date.now() - start;
    times.push(elapsed);
    
    const cacheStatus = elapsed < 10 ? '✅ HIT' : '❌ MISS';
    console.log(`   Chamada ${i + 1}: ${elapsed}ms ${cacheStatus}`);
  }
  
  const metrics = getGeminiMetrics();
  console.log('\n📈 Métricas Finais:');
  console.log(`   Total Requests:    ${metrics.totalRequests}`);
  console.log(`   Cache Hits:        ${metrics.cacheHits}`);
  console.log(`   Cache Hit Rate:    ${metrics.cacheHitRate}`);
  console.log(`   Avg Response Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
  console.log(`   Failed Requests:   ${metrics.failedRequests}`);
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n   Tempo médio geral: ${avgTime.toFixed(0)}ms`);
}

async function testErrorHandling() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('🛡️  TESTE DE ERROR HANDLING\n');
  
  // Dados inválidos propositais
  const invalidData = {
    company_name: '',
    deal_value: -1000,
    days_since_last_activity: 999,
    task_completion_rate: 2.5, // >100%
    total_tasks: 0,
    deal_stage: 'INVALID_STAGE',
    contact_email: null
  };
  
  console.log('📌 Testando com dados inválidos...');
  console.log(`   ${JSON.stringify(invalidData, null, 2)}`);
  
  try {
    const result = await analyzeChurnRiskV2(invalidData);
    console.log('\n✅ Fallback ativado com sucesso!');
    console.log(`   Risk Score: ${result.risk_score}`);
    console.log(`   Razão: ${result.primary_reason}`);
    console.log(`   Ação: ${result.suggested_action}`);
  } catch (error) {
    console.error('\n❌ Erro não tratado:', error.message);
  }
}

async function testUpsellOptimization() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('🎯 TESTE: Upsell Opportunity Analysis\n');
  
  clearCache();
  
  console.log('📌 V1 Original...');
  const v1Start = Date.now();
  const v1Result = await analyzeUpsellOpportunityV1({
    company_name: mockUpsellData.company_name,
    current_value: mockUpsellData.current_value,
    deal_stage: mockUpsellData.deal_stage,
    services_used: mockUpsellData.services_used,
    company_size: mockUpsellData.company_size,
    industry: mockUpsellData.industry
  });
  const v1Time = Date.now() - v1Start;
  
  console.log(`   ⏱️  Tempo: ${v1Time}ms`);
  console.log(`   🎯 Tipo: ${v1Result.opportunity_type}`);
  console.log(`   💡 Produto: ${v1Result.product_suggestion.substring(0, 50)}...`);
  console.log(`   📊 Confiança: ${v1Result.confidence}%`);
  
  console.log('\n📌 V2 Otimizada...');
  clearCache();
  const v2Start = Date.now();
  const v2Result = await analyzeUpsellOpportunityV2(mockUpsellData);
  const v2Time = Date.now() - v2Start;
  
  console.log(`   ⏱️  Tempo: ${v2Time}ms`);
  console.log(`   🎯 Tipo: ${v2Result.opportunity_type}`);
  console.log(`   💡 Produto: ${v2Result.product_suggestion.substring(0, 50)}...`);
  console.log(`   📊 Confiança: ${v2Result.confidence}%`);
  console.log(`   💰 Valor Potencial: R$ ${v2Result.potential_value.toLocaleString('pt-BR')}`);
}

async function runAllTests() {
  console.log('🚀 Iniciando bateria de testes...\n');
  
  try {
    await benchmarkChurnAnalysis();
    await testCacheEfficiency();
    await testErrorHandling();
    await testUpsellOptimization();
    
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const finalMetrics = getGeminiMetrics();
    console.log('📊 Métricas Finais do Serviço:');
    console.log(JSON.stringify(finalMetrics, null, 2));
    
  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES:', error);
    process.exit(1);
  }
}

runAllTests();
