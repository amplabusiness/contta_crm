#!/usr/bin/env tsx
/**
 * Script de Auditoria de Negócios (Deals)
 * 
 * Objetivo: Validar integridade e qualidade dos dados da tabela deals,
 * identificando problemas críticos que impactam relatórios e decisões.
 * 
 * Validações:
 *   - Deals sem owner (responsável)
 *   - Valores zerados ou negativos
 *   - Stages inconsistentes (ex: Closed Won sem data de fechamento)
 *   - Empresas sem CNPJ vinculado
 *   - Dados desatualizados (sem atividade > 90 dias)
 *   - Health score crítico sem ação
 * 
 * Uso:
 *   npx tsx scripts/audit-deals.ts
 * 
 * @author Contta CRM Team
 * @date 2025-11-10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

interface DealDB {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  value: number;
  probability: number;
  stage: string;
  expected_close_date: string | null;
  last_activity: string | null;
  empresa_cnpj: string | null;
  owner_id: string | null;
  health_score: number | null;
  health_reasoning: string | null;
  health_suggested_action: string | null;
  created_at: string;
}

interface AuditReport {
  total: number;
  healthy: number;
  issues: {
    semOwner: DealDB[];
    valoresInvalidos: DealDB[];
    semEmpresa: DealDB[];
    desatualizados: DealDB[];
    healthCritico: DealDB[];
    stageInconsistente: DealDB[];
  };
  score: number;
}

/**
 * Busca todos os deals
 */
async function fetchAllDeals(): Promise<DealDB[]> {
  console.log('🔍 Buscando todos os negócios...');

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar deals:', error.message);
    throw error;
  }

  console.log(`✅ Encontrados ${data.length} negócios\n`);
  return data as DealDB[];
}

/**
 * Audita deals e identifica problemas
 */
function auditDeals(deals: DealDB[]): AuditReport {
  const report: AuditReport = {
    total: deals.length,
    healthy: 0,
    issues: {
      semOwner: [],
      valoresInvalidos: [],
      semEmpresa: [],
      desatualizados: [],
      healthCritico: [],
      stageInconsistente: [],
    },
    score: 0,
  };

  const now = new Date();
  const threshold90Days = new Date();
  threshold90Days.setDate(threshold90Days.getDate() - 90);

  for (const deal of deals) {
    let hasIssue = false;

    // 1. Deals sem owner
    if (!deal.owner_id) {
      report.issues.semOwner.push(deal);
      hasIssue = true;
    }

    // 2. Valores inválidos (≤ 0)
    if (deal.value <= 0) {
      report.issues.valoresInvalidos.push(deal);
      hasIssue = true;
    }

    // 3. Sem empresa vinculada
    if (!deal.empresa_cnpj) {
      report.issues.semEmpresa.push(deal);
      hasIssue = true;
    }

    // 4. Desatualizados (sem atividade > 90 dias)
    const lastActivity = deal.last_activity || deal.created_at;
    if (new Date(lastActivity) < threshold90Days && deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost') {
      report.issues.desatualizados.push(deal);
      hasIssue = true;
    }

    // 5. Health score crítico (< 50) sem ação
    if (deal.health_score !== null && deal.health_score < 50) {
      report.issues.healthCritico.push(deal);
      hasIssue = true;
    }

    // 6. Stage inconsistente
    if (deal.stage === 'Closed Won' && !deal.expected_close_date) {
      report.issues.stageInconsistente.push(deal);
      hasIssue = true;
    }

    if (!hasIssue) {
      report.healthy++;
    }
  }

  // Calcular score de qualidade (0-100)
  const totalIssues = Object.values(report.issues).reduce((sum, arr) => sum + arr.length, 0);
  report.score = Math.max(0, Math.round(((report.total - totalIssues) / report.total) * 100));

  return report;
}

/**
 * Exibe relatório de auditoria
 */
function printReport(report: AuditReport) {
  console.log('='.repeat(70));
  console.log('🔍 RELATÓRIO DE AUDITORIA - NEGÓCIOS (DEALS)');
  console.log('='.repeat(70));

  // Score de qualidade
  const scoreEmoji = report.score >= 80 ? '🟢' : report.score >= 50 ? '🟡' : '🔴';
  console.log(`\n${scoreEmoji} Score de Qualidade: ${report.score}/100`);
  console.log(`   Total de negócios: ${report.total}`);
  console.log(`   ✅ Saudáveis: ${report.healthy} (${((report.healthy / report.total) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️ Com problemas: ${report.total - report.healthy} (${(((report.total - report.healthy) / report.total) * 100).toFixed(1)}%)`);

  // Detalhamento dos problemas
  console.log(`\n📊 Detalhamento dos Problemas:`);
  console.log('─'.repeat(70));

  const problems = [
    { key: 'semOwner', label: '👤 Sem responsável (owner)', critical: true },
    { key: 'valoresInvalidos', label: '💰 Valores inválidos (≤ R$ 0)', critical: true },
    { key: 'semEmpresa', label: '🏢 Sem empresa vinculada', critical: false },
    { key: 'desatualizados', label: '⏰ Desatualizados (> 90 dias)', critical: false },
    { key: 'healthCritico', label: '🚨 Health score crítico (< 50)', critical: true },
    { key: 'stageInconsistente', label: '🔄 Stage inconsistente', critical: false },
  ];

  problems.forEach(({ key, label, critical }) => {
    const count = report.issues[key as keyof typeof report.issues].length;
    const icon = critical && count > 0 ? '🔴' : count > 0 ? '⚠️' : '✅';
    console.log(`   ${icon} ${label}: ${count}`);
  });

  // Listar deals com problemas críticos
  if (report.issues.semOwner.length > 0) {
    console.log(`\n👤 DEALS SEM RESPONSÁVEL (${report.issues.semOwner.length}):`);
    console.log('─'.repeat(70));
    report.issues.semOwner.slice(0, 5).forEach((deal, idx) => {
      console.log(`   ${idx + 1}. ${deal.company_name}`);
      console.log(`      💰 Valor: R$ ${deal.value.toLocaleString('pt-BR')}`);
      console.log(`      📊 Stage: ${deal.stage} | Probabilidade: ${deal.probability}%`);
      console.log(`      📅 Criado em: ${new Date(deal.created_at).toLocaleDateString('pt-BR')}`);
      console.log('');
    });
    if (report.issues.semOwner.length > 5) {
      console.log(`   ... e mais ${report.issues.semOwner.length - 5} deals sem responsável`);
    }
  }

  if (report.issues.valoresInvalidos.length > 0) {
    console.log(`\n💰 DEALS COM VALORES INVÁLIDOS (${report.issues.valoresInvalidos.length}):`);
    console.log('─'.repeat(70));
    report.issues.valoresInvalidos.forEach((deal, idx) => {
      console.log(`   ${idx + 1}. ${deal.company_name}`);
      console.log(`      💰 Valor: R$ ${deal.value.toLocaleString('pt-BR')} ⚠️`);
      console.log(`      📊 Stage: ${deal.stage}`);
      console.log('');
    });
  }

  if (report.issues.healthCritico.length > 0) {
    console.log(`\n🚨 DEALS COM HEALTH CRÍTICO (${report.issues.healthCritico.length}):`);
    console.log('─'.repeat(70));
    report.issues.healthCritico.slice(0, 5).forEach((deal, idx) => {
      console.log(`   ${idx + 1}. ${deal.company_name}`);
      console.log(`      🏥 Health Score: ${deal.health_score}/100`);
      console.log(`      💡 Motivo: ${deal.health_reasoning || 'N/A'}`);
      console.log(`      🎯 Ação sugerida: ${deal.health_suggested_action || 'N/A'}`);
      console.log(`      💰 Valor: R$ ${deal.value.toLocaleString('pt-BR')}`);
      console.log('');
    });
    if (report.issues.healthCritico.length > 5) {
      console.log(`   ... e mais ${report.issues.healthCritico.length - 5} deals com health crítico`);
    }
  }

  if (report.issues.desatualizados.length > 0) {
    console.log(`\n⏰ DEALS DESATUALIZADOS (${report.issues.desatualizados.length}):`);
    console.log('─'.repeat(70));
    report.issues.desatualizados.slice(0, 5).forEach((deal, idx) => {
      const lastActivity = new Date(deal.last_activity || deal.created_at);
      const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${idx + 1}. ${deal.company_name}`);
      console.log(`      ⏰ Última atividade: ${lastActivity.toLocaleDateString('pt-BR')} (${daysInactive} dias)`);
      console.log(`      📊 Stage: ${deal.stage}`);
      console.log(`      💰 Valor: R$ ${deal.value.toLocaleString('pt-BR')}`);
      console.log('');
    });
    if (report.issues.desatualizados.length > 5) {
      console.log(`   ... e mais ${report.issues.desatualizados.length - 5} deals desatualizados`);
    }
  }

  // Recomendações
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMENDAÇÕES');
  console.log('='.repeat(70));

  const recommendations: string[] = [];

  if (report.issues.semOwner.length > 0) {
    recommendations.push(`• Atribuir responsável para ${report.issues.semOwner.length} deals sem owner`);
  }
  if (report.issues.valoresInvalidos.length > 0) {
    recommendations.push(`• Corrigir valores de ${report.issues.valoresInvalidos.length} deals (valores devem ser > R$ 0)`);
  }
  if (report.issues.healthCritico.length > 0) {
    recommendations.push(`• Revisar ${report.issues.healthCritico.length} deals com health crítico e executar ações sugeridas`);
  }
  if (report.issues.desatualizados.length > 0) {
    recommendations.push(`• Atualizar ou arquivar ${report.issues.desatualizados.length} deals sem atividade > 90 dias`);
  }
  if (report.issues.semEmpresa.length > 0) {
    recommendations.push(`• Vincular ${report.issues.semEmpresa.length} deals a empresas cadastradas`);
  }
  if (report.issues.stageInconsistente.length > 0) {
    recommendations.push(`• Corrigir ${report.issues.stageInconsistente.length} deals com stage inconsistente`);
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(`   ${rec}`));
  } else {
    console.log('   ✅ Nenhuma ação crítica necessária!');
    console.log('   📈 A qualidade dos dados está excelente.');
  }

  console.log('='.repeat(70) + '\n');

  // Summary
  if (report.score < 50) {
    console.log('🔴 ATENÇÃO: Score de qualidade crítico! Revisar dados urgentemente.\n');
  } else if (report.score < 80) {
    console.log('🟡 Qualidade moderada. Recomenda-se melhorias antes de ir para produção.\n');
  } else {
    console.log('🟢 Excelente qualidade de dados! Pronto para produção.\n');
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando auditoria de negócios...\n');

  try {
    const deals = await fetchAllDeals();
    const report = auditDeals(deals);
    printReport(report);

    console.log('✅ Auditoria concluída com sucesso!\n');

    // Exit code baseado no score
    if (report.score < 50) {
      process.exit(1); // Falha crítica
    }
  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error);
    process.exit(1);
  }
}

// Executar
main();
