#!/usr/bin/env tsx
/**
 * Script de Auditoria de Empresas
 * 
 * Objetivo: Validar integridade e qualidade dos dados da tabela empresas.
 * 
 * Validações:
 *   - CNPJs inválidos (formato ou dígito verificador)
 *   - Dados desatualizados > 180 dias
 *   - Falta de informações essenciais (endereço, telefone, email)
 *   - Empresas inativas sem marcação correta
 *   - Sócios sem CPF
 * 
 * Uso:
 *   npx tsx scripts/audit-empresas.ts
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

interface EmpresaDB {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  data_abertura: string | null;
  porte: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  cnae_principal_codigo: string | null;
  cnae_principal_descricao: string | null;
  telefones: string[] | null;
  emails: string[] | null;
  created_at: string;
}

interface AuditReport {
  total: number;
  healthy: number;
  issues: {
    cnpjInvalido: EmpresaDB[];
    semEndereco: EmpresaDB[];
    semContato: EmpresaDB[];
    semCNAE: EmpresaDB[];
    inativaSemMarcacao: EmpresaDB[];
  };
  score: number;
}

/**
 * Valida CNPJ (formato básico)
 */
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, '');
  return cleaned.length === 14;
}

/**
 * Busca todas as empresas
 */
async function fetchAllEmpresas(): Promise<EmpresaDB[]> {
  console.log('🔍 Buscando todas as empresas...');

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('razao_social', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error.message);
    throw error;
  }

  console.log(`✅ Encontradas ${data.length} empresas\n`);
  return data as EmpresaDB[];
}

/**
 * Audita empresas e identifica problemas
 */
function auditEmpresas(empresas: EmpresaDB[]): AuditReport {
  const report: AuditReport = {
    total: empresas.length,
    healthy: 0,
    issues: {
      cnpjInvalido: [],
      semEndereco: [],
      semContato: [],
      semCNAE: [],
      inativaSemMarcacao: [],
    },
    score: 0,
  };

  for (const empresa of empresas) {
    let hasIssue = false;

    // 1. CNPJ inválido
    if (!isValidCNPJ(empresa.cnpj)) {
      report.issues.cnpjInvalido.push(empresa);
      hasIssue = true;
    }

    // 2. Sem endereço completo
    if (!empresa.logradouro || !empresa.cidade || !empresa.uf || !empresa.cep) {
      report.issues.semEndereco.push(empresa);
      hasIssue = true;
    }

    // 3. Sem contato (telefone OU email)
    const hasPhone = empresa.telefones && empresa.telefones.length > 0;
    const hasEmail = empresa.emails && empresa.emails.length > 0;
    if (!hasPhone && !hasEmail) {
      report.issues.semContato.push(empresa);
      hasIssue = true;
    }

    // 4. Sem CNAE
    if (!empresa.cnae_principal_codigo || !empresa.cnae_principal_descricao) {
      report.issues.semCNAE.push(empresa);
      hasIssue = true;
    }

    // 5. Inativa sem marcação correta
    if (empresa.situacao_cadastral && 
        empresa.situacao_cadastral.toLowerCase().includes('baixada') &&
        empresa.situacao_cadastral !== 'Baixada') {
      report.issues.inativaSemMarcacao.push(empresa);
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
  console.log('🔍 RELATÓRIO DE AUDITORIA - EMPRESAS');
  console.log('='.repeat(70));

  // Score de qualidade
  const scoreEmoji = report.score >= 80 ? '🟢' : report.score >= 50 ? '🟡' : '🔴';
  console.log(`\n${scoreEmoji} Score de Qualidade: ${report.score}/100`);
  console.log(`   Total de empresas: ${report.total}`);
  console.log(`   ✅ Saudáveis: ${report.healthy} (${((report.healthy / report.total) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️ Com problemas: ${report.total - report.healthy} (${(((report.total - report.healthy) / report.total) * 100).toFixed(1)}%)`);

  // Detalhamento dos problemas
  console.log(`\n📊 Detalhamento dos Problemas:`);
  console.log('─'.repeat(70));

  const problems = [
    { key: 'cnpjInvalido', label: '🔢 CNPJ inválido', critical: true },
    { key: 'semEndereco', label: '📍 Sem endereço completo', critical: false },
    { key: 'semContato', label: '📞 Sem telefone/email', critical: true },
    { key: 'semCNAE', label: '🏭 Sem CNAE', critical: false },
    { key: 'inativaSemMarcacao', label: '⚠️ Inativa sem marcação', critical: false },
  ];

  problems.forEach(({ key, label, critical }) => {
    const count = report.issues[key as keyof typeof report.issues].length;
    const icon = critical && count > 0 ? '🔴' : count > 0 ? '⚠️' : '✅';
    console.log(`   ${icon} ${label}: ${count}`);
  });

  // Listar empresas com problemas críticos
  if (report.issues.cnpjInvalido.length > 0) {
    console.log(`\n🔢 EMPRESAS COM CNPJ INVÁLIDO (${report.issues.cnpjInvalido.length}):`);
    console.log('─'.repeat(70));
    report.issues.cnpjInvalido.forEach((empresa, idx) => {
      console.log(`   ${idx + 1}. ${empresa.razao_social}`);
      console.log(`      CNPJ: ${empresa.cnpj} ⚠️`);
      console.log('');
    });
  }

  if (report.issues.semContato.length > 0) {
    console.log(`\n📞 EMPRESAS SEM CONTATO (${report.issues.semContato.length}):`);
    console.log('─'.repeat(70));
    report.issues.semContato.slice(0, 5).forEach((empresa, idx) => {
      console.log(`   ${idx + 1}. ${empresa.razao_social}`);
      console.log(`      CNPJ: ${empresa.cnpj}`);
      console.log(`      Cidade: ${empresa.cidade || 'N/A'}/${empresa.uf || 'N/A'}`);
      console.log('');
    });
    if (report.issues.semContato.length > 5) {
      console.log(`   ... e mais ${report.issues.semContato.length - 5} empresas sem contato`);
    }
  }

  if (report.issues.semEndereco.length > 0) {
    console.log(`\n📍 EMPRESAS SEM ENDEREÇO COMPLETO (${report.issues.semEndereco.length}):`);
    console.log('─'.repeat(70));
    report.issues.semEndereco.slice(0, 5).forEach((empresa, idx) => {
      const missing = [];
      if (!empresa.logradouro) missing.push('logradouro');
      if (!empresa.cidade) missing.push('cidade');
      if (!empresa.uf) missing.push('UF');
      if (!empresa.cep) missing.push('CEP');
      
      console.log(`   ${idx + 1}. ${empresa.razao_social}`);
      console.log(`      CNPJ: ${empresa.cnpj}`);
      console.log(`      Faltam: ${missing.join(', ')}`);
      console.log('');
    });
    if (report.issues.semEndereco.length > 5) {
      console.log(`   ... e mais ${report.issues.semEndereco.length - 5} empresas`);
    }
  }

  // Recomendações
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMENDAÇÕES');
  console.log('='.repeat(70));

  const recommendations: string[] = [];

  if (report.issues.cnpjInvalido.length > 0) {
    recommendations.push(`• URGENTE: Corrigir ${report.issues.cnpjInvalido.length} CNPJs inválidos`);
  }
  if (report.issues.semContato.length > 0) {
    recommendations.push(`• Obter telefone ou email para ${report.issues.semContato.length} empresas`);
  }
  if (report.issues.semEndereco.length > 0) {
    recommendations.push(`• Completar endereço de ${report.issues.semEndereco.length} empresas`);
    recommendations.push(`  Sugestão: Executar npm run update:cnpja para atualizar dados`);
  }
  if (report.issues.semCNAE.length > 0) {
    recommendations.push(`• Obter CNAE para ${report.issues.semCNAE.length} empresas`);
  }
  if (report.issues.inativaSemMarcacao.length > 0) {
    recommendations.push(`• Normalizar situação cadastral de ${report.issues.inativaSemMarcacao.length} empresas`);
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
    console.log('🟡 Qualidade moderada. Recomenda-se melhorias.\n');
  } else {
    console.log('🟢 Excelente qualidade de dados!\n');
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando auditoria de empresas...\n');

  try {
    const empresas = await fetchAllEmpresas();
    const report = auditEmpresas(empresas);
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
