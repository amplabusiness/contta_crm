/**
 * test-ai-agents.js
 * 
 * Script para testar os 3 agentes IA implementados:
 * 1. Predição de Churn
 * 2. Oportunidades de Upsell
 * 3. Relatórios Automatizados
 * 
 * USO:
 * node scripts/test-ai-agents.js
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar variáveis de ambiente
config({ path: join(rootDir, '.env.local') });

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3001';

console.log('🤖 Testando Agentes IA Autônomos...\n');
console.log(`📡 API Base: ${API_BASE}\n`);

// Verificar se APIs estão configuradas
const requiredEnvVars = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY,
  'GEMINI_API_KEY': process.env.GEMINI_API_KEY || process.env.API_KEY,
  'VITE_CNPJA_API_KEY': process.env.VITE_CNPJA_API_KEY,
};

console.log('🔐 Verificando configuração de APIs:\n');
for (const [key, value] of Object.entries(requiredEnvVars)) {
  const status = value ? '✅' : '❌';
  const display = value ? `${value.substring(0, 20)}...` : 'NÃO CONFIGURADO';
  console.log(`${status} ${key}: ${display}`);
}
console.log('');

if (!requiredEnvVars['VITE_SUPABASE_URL'] || !requiredEnvVars['GEMINI_API_KEY']) {
  console.error('❌ ERRO: Variáveis de ambiente obrigatórias não configuradas!');
  console.error('Configure .env.local com VITE_SUPABASE_URL e GEMINI_API_KEY');
  process.exit(1);
}

// Helper para fazer requests
async function testEndpoint(name, url) {
  console.log(`\n🧪 Testando: ${name}`);
  console.log(`📍 URL: ${url}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ FALHA: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Erro: ${errorText.substring(0, 200)}...`);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ SUCESSO (${elapsed}ms)`);
    
    return data;
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ ERRO (${elapsed}ms): ${error.message}`);
    return null;
  }
}

// Função principal de teste
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO TESTES DOS AGENTES IA');
  console.log('═══════════════════════════════════════════════════════');
  
  // TESTE 1: Predição de Churn
  console.log('\n\n📉 TESTE 1: PREDIÇÃO DE CHURN');
  console.log('─────────────────────────────────────────────────────');
  const churnData = await testEndpoint(
    'Analytics Churn',
    `${API_BASE}/api/analytics-churn`
  );
  
  if (churnData && Array.isArray(churnData)) {
    console.log(`\n📊 Resultados: ${churnData.length} clientes em risco`);
    
    if (churnData.length > 0) {
      console.log('\n🔝 Top 3 Clientes em Risco:');
      churnData.slice(0, 3).forEach((item, idx) => {
        console.log(`\n   ${idx + 1}. ${item.companyName}`);
        console.log(`      Risco: ${item.churnRisk}%`);
        console.log(`      Razão: ${item.primaryReason}`);
        console.log(`      Ação: ${item.suggestedAction}`);
      });
    } else {
      console.log('   ℹ️  Nenhum cliente em risco identificado (sem dados ou todos OK)');
    }
  }
  
  // TESTE 2: Oportunidades de Upsell
  console.log('\n\n📈 TESTE 2: OPORTUNIDADES DE UPSELL/CROSS-SELL');
  console.log('─────────────────────────────────────────────────────');
  const upsellData = await testEndpoint(
    'Analytics Upsell',
    `${API_BASE}/api/analytics-upsell`
  );
  
  if (upsellData && Array.isArray(upsellData)) {
    console.log(`\n📊 Resultados: ${upsellData.length} oportunidades identificadas`);
    
    if (upsellData.length > 0) {
      console.log('\n💰 Top 3 Oportunidades por Valor:');
      upsellData.slice(0, 3).forEach((item, idx) => {
        console.log(`\n   ${idx + 1}. ${item.companyName}`);
        console.log(`      Tipo: ${item.opportunityType}`);
        console.log(`      Produto: ${item.productSuggestion}`);
        console.log(`      Confiança: ${item.confidence}%`);
        console.log(`      Valor Potencial: R$ ${item.potentialValue.toLocaleString('pt-BR')}/mês`);
      });
    } else {
      console.log('   ℹ️  Nenhuma oportunidade identificada (sem clientes ativos ou baixa confiança)');
    }
  }
  
  // TESTE 3: Relatório Automatizado
  console.log('\n\n📊 TESTE 3: RELATÓRIO EXECUTIVO AUTOMATIZADO');
  console.log('─────────────────────────────────────────────────────');
  const reportData = await testEndpoint(
    'Analytics Report',
    `${API_BASE}/api/analytics-report?days=30`
  );
  
  if (reportData && reportData.title) {
    console.log(`\n📄 Relatório Gerado:`);
    console.log(`   Título: ${reportData.title}`);
    console.log(`   Gerado em: ${new Date(reportData.generatedAt).toLocaleString('pt-BR')}`);
    console.log(`\n📝 Sumário:`);
    
    // Remover tags HTML para visualização no terminal
    const cleanSummary = reportData.summary
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    console.log(`   ${cleanSummary.substring(0, 500)}...`);
  }
  
  // RESUMO FINAL
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📋 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = {
    'Predição de Churn': churnData ? '✅ PASSOU' : '❌ FALHOU',
    'Oportunidades Upsell': upsellData ? '✅ PASSOU' : '❌ FALHOU',
    'Relatório Automatizado': reportData ? '✅ PASSOU' : '❌ FALHOU',
  };
  
  console.log('');
  Object.entries(results).forEach(([test, status]) => {
    console.log(`${status.padEnd(12)} ${test}`);
  });
  
  const passedTests = Object.values(results).filter(r => r.includes('✅')).length;
  const totalTests = Object.keys(results).length;
  
  console.log('');
  console.log(`🎯 Taxa de Sucesso: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 TODOS OS AGENTES IA ESTÃO FUNCIONAIS! 🤖');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
}

// Executar testes
runTests().catch(error => {
  console.error('\n💥 ERRO FATAL:', error);
  process.exit(1);
});
