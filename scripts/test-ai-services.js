/**
 * test-ai-services.js
 * 
 * Testa DIRETAMENTE os serviços de IA (sem HTTP)
 * Bypass dos endpoints API para validar lógica core
 * 
 * USO: node scripts/test-ai-services.js
 */

// ⚠️ CRÍTICO: Carregar .env ANTES de imports
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar ANTES de qualquer import de service
config({ path: join(rootDir, '.env.local') });

// Importar serviços
import { analyzeChurnRisk, analyzeUpsellOpportunity, generateAutomatedReport } from '../services/geminiService.ts';

console.log('🤖 Testando Serviços de IA Diretamente\n');

// Mock data para testes
const mockDealData = {
  id: 'test-deal-123',
  title: 'Serviços Contábeis - Empresa ABC Ltda',
  stage: 'Closed Won',
  value: 5000,
  probability: 100,
  expectedCloseDate: new Date('2024-01-15').toISOString(),
  createdAt: new Date('2023-12-01').toISOString(),
  lastActivity: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 dias atrás
  completedTasks: 3,
  totalTasks: 10,
  companyData: {
    cnpj: '00.000.000/0001-00',
    razao_social: 'Empresa ABC Ltda',
    porte: 'MEDIA',
    cnae_principal: {
      codigo: '6910-2/00',
      descricao: 'Atividades jurídicas'
    },
    situacao_cadastral: 'ATIVA'
  }
};

const mockAnalyticsData = {
  period: { start: '2024-11-01', end: '2024-11-30', days: 30 },
  overview: {
    total_deals: 45,
    won_deals: 12,
    lost_deals: 8,
    in_progress: 25,
    conversion_rate: 0.27,
    avg_deal_value: 4500,
    total_revenue: 54000
  },
  top_cnae: {
    codigo: '6920-6/01',
    descricao: 'Atividades de consultoria em gestão empresarial',
    count: 15
  }
};

async function testChurnPrediction() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📉 TESTE 1: PREDIÇÃO DE CHURN');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Dados de entrada:');
  console.log(`   Deal: ${mockDealData.title}`);
  console.log(`   Stage: ${mockDealData.stage}`);
  console.log(`   Última atividade: há ${Math.floor((Date.now() - new Date(mockDealData.lastActivity).getTime()) / (24*60*60*1000))} dias`);
  console.log(`   Taxa de conclusão tarefas: ${Math.round(mockDealData.completedTasks/mockDealData.totalTasks*100)}%`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await analyzeChurnRisk(mockDealData);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Análise concluída em ${elapsed}ms\n`);
    console.log('🎯 Resultado:');
    console.log(`   Risk Score: ${result.risk_score}/100`);
    console.log(`   Razão Principal: ${result.primary_reason}`);
    console.log(`   Ação Sugerida: ${result.suggested_action}`);
    console.log('');
    
    // Validações
    const validations = [];
    if (result.risk_score >= 0 && result.risk_score <= 100) {
      validations.push('✅ risk_score válido (0-100)');
    } else {
      validations.push('❌ risk_score inválido');
    }
    
    if (result.primary_reason && result.primary_reason.length > 10) {
      validations.push('✅ primary_reason preenchido');
    } else {
      validations.push('❌ primary_reason vazio/curto');
    }
    
    if (result.suggested_action && result.suggested_action.length > 10) {
      validations.push('✅ suggested_action preenchido');
    } else {
      validations.push('❌ suggested_action vazio/curto');
    }
    
    console.log('📋 Validações:');
    validations.forEach(v => console.log(`   ${v}`));
    
    return validations.every(v => v.startsWith('✅'));
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.error(`   Stack: ${error.stack.substring(0, 200)}...`);
    return false;
  }
}

async function testUpsellOpportunity() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📈 TESTE 2: OPORTUNIDADES DE UPSELL/CROSS-SELL');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Dados de entrada:');
  console.log(`   Deal: ${mockDealData.title}`);
  console.log(`   Valor atual: R$ ${mockDealData.value.toLocaleString('pt-BR')}/mês`);
  console.log(`   Empresa: ${mockDealData.companyData.razao_social}`);
  console.log(`   Porte: ${mockDealData.companyData.porte}`);
  console.log(`   CNAE: ${mockDealData.companyData.cnae_principal.descricao}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await analyzeUpsellOpportunity(mockDealData);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Análise concluída em ${elapsed}ms\n`);
    console.log('🎯 Resultado:');
    console.log(`   Tipo: ${result.opportunity_type}`);
    console.log(`   Produto Sugerido: ${result.product_suggestion}`);
    console.log(`   Confiança: ${result.confidence}%`);
    console.log(`   Valor Potencial: R$ ${result.potential_value.toLocaleString('pt-BR')}/mês`);
    console.log('');
    
    // Validações
    const validations = [];
    if (['upsell', 'cross-sell', 'retention'].includes(result.opportunity_type.toLowerCase())) {
      validations.push('✅ opportunity_type válido');
    } else {
      validations.push('❌ opportunity_type inválido');
    }
    
    if (result.product_suggestion && result.product_suggestion.length > 10) {
      validations.push('✅ product_suggestion preenchido');
    } else {
      validations.push('❌ product_suggestion vazio');
    }
    
    if (result.confidence >= 0 && result.confidence <= 100) {
      validations.push('✅ confidence válido (0-100)');
    } else {
      validations.push('❌ confidence inválido');
    }
    
    if (result.potential_value > 0) {
      validations.push('✅ potential_value positivo');
    } else {
      validations.push('❌ potential_value inválido');
    }
    
    console.log('📋 Validações:');
    validations.forEach(v => console.log(`   ${v}`));
    
    return validations.every(v => v.startsWith('✅'));
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.error(`   Stack: ${error.stack.substring(0, 200)}...`);
    return false;
  }
}

async function testAutomatedReport() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 TESTE 3: RELATÓRIO EXECUTIVO AUTOMATIZADO');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Dados de entrada:');
  console.log(`   Período: ${mockAnalyticsData.period.days} dias`);
  console.log(`   Total Deals: ${mockAnalyticsData.overview.total_deals}`);
  console.log(`   Taxa Conversão: ${Math.round(mockAnalyticsData.overview.conversion_rate * 100)}%`);
  console.log(`   Receita Total: R$ ${mockAnalyticsData.overview.total_revenue.toLocaleString('pt-BR')}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await generateAutomatedReport(mockAnalyticsData);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Relatório gerado em ${elapsed}ms\n`);
    console.log('📄 Resultado:');
    console.log(`   Título: ${result.title}`);
    console.log(`   Gerado em: ${new Date(result.generatedAt).toLocaleString('pt-BR')}`);
    console.log('');
    
    // Remover HTML tags para visualização
    const cleanSummary = result.summary
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    console.log('📝 Sumário (primeiros 400 chars):');
    console.log(`   ${cleanSummary.substring(0, 400)}...`);
    console.log('');
    
    // Validações
    const validations = [];
    if (result.title && result.title.length > 10) {
      validations.push('✅ title preenchido');
    } else {
      validations.push('❌ title vazio');
    }
    
    if (result.summary && result.summary.length > 100) {
      validations.push('✅ summary preenchido');
    } else {
      validations.push('❌ summary vazio/curto');
    }
    
    if (result.summary.includes('<h') || result.summary.includes('<p')) {
      validations.push('✅ summary contém HTML');
    } else {
      validations.push('⚠️  summary sem formatação HTML');
    }
    
    if (result.generatedAt && !isNaN(new Date(result.generatedAt).getTime())) {
      validations.push('✅ generatedAt válido');
    } else {
      validations.push('❌ generatedAt inválido');
    }
    
    console.log('📋 Validações:');
    validations.forEach(v => console.log(`   ${v}`));
    
    return validations.filter(v => v.startsWith('✅')).length >= 3; // Permitir warning HTML
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.error(`   Stack: ${error.stack.substring(0, 200)}...`);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO TESTES DOS SERVIÇOS IA (CORE)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Verificar configuração
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!geminiKey) {
    console.error('❌ ERRO: GEMINI_API_KEY não configurado em .env.local');
    process.exit(1);
  }
  console.log(`✅ GEMINI_API_KEY configurado: ${geminiKey.substring(0, 20)}...\n`);
  
  // Executar testes
  const results = {
    churn: await testChurnPrediction(),
    upsell: await testUpsellOpportunity(),
    report: await testAutomatedReport(),
  };
  
  // Resumo
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📋 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`${results.churn ? '✅' : '❌'} PASSOU      Predição de Churn`);
  console.log(`${results.upsell ? '✅' : '❌'} PASSOU      Oportunidades Upsell`);
  console.log(`${results.report ? '✅' : '❌'} PASSOU      Relatório Automatizado`);
  console.log('');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`🎯 Taxa de Sucesso: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 TODOS OS SERVIÇOS IA ESTÃO FUNCIONAIS! 🤖');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Deploy para Vercel (serverless functions)');
    console.log('   2. Testar endpoints HTTP em produção');
    console.log('   3. Integrar com frontend Analytics.tsx');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n💥 ERRO FATAL:', error);
  process.exit(1);
});
